import json
from train_model import NON_RELEVANT, JOBS, HACKATHONS, OTHERS

# Create expanded datasets by duplicating and slightly modifying or adding more robust examples

MORE_NON_RELEVANT = [
    "sender: offers@pizza.com subject: 50% off large pizzas snippet: Use code PIZZA50 at checkout.",
    "sender: noreply@zoom.us subject: Missed meeting snippet: You missed the scheduled meeting with the marketing team.",
    "sender: updates@youtube.com subject: New upload from your favorite channel snippet: Check out the latest video on tech reviews.",
    "sender: news@bbc.co.uk subject: Breaking news today snippet: Global markets rally as tech stocks surge.",
    "sender: security@bank.com subject: Login alert snippet: A new login was detected on your account.",
    "sender: admin@university.edu subject: Campus closure snippet: Due to heavy snow, campus is closed today.",
    "sender: friends@group.com subject: Dinner tonight? snippet: Are we still on for dinner at 7?",
    "sender: promo@travel.com subject: Flight deals snippet: Fly to Europe for under $300 roundtrip.",
    "sender: no-reply@delivery.com subject: Your order has arrived snippet: Your groceries have been left at the door.",
    "sender: social@pinterest.com subject: 10 new pins for you snippet: We think you'll love these interior design ideas."
] * 10

MORE_JOBS = [
    ("sender: careers@amazon.com subject: Amazon Interview Scheduled snippet: Your interview for the Software Engineer role is scheduled for tomorrow.", "Interviewing"),
    ("sender: jobs@netflix.com subject: Offer Letter snippet: Congratulations! We are thrilled to offer you the position of Senior Data Engineer.", "Offer"),
    ("sender: hr@apple.com subject: Update on your application snippet: Unfortunately, we will not be moving forward with your application.", "Rejected"),
    ("sender: recruiting@google.com subject: Action required: Online Assessment snippet: Please complete this coding test within 48 hours.", "Online Assessment"),
    ("sender: talent@startup.io subject: Thanks for applying snippet: We have received your resume for the Frontend Developer role.", "Applied")
] * 10

MORE_HACKATHONS = [
    ("sender: team@hackmit.org subject: Welcome to HackMIT snippet: You are successfully registered for the event.", "Registered"),
    ("sender: noreply@devpost.com subject: Hackathon finalist snippet: Your project has been selected for the final round.", "Finalist"),
    ("sender: admin@mlh.io subject: Application update snippet: We are sorry, but we cannot accommodate you this year.", "Rejected")
] * 10

MORE_OTHERS = [
    ("sender: apply@opensource.org subject: GSoC Application snippet: Your proposal has been submitted.", "Applied"),
    ("sender: mentors@program.org subject: Welcome to the fellowship snippet: Congratulations, you have been accepted into the program.", "Accepted"),
    ("sender: reject@scholarship.org subject: Scholarship update snippet: We regret to inform you that you were not selected.", "Rejected")
] * 10

# Combine datasets
final_data = {
    "NON_RELEVANT": NON_RELEVANT + MORE_NON_RELEVANT,
    "JOBS": JOBS + MORE_JOBS,
    "HACKATHONS": HACKATHONS + MORE_HACKATHONS,
    "OTHERS": OTHERS + MORE_OTHERS
}

with open("training_data.json", "w") as f:
    json.dump(final_data, f, indent=4)

print("✅ Saved training data to training_data.json with expanded examples.")
