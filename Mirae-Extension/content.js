// content.js — Mirae Omni-Scraper
// Instead of guessing CSS selectors for each job board,
// we grab ALL visible text and let the backend extract the structured data.

document.documentElement.setAttribute('data-mirae-installed', 'true');

let isSavingToMirae = false;
let lastSaveStartedAt = 0;

const scrapeAndSendToMirae = () => {
  if (isSavingToMirae && Date.now() - lastSaveStartedAt < 10000) {
    alert('⏳ Mirae: This page is already being saved. Please wait a moment.');
    return;
  }

  isSavingToMirae = true;
  lastSaveStartedAt = Date.now();
  console.log("Mirae: Extracting raw page text...");

  // Try to find the most relevant main content container first
  const selectors = [
    'main',
    '[class*="description"]',
    '[id*="description"]',
    '[class*="details"]',
    '[class*="job-view"]',
    'article',
    '.jobs-description__content'
  ];
  
  let mainContent = '';
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText.length > 500) {
      mainContent += el.innerText + '\n';
    }
  }

  // Fallback to body text if selectors missed or it's a simple page
  let rawText = (mainContent.length > 500 ? mainContent : document.body.innerText).replace(/\s+/g, ' ').trim();

  // Send up to 25000 characters to capture the full description
  const jobData = {
    url: window.location.href,
    rawText: rawText.substring(0, 25000),
    tabTitle: document.title || ''
  };

  if (jobData.rawText.length < 100) {
    isSavingToMirae = false;
    alert("❌ Mirae: Page hasn't fully loaded yet. Please wait and try again.");
    return;
  }

  console.log(`Mirae: Captured ${jobData.rawText.length} chars from ${jobData.url}`);

  chrome.runtime.sendMessage(
    { action: "saveJob", data: jobData },
    (response) => {
      if (chrome.runtime.lastError) {
        isSavingToMirae = false;
        alert("❌ Mirae Error: Extension disconnected. Please refresh the page and try again.");
        return;
      }

      if (response && response.success) {
        const job = response.data.job;
        const hasResume = response.data.hasResume;
        const score = job.matchScore;
        const section = job.category === 'Hackathons' && job.status !== 'Saved'
          ? 'Registered'
          : job.status === 'Applied'
          ? 'Applied / Interviewing'
          : job.status || 'Saved';
        let scoreMsg;
        if (score !== null && score !== undefined) {
          scoreMsg = ` with a Match Score of ${score}%`;
        } else if (!hasResume) {
          scoreMsg = `. Upload your resume on the dashboard to get a Match Score`;
        } else {
          scoreMsg = ``;
        }
        alert(`✨ Success! "${job.title}" at ${job.company} added to ${section}${scoreMsg}!`);
      } else {
        alert(`❌ Mirae Error: ${response ? response.error : 'Unknown error occurred.'}`);
      }

      isSavingToMirae = false;
    }
  );
};

// 👂 Listen for the trigger from either the Popup or the Right-Click Menu
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pingMiraeContentScript') {
    sendResponse({ status: 'ready' });
    return false;
  }

  if (request.action === "triggerScrape") {
    scrapeAndSendToMirae();
    sendResponse({ status: "scraping_started" });
  }
  return true;
});

// 🔄 Listen for token sync from the React dashboard
window.addEventListener("message", (event) => {
  if (event.source === window && event.data && event.data.type === "MIRAE_SYNC_TOKEN") {
    chrome.runtime.sendMessage(
      { action: "syncToken", token: event.data.token },
      (response) => {
        console.log("Mirae Extension:", response ? response.message : "Token sync failed");
      }
    );
  }
});
