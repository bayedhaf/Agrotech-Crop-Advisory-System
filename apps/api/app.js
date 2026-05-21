// app.js
// Express application setup

const express = require("express");
const cors = require("cors");

const diagnoseRoutes = require("./src/routes/diagnose.routes");
const healthRoutes = require("./src/routes/health.routes");
const sensorAnalysisRoutes = require("./src/routes/sensor-analysis.routes");
const mqttRoutes = require("./src/routes/mqtt.routes");

const app = express();

app.use(
  cors({
    origin: "*", // Allow all origins for MVP testing to prevent Live Server or Next.js port conflicts
    credentials: false // Must be false when origin is "*"
  })
);

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/diagnose", diagnoseRoutes);
app.use("/api/v1/sensor-analysis", sensorAnalysisRoutes);
app.use("/api", mqttRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
});

// ─── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[Global Error]", err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: err.message || "An unexpected error occurred",
    },
  });
});

module.exports = app;
