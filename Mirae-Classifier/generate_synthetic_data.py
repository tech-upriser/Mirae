import json
import random

# Generate diverse datasets
non_relevant = [
    "sender: updates@linkedin.com subject: 10 new jobs for Software Engineer snippet: Check out these new jobs matching your profile.",
    "sender: promo@doordash.com subject: Hungry? 20% off your next order snippet: Order now and get 20% off.",
    "sender: noreply@github.com subject: [GitHub] Subscribed to repo snippet: You are now watching notifications for this repository.",
    "sender: spam@deals.com subject: You won a free iPhone snippet: Click here to claim your prize.",
    "sender: mom@gmail.com subject: Dinner tonight? snippet: Let me know what time you'll be home.",
    "sender: notifications@twitter.com subject: John Doe Tweeted snippet: See what John is talking about today.",
    "sender: info@bank.com subject: Your monthly statement is ready snippet: Log in to view your statement for June.",
    "sender: newsletter@techcrunch.com subject: Daily Crunch: AI takes over snippet: Read the latest tech news.",
    "sender: billing@aws.amazon.com subject: AWS Invoice Available snippet: Your invoice for the month of May is now available.",
    "sender: support@apple.com subject: Your Apple ID was used to sign in snippet: We noticed a new login on your account.",
    "sender: uber.receipts@uber.com subject: Your Monday morning trip with Uber snippet: Total: $15.50.",
    "sender: hr.newsletter@company.com subject: Q3 Company All Hands snippet: Don't forget to tune in for the all hands meeting tomorrow.",
    "sender: deals@amazon.com subject: Today's Deals: 50% off electronics snippet: Huge savings on laptops and accessories.",
    "sender: notifications@facebook.com subject: Jane tagged you in a photo snippet: View the photo on Facebook.",
    "sender: noreply@reddit.com subject: Trending on r/cscareerquestions snippet: How to negotiate salary.",
    "sender: alerts@netflix.com subject: New arrivals on Netflix snippet: Check out the new movies added this week.",
    "sender: noreply@youtube.com subject: Marques Brownlee uploaded a new video snippet: M2 MacBook Air Review.",
    "sender: updates@slack.com subject: You have 5 unread messages snippet: Catch up on your Slack messages.",
    "sender: marketing@adobe.com subject: Get 20% off Creative Cloud snippet: Special offer for students.",
    "sender: noreply@zoom.us subject: Meeting recording is ready snippet: You can now view the recording for 'Weekly Sync'.",
    "sender: alerts@spotify.com subject: New release from your favorite artist snippet: Listen to the new album now.",
    "sender: support@github.com subject: Action required: Update your payment method snippet: Your credit card is expiring soon.",
    "sender: info@meetup.com subject: Upcoming events near you snippet: Check out these tech meetups in your area.",
    "sender: alerts@calendar.google.com subject: Reminder: Dentist appointment snippet: Tomorrow at 2:00 PM.",
    "sender: newsletter@morningbrew.com subject: Market update snippet: S&P 500 hits new high.",
    "sender: updates@medium.com subject: 5 articles we think you'll love snippet: Read the latest stories from top writers.",
    "sender: noreply@duolingo.com subject: You forgot to practice today! snippet: Keep your streak alive by practicing now.",
    "sender: info@airbnb.com subject: Your booking is confirmed snippet: Get ready for your trip to New York.",
    "sender: support@paypal.com subject: Receipt for your payment to Spotify snippet: You paid $9.99 USD to Spotify.",
    "sender: notifications@instagram.com subject: John liked your post snippet: See your new notifications on Instagram.",
]

jobs = [
    # Applied
    ["sender: careers@google.com subject: Thank you for applying snippet: We have received your application for the SWE Intern role and will review it.", "Applied"],
    ["sender: recruiting@meta.com subject: Application received: Frontend Engineer snippet: Thanks for applying to Meta! Our team is reviewing your resume.", "Applied"],
    ["sender: jobs@apple.com subject: Your Apple application snippet: We've successfully received your application for the iOS Developer position.", "Applied"],
    ["sender: talent@stripe.com subject: Stripe Application snippet: Thank you for submitting your application for the Backend Engineer role.", "Applied"],
    ["sender: hr@netflix.com subject: Application Confirmation snippet: We have received your materials for the Data Scientist role at Netflix.", "Applied"],
    ["sender: careers@amazon.jobs subject: Application submitted snippet: Your application for SDE I has been submitted.", "Applied"],
    ["sender: recruiting@uber.com subject: We've received your application snippet: Thanks for applying to the Software Engineer role at Uber.", "Applied"],
    ["sender: jobs@airbnb.com subject: Application Confirmation snippet: We have received your application for the Full Stack role.", "Applied"],
    ["sender: talent@doordash.com subject: Application received snippet: Your application for the Mobile Engineer role has been submitted.", "Applied"],
    ["sender: hr@spotify.com subject: Thanks for applying snippet: We're reviewing your application for the Web Engineer position.", "Applied"],
    # Online Assessment
    ["sender: no-reply@hackerrank.com subject: Invitation to HackerRank assessment snippet: You have been invited to take a coding assessment for the Google SWE role.", "Online Assessment"],
    ["sender: assessments@codesignal.com subject: CodeSignal Assessment Invitation snippet: Capital One invites you to complete the General Coding Assessment.", "Online Assessment"],
    ["sender: support@codility.com subject: Codility test for Microsoft snippet: Please complete this coding task within 72 hours.", "Online Assessment"],
    ["sender: talent@databricks.com subject: Take-home challenge snippet: Please complete this take-home assignment for the Data Engineer role.", "Online Assessment"],
    ["sender: interviewing@karat.com subject: Invitation to schedule Karat interview snippet: Schedule your technical interview for the Roblox SWE role.", "Online Assessment"],
    ["sender: no-reply@hackerrank.com subject: Amazon SDE Online Assessment snippet: You have 5 days to complete the OA for the SDE I role.", "Online Assessment"],
    ["sender: assessments@hirevue.com subject: HireVue Video Assessment snippet: Please complete your one-way video interview for the Goldman Sachs internship.", "Online Assessment"],
    ["sender: hr@meta.com subject: Meta Coding Challenge snippet: Complete this 90-minute coding challenge on HackerRank.", "Online Assessment"],
    ["sender: recruiting@stripe.com subject: Stripe Byteboard Assessment snippet: You've been invited to complete a Byteboard assessment for the Backend role.", "Online Assessment"],
    ["sender: support@codesignal.com subject: Robinhood Coding Assessment snippet: Complete your assessment for the Backend Engineer role.", "Online Assessment"],
    # Applied / Interviewing
    ["sender: recruiting@google.com subject: Schedule your Google interview snippet: We'd like to invite you for a virtual onsite interview for the SWE role.", "Applied / Interviewing"],
    ["sender: hr@meta.com subject: Meta Phone Screen snippet: Your phone screen with a Meta engineer is scheduled for next Tuesday.", "Applied / Interviewing"],
    ["sender: interviews@apple.com subject: Apple Interview Confirmation snippet: Your technical interview for the iOS Developer role is confirmed for Friday.", "Applied / Interviewing"],
    ["sender: scheduling@amazon.jobs subject: Amazon Virtual Loop snippet: Your 4-round virtual onsite interview for SDE I is scheduled.", "Applied / Interviewing"],
    ["sender: talent@stripe.com subject: Final Round Interview snippet: We're excited to invite you to the final round interviews for the Backend Engineer role.", "Applied / Interviewing"],
    ["sender: recruiting@uber.com subject: Technical Phone Screen snippet: Your technical phone screen for the Software Engineer role is scheduled.", "Applied / Interviewing"],
    ["sender: hr@netflix.com subject: System Design Interview snippet: Your system design interview is confirmed for Wednesday.", "Applied / Interviewing"],
    ["sender: jobs@airbnb.com subject: Behavioral Interview snippet: Your behavioral interview with the hiring manager is confirmed.", "Applied / Interviewing"],
    ["sender: talent@doordash.com subject: Interview Invitation snippet: We'd like to invite you for an interview for the Mobile Engineer role.", "Applied / Interviewing"],
    ["sender: hr@spotify.com subject: Technical Interview Confirmation snippet: Your technical interview for the Web Engineer position is confirmed.", "Applied / Interviewing"],
    # Offer
    ["sender: offers@google.com subject: Google Offer Details snippet: We are thrilled to offer you the Software Engineer role! Here are the details.", "Offer"],
    ["sender: hr@meta.com subject: Offer from Meta snippet: Congratulations! We'd like to extend an offer for the Frontend Engineer position.", "Offer"],
    ["sender: careers@apple.com subject: Apple Offer Letter snippet: We are excited to offer you the iOS Developer position. Please review the attached letter.", "Offer"],
    ["sender: offers@amazon.jobs subject: Amazon SDE I Offer snippet: Congratulations on your offer for the SDE I role at Amazon.", "Offer"],
    ["sender: talent@stripe.com subject: Stripe Offer snippet: We are delighted to offer you the Backend Engineer role.", "Offer"],
    ["sender: recruiting@uber.com subject: Job Offer snippet: We are thrilled to extend an offer for the Software Engineer position.", "Offer"],
    ["sender: hr@netflix.com subject: Netflix Offer Details snippet: Congratulations! We'd like to offer you the Data Scientist role.", "Offer"],
    ["sender: jobs@airbnb.com subject: Offer Letter snippet: We are excited to offer you the Full Stack role at Airbnb.", "Offer"],
    ["sender: talent@doordash.com subject: DoorDash Offer snippet: We are delighted to offer you the Mobile Engineer role.", "Offer"],
    ["sender: hr@spotify.com subject: Offer from Spotify snippet: Congratulations! We'd like to extend an offer for the Web Engineer position.", "Offer"],
    # Rejected
    ["sender: careers@google.com subject: Update on your Google application snippet: While your background is impressive, we will not be moving forward with your application.", "Rejected"],
    ["sender: hr@meta.com subject: Meta Application Status snippet: Unfortunately, we have decided to pursue other candidates for the Frontend Engineer role.", "Rejected"],
    ["sender: recruiting@apple.com subject: Your application to Apple snippet: Thank you for applying, but we will not be proceeding with your candidacy at this time.", "Rejected"],
    ["sender: jobs@amazon.jobs subject: Application Update snippet: We have carefully reviewed your application for SDE I and decided not to move forward.", "Rejected"],
    ["sender: talent@stripe.com subject: Stripe Application Update snippet: After careful consideration, we will not be moving forward with your application.", "Rejected"],
    ["sender: recruiting@uber.com subject: Update on your application snippet: Unfortunately, we have decided to pursue other candidates for the Software Engineer role.", "Rejected"],
    ["sender: hr@netflix.com subject: Application Status snippet: We have carefully reviewed your application and decided not to move forward.", "Rejected"],
    ["sender: jobs@airbnb.com subject: Your application snippet: Thank you for applying, but we will not be proceeding with your candidacy.", "Rejected"],
    ["sender: talent@doordash.com subject: Application Update snippet: We have decided to pursue other candidates for the Mobile Engineer role.", "Rejected"],
    ["sender: hr@spotify.com subject: Status on your application snippet: Unfortunately, we will not be moving forward with your application for the Web Engineer position.", "Rejected"],
]

hackathons = [
    # Registered / Participated
    ["sender: noreply@devpost.com subject: You're registered for HackMIT snippet: Registration confirmed! Don't forget to join the Discord.", "Registered / Participated"],
    ["sender: hello@unstop.com subject: SIH 2026 Registration snippet: Your registration for Smart India Hackathon is complete.", "Registered / Participated"],
    ["sender: team@mlh.io subject: Welcome to HackUPC snippet: Thanks for registering for HackUPC. We'll see you in Barcelona!", "Registered / Participated"],
    ["sender: noreply@hackerearth.com subject: Registration confirmed snippet: You are registered for the AI Innovation Challenge.", "Registered / Participated"],
    ["sender: admin@ethglobal.com subject: ETHWaterloo Registration snippet: Your application to ETHWaterloo has been received.", "Registered / Participated"],
    ["sender: info@devfolio.co subject: InOut Registration snippet: You have successfully registered for InOut 7.0.", "Registered / Participated"],
    ["sender: hello@taikai.network subject: Registration complete snippet: You are registered for the Web3 Buildathon.", "Registered / Participated"],
    ["sender: noreply@devpost.com subject: PennApps Registration snippet: Your registration for PennApps is confirmed.", "Registered / Participated"],
    ["sender: team@mlh.io subject: Welcome to LA Hacks snippet: Thanks for registering for LA Hacks. We'll see you in Los Angeles!", "Registered / Participated"],
    ["sender: hello@unstop.com subject: Registration confirmed snippet: Your registration for the Flipkart GRiD challenge is complete.", "Registered / Participated"],
    # Won / Completed
    ["sender: noreply@devpost.com subject: HackMIT Winners snippet: Congratulations, you won the Best Overall Award at HackMIT!", "Won / Completed"],
    ["sender: hello@unstop.com subject: SIH 2026 Results snippet: Congratulations! You are the winner of the Smart India Hackathon.", "Won / Completed"],
    ["sender: admin@ethglobal.com subject: ETHWaterloo Prizes snippet: You won the sponsor prize from Polygon! Congratulations.", "Won / Completed"],
    ["sender: info@devfolio.co subject: InOut Winner snippet: Congratulations on winning 1st place at InOut 7.0.", "Won / Completed"],
    ["sender: noreply@hackerearth.com subject: Winner Announcement snippet: You have won the AI Innovation Challenge. Claim your prize.", "Won / Completed"],
    ["sender: team@mlh.io subject: LA Hacks Winners snippet: Congratulations, you won the Best Overall Award at LA Hacks!", "Won / Completed"],
    ["sender: hello@taikai.network subject: Web3 Buildathon Winner snippet: Congratulations on winning 1st place at the Web3 Buildathon.", "Won / Completed"],
    ["sender: noreply@devpost.com subject: PennApps Winners snippet: Congratulations, you won the Best Overall Award at PennApps!", "Won / Completed"],
    ["sender: hello@unstop.com subject: Flipkart GRiD Results snippet: Congratulations! You are the winner of the Flipkart GRiD challenge.", "Won / Completed"],
    ["sender: team@mlh.io subject: HackUPC Winners snippet: Congratulations, you won the Best Overall Award at HackUPC!", "Won / Completed"],
    # Lost
    ["sender: noreply@devpost.com subject: HackMIT Status Update snippet: Unfortunately, we cannot accommodate you at HackMIT this year.", "Lost"],
    ["sender: hello@unstop.com subject: SIH 2026 Update snippet: Your team was not shortlisted for the next round. Keep trying!", "Lost"],
    ["sender: admin@ethglobal.com subject: ETHWaterloo Application snippet: We received many applications and unfortunately cannot accept yours.", "Lost"],
    ["sender: team@mlh.io subject: HackUPC Update snippet: Unfortunately, we cannot accommodate you at HackUPC this year due to space limits.", "Lost"],
    ["sender: noreply@hackerearth.com subject: Challenge Update snippet: Your submission did not qualify for the next round.", "Lost"],
    ["sender: info@devfolio.co subject: InOut Status Update snippet: Unfortunately, we cannot accommodate you at InOut 7.0 this year.", "Lost"],
    ["sender: hello@taikai.network subject: Buildathon Update snippet: Your submission did not qualify for the next round.", "Lost"],
    ["sender: noreply@devpost.com subject: PennApps Status Update snippet: Unfortunately, we cannot accommodate you at PennApps this year.", "Lost"],
    ["sender: hello@unstop.com subject: Flipkart GRiD Update snippet: Your team was not shortlisted for the next round. Keep trying!", "Lost"],
    ["sender: team@mlh.io subject: LA Hacks Update snippet: Unfortunately, we cannot accommodate you at LA Hacks this year due to space limits.", "Lost"],
]

others = [
    # Active / In Progress
    ["sender: fellowships@ycombinator.com subject: YC Application Received snippet: We've received your application for the Y Combinator Fellowship.", "Active / In Progress"],
    ["sender: scholarships@google.com subject: Google Scholarship Application snippet: Thank you for applying to the Google Women Techmakers Scholarship.", "Active / In Progress"],
    ["sender: info@outreachy.org subject: Outreachy Application snippet: Your initial application for Outreachy has been recorded.", "Active / In Progress"],
    ["sender: programs@mlh.io subject: MLH Fellowship Application snippet: We have received your application for the MLH Fellowship.", "Active / In Progress"],
    ["sender: admissions@university.edu subject: MS CS Application snippet: Your application to the MS in Computer Science program is complete.", "Active / In Progress"],
    ["sender: hello@summerofcode.withgoogle.com subject: GSoC Application snippet: Your proposal for Google Summer of Code has been submitted.", "Active / In Progress"],
    ["sender: fellowships@openai.com subject: OpenAI Scholars Application snippet: Thank you for applying to the OpenAI Scholars program.", "Active / In Progress"],
    ["sender: scholarships@microsoft.com subject: Microsoft Scholarship Application snippet: Thank you for applying to the Microsoft Tuition Scholarship.", "Active / In Progress"],
    ["sender: info@lfx.linuxfoundation.org subject: LFX Mentorship Application snippet: Your application for the LFX Mentorship has been recorded.", "Active / In Progress"],
    ["sender: programs@github.com subject: GitHub Campus Experts Application snippet: We have received your application for the GitHub Campus Experts program.", "Active / In Progress"],
    # Active / In Progress
    ["sender: fellowships@ycombinator.com subject: YC Application Update snippet: Your application is now under review by our partners.", "Active / In Progress"],
    ["sender: scholarships@google.com subject: Scholarship Application Status snippet: The committee is currently reviewing your scholarship application.", "Active / In Progress"],
    ["sender: info@outreachy.org subject: Outreachy Contribution Period snippet: You are now approved to start the contribution period.", "Active / In Progress"],
    ["sender: programs@mlh.io subject: MLH Fellowship Interview snippet: Please schedule an interview for the MLH Fellowship.", "Active / In Progress"],
    ["sender: admissions@university.edu subject: Application Under Review snippet: The admissions committee is currently reviewing your MS CS application.", "Active / In Progress"],
    ["sender: hello@summerofcode.withgoogle.com subject: GSoC Proposal Review snippet: Organizations are currently reviewing your GSoC proposal.", "Active / In Progress"],
    ["sender: fellowships@openai.com subject: OpenAI Scholars Update snippet: Your application is now under review by our researchers.", "Active / In Progress"],
    ["sender: scholarships@microsoft.com subject: Scholarship Application Status snippet: The committee is currently reviewing your scholarship application.", "Active / In Progress"],
    ["sender: info@lfx.linuxfoundation.org subject: LFX Mentorship Update snippet: Your application is now under review by the project maintainers.", "Active / In Progress"],
    ["sender: programs@github.com subject: GitHub Campus Experts Update snippet: Your application is now under review by our team.", "Active / In Progress"],
    # Completed
    ["sender: fellowships@ycombinator.com subject: YC Fellowship Offer snippet: Congratulations! We are excited to offer you a spot in the YC Fellowship.", "Completed"],
    ["sender: scholarships@google.com subject: Congratulations! You've been selected snippet: You have been awarded the Google Women Techmakers Scholarship.", "Completed"],
    ["sender: info@outreachy.org subject: Accepted as an Outreachy Intern snippet: Congratulations! You have been selected for the Outreachy internship.", "Completed"],
    ["sender: programs@mlh.io subject: Welcome to the MLH Fellowship snippet: Congratulations, you're accepted into the MLH Fellowship!", "Completed"],
    ["sender: admissions@university.edu subject: Offer of Admission snippet: We are pleased to offer you admission to the MS CS program.", "Completed"],
    ["sender: hello@summerofcode.withgoogle.com subject: Accepted for GSoC snippet: Congratulations! Your proposal for Google Summer of Code has been accepted.", "Completed"],
    ["sender: fellowships@openai.com subject: OpenAI Scholars Offer snippet: Congratulations! We are excited to offer you a spot in the OpenAI Scholars program.", "Completed"],
    ["sender: scholarships@microsoft.com subject: Congratulations! You've been selected snippet: You have been awarded the Microsoft Tuition Scholarship.", "Completed"],
    ["sender: info@lfx.linuxfoundation.org subject: Accepted as an LFX Mentee snippet: Congratulations! You have been selected for the LFX Mentorship.", "Completed"],
    ["sender: programs@github.com subject: Welcome to GitHub Campus Experts snippet: Congratulations, you're accepted into the GitHub Campus Experts program!", "Completed"],
    # Lost
    ["sender: fellowships@ycombinator.com subject: Update on YC Fellowship snippet: We had a record number of applications and cannot offer you a spot.", "Lost"],
    ["sender: scholarships@google.com subject: Scholarship Application Update snippet: Unfortunately, you were not selected for the scholarship this year.", "Lost"],
    ["sender: info@outreachy.org subject: Outreachy Status snippet: Unfortunately, you were not selected for an internship this round.", "Lost"],
    ["sender: programs@mlh.io subject: MLH Fellowship Update snippet: We regret to inform you that we cannot offer you a fellowship position.", "Lost"],
    ["sender: admissions@university.edu subject: Admission Decision snippet: We are unable to offer you admission to the MS CS program for the Fall.", "Lost"],
    ["sender: hello@summerofcode.withgoogle.com subject: GSoC Proposal Update snippet: Unfortunately, your proposal for Google Summer of Code was not selected.", "Lost"],
    ["sender: fellowships@openai.com subject: Update on OpenAI Scholars snippet: We had a record number of applications and cannot offer you a spot.", "Lost"],
    ["sender: scholarships@microsoft.com subject: Scholarship Application Update snippet: Unfortunately, you were not selected for the scholarship this year.", "Lost"],
    ["sender: info@lfx.linuxfoundation.org subject: LFX Mentorship Status snippet: Unfortunately, you were not selected for a mentorship this round.", "Lost"],
    ["sender: programs@github.com subject: GitHub Campus Experts Update snippet: We regret to inform you that we cannot offer you a position in the program.", "Lost"],
]

# Duplicate the datasets to ensure enough examples for the models to learn from, just slightly modifying them.
# The ML model expects a decent volume.

import random

companies = ["Tesla", "Airbnb", "Databricks", "Snowflake", "Palantir", "Robinhood", "Coinbase", "Roku", "Spotify", "Snap", "ByteDance", "Twilio", "Dropbox"]
roles = ["Frontend Developer", "Backend Engineer", "Data Analyst", "Product Manager", "UX Designer", "DevOps Engineer", "Machine Learning Engineer", "Security Researcher", "Full Stack Developer", "QA Automation Engineer"]
hackathon_names = ["HackTheNorth", "CalHacks", "TreeHacks", "HackNYU", "HackTX", "VTHacks", "BoilerMake", "HackGT", "SwampHacks"]
other_programs = ["DeepMind Scholarship", "Bessemer Fellowship", "Sequoia Mentorship", "Linux Foundation Course", "Google Research Program", "Meta University", "a16z Fellowship"]
filler_words = ["Great news", "Update on", "Status of", "Regarding", "Action required", "Your application to", "Next steps for", "Following up on"]

# Generate hundreds of unique synthetic training examples to make the TF-IDF vectorizer highly robust
original_jobs = list(jobs)
original_hackathons = list(hackathons)
original_others = list(others)
original_non_relevant = list(non_relevant)

for i in range(25):
    for x in original_jobs:
        base_text = x[0]
        c = random.choice(companies)
        r = random.choice(roles)
        f = random.choice(filler_words)
        new_text = base_text.replace("Google", c).replace("Meta", c).replace("Apple", c).replace("Amazon", c).replace("Stripe", c).replace("Uber", c).replace("Netflix", c).replace("Software Engineer", r).replace("SWE role", r).replace("Frontend Engineer", r).replace("Update on", f)
        jobs.append([new_text + f" {i}", x[1]])
        
    for x in original_hackathons:
        base_text = x[0]
        h = random.choice(hackathon_names)
        new_text = base_text.replace("HackMIT", h).replace("SIH 2026", h).replace("HackUPC", h).replace("ETHWaterloo", h).replace("PennApps", h).replace("LA Hacks", h)
        hackathons.append([new_text + f" {i}", x[1]])
        
    for x in original_others:
        base_text = x[0]
        p = random.choice(other_programs)
        new_text = base_text.replace("YC", p).replace("Google Scholarship", p).replace("Outreachy", p).replace("MLH Fellowship", p).replace("OpenAI Scholars", p).replace("GSoC", p)
        others.append([new_text + f" {i}", x[1]])
        
    for x in original_non_relevant:
        non_relevant.append(x + f" snippet{i}")

data = {
    "NON_RELEVANT": non_relevant,
    "JOBS": jobs,
    "HACKATHONS": hackathons,
    "OTHERS": others
}

with open("d:/Mirae/Mirae-Classifier/training_data.json", "w") as f:
    json.dump(data, f, indent=4)

print("Generated new robust training_data.json!")
