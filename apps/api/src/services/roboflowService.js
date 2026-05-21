// src/services/roboflowService.js
// Handles Roboflow Object Detection / Classification API integration for plant disease diagnosis
"use strict";

// Database mapping for common crop diseases
const DISEASE_DATABASE = {
  "rust": {
    disease: "Common Rust",
    remedy: "Apply copper-based fungicides immediately. Remove and destroy severely affected leaves.",
    prevention: "Plant rust-resistant crop hybrids, practice crop rotation, and avoid overhead sprinkler watering."
  },
  "leaf spot": {
    disease: "Leaf Spot Disease",
    remedy: "Apply appropriate triazole or chlorothalonil fungicides. Clear all fallen crop debris from the field.",
    prevention: "Ensure adequate plant spacing to facilitate airflow, and rotate crops annually."
  },
  "blight": {
    disease: "Blight Disease",
    remedy: "Apply copper-based or systemic fungicides early. Prune lower leaves to reduce soil splash infection.",
    prevention: "Practice crop rotation, plant certified disease-free seeds, and avoid watering late in the day."
  },
  "powdery mildew": {
    disease: "Powdery Mildew",
    remedy: "Apply sulfur-based fungicides, potassium bicarbonate, or organic neem oil.",
    prevention: "Grow plants in areas with full sun exposure and prune regularly to improve internal canopy aeration."
  },
  "mosaic": {
    disease: "Mosaic Virus",
    remedy: "No chemical cure exists for viral infections. Promptly remove and burn infected plants to prevent spread.",
    prevention: "Control aphid and insect vectors using insecticidal soaps. Plant virus-free certified stock."
  },
  "healthy": {
    disease: "Healthy Plant",
    remedy: "No treatment needed. Keep maintaining current crop care and nutrition practices.",
    prevention: "Continue regular weeding, balanced nitrogen fertilization, and routine monitoring."
  }
};

/**
 * Predict crop disease from an image buffer using Roboflow API
 * @param {Buffer} imageBuffer - Raw image data
 * @param {string} mimeType - Image MIME type (e.g. "image/jpeg")
 * @returns {Promise<object>} Structured diagnosis result
 */
async function predictImage(imageBuffer, mimeType) {
  const apiKey = process.env.ROBOFLOW_API_KEY;
  const modelId = process.env.ROBOFLOW_MODEL_ID || "plant-disease-finder-1r3nk/3";

  if (!apiKey) {
    throw new Error("ROBOFLOW_API_KEY is not configured in environment variables");
  }

  const url = `https://detect.roboflow.com/${modelId}?api_key=${apiKey}`;
  
  console.log(`🧠 Calling Roboflow Inference API for model: ${modelId}`);
  
  const base64Image = imageBuffer.toString("base64");
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: base64Image
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Roboflow Inference API failed (Status ${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return parseRoboflowResult(result);
}

/**
 * Parse and validate predictions array from Roboflow JSON response
 */
function parseRoboflowResult(result) {
  const predictions = result.predictions || [];

  if (predictions.length === 0) {
    return {
      isHealthy: true,
      disease: null,
      confidence: 1.0,
      severity: "none",
      remedy: DISEASE_DATABASE.healthy.remedy,
      prevention: DISEASE_DATABASE.healthy.prevention,
      description: "No plant disease symptoms or anomalies were detected on the leaf."
    };
  }

  // Retrieve the top prediction based on confidence score
  const topPrediction = predictions.reduce((prev, current) => 
    (prev.confidence > current.confidence) ? prev : current
  );

  const rawClass = topPrediction.class.toLowerCase();
  
  // Check if class indicates healthy
  const isHealthy = rawClass.includes("healthy") || rawClass === "normal" || rawClass === "healthy-leaf";
  
  let diseaseName = topPrediction.class;
  let remedy = DISEASE_DATABASE.healthy.remedy;
  let prevention = DISEASE_DATABASE.healthy.prevention;

  if (isHealthy) {
    diseaseName = "Healthy";
  } else {
    // Find matching database profile
    let matchedKey = Object.keys(DISEASE_DATABASE).find(key => rawClass.includes(key));
    if (matchedKey && matchedKey !== "healthy") {
      const dbMatch = DISEASE_DATABASE[matchedKey];
      diseaseName = dbMatch.disease;
      remedy = dbMatch.remedy;
      prevention = dbMatch.prevention;
    } else {
      // Format raw class name neatly (e.g. capitalize parts)
      diseaseName = topPrediction.class
        .split(/[-_ ]+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      remedy = "Consult a local agricultural extension officer or agronomist for targeted treatment options.";
      prevention = "Practice strict crop rotation, clear field residues, and maintain optimal soil health.";
    }
  }

  // Map severity based on confidence
  let severity = "low";
  if (topPrediction.confidence > 0.85) {
    severity = "high";
  } else if (topPrediction.confidence > 0.55) {
    severity = "medium";
  }

  const description = isHealthy 
    ? `The crop leaf appears to be healthy (Confidence: ${(topPrediction.confidence * 100).toFixed(1)}%).`
    : `Detected symptoms of '${diseaseName}' on the crop leaf (Confidence: ${(topPrediction.confidence * 100).toFixed(1)}%).`;

  return {
    isHealthy: isHealthy,
    disease: isHealthy ? null : diseaseName,
    confidence: parseFloat(topPrediction.confidence.toFixed(2)),
    severity: isHealthy ? "none" : severity,
    remedy: remedy,
    prevention: prevention,
    description: description
  };
}

module.exports = {
  predictImage
};
