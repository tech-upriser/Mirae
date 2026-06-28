const { google } = require("googleapis");
const User = require("../models/User");
const Job = require("../models/Job");
const Contact = require("../models/Contact");
const CalendarEvent = require("../models/CalendarEvent");
const { upsertMiraeEventToGoogle } = require("./googleCalendarController");
const socket = require("../utils/socket");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// Initialize OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI,
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Recursively extracts the plain-text body from a Gmail message payload.
 * Handles both simple and multipart MIME structures.
 * The result is held in-memory only — never persisted to the database.
 */
const getEmailBody = (payload) => {
  let body = "";
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body.data) {
        body += Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.parts) {
        body += getEmailBody(part);
      }
    }
  } else if (payload.body && payload.body.data) {
    body += Buffer.from(payload.body.data, "base64").toString("utf-8");
  }
  return body;
};

/**
 * Maps fine-grained ML status predictions to the Kanban column values
 * stored in the Job model, depending on the dashboard category.
 */
const mapStatusToKanban = (status, category) => {
  if (category === "Jobs") {
    const map = {
      Applied: "Applied",
      "Online Assessment": "Interviewing",
      Interviewing: "Interviewing",
      Offer: "Offer",
      Rejected: "Rejected",
    };
    return map[status] || null;
  }

  if (category === "Hackathons") {
    const map = {
      Registered: "Applied",
      Shortlisted: "Interviewing",
      Finalist: "Interviewing",
      Winner: "Offer",
      Rejected: "Rejected",
    };
    return map[status] || null;
  }

  if (category === "Others") {
    const map = {
      Applied: "Applied",
      "Under Review": "Applied",
      Accepted: "Offer",
      Rejected: "Rejected",
    };
    return map[status] || null;
  }

  return null;
};

// ─── ML Service Communication ────────────────────────────────────────────────

/**
 * Stage 1 + 2 + 4: Calls the Python /analyze endpoint.
 * Returns { is_relevant, category, status, confidence }
 */
const analyzeEmail = async (subject, sender, snippet, body) => {
  const res = await fetch(`${ML_SERVICE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, sender, snippet, body }),
  });
  if (!res.ok) throw new Error(`ML /analyze failed: ${await res.text()}`);
  return res.json();
};

/**
 * Stage 3: Calls the Python /match endpoint with TF-IDF cosine similarity.
 * Sends the email text + list of candidate cards from MongoDB.
 * Returns { matched_id, confidence, matched_title }
 */
const matchCard = async (emailText, candidates) => {
  const res = await fetch(`${ML_SERVICE_URL}/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email_text: emailText, candidates }),
  });
  if (!res.ok) throw new Error(`ML /match failed: ${await res.text()}`);
  return res.json();
};

/**
 * Stage 5: Calls the Python /extract endpoint for category-aware metadata.
 * Returns { date, time, meeting_link, interviewer, salary, deadline, ... }
 */
const extractMetadata = async (subject, sender, snippet, body, category) => {
  const res = await fetch(`${ML_SERVICE_URL}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, sender, snippet, body, category }),
  });
  if (!res.ok) throw new Error(`ML /extract failed: ${await res.text()}`);
  return res.json();
};

// ─── Main Webhook Handler ────────────────────────────────────────────────────

const handleWebhook = async (req, res) => {
  try {
    // ───────────────────────────────────────────────────────────────────────
    // 1. ALWAYS acknowledge Google immediately (prevents retry storms)
    // ───────────────────────────────────────────────────────────────────────
    res.status(200).send("OK");

    const message = req.body.message;
    if (!message || !message.data) return;

    // 2. Decode Pub/Sub payload
    const decodedData = Buffer.from(message.data, "base64").toString("utf-8");
    const pubsubPayload = JSON.parse(decodedData);

    const user = await User.findOne({ email: pubsubPayload.emailAddress });
    if (!user || !user.gmailTokens) {
      console.error("⚠️ User not found or Gmail tokens missing.");
      return;
    }

    // 3. Prevent duplicate processing via History ID comparison
    if (
      user.lastHistoryId &&
      BigInt(pubsubPayload.historyId) <= BigInt(user.lastHistoryId)
    ) {
      return;
    }

    // 4. Initialize Gmail API
    oauth2Client.setCredentials(user.gmailTokens);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // 5. Fetch the latest unread message
    const messagesResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: 1,
      q: "is:unread",
    });

    if (
      !messagesResponse.data.messages ||
      messagesResponse.data.messages.length === 0
    ) {
      return;
    }

    const messageId = messagesResponse.data.messages[0].id;
    const email = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
    });

    // 6. Extract email fields (held in-memory only — NEVER saved to DB)
    const headers = email.data.payload.headers;
    const subject =
      headers.find((h) => h.name === "Subject")?.value || "";
    const from = headers.find((h) => h.name === "From")?.value || "";
    const snippet = email.data.snippet || "";
    const body = getEmailBody(email.data.payload);

    console.log(`\n📩 PROCESSING EMAIL: "${subject}" from ${from}`);

    try {
      // ─────────────────────────────────────────────────────────────────────
      // STAGE 1 + 2 + 4: Analyze (Detect → Route → Status)
      // ─────────────────────────────────────────────────────────────────────
      const analysis = await analyzeEmail(subject, from, snippet, body);

      if (!analysis.is_relevant) {
        console.log("🛑 Not relevant — skipping.");
        user.lastHistoryId = pubsubPayload.historyId;
        await user.save();
        return;
      }

      // console.log(
      //   `🤖 ML Result → Category: ${analysis.category} | Status: ${analysis.status} | Confidence: ${analysis.confidence}`,
      // );

      // ─────────────────────────────────────────────────────────────────────
      // STAGE 3: Card Matching (TF-IDF Cosine Similarity)
      // ─────────────────────────────────────────────────────────────────────

      // Map ML category to the Job model's category enum
      const categoryFilter =
        analysis.category === "Jobs"
          ? { $in: ["Jobs", "Internships"] }
          : analysis.category === "Hackathons"
            ? "Hackathons"
            : { $in: ["Others", "Open Source", "Other"] };

      // Fetch candidate cards for this user in the predicted category
      const candidateCards = await Job.find({
        userId: user._id,
        category: categoryFilter,
      }).sort({ createdAt: -1 });

      if (candidateCards.length === 0) {
        // console.log(
        //   `⚠️ No ${analysis.category} cards found for this user — nothing to match.`,
        // );
        user.lastHistoryId = pubsubPayload.historyId;
        await user.save();
        return;
      }

      // Build candidate list for the ML matching service
      const candidates = candidateCards.map((card) => ({
        id: card._id.toString(),
        title: card.title,
        company: card.company,
      }));

      const emailText = `${subject} ${from} ${snippet} ${body}`;
      const matchResult = await matchCard(emailText, candidates);

      if (!matchResult.matched_id) {
        console.log(
          `⚠️ No confident match found (best score: ${matchResult.confidence.toFixed(3)}).`,
        );
        user.lastHistoryId = pubsubPayload.historyId;
        await user.save();
        return;
      }

      // console.log(
      //   `🔗 Matched Card: "${matchResult.matched_title}" (confidence: ${matchResult.confidence.toFixed(3)})`,
      // );

      // ─────────────────────────────────────────────────────────────────────
      // STAGE 4 (continued): Update Status
      // ─────────────────────────────────────────────────────────────────────
      const matchedJob = candidateCards.find(
        (c) => c._id.toString() === matchResult.matched_id,
      );

      if (!matchedJob) {
        console.error("❌ Matched ID not found in candidates — data mismatch.");
        user.lastHistoryId = pubsubPayload.historyId;
        await user.save();
        return;
      }

      const kanbanStatus = mapStatusToKanban(analysis.status, analysis.category);

      if (kanbanStatus && matchedJob.status !== kanbanStatus) {
        matchedJob.status = kanbanStatus;
        matchedJob.history.push({ status: kanbanStatus, date: new Date() });

        // If rejected, store the reason from the snippet
        if (kanbanStatus === "Rejected") {
          matchedJob.rejectionReason = snippet.substring(0, 200);
        }

        await matchedJob.save();
        console.log(
          `✅ Updated "${matchedJob.title}" at ${matchedJob.company} → ${kanbanStatus}`,
        );

        // Emit real-time Socket.io event to the user's dashboard
        try {
          socket.getIO().to(user._id.toString()).emit('status_update', {
            jobId: matchedJob._id,
            company: matchedJob.company,
            title: matchedJob.title,
            oldStatus: matchedJob.status, // We lost oldStatus because we mutated it, but the client can see it
            newStatus: kanbanStatus,
            category: analysis.category
          });
          console.log(`🔌 Emitted real-time update to user ${user._id}`);
        } catch (socketErr) {
          console.error('Socket emission failed:', socketErr.message);
        }
      } else {
        console.log(
          `➖ Status already "${matchedJob.status}" — no update needed.`,
        );
      }

      // ─────────────────────────────────────────────────────────────────────
      // STAGE 5: Metadata Extraction + Intelligence Actions
      // ─────────────────────────────────────────────────────────────────────
      const metadata = await extractMetadata(
        subject,
        from,
        snippet,
        body,
        analysis.category,
      );
      // console.log(`📋 Extracted Metadata:`, metadata);

      // ── Auto-Contact Creation (Recruiter CRM) ──
      try {
        // Parse "John Doe <john@example.com>"
        const emailMatch = from.match(/<([^>]+)>/);
        const email = emailMatch ? emailMatch[1] : from;
        const nameMatch = from.match(/^([^<]+)/);
        const name = nameMatch ? nameMatch[1].trim().replace(/"/g, '') : email;

        if (email && email !== "unknown" && !email.includes("noreply") && !email.includes("no-reply")) {
          let contact = await Contact.findOne({ userId: user._id, email });
          
          if (!contact) {
            contact = new Contact({
              userId: user._id,
              name,
              email,
              company: matchedJob.company,
              role: kanbanStatus === "Interviewing" ? "Interviewer" : "Recruiter",
              jobIds: [matchedJob._id],
              interactions: []
            });
            console.log(`👤 Created new contact: ${name} (${email})`);
          } else {
            // Update existing contact
            if (!contact.jobIds.includes(matchedJob._id)) {
              contact.jobIds.push(matchedJob._id);
            }
            contact.lastContactDate = new Date();
          }

          // Log the interaction
          contact.interactions.push({
            type: "email_received",
            date: new Date(),
            notes: `Received email regarding ${matchedJob.title}: "${subject}"`
          });

          await contact.save();
          
          // Also link back to the Job model's basic contact fields if empty
          if (!matchedJob.contacts?.recruiterName) {
             matchedJob.contacts = { ...matchedJob.contacts, recruiterName: name };
             await matchedJob.save();
          }
        }
      } catch (contactErr) {
        console.error("Failed to process Contact:", contactErr.message);
      }

      // ── Auto-Calendar for Interviews ──
      if (
        kanbanStatus === "Interviewing" &&
        metadata.date
      ) {
        try {
          const calEvent = new CalendarEvent({
            userId: user._id,
            title: `Interview: ${matchedJob.company} — ${matchedJob.title}`,
            description: [
              `Automatically created by Mirae Intelligence Engine.`,
              metadata.interviewer
                ? `Interviewer: ${metadata.interviewer}`
                : "",
              metadata.meeting_link
                ? `Meeting Link: ${metadata.meeting_link}`
                : "",
            ]
              .filter(Boolean)
              .join("\n"),
            date: new Date(metadata.date),
            startTime: metadata.time || "09:00 AM",
            type: "interview",
            location: metadata.meeting_link ? "Online" : "",
            applyLink: metadata.meeting_link || "",
            source: "dashboard",
          });

          await calEvent.save();

          // Sync to Google Calendar if connected
          if (user.googleRefreshToken) {
            await upsertMiraeEventToGoogle(user._id, calEvent);
            console.log(`🗓️ Google Calendar event created!`);
          }
        } catch (calErr) {
          console.error("Calendar event creation failed:", calErr.message);
        }
      }

      // ── Auto-save offer metadata ──
      if (kanbanStatus === "Offer") {
        if (metadata.salary) matchedJob.salary = metadata.salary;
        if (metadata.deadline)
          matchedJob.deadline = new Date(metadata.deadline);
        await matchedJob.save();
        console.log(`💰 Offer metadata saved.`);
      }

      // ── Auto-save hackathon deadline ──
      if (
        analysis.category === "Hackathons" &&
        metadata.deadline
      ) {
        matchedJob.deadline = new Date(metadata.deadline);
        await matchedJob.save();

        // Also create a calendar reminder for the deadline
        try {
          const deadlineEvent = new CalendarEvent({
            userId: user._id,
            title: `Deadline: ${matchedJob.title}`,
            description: `Submission deadline for ${matchedJob.company || matchedJob.title}.\nAutomatically created by Mirae Intelligence Engine.`,
            date: new Date(metadata.deadline),
            startTime: "11:59 PM",
            type: "deadline",
            source: "dashboard",
          });
          await deadlineEvent.save();
          if (user.googleRefreshToken) {
            await upsertMiraeEventToGoogle(user._id, deadlineEvent);
          }
          console.log(`📅 Hackathon deadline reminder created.`);
        } catch (calErr) {
          console.error("Deadline event creation failed:", calErr.message);
        }
      }
    } catch (mlErr) {
      console.error(
        "❌ Error communicating with ML service:",
        mlErr.message,
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // STAGE 6: Finalize — update History ID, drop email text from memory
    // ───────────────────────────────────────────────────────────────────────
    user.lastHistoryId = pubsubPayload.historyId;
    await user.save();

    // All email variables (subject, from, snippet, body) go out of scope
    // here and are garbage-collected. Zero persistence. Privacy++.
  } catch (error) {
    console.error("❌ Webhook processing error:", error.message);
  }
};

module.exports = { handleWebhook };
