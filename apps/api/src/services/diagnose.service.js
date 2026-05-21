// services/diagnose.service.js
// Mock service: AI diagnosis via Roboflow (no database storage)
const { diagnoseCropDisease } = require("./ai.service");

/**
 * Creates a new diagnosis using Roboflow.
 */
async function createDiagnosis(userId, imageBuffer, mimeType, originalName, cropType) {
  // 1. Mock image URL
  const imageUrl = "https://storage.googleapis.com/mock-bucket/mock-leaf-image.jpg";

  // 2. Run AI diagnosis (utilizes Roboflow)
  const aiResult = await diagnoseCropDisease(imageBuffer, mimeType, cropType);

  // 3. Build mock diagnosis document
  const diagnosisData = {
    ...aiResult,
    imageUrl,
    userId,
    createdAt: new Date().toISOString(),
  };

  const diagnosisId = "mock-diag-" + Date.now();

  return { diagnosisId, ...diagnosisData };
}

/**
 * Retrieves mock history
 */
async function getDiagnosisHistory(userId) {
  return [
    {
      diagnosisId: "mock-diag-12345",
      isHealthy: false,
      disease: "Common Rust",
      confidence: 0.89,
      severity: "high",
      remedy: "Apply copper-based fungicides immediately. Remove and destroy severely affected leaves.",
      prevention: "Plant rust-resistant crop hybrids, practice crop rotation, and avoid overhead sprinkler watering.",
      description: "Detected symptoms of 'Common Rust' on the crop leaf (Confidence: 89.0%).",
      imageUrl: "https://storage.googleapis.com/mock-bucket/mock-leaf-image.jpg",
      userId,
      createdAt: new Date().toISOString()
    }
  ];
}

/**
 * Retrieves a single mock diagnosis
 */
async function getDiagnosisById(userId, diagnosisId) {
  return {
    diagnosisId,
    isHealthy: false,
    disease: "Common Rust",
    confidence: 0.89,
    severity: "high",
    remedy: "Apply copper-based fungicides immediately. Remove and destroy severely affected leaves.",
    prevention: "Plant rust-resistant crop hybrids, practice crop rotation, and avoid overhead sprinkler watering.",
    description: "Detected symptoms of 'Common Rust' on the crop leaf (Confidence: 89.0%).",
    imageUrl: "https://storage.googleapis.com/mock-bucket/mock-leaf-image.jpg",
    userId,
    createdAt: new Date().toISOString()
  };
}

/**
 * Mocks deleting a diagnosis
 */
async function deleteDiagnosis(userId, diagnosisId) {
  return true;
}

module.exports = {
  createDiagnosis,
  getDiagnosisHistory,
  getDiagnosisById,
  deleteDiagnosis,
};
