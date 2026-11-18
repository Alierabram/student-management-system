require("dotenv").config();
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const auditRoutes = require("./routes/auditRoutes");
const { seedDatabase } = require("./scripts/seed");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bugemadesk";

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

// Serve login page at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", async (req, res) => {
  const state = mongoose.connection.readyState;
  if (state !== 1) {
    return res.status(503).json({ error: "The application cannot reach MongoDB.", readyState: state });
  }
  res.json({
    data: {
      ok: true,
      database: "bugemadesk",
      service: "BugemaDesk Student Management System"
    }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/audit-logs", auditRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint not found." });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof mongoose.Error.ValidationError) {
    const message = Object.values(err.errors)
      .map((item) => item.message)
      .join(" ");
    return res.status(400).json({ error: message || "Validation failed." });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: `Invalid value for ${err.path}.` });
  }

  if (err.code === 11000) {
    const key = Object.keys(err.keyValue || {})[0];
    if (key === "regNo") return res.status(409).json({ error: "A student with this registration number already exists." });
    if (key === "email") return res.status(409).json({ error: "A student with this email address already exists." });
    return res.status(409).json({ error: "A record with this unique value already exists." });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must contain valid JSON." });
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error. Check the server log for details." });
});

async function start() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log("Connected to MongoDB.");

  await seedDatabase();

  const server = app.listen(PORT, () => {
    console.log(`BugemaDesk running at http://localhost:${PORT}`);
    console.log(`Database: bugemadesk | Collections: users, students, audit_logs`);
    if (process.env.NODE_ENV !== "production") {
      console.log("Local demo accounts are documented in README.md.");
    }
  });

  const shutdown = (signal) => {
    console.log(`${signal} received; closing the application.`);
    server.close(() => {
      mongoose.connection.close(false).then(() => process.exit(0));
    });
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  return server;
}

if (require.main === module) {
  start().catch((err) => {
    console.error("Could not start BugemaDesk.");
    console.error("Make sure MongoDB is running and MONGODB_URI is correct.");
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { app, start };