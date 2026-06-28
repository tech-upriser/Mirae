const Job = require('../models/Job');
const User = require('../models/User');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SKILL_LIBRARY = [
  { label: 'JavaScript', terms: ['javascript', 'js'] },
  { label: 'TypeScript', terms: ['typescript', 'ts'] },
  { label: 'Python', terms: ['python'] },
  { label: 'Java', terms: ['java'] },
  { label: 'C++', terms: ['c++'] },
  { label: 'C#', terms: ['c#', 'c sharp'] },
  { label: 'Go', terms: ['golang', ' go '] },
  { label: 'Rust', terms: ['rust'] },
  { label: 'SQL', terms: ['sql', 'mysql', 'postgresql', 'postgres'] },
  { label: 'React', terms: ['react', 'react.js'] },
  { label: 'Node.js', terms: ['node.js', 'nodejs', 'node js'] },
  { label: 'Express.js', terms: ['express', 'express.js'] },
  { label: 'MongoDB', terms: ['mongodb', 'mongo db'] },
  { label: 'Docker', terms: ['docker'] },
  { label: 'Kubernetes', terms: ['kubernetes', 'k8s'] },
  { label: 'AWS', terms: ['aws', 'amazon web services'] },
  { label: 'Google Cloud', terms: ['google cloud', 'gcp'] },
  { label: 'Azure', terms: ['azure', 'microsoft azure'] },
  { label: 'Git', terms: ['git', 'github', 'gitlab'] },
  { label: 'Linux', terms: ['linux'] },
  { label: 'REST APIs', terms: ['rest api', 'restful api', 'rest apis'] },
  { label: 'GraphQL', terms: ['graphql'] },
  { label: 'System Design', terms: ['system design'] },
  { label: 'Distributed Systems', terms: ['distributed systems', 'distributed system'] },
  { label: 'Data Structures', terms: ['data structures'] },
  { label: 'Algorithms', terms: ['algorithms', 'algorithmic'] },
  { label: 'Software Development', terms: ['software development', 'software engineering'] },
  { label: 'Programming Languages', terms: ['programming languages', 'programming language'] },
  { label: 'Machine Learning', terms: ['machine learning', 'ml'] },
  { label: 'Data Science', terms: ['data science'] },
  { label: 'Artificial Intelligence', terms: ['artificial intelligence', 'ai '] },
  { label: 'Problem Solving', terms: ['problem solving', 'problem-solving'] },
  { label: 'Communication', terms: ['communication skills', 'communication'] },
  { label: 'Leadership', terms: ['leadership'] },
  { label: 'Mentoring', terms: ['mentor', 'mentoring'] },
  { label: 'Stakeholder Management', terms: ['stakeholder management', 'stakeholder'] },
  { label: 'Partnerships', terms: ['partnerships', 'partnership'] },
  { label: 'Program Management', terms: ['program management'] },
  { label: 'Project Management', terms: ['project management'] },
  { label: 'Product Management', terms: ['product management'] },
  { label: 'Testing', terms: ['testing', 'unit testing', 'integration testing'] },
  { label: 'Debugging', terms: ['debugging', 'debug'] },
];

const uniq = (items) => [...new Set(items.filter(Boolean))];

const extractSkillsFromText = (text = '') => {
  const haystack = ` ${String(text || '').toLowerCase()} `;
  return SKILL_LIBRARY
    .filter((entry) => entry.terms.some((term) => haystack.includes(` ${term.toLowerCase()} `) || haystack.includes(term.toLowerCase())))
    .map((entry) => entry.label);
};

const splitSkillsFromText = (value = '') => {
  return uniq(
    String(value || '')
      .split(/[\n,•|/]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
};

const deriveSkillBuckets = ({ aiSkills, rawText, description, resumeText, hasResume }) => {
  const required = uniq([
    ...aiSkills.all,
    ...extractSkillsFromText(rawText),
    ...extractSkillsFromText(description),
  ]);

  const normalizedResume = ` ${String(resumeText || '').toLowerCase()} `;

  const matched = hasResume
    ? required.filter((skill) => {
        const libraryMatch = SKILL_LIBRARY.find((entry) => entry.label === skill);
        if (!libraryMatch) return normalizedResume.includes(skill.toLowerCase());
        return libraryMatch.terms.some((term) => normalizedResume.includes(` ${term.toLowerCase()} `) || normalizedResume.includes(term.toLowerCase()));
      })
    : [];

  const aiMatched = aiSkills.matched.filter((skill) => required.includes(skill));
  const finalMatched = uniq(hasResume ? [...matched, ...aiMatched] : []);
  const finalMissing = hasResume
    ? required.filter((skill) => !finalMatched.includes(skill))
    : required;

  return {
    all: required,
    matched: finalMatched,
    missing: uniq([...aiSkills.missing.filter((skill) => required.includes(skill)), ...finalMissing]),
  };
};

const deriveMatchScore = (providedScore, skills, hasResume) => {
  if (!hasResume) return null;
  if (typeof providedScore === 'number' && !Number.isNaN(providedScore)) return providedScore;
  if (!skills.all.length) return null;
  return Math.max(0, Math.min(100, Math.round((skills.matched.length / skills.all.length) * 100)));
};

// Helper: Normalize category into the dashboard's 3 buckets
const normalizeCategory = (raw, context = '') => {
  const rawValue = String(raw || '').toLowerCase().trim();
  const combined = `${raw || ''} ${context || ''}`.toLowerCase().trim();

  if (['jobs', 'job'].includes(rawValue)) return 'Jobs';
  if (['hackathons', 'hackathon', 'contest', 'contests'].includes(rawValue)) return 'Hackathons';
  if (['others', 'other'].includes(rawValue)) return 'Others';

  const hackathonKeywords = [
    'hackathon',
    'contest',
    'competition',
    'challenge',
    'ctf',
    'bounty',
    'buildathon'
  ];

  const strongJobKeywords = [
    'software engineer',
    'data scientist',
    'data science manager',
    'security engineer',
    'product manager',
    'designer',
    'developer',
    'engineer',
    'manager',
    'analyst',
    'specialist',
    'consultant',
    'recruiter',
    'full-time',
    'part-time',
    'apply now',
    'job description',
    'responsibilities',
    'qualifications',
    'requirements'
  ];

  const otherKeywords = [
    'workshop',
    'webinar',
    'session',
    'bootcamp',
    'masterclass',
    'fellowship',
    'scholarship',
    'meetup',
    'conference',
    'summit'
  ];

  if (hackathonKeywords.some((keyword) => combined.includes(keyword))) return 'Hackathons';
  if (strongJobKeywords.some((keyword) => combined.includes(keyword))) return 'Jobs';
  if (otherKeywords.some((keyword) => combined.includes(keyword))) return 'Others';

  return 'Others';
};

const PIPELINE_STATUSES = ['Saved', 'Applied', 'Interviewing', 'Offer', 'Rejected'];

const normalizePipelineStatusValue = (raw) => {
  const value = String(raw || '').toLowerCase().trim();
  if (!value) return null;

  if (['saved', 'not applied', 'not registered', 'currently not registered', 'not submitted', 'not started'].includes(value)) {
    return 'Saved';
  }

  if (['applied', 'submitted', 'registered', 'completed', 'application submitted', 'registration complete'].includes(value)) {
    return 'Applied';
  }

  if (['interview', 'interviewing', 'interview scheduled', 'screening', 'phone screen', 'onsite'].includes(value)) {
    return 'Applied';
  }

  if (['offer', 'offered', 'accepted', 'selected', 'winner', 'shortlisted'].includes(value)) {
    return 'Offer';
  }

  if (['rejected', 'declined', 'not selected', 'unsuccessful', 'rejection'].includes(value)) {
    return 'Rejected';
  }

  return null;
};

const hasAnyPattern = (text, patterns) => patterns.some((pattern) => pattern.test(text));

const inferPipelineStatus = ({ rawStatus, category, context }) => {
  const directStatus = normalizePipelineStatusValue(rawStatus);
  if (directStatus) return directStatus;

  const text = ` ${String(context || '').toLowerCase().replace(/\s+/g, ' ')} `;
  const isHackathon = category === 'Hackathons';

  const negativeSavedPatterns = isHackathon
    ? [
        /\bnot\s+(?:yet\s+)?registered\b/,
        /\bnot\s+currently\s+registered\b/,
        /\byou\s+are\s+not\s+registered\b/,
      ]
    : [
        /\bnot\s+(?:yet\s+)?applied\b/,
        /\byou\s+have\s+not\s+applied\b/,
        /\bapplication\s+not\s+submitted\b/,
      ];

  if (hasAnyPattern(text, negativeSavedPatterns)) return 'Saved';

  if (hasAnyPattern(text, [
    /\b(?:application|submission)\s+(?:was\s+)?(?:rejected|declined|unsuccessful)\b/,
    /\bwe\s+(?:are\s+)?(?:sorry|unable)\b.{0,80}\b(?:not\s+selected|move\s+forward|proceed)\b/,
    /\bnot\s+selected\b/,
    /\bno\s+longer\s+under\s+consideration\b/,
  ])) {
    return 'Rejected';
  }

  if (hasAnyPattern(text, [
    /\bcongratulations\b.{0,100}\b(?:offer|selected|accepted|winner)\b/,
    /\b(?:offer|acceptance)\s+(?:letter|received|extended|accepted)\b/,
    /\byou\s+(?:have\s+been\s+)?(?:selected|accepted)\b/,
    /\bwinner\b/,
  ])) {
    return 'Offer';
  }

  if (hasAnyPattern(text, [
    /\binterview\s+(?:scheduled|confirmed|invitation|invite|stage|round)\b/,
    /\b(?:phone|technical|onsite|final)\s+(?:screen|interview|round)\b/,
    /\bmeet\s+with\s+(?:the\s+)?(?:recruiter|hiring\s+manager|team)\b/,
  ])) {
    return 'Applied';
  }

  const activePatterns = isHackathon
    ? [
        /\byou\s+(?:are|'re)\s+registered\b/,
        /\bregistered\s+(?:successfully|on|for)\b/,
        /\bregistration\s+(?:confirmed|complete|successful)\b/,
        /\bteam\s+(?:is\s+)?registered\b/,
      ]
    : [
        /\byou\s+(?:have\s+)?applied\b/,
        /\balready\s+applied\b/,
        /\bapplied\s+on\b/,
        /\bapplication\s+(?:submitted|received|complete|successful)\b/,
        /\bsubmitted\s+(?:your\s+)?application\b/,
        /\bthank\s+you\s+for\s+(?:applying|your\s+application)\b/,
      ];

  if (hasAnyPattern(text, activePatterns)) return 'Applied';

  const openActionPatterns = isHackathon
    ? [
        /\bregistration\s+(?:is\s+)?(?:open|opens|closes|deadline)\b/,
        /\bregister\s+(?:now|today)\b/,
        /\bjoin\s+(?:this\s+)?(?:hackathon|contest|challenge)\b/,
      ]
    : [
        /\bapply\s+now\b/,
        /\bstart\s+(?:your\s+)?application\b/,
        /\bsubmit\s+(?:an\s+)?application\b/,
      ];

  if (hasAnyPattern(text, openActionPatterns)) return 'Saved';

  return 'Saved';
};

// Helper: Extract company name from URL as last resort
const companyFromUrl = (url) => {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    const name = hostname.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return 'Unknown Company';
  }
};

const parseDeadline = (raw) => {
  if (!raw) return null;

  const value = String(raw).trim();
  if (!value || /not specified|unknown|n\/a|none/i.test(value)) return null;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const numericMatch = value.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (numericMatch) {
    const [, a, b, c] = numericMatch;
    const year = c.length === 2 ? `20${c}` : c;
    const iso = new Date(`${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`);
    if (!Number.isNaN(iso.getTime())) return iso;
  }

  return null;
};

const hasMeaningfulValue = (value) => {
  const text = String(value || '').trim();
  return Boolean(text) && !/^(not specified|unknown|n\/a|na|none|null|undefined)$/i.test(text);
};

// Main handler: AI analysis via Groq (Llama 3) + save
exports.createJob = async (req, res) => {
  try {
    const incomingData = req.body;

    // Support BOTH old format (title/company/description) and new omni-scraper format (rawText)
    const rawText = incomingData.rawText || incomingData.description || '';
    const url = incomingData.url || '';
    const isManualEntry = Boolean(incomingData.title && incomingData.company);

    console.log("📥 Tracker received:", { url: url.substring(0, 60), textLength: rawText.length });

    if (rawText.length < 50 && !isManualEntry) {
      return res.status(400).json({ error: "Not enough text captured from the page. Try refreshing and scraping again." });
    }

    // 1. Fetch user's resume from DB
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: "User not found. Please log in again." });
    }

    const hasResume = !!(user.resumeText && user.resumeText.trim().length > 20);
    // Grab the user's skills from the database (fallback to resume text or a default string)
    const userProfileSkills = hasResume ? user.resumeText.substring(0, 3000) : "React, Node.js, MongoDB, JavaScript, Python";

    // 2. The Omni-Extraction Prompt
    const systemPrompt = `You are an expert technical recruiter and data extractor. 
I will provide you with the raw text scraped from a job board webpage. 
Your job is to find the job details and return a strict JSON object.

If you cannot find a specific detail, use "Not specified" or "Unknown". Only classify into Jobs, Hackathons, or Others. Anything that is not a job posting and not a hackathon/contest must be Others.

CRITICAL INSTRUCTION: I will also provide the candidate's current skills. You must compare the job's required skills against the candidate's skills to calculate a Match Score (0-100). Furthermore, you must categorize the job's required skills into "matched" (skills the candidate has) and "missing" (skills the candidate lacks). Never leave the skills arrays empty if the posting mentions technologies, tools, or competencies. Infer a concise required-skills list from the posting text when needed.

PIPELINE STATUS INSTRUCTION: Decide where this item belongs in the user's Mirae dashboard. Return "Saved" if the page only shows an opportunity to apply/register or clearly says not applied/not registered. Return "Applied" if the page confirms the user already applied, submitted, registered, or has an interview/screen/round scheduled. Jobs use one combined dashboard section called "Applied / Interviewing", so do not return a separate Interviewing status. For hackathons/contests, registered means "Applied" because the dashboard displays those in the Registered section. Return "Offer" only when the user is selected, accepted, won, or received an offer. Return "Rejected" only when the page says unsuccessful, declined, rejected, or not selected. Do not treat generic buttons like "Apply now" or "Register" as Applied.

Candidate's Current Skills: ${userProfileSkills}

You MUST return ONLY valid JSON in this exact format:
{
  "title": "Exact Job Title",
  "company": "Company Name",
  "location": "City, State or Remote",
  "postedDate": "Date posted, e.g., 2 days ago or exact date",
  "salary": "Compensation range, e.g., $120k - $150k or ₹15LPA",
  "deadline": "Exact deadline date if present, otherwise empty string",
  "category": "Strictly one of: Jobs, Hackathons, Others",
  "pipelineStatus": "Strictly one of: Saved, Applied, Offer, Rejected",
  "description": "A clean 2-paragraph summary of the job and requirements",
  "matchScore": 85,
  "skills": {
    "all": ["skill1", "skill2", "skill3", "skill4"],
    "matched": ["skill1", "skill2"],
    "missing": ["skill3", "skill4"]
  }
}`;

    const userMessage = `Job URL: ${url}

Here is the webpage text:

${rawText.substring(0, 6000)}`;

    // 3. Call Groq AI (Llama 3 — fast, free, guaranteed JSON)
    let aiResult = {
      title: 'Untitled Position',
      company: companyFromUrl(url),
      location: '',
      postedDate: '',
      salary: '',
      deadline: '',
      category: 'Jobs',
      pipelineStatus: 'Saved',
      description: '',
      matchScore: null,
      skills: {
        all: [],
        matched: [],
        missing: []
      }
    };

    try {
      console.log("🧠 Calling Groq AI (Llama 3)...");
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" }, // Forces perfect JSON output!
        temperature: 0.2,
      });

      const aiText = chatCompletion.choices[0].message.content;
      // console.log("🤖 Groq raw response:", aiText.substring(0, 300));
      aiResult = JSON.parse(aiText);

      // Enforce null match score if no resume
      if (!hasResume) {
        aiResult.matchScore = null;
        if (aiResult.skills) {
          aiResult.skills.matched = [];
          aiResult.skills.missing = [];
        }
      }
    } catch (aiError) {
      console.warn("⚠️ Groq AI failed. Saving with URL-based fallback.", aiError.message);
    }

    // 4. Prefer explicit manual values when the dashboard form provides them.
    const finalTitle = hasMeaningfulValue(incomingData.title)
      ? incomingData.title.trim()
      : hasMeaningfulValue(aiResult.title)
      ? aiResult.title
      : 'Untitled Position';

    const finalCompany = hasMeaningfulValue(incomingData.company)
      ? incomingData.company.trim()
      : (aiResult.company && aiResult.company !== 'Unknown Company' && aiResult.company !== 'Unknown')
      ? aiResult.company
      : companyFromUrl(url);

    // 5. Ensure skills object is properly formatted (defensive parsing)
    let safeSkills = { all: [], matched: [], missing: [] };
    const ensureArray = (val) => {
      if (Array.isArray(val)) return val.filter(v => typeof v === 'string');
      if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    };

    if (aiResult.skills) {
      if (Array.isArray(aiResult.skills)) {
        safeSkills.all = ensureArray(aiResult.skills);
        safeSkills.matched = [];
        safeSkills.missing = ensureArray(aiResult.skills);
      } else {
        safeSkills.all = uniq([
          ...ensureArray(aiResult.skills.all),
          ...splitSkillsFromText(aiResult.skills.required),
        ]);
        safeSkills.matched = ensureArray(aiResult.skills.matched);
        safeSkills.missing = ensureArray(aiResult.skills.missing);
      }
    }

    safeSkills = deriveSkillBuckets({
      aiSkills: safeSkills,
      rawText: rawText.substring(0, 6000),
      description: aiResult.description || '',
      resumeText: user.resumeText || '',
      hasResume,
    });

    let safeMatchScore = null;
    if (aiResult.matchScore !== undefined && aiResult.matchScore !== null) {
      const parsed = parseInt(String(aiResult.matchScore).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed)) safeMatchScore = parsed;
    }

    safeMatchScore = deriveMatchScore(safeMatchScore, safeSkills, hasResume);

    if (!hasResume) {
      safeSkills.matched = [];
      safeSkills.missing = safeSkills.all;
    }

    // Clean up description if it's too long or just raw text
    let safeDescription = aiResult.description || '';
    if (safeDescription.length > 2000) {
      safeDescription = safeDescription.substring(0, 2000) + '...';
    }
    
    const categoryContext = [
      aiResult.category,
      aiResult.title,
      aiResult.description,
      rawText.substring(0, 2000)
    ].join(' ');

    const finalCategory = normalizeCategory(incomingData.category || aiResult.category, categoryContext);
    const finalDeadline = parseDeadline(incomingData.deadline) || parseDeadline(aiResult.deadline);
    const statusContext = [
      incomingData.status,
      aiResult.pipelineStatus,
      aiResult.status,
      aiResult.category,
      aiResult.title,
      aiResult.company,
      aiResult.description,
      rawText.substring(0, 6000)
    ].join(' ');
    const incomingStatus = PIPELINE_STATUSES.includes(incomingData.status)
      ? normalizePipelineStatusValue(incomingData.status)
      : null;
    const finalStatus = incomingStatus || inferPipelineStatus({
      rawStatus: aiResult.pipelineStatus || aiResult.status,
      category: finalCategory,
      context: statusContext
    });
    // 6. Build final document
    const createdAt = new Date();
    const appliedDate = finalStatus === 'Applied' || finalStatus === 'Offer'
      ? createdAt
      : null;

    const finalData = {
      title: finalTitle,
      company: finalCompany,
      url: url || 'https://unknown',
      description: safeDescription,
      matchScore: safeMatchScore,
      skills: safeSkills,
      location: incomingData.location || aiResult.location || '',
      postedDate: aiResult.postedDate || '',
      salary: incomingData.salaryRange || incomingData.salary || aiResult.salary || aiResult.salaryRange || '',
      deadline: finalDeadline,
      category: finalCategory,
      status: finalStatus,
      appliedDate,
      history: [{ status: finalStatus, date: createdAt }],
      userId: req.user.id,
      createdAt,
      updatedAt: createdAt
    };

    const existingJob = await Job.findOne({
      userId: req.user.id,
      url: finalData.url,
    }).sort({ updatedAt: -1 });

    if (existingJob) {
      const history = Array.isArray(existingJob.history) ? [...existingJob.history] : [];
      const lastStatus = history.length ? history[history.length - 1]?.status : existingJob.status;
      if (finalStatus && lastStatus !== finalStatus) {
        history.push({ status: finalStatus, date: createdAt });
      }

      existingJob.title = finalData.title;
      existingJob.company = finalData.company;
      existingJob.description = finalData.description;
      existingJob.matchScore = finalData.matchScore;
      existingJob.skills = finalData.skills;
      existingJob.location = finalData.location;
      existingJob.postedDate = finalData.postedDate;
      existingJob.salary = finalData.salary;
      existingJob.deadline = finalData.deadline;
      existingJob.category = finalData.category;
      existingJob.status = finalData.status;
      existingJob.appliedDate = finalData.appliedDate || existingJob.appliedDate;
      existingJob.history = history;
      existingJob.updatedAt = createdAt;

      await existingJob.save();

      console.log("♻️ Existing job refreshed successfully! ID:", existingJob._id);

      return res.status(200).json({
        message: 'This job was already saved. Mirae refreshed its details.',
        job: existingJob,
      });
    }

    const newJob = new Job(finalData);
    await newJob.save();

    console.log("✅ Job saved successfully! ID:", newJob._id);

    res.status(201).json({
      message: aiResult.matchScore !== null
        ? "Analysis Complete and Personalized!"
        : "Job saved! Upload a resume to get Match Scores.",
      job: newJob
    });

  } catch (error) {
    console.error("❌ Tracker Controller Error:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
};

// Get all jobs (Secure Dashboard Fetch)
exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
};


// Delete one job for the logged-in user
exports.deleteJob = async (req, res) => {
  try {
    const deletedJob = await Job.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deletedJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.status(200).json({ message: 'Job deleted successfully', id: deletedJob._id });
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
};

// Update job status
exports.updateJobStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const job = await Job.findOne({ _id: req.params.id, userId: req.user.id });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status === status) {
      return res.status(200).json({ message: 'Job status unchanged', job });
    }

    job.status = status;
    job.history = Array.isArray(job.history) ? job.history : [];
    job.history.push({ status, date: new Date() });
    await job.save();

    res.status(200).json({ message: 'Job status updated successfully', job });
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ error: 'Failed to update job status' });
  }
};


// Save networking contacts
exports.updateJobContacts = async (req, res) => {
  try {
    const recruiterName = String(req.body?.recruiterName || '').trim();
    const hiringManager = String(req.body?.hiringManager || '').trim();

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        $set: {
          contacts: {
            recruiterName,
            hiringManager,
          },
        },
      },
      { returnDocument: 'after' }
    );

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.status(200).json({ message: 'Contacts saved successfully', job });
  } catch (error) {
    console.error('Update Contacts Error:', error);
    res.status(500).json({ error: 'Failed to save contacts' });
  }
};


// Save job notes
exports.updateJobNotes = async (req, res) => {
  try {
    const notes = String(req.body?.notes || '');

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        $set: {
          notes,
        },
      },
      { returnDocument: 'after' }
    );

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.status(200).json({ message: 'Note saved successfully', job });
  } catch (error) {
    console.error('Update Notes Error:', error);
    res.status(500).json({ error: 'Failed to save note' });
  }
};

