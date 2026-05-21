// services/ai.service.js
// Roboflow API wrapper for crop disease diagnosis
"use strict";

const roboflowService = require("./roboflowService");

/**
 * Diagnoses crop diseases from a leaf image using Roboflow API.
 *
 * @param {Buffer} imageBuffer - Raw image data
 * @param {string} mimeType    - MIME type of the image (e.g. "image/jpeg")
 * @param {string} cropType    - Type of crop (e.g. "maize")
 * @returns {Promise<DiagnosisResult>}
 */
async function diagnoseCropDisease(imageBuffer, mimeType, cropType) {
  const apiKey = process.env.ROBOFLOW_API_KEY;
  if (!apiKey) {
    throw new Error("ROBOFLOW_API_KEY is not configured. Please add it to your .env file.");
  }

  return await roboflowService.predictImage(imageBuffer, mimeType);
}

module.exports = { diagnoseCropDisease };
