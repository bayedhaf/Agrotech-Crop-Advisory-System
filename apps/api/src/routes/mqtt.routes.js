// src/routes/mqtt.routes.js
// Route definitions for ECE hardware integration endpoints
"use strict";

const { Router } = require("express");
const { getLatest, getHistory, controlPump, getStatus } = require("../controllers/mqttController");

const router = Router();

// Endpoint definitions corresponding to the API Reference Document
router.get("/latest", getLatest);
router.get("/history", getHistory);
router.post("/pump", controlPump);
router.get("/status", getStatus);

module.exports = router;
