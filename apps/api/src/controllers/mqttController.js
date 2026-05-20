// src/controllers/mqttController.js
// Handles Express routing logic for Mobile App REST API endpoints
"use strict";

const mqttService = require("../services/mqttService");

/**
 * GET /api/latest
 * Returns the most recent sensor reading.
 * If no reading has been received from MQTT yet, it returns a default mockup reading to prevent app crashes.
 */
function getLatest(req, res) {
  let latest = mqttService.getLatestReading();
  
  if (!latest) {
    // Return a realistic placeholder/fallback reading if the ESP32 has not published yet.
    latest = {
      soil_moisture: 45,
      temperature: 22.5,
      humidity: 65,
      light: 1500,
      pump_status: 0,
      recommendation: "Soil moisture acceptable (30-60%). Monitor closely.",
      timestamp: new Date().toISOString(),
      is_fallback: true // Flag to indicate it's a simulated initial value
    };
  }

  return res.status(200).json({
    success: true,
    data: latest
  });
}

/**
 * GET /api/history
 * Returns the rolling array of the last 50 readings.
 */
function getHistory(req, res) {
  const history = mqttService.getHistory();
  return res.status(200).json({
    success: true,
    count: history.length,
    data: history
  });
}

/**
 * POST /api/pump
 * Sends a pump control command (ON/OFF) via MQTT.
 */
function controlPump(req, res) {
  const { state } = req.body;

  if (state !== "ON" && state !== "OFF") {
    return res.status(400).json({
      success: false,
      error: 'state must be "ON" or "OFF"'
    });
  }

  try {
    mqttService.setPumpState(state);
    return res.status(200).json({
      success: true,
      message: `Pump turned ${state}`
    });
  } catch (err) {
    console.error("[controlPump] Error publishing command:", err.message);
    return res.status(503).json({
      success: false,
      error: `Could not send command to pump: ${err.message}`
    });
  }
}

/**
 * GET /api/status
 * Returns health status, MQTT connection, and uptime.
 */
function getStatus(req, res) {
  const status = mqttService.getStatus();
  return res.status(200).json(status);
}

module.exports = {
  getLatest,
  getHistory,
  controlPump,
  getStatus
};
