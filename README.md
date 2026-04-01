# ReceiptSense — AI Grocery Receipt Analyzer

ReceiptSense is a full-stack **MERN** application with a **Python FastAPI** ML microservice that automatically parses grocery receipts (images) using the **Donut OCR** model, then turns them into structured data you can analyze (categories, monthly trends, insights, budgeting).

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Repository Structure](#repository-structure)
- [Quick Start (Local Development)](#quick-start-local-development)
  - [Prerequisites](#prerequisites)
  - [1) Configure Environment Variables](#1-configure-environment-variables)
  - [2) Start MongoDB](#2-start-mongodb)
  - [3) Start the ML Service (FastAPI)](#3-start-the-ml-service-fastapi)
  - [4) Start the Backend (Node/Express)](#4-start-the-backend-nodeexpress)
  - [5) Start the Frontend (React/Vite)](#5-start-the-frontend-reactvite)
- [API Reference](#api-reference)
  - [Backend (Express)](#backend-express)
  - [ML Service (FastAPI)](#ml-service-fastapi)
- [ML Pipeline Details](#ml-pipeline-details)
  - [RAW Donut Output](#raw-donut-output)
  - [Parsed/Cleaned Output](#parsedcleaned-output)
  - [Category Classification](#category-classification)
- [Fallback Behavior](#fallback-behavior)
- [Troubleshooting](#troubleshooting)
- [Contributors](#contributors)

---

## Features

- **Receipt upload** (image) with an ML-powered extraction pipeline
- **OCR + structured parsing** using the Donut model
- Stores both:
  - **RAW** Donut JSON output (unaltered), and
  - a **cleaned/normalized** receipt representation (items, totals, date)
- **Analytics dashboard**:
  - category breakdown (pie/donut chart)
  - monthly trends (bar chart)
  - spending summaries & “insights”
- **Auth** (register/login) and user-scoped data
- **Budget planning API** (backend route exists and is mounted)

---

## Tech Stack

### Frontend
- React (Vite)
- axios
- react-router-dom
- Tailwind (via Vite plugin)

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT auth
- Multer (uploads)
- node-fetch (ML service calls)

### ML Microservice
- Python + FastAPI + Uvicorn
- Donut OCR model via Hugging Face ecosystem (transformers, torch)
- Pillow for image preprocessing

---

## System Architecture

```
Receipt Image
      │
      ▼
┌─────────────────────────────────────────┐
│  FastAPI ML Service  (ml-model/)        │
│  • Preprocess image                     │
│  • Run Donut inference                  │
│  • Return RAW JSON (unchanged format)   │
└──────────────────┬──────────────────────┘
                   │ POST http://localhost:8000/process
                   ▼
┌─────────────────────────────────────────┐
│  Node.js / Express Backend (server/)    │
│  • Receive RAW JSON                     │
│  • utils/parser.js → clean format       │
│  • Store in MongoDB (raw + parsed)      │
│  • /api/analytics/extended              │
└──────────────────┬──────────────────────┘
                   │ REST API
                   ▼
┌─────────────────────────────────────────┐
│  React Frontend  (client/)              │
│  • Upload modal with drag & drop        │
│  • Receipt item result view             │
│  • Category pie chart                   │
│  • Monthly trend bar chart              │
│  • AI spending insights                 │
└─────────────────────────────────────────┘
```

---

## Repository Structure

```
receipt-sense/
├── client/                 # React + Vite frontend
├── server/                 # Node + Express API
└── ml-model/               # FastAPI ML microservice (Donut OCR)
```

Notable files mentioned in the codebase:

```
ml-model/
├── app.py            FastAPI entry point
├── model.py          Donut model loader + inference
├── preprocess.py     Image preprocessing
├── requirements.txt  Python dependencies
└── start.sh          One-command startup script

server/
├── routes/upload-bill.js    ML-powered upload route
├── utils/parser.js          RAW → clean post-processing
└── models/Bill.js           Extended schema (additive)

client/src/
├── components/ReceiptResult.jsx      Extracted items display
├── components/CategoryPieChart.jsx   SVG donut chart
├── components/MonthlyTrendChart.jsx  SVG bar chart
└── components/InsightsSection.jsx    AI insights cards
```

---

## Quick Start (Local Development)

### Prerequisites

- Node.js (recommended: LTS)
- Python 3 (with `venv`)
- MongoDB running locally **or** a MongoDB connection string
- Disk space / bandwidth for the Donut model download (first run is large)

---

### 1) Configure Environment Variables

Create a file at `server/.env`:

```bash
MONGO_URI=mongodb://localhost:27017/receipt-sense
JWT_SECRET=your_secret_here
ML_SERVICE_URL=http://localhost:8000
PORT=5000
```

Notes:
- `ML_SERVICE_URL` is optional if your backend defaults to `http://localhost:8000`.
- `PORT` is optional (defaults to `5000` in the backend).

---

### 2) Start MongoDB

Make sure MongoDB is running locally, or point `MONGO_URI` to your hosted instance.

---

### 3) Start the ML Service (FastAPI)

From the repository root:

```bash
cd ml-model
chmod +x start.sh
./start.sh
```

- Runs at: `http://localhost:8000`
- Health check: `GET http://localhost:8000/health`
- First run downloads the Donut model (large). Subsequent starts are much faster.

---

### 4) Start the Backend (Node/Express)

In a new terminal:

```bash
cd server
npm install
npm run dev
```

- Backend runs at: `http://localhost:5000`
- Health check: `GET http://localhost:5000/` → `{ "status": "ok" }`

---

### 5) Start the Frontend (React/Vite)

In a new terminal:

```bash
cd client
npm install
npm run dev
```

- Frontend dev server opens at: `http://localhost:5173`

---

## API Reference

### Backend (Express)

**Existing routes (auth, bills, analytics):**

| Method | Endpoint                | Description           |
|--------|-------------------------|-----------------------|
| POST   | /api/auth/register      | Sign up               |
| POST   | /api/auth/login         | Log in                |
| POST   | /api/bills/upload       | Upload (mock data)    |
| GET    | /api/bills              | List user's bills     |
| GET    | /api/analytics          | Weekly/monthly totals |

**ML pipeline routes:**

| Method | Endpoint                    | Description                            |
|--------|-----------------------------|----------------------------------------|
| POST   | /api/bills/upload-bill      | Upload → Donut ML → parse → save       |
| GET    | /api/analytics/extended     | Category, monthly, trend analytics     |

**Budget routes (mounted):**
- Mounted at: `/api/budget` (see `server/server.js`)

---

### ML Service (FastAPI)

| Method | Endpoint   | Description            |
|--------|------------|------------------------|
| GET    | /health    | Health check           |
| POST   | /process   | Image → RAW Donut JSON |

---

## ML Pipeline Details

### RAW Donut Output

The ML service returns Donut output **as-is** (raw format), e.g.:

```json
{
  "menu": [
    { "nm": "Full Cream Milk", "cnt": "2", "price": "SR 12.50" }
  ],
  "sub_total": { "subtotal_price": "SR 12.50" },
  "total": { "total_price": "SR 12.50" }
}
```

### Parsed/Cleaned Output

The backend normalizes the RAW JSON into a cleaner structure (via `server/utils/parser.js`) before storing it in MongoDB:

```json
{
  "store_name": "",
  "date": "2024-03-15",
  "total_amount": 12.50,
  "items": [
    { "name": "full cream milk", "quantity": 2, "price": 12.50, "category": "dairy" }
  ]
}
```

### Category Classification

Category assignment is rule-based keyword matching in `parser.js`:

| Category            | Keywords                                      |
|---------------------|-----------------------------------------------|
| dairy               | milk, cheese, butter, yogurt, cream, paneer   |
| grains              | rice, wheat, flour, bread, pasta, oat         |
| beverages           | tea, coffee, juice, water, soda               |
| fruits & vegetables | apple, banana, tomato, onion, potato          |
| meat & protein      | chicken, beef, fish, egg, prawn               |
| snacks              | biscuit, chips, chocolate, wafer              |
| household           | soap, shampoo, detergent, tissue              |
| oil & spices        | oil, salt, sugar, masala, turmeric            |
| others              | (fallback)                                    |

---

## Fallback Behavior

If the ML service is unreachable (e.g., 502/503), the frontend falls back to the existing **mock-data upload** endpoint so development can continue even without the Python service running.

---

## Troubleshooting

### MongoDB connection errors
- Ensure MongoDB is running.
- Verify `server/.env` has a valid `MONGO_URI`.
- Check backend logs for: `MongoDB connection error: ...`

### ML service is slow on first run
- The first run downloads a large model. Let it complete and try again.
- After the initial download, restarts should be much faster.

### Upload route not working
- Confirm the ML service is running at `ML_SERVICE_URL` (default `http://localhost:8000`).
- Test `GET /health` on the ML service.
- Ensure the backend is running and mounted routes include:
  - `/api/bills/upload-bill` (ML upload)
  - `/api/bills/upload` (fallback/mock)

---

## Contributors
👥 Contributors:

- **Sambodhi Roy**  
  🔗 https://github.com/Sambodhi-Roy  

- **Arpit Singh**  
  🔗 https://github.com/scarwizz  
