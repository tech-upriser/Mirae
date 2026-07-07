const Job = require('../models/Job');
const User = require('../models/User');
const Groq = require('groq-sdk');
const socket = require('../utils/socket');

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

const normalizeSkill = (skill) => {
  const clean = String(skill || '').trim().toLowerCase();
  if (!clean) return '';
  // Find in library matching label or terms
  const matchedEntry = SKILL_LIBRARY.find(
    (entry) =>
      entry.label.toLowerCase() === clean ||
      entry.terms.some((term) => term.toLowerCase() === clean)
  );
  return matchedEntry ? matchedEntry.label : (skill.trim().charAt(0).toUpperCase() + skill.trim().slice(1));
};

const normalizeSkillList = (skills) => {
  if (!Array.isArray(skills)) return [];
  return [...new Set(skills.map(normalizeSkill).filter(Boolean))];
};

const extractSkillsWithAI = async (text, isResume = false) => {
  if (!text || text.trim().length < 20) return [];
  
  const systemPrompt = isResume 
    ? `You are an expert resume parser.

Extract ONLY technical skills from the resume (Programming Languages, Frameworks, Libraries, Databases, Cloud Providers, Tools).

Return ONLY valid JSON.

Format:
{
  "skills": [
    "React",
    "Node.js",
    "MongoDB"
  ]
}

Rules:
- No explanation.
- No markdown.
- No comments.
- No duplicate skills.
- Normalize names (e.g. "ReactJS" -> "React", "Node" -> "Node.js").
- Ignore soft skills (e.g. leadership, communication).
- Ignore education, degrees (B.Tech, MS, PhD, Bachelor's, Master's, Graduate), projects, companies, and achievements.
- Extract ONLY explicit technical skills (e.g. Python, AWS, Docker).`
    : `You are an expert technical recruiter.
    
Extract ONLY technical skills required from this job description (Programming Languages, Frameworks, Libraries, Databases, Cloud Platforms, Developer Tools).

Return ONLY JSON.

Format:
{
  "skills": []
}

Rules:
- No soft skills.
- Ignore education requirements and degrees (e.g. B.Tech, MS, PhD, Bachelor's, Master's, Graduate, Undergraduate).
- Normalize names (e.g., "JS" -> "JavaScript").
- Extract explicit technical requirements only (e.g. Python, AWS, Docker).`;

  const userMessage = isResume 
    ? `Resume Text:\n${text.substring(0, 25000)}`
    : `Job Description:\n${text.substring(0, 25000)}`;

  let attempt = 1;
  const maxAttempts = 2; // Retry once means 2 total attempts

  while (attempt <= maxAttempts) {
    try {
      console.log(`🧠 [Groq API] Extracting skills (Attempt ${attempt}/${maxAttempts})...`);
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const content = chatCompletion.choices[0].message.content;
      console.log(`🤖 [Groq API] Raw response:`, content);
      
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.skills)) {
        return parsed.skills.filter(s => typeof s === 'string' && s.trim().length > 0);
      }
      
      throw new Error("Invalid skills array in JSON");
    } catch (error) {
      console.warn(`⚠️ [Groq API] Attempt ${attempt} failed:`, error.message);
      attempt++;
    }
  }

  // Fallback if all attempts fail
  console.error(`❌ [Groq API] Failed to extract skills after ${maxAttempts} attempts. Returning empty list.`);
  return [];
};

const extractJobDetailsWithAI = async (text) => {
  if (!text || text.trim().length < 20) return { skills: [], description: '' };
  
  const systemPrompt = `You are an expert technical recruiter and parser.
Given the noisy raw text extracted from a webpage, extract:
1. A clean, professional summary of the core job description (responsibilities, about the role, and requirements). Ignore all website navigation menus, footer links, privacy policies, unrelated ads, and boilerplate company text. Format it cleanly with basic text.
2. A precise list of ONLY technical skills required (Programming Languages, Frameworks, Databases, Tools). Ignore soft skills.
3. The category of this opportunity. Must be exactly one of: "Jobs", "Hackathons", or "Others".
4. The current status of the user's application based on the text. If there is no explicit confirmation of application, default to "Saved". 
   - For Jobs: "Saved", "Applied", "Interviewing", "Offer", "Rejected".
   - For Hackathons: "Saved", "Registered", "Participated", "Won", "Completed", "Lost", "Offer" (if shortlisted/selected).
   - For Others: "Saved", "Active", "Completed", "Lost", "Offer" (if shortlisted/selected).
   If the text indicates the user has been shortlisted, selected, accepted, or won a round/contest, set the status to "Offer".
5. The application deadline or registration deadline mentioned in the text. Format it as an ISO date string (YYYY-MM-DD) if possible, or just return the date text (e.g. "July 28, 2026") or "Not specified" if not found.

Return ONLY valid JSON.

Format:
{
  "description": "String containing the cleaned job description...",
  "skills": ["Skill1", "Skill2"],
  "category": "Jobs|Hackathons|Others",
  "status": "String (one of the valid statuses above based on category)",
  "deadline": "String (e.g. 'YYYY-MM-DD' or date text, or 'Not specified')"
}`;

  const userMessage = `Job Posting Text:\n${text.substring(0, 25000)}`;

  let attempt = 1;
  const maxAttempts = 2;

  while (attempt <= maxAttempts) {
    try {
      console.log(`🧠 [Groq API] Extracting job details (Attempt ${attempt}/${maxAttempts})...`);
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const content = chatCompletion.choices[0].message.content;
      const parsed = JSON.parse(content);
      
      if (parsed) {
        return {
          description: parsed.description || '',
          skills: Array.isArray(parsed.skills) ? parsed.skills : [],
          category: parsed.category || null,
          status: parsed.status || null,
          deadline: parsed.deadline || null
        };
      }
    } catch (error) {
      console.error(`⚠️ [Groq API] Attempt ${attempt} failed:`, error.message);
    }
    attempt++;
  }

  return { skills: [], description: '' };
};

exports.extractSkillsWithAI = extractSkillsWithAI;
exports.extractJobDetailsWithAI = extractJobDetailsWithAI;

/**
 * Normalizes a text string by:
 * - Converting to lowercase
 * - Translating '&' to 'and'
 * - Replacing punctuation/special chars (except '+' and '#') with spaces
 * - Collapsing extra whitespace
 */
function normalize(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9+#\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Configurable Synonym Dictionary (Bidirectional Groups)
const SYNONYM_GROUPS = [
  ['javascript', 'js'],
  ['typescript', 'ts'],
  ['c#', 'c sharp'],
  ['golang', 'go'],
  ['sql', 'mysql', 'postgresql', 'postgres'],
  ['react', 'react.js', 'reactjs'],
  ['node.js', 'nodejs', 'node js'],
  ['express.js', 'express', 'expressjs'],
  ['mongodb', 'mongo db'],
  ['kubernetes', 'k8s'],
  ['aws', 'amazon web services'],
  ['google cloud', 'gcp'],
  ['azure', 'microsoft azure'],
  ['git', 'github', 'gitlab'],
  ['rest api', 'restful api', 'rest apis', 'restful apis', 'rest'],
  ['distributed systems', 'distributed system'],
  ['algorithms', 'algorithmic'],
  ['software development', 'software engineering'],
  ['machine learning', 'ml'],
  ['artificial intelligence', 'ai'],
  ['dsa', 'data structures and algorithms', 'data structures & algorithms'],
  ['oop', 'object-oriented programming', 'object oriented programming']
];

// Generate lookup map for synonyms
const SYNONYM_MAP = {};
for (const group of SYNONYM_GROUPS) {
  const normalizedGroup = group.map(term => normalize(term)).filter(Boolean);
  for (const term of normalizedGroup) {
    SYNONYM_MAP[term] = normalizedGroup;
  }
}

/**
 * Computes Levenshtein distance between two strings
 */
function levenshtein(a, b) {
  const tmp = [];
  for (let i = 0; i <= b.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        tmp[i][j] = tmp[i - 1][j - 1];
      } else {
        tmp[i][j] = Math.min(
          tmp[i - 1][j - 1] + 1, // substitution
          tmp[i][j - 1] + 1,     // insertion
          tmp[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return tmp[b.length][a.length];
}

/**
 * Calculates normalized Levenshtein similarity (0.0 to 1.0)
 */
function getLevenshteinSimilarity(s1, s2) {
  const len = Math.max(s1.length, s2.length);
  if (len === 0) return 1.0;
  const dist = levenshtein(s1, s2);
  return (len - dist) / len;
}

/**
 * Extracts canonical representation of a skill name for deduplication
 */
function getCanonicalSkill(skillName) {
  const norm = normalize(skillName);
  if (!norm) return '';
  
  // Handle parenthesized text like "Amazon Web Services (AWS)"
  const parenRegex = /\(([^)]+)\)/;
  const match = skillName.match(parenRegex);
  if (match) {
    const inside = normalize(match[1]);
    if (SYNONYM_MAP[inside]) {
      return SYNONYM_MAP[inside][0];
    }
  }
  
  if (SYNONYM_MAP[norm]) {
    return SYNONYM_MAP[norm][0];
  }
  
  const withoutParen = normalize(skillName.replace(/\([^)]+\)/g, ' '));
  if (SYNONYM_MAP[withoutParen]) {
    return SYNONYM_MAP[withoutParen][0];
  }
  
  return norm;
}

/**
 * Deduplicates required job skills by mapping to canonical forms
 */
function deduplicateJobSkills(jobSkills) {
  const seen = new Set();
  const uniqueSkills = [];
  for (const skill of jobSkills) {
    if (!skill) continue;
    const canonical = getCanonicalSkill(skill);
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      uniqueSkills.push(skill);
    }
  }
  return uniqueSkills;
}

/**
 * Returns all possible variants (abbreviations, synonyms, parts) for a skill
 */
function getSkillVariants(skill) {
  const variants = new Set();
  const norm = normalize(skill);
  if (norm) {
    variants.add(norm);
  }
  
  // Check text inside parenthesis (e.g. AWS)
  const parenRegex = /\(([^)]+)\)/g;
  let match;
  while ((match = parenRegex.exec(skill)) !== null) {
    const inside = normalize(match[1]);
    if (inside) variants.add(inside);
  }
  
  // Check text without parenthesis
  const withoutParen = normalize(skill.replace(/\([^)]+\)/g, ' '));
  if (withoutParen) variants.add(withoutParen);
  
  // Expand synonyms for all found variants
  const currentVariants = Array.from(variants);
  for (const variant of currentVariants) {
    const syns = SYNONYM_MAP[variant];
    if (syns) {
      for (const syn of syns) {
        const normSyn = normalize(syn);
        if (normSyn) variants.add(normSyn);
      }
    }
  }
  
  return Array.from(variants);
}

/**
 * Performs sliding window fuzzy matching of a variant against resume tokens
 */
function fuzzyMatchPhrase(variant, resumeTokens, threshold = 0.82) {
  const variantTokens = variant.split(' ').filter(Boolean);
  const n = variantTokens.length;
  if (n === 0) return false;
  
  for (let i = 0; i <= resumeTokens.length - n; i++) {
    const windowTokens = resumeTokens.slice(i, i + n);
    const windowPhrase = windowTokens.join(' ');
    
    const similarity = getLevenshteinSimilarity(windowPhrase, variant);
    if (similarity >= threshold) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a skill is matched in the searchSpace or resumeTokens
 */
function isSkillMatched(skill, searchSpace, resumeTokens) {
  const variants = getSkillVariants(skill);
  
  for (const variant of variants) {
    // 1. Exact whole-word/phrase match
    if (searchSpace.includes(' ' + variant + ' ')) {
      return true;
    }
    
    // 2. Compound phrase matching (split by ' and ')
    const parts = variant.split(' and ').map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      const allPartsMatched = parts.every(part => {
        if (searchSpace.includes(' ' + part + ' ')) return true;
        if (part.length > 4 && fuzzyMatchPhrase(part, resumeTokens, 0.82)) return true;
        return false;
      });
      if (allPartsMatched) {
        return true;
      }
    }
    
    // 3. Fuzzy matching on the variant (no fuzzy matching for short words)
    const threshold = variant.length <= 4 ? 1.0 : 0.82;
    if (fuzzyMatchPhrase(variant, resumeTokens, threshold)) {
      return true;
    }
  }
  
  return false;
}

const computeSkillGap = (resumeSkills = [], jobSkills = [], resumeText = '') => {
  // 1. Deduplicate required job skills
  const uniqueJobSkills = deduplicateJobSkills(jobSkills || []);
  
  // 2. Prepare resume search space
  const resumeSkillsList = Array.isArray(resumeSkills) ? resumeSkills : [];
  const searchPool = [
    ...resumeSkillsList,
    resumeText || ''
  ];
  
  const searchSpace = ' ' + searchPool.map(s => normalize(s)).join(' ') + ' ';
  const resumeTokens = normalize(resumeText || '').split(' ').filter(Boolean);
  
  const matchedSkills = [];
  const missingSkills = [];
  
  for (const skill of uniqueJobSkills) {
    if (isSkillMatched(skill, searchSpace, resumeTokens)) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }
  
  let matchPercentage = null;
  const totalRequired = uniqueJobSkills.length;
  if (totalRequired > 0) {
    matchPercentage = Math.round((matchedSkills.length / totalRequired) * 100);
  }
  
  return {
    matchPercentage,
    matchedSkills,
    missingSkills,
    resumeSkills: resumeSkillsList,
    jobSkills: uniqueJobSkills
  };
};

const ensureJobSkillsAndMatch = async (job, user) => {
  let updated = false;

  // Initialize job.jobSkills if missing
  if (!job.jobSkills || job.jobSkills.length === 0) {
    const fallbackAll = job.skills?.all || [];
    if (fallbackAll.length > 0) {
      job.jobSkills = fallbackAll;
      updated = true;
    } else if (job.description || job.rawText) {
      console.log(`🤖 [Job Skills Healing] Job ${job._id} has no skills. Extracting...`);
      const extracted = await extractSkillsWithAI(job.description || job.rawText || '', false);
      job.jobSkills = normalizeSkillList(extracted);
      if (!job.skills) job.skills = { all: [], matched: [], missing: [] };
      job.skills.all = job.jobSkills;
      updated = true;
    }
  }

  // If user has resumeSkills or resumeText, compute matching on-the-fly and sync to job document
  const hasResume = !!(user && user.resumeText && user.resumeText.trim().length > 20);
  if (hasResume) {
    const gap = computeSkillGap(user.resumeSkills || [], job.jobSkills, user.resumeText);

    if (
      job.matchScore !== gap.matchPercentage ||
      JSON.stringify(job.skills?.matched) !== JSON.stringify(gap.matchedSkills) ||
      JSON.stringify(job.skills?.missing) !== JSON.stringify(gap.missingSkills)
    ) {
      job.matchScore = gap.matchPercentage;
      if (!job.skills) job.skills = { all: [], matched: [], missing: [] };
      job.skills.matched = gap.matchedSkills;
      job.skills.missing = gap.missingSkills;
      updated = true;
    }
  } else {
    // If no resume uploaded, reset matches
    if (job.matchScore !== null || job.skills?.matched?.length > 0) {
      job.matchScore = null;
      if (!job.skills) job.skills = { all: [], matched: [], missing: [] };
      job.skills.matched = [];
      job.skills.missing = job.jobSkills;
      updated = true;
    }
  }

  if (updated) {
    await job.save();
    console.log(`💾 [Job Skills Healing] Job ${job._id} successfully saved to MongoDB.`);
  }

  return job;
};

exports.computeSkillGap = computeSkillGap;
exports.ensureJobSkillsAndMatch = ensureJobSkillsAndMatch;

const cleanTitle = (rawTitle) => {
  let title = String(rawTitle || '').trim();
  if (!title) return 'Untitled Position';
  
  // Remove common job board suffixes
  title = title
    .replace(/\s*\|\s*(LinkedIn|Indeed|Glassdoor|SimplyHired|ZipRecruiter|Google|GitHub|Mirae)\s*$/i, '')
    .replace(/\s*-\s*Job\s*Search\s*$/i, '')
    .replace(/\s*-\s*Careers\s*$/i, '')
    .replace(/\s*-\s*Job\s*Description\s*$/i, '');
    
  return title || 'Untitled Position';
};

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
    'summit',
    'summer school',
    'program',
    'course'
  ];

  if (hackathonKeywords.some((keyword) => combined.includes(keyword))) return 'Hackathons';
  if (otherKeywords.some((keyword) => combined.includes(keyword))) return 'Others';
  if (strongJobKeywords.some((keyword) => combined.includes(keyword))) return 'Jobs';

  return 'Others';
};

const PIPELINE_STATUSES = ['Saved', 'Applied', 'Interviewing', 'Offer', 'Rejected'];

const STATUS_WEIGHTS = {
  'Saved': 1,
  'Applied': 2,
  'Registered': 2,
  'Participated': 2,
  'Active': 2,
  'In Progress': 2,
  'Interviewing': 3,
  'Offer': 4,
  'Won': 4,
  'Completed': 4,
  'Rejected': 5,
  'Lost': 5
};

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
    /\bcongratulations\b.{0,100}\b(?:offer|selected|accepted|winner|shortlisted)\b/,
    /\b(?:offer|acceptance)\s+(?:letter|received|extended|accepted)\b/,
    /\byou\s+(?:have\s+been\s+)?(?:selected|accepted|shortlisted)\b/,
    /\bwinner\b/,
    /\byour\s+result\b.{0,50}\bshortlisted\b/,
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

    // 1. Fetch user's resume/skills from DB
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: "User not found. Please log in again." });
    }

    const hasResume = !!(user.resumeText && user.resumeText.trim().length > 20);

    // 2. Extract job details and technical skills from the raw text
    const extractedData = await extractJobDetailsWithAI(rawText);
    const normalizedJobSkills = normalizeSkillList(extractedData.skills);

    // 3. Retrieve user's resumeSkills or extract on-the-fly if missing
    let resumeSkills = [];
    if (hasResume) {
      if (!user.resumeSkills || user.resumeSkills.length === 0) {
        console.log("♻️ User has resume but no resumeSkills. Extracting on-the-fly...");
        user.resumeSkills = await extractSkillsWithAI(user.resumeText, true);
        await user.save();
      }
      resumeSkills = normalizeSkillList(user.resumeSkills);
    }

    // 4. Compute matchedSkills and missingSkills
    const gap = computeSkillGap(resumeSkills, normalizedJobSkills);
    const matchPercentage = gap.matchPercentage;
    const matchedSkills = gap.matchedSkills;
    const missingSkills = gap.missingSkills;

    // Prepare job details fallbacks
    const finalTitle = cleanTitle(incomingData.title || incomingData.tabTitle || '');
    const finalCompany = hasMeaningfulValue(incomingData.company)
      ? incomingData.company.trim()
      : companyFromUrl(url);

    let finalDescription = extractedData.description || incomingData.description || '';
    if (!finalDescription && rawText) {
      finalDescription = rawText.substring(0, 4000).trim();
      if (rawText.length > 4000) finalDescription += '...';
    }

    const categoryContext = [
      finalTitle,
      finalDescription,
      rawText.substring(0, 2000)
    ].join(' ');

    const finalCategory = incomingData.category 
      ? normalizeCategory(incomingData.category, '') 
      : (['Jobs', 'Hackathons', 'Others'].includes(extractedData.category) 
          ? extractedData.category 
          : normalizeCategory(null, categoryContext));

    const finalDeadline = parseDeadline(incomingData.deadline) || parseDeadline(extractedData.deadline);

    const statusContext = [
      incomingData.status,
      finalCategory,
      finalTitle,
      finalCompany,
      finalDescription,
      rawText.substring(0, 6000)
    ].join(' ');

    const incomingStatus = PIPELINE_STATUSES.includes(incomingData.status)
      ? normalizePipelineStatusValue(incomingData.status)
      : null;

    const validStatuses = ['Saved', 'Applied', 'Registered', 'Interviewing', 'Participated', 'Offer', 'Won', 'Rejected', 'Lost', 'Active', 'In Progress', 'Completed'];
    const aiStatus = validStatuses.includes(extractedData.status) ? extractedData.status : null;

    let finalStatus = incomingStatus;
    if (!finalStatus) {
      if (aiStatus) {
        finalStatus = normalizePipelineStatusValue(aiStatus);
      } else {
        finalStatus = inferPipelineStatus({
          rawStatus: incomingData.status,
          category: finalCategory,
          context: statusContext
        });
      }
    }
    finalStatus = finalStatus || 'Saved';

    const createdAt = new Date();
    const appliedDate = finalStatus === 'Applied' || finalStatus === 'Offer'
      ? createdAt
      : null;

    const safeSkills = {
      all: normalizedJobSkills,
      matched: matchedSkills,
      missing: missingSkills
    };

    const finalData = {
      title: finalTitle,
      company: finalCompany,
      url: url || 'https://unknown',
      description: finalDescription,
      matchScore: matchPercentage,
      skills: safeSkills,
      jobSkills: normalizedJobSkills,
      location: incomingData.location || '',
      postedDate: '',
      salary: incomingData.salaryRange || incomingData.salary || '',
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

      existingJob.title = finalData.title || existingJob.title;
      existingJob.company = finalData.company || existingJob.company;
      existingJob.description = finalData.description || existingJob.description;
      
      if (finalData.jobSkills && finalData.jobSkills.length > 0) {
        existingJob.matchScore = finalData.matchScore;
        existingJob.skills = finalData.skills;
        existingJob.jobSkills = finalData.jobSkills;
      }

      existingJob.location = finalData.location;
      existingJob.postedDate = finalData.postedDate;
      existingJob.salary = finalData.salary;
      existingJob.deadline = finalData.deadline || existingJob.deadline;
      existingJob.category = finalData.category;
      
      const oldWeight = STATUS_WEIGHTS[existingJob.status] || 1;
      const newWeight = STATUS_WEIGHTS[finalData.status] || 1;
      if (finalData.status && (finalData.status !== 'Saved' || existingJob.status === 'Saved')) {
        if (newWeight >= oldWeight || finalData.status === 'Rejected' || finalData.status === 'Lost') {
          existingJob.status = finalData.status;
        }
      }
      existingJob.appliedDate = finalData.appliedDate || existingJob.appliedDate;
      existingJob.history = history;
      existingJob.updatedAt = createdAt;

      await existingJob.save();

      console.log("♻️ Existing job refreshed successfully! ID:", existingJob._id);

      try {
        socket.getIO().to(req.user.id.toString()).emit('job_added', existingJob);
      } catch (err) {
        console.error("Socket emission failed:", err.message);
      }

      return res.status(200).json({
        message: 'This job was already saved. Mirae refreshed its details.',
        job: existingJob,
        matchPercentage,
        matchedSkills,
        missingSkills,
        resumeSkills,
        jobSkills: normalizedJobSkills
      });
    }

    const newJob = new Job(finalData);
    await newJob.save();

    console.log("✅ Job saved successfully! ID:", newJob._id);

    try {
      socket.getIO().to(req.user.id.toString()).emit('job_added', newJob);
    } catch (err) {
      console.error("Socket emission failed:", err.message);
    }

    res.status(201).json({
      message: "Analysis Complete and Personalized!",
      job: newJob,
      matchPercentage,
      matchedSkills,
      missingSkills,
      resumeSkills,
      jobSkills: normalizedJobSkills
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
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    const jobs = await Job.find({ userId: req.user.id }).sort({ createdAt: -1 });

    const healedJobs = await Promise.all(
      jobs.map(job => ensureJobSkillsAndMatch(job, user))
    );

    res.status(200).json(healedJobs);
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

    // Automatically create a calendar event for Interviewing or Participated stages
    if (status === 'Interviewing' || status === 'Participated') {
      const CalendarEvent = require('../models/CalendarEvent');
      
      // Check if an event already exists for this job to prevent duplicates
      const existingEvent = await CalendarEvent.findOne({ 
        userId: req.user.id, 
        title: { $regex: new RegExp(job.company, 'i') },
        type: 'interview'
      });
      
      if (!existingEvent) {
        // Create an event for tomorrow at 10 AM by default
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        await CalendarEvent.create({
          title: `Interview: ${job.company} - ${job.title}`,
          description: `Automatically generated event for ${status} status. Update with exact date and time.`,
          date: tomorrow,
          startTime: '10:00 AM',
          endTime: '11:00 AM',
          type: 'interview',
          status: 'pending',
          userId: req.user.id
        });
      }
    }

    res.status(200).json({ message: 'Job status updated successfully', job });
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ error: 'Failed to update job status' });
  }
};


// Save networking contacts
exports.updateJobContacts = async (req, res) => {
  try {
    const networkContacts = Array.isArray(req.body?.networkContacts) ? req.body.networkContacts : [];
    
    // Also support legacy recruiterName/hiringManager if passed
    const recruiterName = String(req.body?.recruiterName || '').trim();
    const hiringManager = String(req.body?.hiringManager || '').trim();

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      {
        $set: {
          networkContacts,
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

