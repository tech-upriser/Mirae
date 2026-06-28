require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");

const jobRoutes = require("./routes/jobRoutes");
const authRoutes = require("./routes/authRoutes");
const trackerRoutes = require("./routes/trackerRoutes");
const profileRoutes = require("./routes/profileRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const calendarRoutes = require("./routes/calendarRoutes");
const gmailRoutes = require("./routes/gmailRoutes");
const contactRoutes = require("./routes/contactRoutes");

const app = express();

// 🛡️ CORS Policy configured for Frontend + Extension
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect to Database
connectDB();

// Mount all Routes
app.use("/api/jobs", jobRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/tracker", trackerRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/gmail", gmailRoutes);
app.use("/api/contacts", contactRoutes);

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ message: "Mirae Backend is running perfectly! 🚀" });
});

const http = require("http");
const socket = require("./utils/socket");
const reminderService = require("./services/reminderService");

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
const io = socket.init(server);

io.on('connection', (client) => {
  console.log(`🔌 Client connected: ${client.id}`);
  
  client.on('join', (userId) => {
    client.join(userId);
    console.log(`👤 Client ${client.id} joined room for user: ${userId}`);
  });

  client.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${client.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`\n🌟 Mirae Backend is listening on port ${PORT}`);
  console.log(`🔗 Health check available at http://localhost:${PORT}/health`);
  
  // Start server-side cron jobs
  reminderService.init();
});
