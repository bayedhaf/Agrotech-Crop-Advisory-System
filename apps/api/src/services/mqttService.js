// src/services/mqttService.js
// Handles MQTT broker connection, data subscription, rolling history buffer, and command publishing.
"use strict";

const mqtt = require("mqtt");

// Broker settings from reference document
const BROKER_URL = "mqtt://broker.hivemq.com:1883";
const OPTIONS = {
  username: "Team8_User",
  password: "SecurePass123",
  clientId: `astu_agri_server_${Math.random().toString(16).slice(2, 8)}`,
  clean: true,
  reconnectPeriod: 5000, // Reconnect every 5 seconds if connection is lost
};

const DATA_TOPIC = "astu/agri/data";
const CONTROL_TOPIC = "astu/agri/control";

const MAX_HISTORY = 50;
const history = [];
let isConnected = false;
let client = null;
let serverStartTime = Math.floor(Date.now() / 1000);

/**
 * Rules engine to calculate agricultural recommendation strings
 */
function generateRecommendation(soilMoisture, temperature, humidity) {
  const recommendations = [];

  // Soil moisture analysis
  if (soilMoisture < 30) {
    recommendations.push("Soil moisture low (below 30%). Irrigation recommended.");
  } else if (soilMoisture <= 60) {
    recommendations.push("Soil moisture acceptable (30-60%). Monitor closely.");
  } else {
    recommendations.push("Soil moisture good (above 60%).");
  }

  // Temperature analysis
  if (temperature < 10) {
    recommendations.push("Low temperature (below 10°C). Risk of frost.");
  } else if (temperature > 35) {
    recommendations.push("High temperature (above 35°C). Ensure adequate watering.");
  }

  // Humidity analysis
  if (humidity > 85) {
    recommendations.push("High humidity (above 85%). Risk of fungal disease.");
  }

  return recommendations.join(" | ");
}

/**
 * Initialize MQTT Client connection and subscriptions
 */
function initialize() {
  console.log(`🔌 Connecting to HiveMQ MQTT Broker at ${BROKER_URL}...`);
  
  client = mqtt.connect(BROKER_URL, OPTIONS);

  client.on("connect", () => {
    isConnected = true;
    console.log("🟢 Connected to MQTT Broker successfully.");
    
    client.subscribe(DATA_TOPIC, { qos: 1 }, (err) => {
      if (err) {
        console.error(`❌ Failed to subscribe to topic ${DATA_TOPIC}:`, err.message);
      } else {
        console.log(`📡 Subscribed to topic: ${DATA_TOPIC}`);
      }
    });
  });

  client.on("message", (topic, message) => {
    if (topic === DATA_TOPIC) {
      try {
        const payload = JSON.parse(message.toString());
        
        // Extract and normalize fields to handle any minor format variations
        const soilMoisture = Number(payload.soil_moisture !== undefined ? payload.soil_moisture : payload.soilMoisture);
        const temperature = Number(payload.temperature !== undefined ? payload.temperature : payload.temp);
        const humidity = Number(payload.humidity !== undefined ? payload.humidity : payload.hum);
        const light = Number(payload.light !== undefined ? payload.light : payload.lightIntensity);
        const pumpStatus = Number(payload.pump_status !== undefined ? payload.pump_status : payload.pumpStatus);

        if (isNaN(soilMoisture) || isNaN(temperature) || isNaN(humidity)) {
          console.warn("⚠️ Received invalid or incomplete sensor reading:", payload);
          return;
        }

        const recommendation = generateRecommendation(soilMoisture, temperature, humidity);
        
        const sensorReading = {
          soil_moisture: soilMoisture,
          temperature: parseFloat(temperature.toFixed(1)),
          humidity: humidity,
          light: isNaN(light) ? null : light,
          pump_status: isNaN(pumpStatus) ? 0 : (pumpStatus > 0 ? 1 : 0),
          recommendation: recommendation,
          timestamp: new Date().toISOString()
        };

        // Add to rolling history (oldest first, newest last)
        history.push(sensorReading);
        if (history.length > MAX_HISTORY) {
          history.shift(); // Remove oldest
        }

        console.log(`📥 Processed Sensor Reading: Soil Moisture: ${soilMoisture}%, Temp: ${temperature}°C, Pump Status: ${sensorReading.pump_status}`);

      } catch (err) {
        console.error("❌ Failed to parse incoming MQTT message:", err.message);
      }
    }
  });

  client.on("close", () => {
    if (isConnected) {
      isConnected = false;
      console.warn("🔴 Connection to MQTT Broker closed.");
    }
  });

  client.on("error", (err) => {
    console.error("❌ MQTT Connection Error:", err.message);
  });
}

/**
 * Get the latest sensor reading
 */
function getLatestReading() {
  if (history.length === 0) {
    return null;
  }
  return history[history.length - 1];
}

/**
 * Get all readings in the rolling history buffer
 */
function getHistory() {
  return history;
}

/**
 * Publish pump control state (ON or OFF)
 */
function setPumpState(state) {
  if (!client || !isConnected) {
    throw new Error("MQTT broker is disconnected. Cannot publish command.");
  }
  
  const payload = state.toUpperCase() === "ON" ? "ON" : "OFF";
  console.log(`📤 Publishing pump command to topic ${CONTROL_TOPIC}: ${payload}`);
  
  client.publish(CONTROL_TOPIC, payload, { qos: 1, retain: false });
}

/**
 * Get MQTT status, server uptime, etc.
 */
function getStatus() {
  const currentUptime = Math.floor(Date.now() / 1000) - serverStartTime;
  return {
    success: true,
    server: "Smart Agriculture API",
    mqtt: isConnected ? "connected" : "disconnected",
    uptime_sec: currentUptime,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  initialize,
  getLatestReading,
  getHistory,
  setPumpState,
  getStatus,
};
