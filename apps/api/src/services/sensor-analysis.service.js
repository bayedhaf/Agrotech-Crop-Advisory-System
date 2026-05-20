// src/services/sensor-analysis.service.js
// Rule-based, free sensor data analysis for farming recommendations (replaces expensive Claude calls)
"use strict";

/**
 * Typical ideal ranges per supported crop type.
 */
const CROP_RANGES = {
  maize:   { tempMin: 18, tempMax: 32, humidityMin: 50, humidityMax: 80, soilMoistureMin: 40, soilMoistureMax: 70 },
  tomato:  { tempMin: 18, tempMax: 29, humidityMin: 60, humidityMax: 80, soilMoistureMin: 50, soilMoistureMax: 75 },
  teff:    { tempMin: 10, tempMax: 27, humidityMin: 40, humidityMax: 70, soilMoistureMin: 30, soilMoistureMax: 60 },
  wheat:   { tempMin: 12, tempMax: 25, humidityMin: 40, humidityMax: 70, soilMoistureMin: 40, soilMoistureMax: 65 },
  sorghum: { tempMin: 20, tempMax: 35, humidityMin: 40, humidityMax: 75, soilMoistureMin: 30, soilMoistureMax: 65 },
  barley:  { tempMin: 10, tempMax: 25, humidityMin: 45, humidityMax: 70, soilMoistureMin: 35, soilMoistureMax: 60 },
};

/**
 * Build the prompt (kept for backward compatibility and testing)
 */
function buildSensorAnalysisPrompt({ temperature, humidity, soilMoisture, cropType }) {
  const crop = cropType?.toLowerCase();
  const ranges = CROP_RANGES[crop] || null;

  const rangeInfo = ranges
    ? `\nIdeal ranges for ${cropType}: temperature ${ranges.tempMin}–${ranges.tempMax}°C, ` +
      `humidity ${ranges.humidityMin}–${ranges.humidityMax}%, ` +
      `soil moisture ${ranges.soilMoistureMin}–${ranges.soilMoistureMax}%.`
    : "";

  return (
    `Analyze the following farm sensor readings and provide agricultural recommendations.\n\n` +
    `Sensor Readings:\n` +
    `- Temperature: ${temperature}°C\n` +
    `- Humidity: ${humidity}%\n` +
    `- Soil Moisture: ${soilMoisture}%\n` +
    `- Crop Type: ${cropType || "unknown"}` +
    rangeInfo +
    `\n\nReturn a JSON response with your analysis and recommendations.`
  );
}

/**
 * Validate response schema (kept for testing)
 */
function parseSensorAnalysisResponse(rawText) {
  let parsed = JSON.parse(rawText.trim());
  const requiredFields = ["status", "summary", "recommendations", "alerts", "irrigationAdvice", "fertilizerAdvice"];
  const missing = requiredFields.filter((f) => !(f in parsed));
  if (missing.length > 0) {
    throw new Error(`Claude response missing required fields: ${missing.join(", ")}`);
  }
  return parsed;
}

/**
 * Analyze farm sensor readings using localized rules.
 * Does not make external LLM calls. Fully free.
 */
async function analyzeSensorData(reading) {
  if (!reading || typeof reading !== "object") {
    throw new Error("reading is required");
  }

  const { temperature, humidity, soilMoisture, cropType } = reading;

  if (temperature == null || humidity == null || soilMoisture == null) {
    throw new Error("temperature, humidity, and soilMoisture are required");
  }

  const crop = cropType?.toLowerCase() || "maize";
  const range = CROP_RANGES[crop] || {
    tempMin: 15,
    tempMax: 30,
    humidityMin: 50,
    humidityMax: 80,
    soilMoistureMin: 40,
    soilMoistureMax: 70
  };

  const alerts = [];
  const recommendations = [];
  let status = "optimal";

  // Soil moisture rules
  if (soilMoisture < range.soilMoistureMin) {
    const isCritical = (range.soilMoistureMin - soilMoisture) > 15;
    status = isCritical ? "critical" : (status !== "critical" ? "warning" : "critical");
    alerts.push({
      type: "low_soil_moisture",
      message: `Soil moisture (${soilMoisture}%) is below the ideal minimum of ${range.soilMoistureMin}% for ${crop}.`,
      severity: isCritical ? "high" : "medium"
    });
    recommendations.push("Initiate irrigation cycle immediately to replenish soil water reserves.");
  } else if (soilMoisture > range.soilMoistureMax) {
    const isCritical = (soilMoisture - range.soilMoistureMax) > 15;
    status = isCritical ? "critical" : (status !== "critical" ? "warning" : "critical");
    alerts.push({
      type: "high_soil_moisture",
      message: `Soil moisture (${soilMoisture}%) exceeds the ideal maximum of ${range.soilMoistureMax}% for ${crop}.`,
      severity: isCritical ? "high" : "medium"
    });
    recommendations.push("Deactivate irrigation systems and inspect field drainage to avoid root hypoxia.");
  }

  // Temperature rules
  if (temperature < range.tempMin) {
    const isCritical = (range.tempMin - temperature) > 6;
    status = isCritical ? "critical" : (status !== "critical" ? "warning" : "critical");
    alerts.push({
      type: "low_temperature",
      message: `Temperature (${temperature}°C) is below the crop minimum of ${range.tempMin}°C. Risk of slow growth.`,
      severity: isCritical ? "high" : "medium"
    });
    recommendations.push("Consider physical crop covers or thermal insulation to mitigate frost hazards.");
  } else if (temperature > range.tempMax) {
    const isCritical = (temperature - range.tempMax) > 6;
    status = isCritical ? "critical" : (status !== "critical" ? "warning" : "critical");
    alerts.push({
      type: "high_temperature",
      message: `Temperature (${temperature}°C) exceeds the crop maximum of ${range.tempMax}°C. Stress danger.`,
      severity: isCritical ? "high" : "medium"
    });
    recommendations.push("Increase irrigation frequency slightly to assist crop transpiration cooling.");
  }

  // Humidity rules
  if (humidity < range.humidityMin) {
    if (status !== "critical") status = "warning";
    alerts.push({
      type: "low_humidity",
      message: `Relative humidity (${humidity}%) is dry. Ideal minimum is ${range.humidityMin}%.`,
      severity: "low"
    });
    recommendations.push("Ensure soil moisture is maintained to support transpiration.");
  } else if (humidity > range.humidityMax) {
    const isHighRisk = humidity > 85;
    status = isHighRisk ? "critical" : (status !== "critical" ? "warning" : "critical");
    alerts.push({
      type: "high_humidity",
      message: `Relative humidity (${humidity}%) is high. Fungal pathogens spread easily in these conditions.`,
      severity: isHighRisk ? "high" : "medium"
    });
    recommendations.push("Prune excess crop foliage to encourage proper ventilation. Apply proactive organic fungicides if necessary.");
  }

  // Fallbacks if conditions are perfect
  if (status === "optimal") {
    recommendations.push("Continue regular crop monitoring and keep to your standard crop care schedule.");
    recommendations.push("No interventions required at this time.");
  }

  // Formulate summary
  const summary = status === "optimal"
    ? `All microclimate parameters are ideal for ${cropType || "crops"}. Farm health is excellent.`
    : `Some parameters are outside optimal limits for ${cropType || "crops"}. Care recommendations have been compiled.`;

  const irrigationAdvice = soilMoisture < range.soilMoistureMin
    ? "Irrigation recommended immediately to restore soil water balance."
    : soilMoisture > range.soilMoistureMax
      ? "Turn off all irrigation nodes. Monitor drainage."
      : "Soil moisture is adequate. No irrigation adjustments needed.";

  const fertilizerAdvice = status === "optimal"
    ? "Apply scheduled seasonal fertilizer. Nutrient uptake is currently optimal."
    : "Hold off on fertilizer application if soil is extremely dry or saturated; stabilize soil moisture first.";

  return {
    status,
    summary,
    recommendations,
    alerts,
    irrigationAdvice,
    fertilizerAdvice
  };
}

module.exports = { analyzeSensorData, buildSensorAnalysisPrompt, parseSensorAnalysisResponse };
