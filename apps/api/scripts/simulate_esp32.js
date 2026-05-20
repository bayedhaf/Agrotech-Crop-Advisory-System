// scripts/simulate_esp32.js
// This script perfectly mocks the ECE team's Wokwi ESP32 simulation.
// It connects to the HiveMQ broker and publishes nested JSON data every 5 seconds.

const mqtt = require("mqtt");

const BROKER_URL = "mqtt://broker.hivemq.com:1883";
const OPTIONS = {
  username: "Team8_User",
  password: "SecurePass123",
  clientId: `mock_esp32_${Math.random().toString(16).slice(2, 8)}`,
  clean: true,
};

const DATA_TOPIC = "astu/agri/data";

console.log(`🚀 Starting Mock ESP32 Simulator...`);
console.log(`🔌 Connecting to ${BROKER_URL}...`);

const client = mqtt.connect(BROKER_URL, OPTIONS);

client.on("connect", () => {
  console.log("🟢 Mock ESP32 Connected to HiveMQ Broker!");
  console.log("📡 Beginning to publish simulated data every 5 seconds...\n");

  // Initial base values
  let soilMoisture = 45;
  let temperature = 25.0;
  let humidity = 60.0;
  let light = 1200;
  let pumpStatus = 0;

  setInterval(() => {
    // Add slight random variations to simulate real-world physics
    soilMoisture = Math.max(10, Math.min(100, soilMoisture + (Math.random() * 4 - 2)));
    temperature = Math.max(5, Math.min(45, temperature + (Math.random() * 2 - 1)));
    humidity = Math.max(20, Math.min(100, humidity + (Math.random() * 5 - 2.5)));
    light = Math.max(200, Math.min(3000, light + (Math.random() * 200 - 100)));

    // Auto pump logic (just like the Wokwi script)
    if (soilMoisture < 30) pumpStatus = 1;
    if (soilMoisture > 60) pumpStatus = 0;

    // Deeply nested JSON exactly matching the Wokwi C++ output
    const payload = {
      Soil_Moisture: { ID: 1, Val: Math.round(soilMoisture), Unit: "%" },
      Temperature: { ID: 2, Val: parseFloat(temperature.toFixed(1)), Unit: "C" },
      Humidity: { ID: 3, Val: parseFloat(humidity.toFixed(1)), Unit: "%" },
      Light: { ID: 4, Val: Math.round(light), Unit: "Lux" },
      Pump_Status: { ID: 5, Val: pumpStatus, Unit: "Bool" }
    };

    const jsonString = JSON.stringify(payload);
    
    console.log(`📤 Publishing to ${DATA_TOPIC}:`);
    console.log(`   Moisture: ${Math.round(soilMoisture)}% | Temp: ${temperature.toFixed(1)}°C | Humidity: ${humidity.toFixed(1)}%`);
    
    client.publish(DATA_TOPIC, jsonString, { qos: 1 });
  }, 5000); // 5000ms = 5 seconds
});

client.on("error", (err) => {
  console.error("❌ MQTT Error:", err.message);
});
