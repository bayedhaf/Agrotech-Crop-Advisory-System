// index.js
// Server entry point
require("dotenv").config();
const app = require("./app");
const mqttService = require("./src/services/mqttService");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌱 Smart Agriculture API running on port ${PORT}`);
  console.log(`   Health check:     http://localhost:${PORT}/api/v1/health`);
  console.log(`   Diagnose:         http://localhost:${PORT}/api/v1/diagnose`);
  console.log(`   Sensor Analysis:  http://localhost:${PORT}/api/v1/sensor-analysis`);
  console.log(`   Latest Readings:  http://localhost:${PORT}/api/latest`);
  console.log(`   Status Endpoint:  http://localhost:${PORT}/api/status`);
  
  // Start MQTT broker listener
  mqttService.initialize();

  // Run Mock ESP32 Simulation so the dashboard has data
  console.log("   Mock ESP32:       Enabled (running in background)");
  require("./scripts/simulate_esp32");
});
