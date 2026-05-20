// src/services/aiService.js
// Roboflow-based crop disease diagnosis service
"use strict";

const roboflowService = require("./roboflowService");

/**
 * Analyze a crop leaf image using the Roboflow Inference API.
 *
 * @param {string} base64Image  - Base64-encoded image data.
 * @param {string} [mediaType]  - MIME type. Defaults to "image/jpeg".
 * @param {string} [cropType]   - Optional crop type hint.
 * @returns {Promise<Object>} Structured diagnosis JSON
 */
async function analyzeImage(base64Image, mediaType = "image/jpeg", cropType = null) {
  if (!base64Image) {
    throw new Error("base64Image is required");
  }

  const apiKey = process.env.ROBOFLOW_API_KEY;
  if (!apiKey) {
    throw new Error("ROBOFLOW_API_KEY environment variable is not configured. Please add it to your .env file.");
  }

  const imageBuffer = Buffer.from(base64Image, "base64");
  return await roboflowService.predictImage(imageBuffer, mediaType);
}

module.exports = { analyzeImage };
