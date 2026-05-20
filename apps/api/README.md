# 🚀 Smart Agriculture API (Node.js + Express)

Production-grade REST API for real-time IoT sensor data, AI-powered disease diagnosis, and hardware integrations.

**Lead:** Bayisa and Beka

---

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Environment Setup](#environment-setup)
- [API Endpoints](#api-endpoints)
- [MQTT Integration (Hardware)](#mqtt-integration-hardware)
- [Database Schema](#database-schema)
- [Development Guide](#development-guide)
- [Deployment](#deployment)

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm/pnpm installed
- Firebase Admin SDK service account key (Optional for local MVP)
- Roboflow API key

### Installation

```bash
# From root of monorepo
cd apps/api

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Fill in your credentials:
# - ROBOFLOW_API_KEY
# - ROBOFLOW_MODEL_ID
# - (Optional) Firebase Credentials

# Run development server
npm run start
```

Server runs on `http://localhost:3000`

**Verify setup:**

```bash
curl http://localhost:3000/api/status
# Response: { "success": true, "mqtt": "connected", "uptime_sec": 123, ... }
```

---

## Architecture Overview

### Layered Architecture

```
Routes (Define endpoints)
   ↓
Controllers (Handle HTTP request/response)
   ↓
Services (Business logic, MQTT, AI orchestration)
   ↓
External APIs (Roboflow, HiveMQ) / Firebase Database
```

### Key Design Principles

- **Separation of Concerns:** Each layer has a single responsibility.
- **Fail-Safe IoT:** Integrated with a public MQTT broker (HiveMQ) with an in-memory fallback buffer of the last 50 readings.
- **Cost-Effective MVP:** Uses deterministic rule-based algorithms for sensor analysis to avoid expensive LLM API calls.
- **Environment-Based Config:** No secrets in code; use `.env`.
- **Local Dev Friendly:** Graceful mock fallbacks if Firebase credentials are missing.

---

## Project Structure

```
apps/api/
├── src/
│   ├── index.js                     ← Server entry point
│   ├── app.js                       ← Express app setup & middleware
│   │
│   ├── confi/
│   │   └── firebase.js              ← Firebase Admin SDK initialization
│   │
│   ├── routes/                      ← Route definitions
│   │   ├── mqtt.routes.js           ← Hardware/Mobile /api endpoints
│   │   ├── diagnose.routes.js       ← /diagnose endpoints
│   │   └── sensor-analysis.routes.js← /sensor-analysis endpoints
│   │
│   ├── controllers/                 ← Request handlers
│   │   ├── mqttController.js        ← Pump & telemetry handler
│   │   ├── diagnose.controller.js   ← Image diagnosis submission
│   │   └── sensor-analysis.controller.js
│   │
│   ├── services/                    ← Business logic
│   │   ├── mqttService.js           ← HiveMQ broker & rules engine
│   │   ├── diagnose.service.js      ← Orchestrate AI + storage
│   │   ├── roboflowService.js       ← Roboflow Vision API wrapper
│   │   └── sensor-analysis.service.js ← Rule engine (irrigation/fertilizer logic)
│   │
│   └── middleware/
│       ├── auth.middleware.js       ← JWT / Firebase token verification
│       └── upload.middleware.js     ← Multer file handling
│
├── .env.example
├── .env                             ← Gitignored secrets
└── package.json
```

---

## Technology Stack

| Category           | Tech                 | Purpose                      |
| ------------------ | -------------------- | ---------------------------- |
| **Runtime**        | Node.js 18+          | Server runtime               |
| **Framework**      | Express.js           | HTTP server & routing        |
| **Database**       | Firebase Realtime DB | Data storage (Optional dev)  |
| **File Storage**   | Firebase Storage     | Image uploads                |
| **Hardware Sync**  | MQTT (mqtt.js)       | Sub/Pub with ESP32 (HiveMQ)  |
| **AI Integration** | Roboflow API         | Disease diagnosis via vision |
| **File Upload**    | Multer               | Image handling               |
| **Rate Limiting**  | express-rate-limit   | API protection               |

---

## Environment Setup

### Create `.env` File

```bash
cp .env.example .env
```

### Required Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Firebase Admin SDK (Leave blank for Mock mode)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc@project.iam.gserviceaccount.com

# AI / Vision Integration
ROBOFLOW_API_KEY=your-roboflow-api-key
ROBOFLOW_MODEL_ID=plant-disease-finder-1r3nk/3

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

---

## API Endpoints

### 1. Hardware & Mobile Telemetry (`/api`)

| Method | Endpoint        | Auth | Description |
|--------|----------------|------|-------------|
| `GET`  | `/api/status`   | None | Server health and MQTT connection status |
| `GET`  | `/api/latest`   | None | Get the newest sensor reading and rule advisory |
| `GET`  | `/api/history`  | None | Array of the last 50 recorded readings |
| `POST` | `/api/pump`     | None | Send `{ "state": "ON" | "OFF" }` to physical pump |

### 2. Disease Diagnosis (`/api/v1/diagnose`)

| Method | Endpoint            | Auth       | Description |
|--------|---------------------|------------|-------------|
| `POST` | `/diagnose`         | Bearer JWT | Submit leaf image for Roboflow AI diagnosis |
| `GET`  | `/diagnose/history` | Bearer JWT | Get farmer's diagnosis history |
| `GET`  | `/diagnose/:id`     | Bearer JWT | Get single diagnosis result |
| `DELETE`| `/diagnose/:id`    | Bearer JWT | Delete a diagnosis |

### 3. Sensor Analysis (`/api/v1/sensor-analysis`)

| Method | Endpoint            | Auth       | Description |
|--------|---------------------|------------|-------------|
| `POST` | `/sensor-analysis`  | Bearer JWT | Run deterministic crop rules on provided sensor data |

---

## MQTT Integration (Hardware)

The backend natively connects to a public MQTT broker to synchronize with the ECE team's ESP32 microcontrollers.

* **Broker URL:** `broker.hivemq.com` (Port `1883`)
* **Credentials:** `Team8_User` / `SecurePass123`
* **Telemetry Topic:** `astu/agri/data` (Backend subscribes here to catch live ESP32 readings).
* **Control Topic:** `astu/agri/control` (Backend publishes `ON`/`OFF` payloads here when triggered by the Mobile App).

---

## Development Guide

### Running the API locally

```bash
# Start the server (connects to HiveMQ automatically)
npm run start
```

### Authentication Mock Mode
If `serviceAccountKey.json` or Firebase Environment variables are not found, the backend will gracefully bypass Firebase Authentication (`auth.middleware.js`) and assign a mock user session. This ensures UI/UX Mobile developers can test the REST APIs immediately without managing live databases.

---

## Deployment

1. **Host Configuration:** Expose port `3000`.
2. **Environment Variables:** Provide valid `ROBOFLOW_API_KEY` and Firebase credentials.
3. **Network Allowlisting:** Ensure the host platform permits outbound TCP traffic on port `1883` to communicate with `broker.hivemq.com`.

---

**Questions?** Contact the SE / CSE Team.
