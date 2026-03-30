# ReceiptSense — AI Grocery Receipt Analyzer

A full-stack MERN application with a Python FastAPI ML microservice for
automatic receipt parsing using the Donut OCR model.

---

## Architecture

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

## Quick Start

### 1. MongoDB

Make sure MongoDB is running locally or set `MONGO_URI` in `server/.env`.

```
server/.env:
  MONGO_URI=mongodb://localhost:27017/receipt-sense
  JWT_SECRET=your_secret_here
  ML_SERVICE_URL=http://localhost:8000   # optional, this is the default
```

### 2. ML Service (Python)

```bash
cd ml-model
chmod +x start.sh
./start.sh
```

> First run downloads the Donut model (~1.5 GB). Subsequent starts are instant.
>
> The service runs at **http://localhost:8000**. Health check: `GET /health`

### 3. Backend (Node.js)

```bash
cd server
npm install
npm run dev
```

> Runs at **http://localhost:5000**

### 4. Frontend (React)

```bash
cd client
npm install
npm run dev
```

> Opens at **http://localhost:5173**

---

## API Reference

### Existing routes (unchanged)

| Method | Endpoint                | Description           |
|--------|-------------------------|-----------------------|
| POST   | /api/auth/register      | Sign up               |
| POST   | /api/auth/login         | Log in                |
| POST   | /api/bills/upload       | Upload (mock data)    |
| GET    | /api/bills              | List user's bills     |
| GET    | /api/analytics          | Weekly/monthly totals |

### New routes (ML pipeline)

| Method | Endpoint                    | Description                            |
|--------|-----------------------------|----------------------------------------|
| POST   | /api/bills/upload-bill      | Upload → Donut ML → parse → save       |
| GET    | /api/analytics/extended     | Category, monthly, trend analytics     |

### ML Service

| Method | Endpoint         | Description                         |
|--------|------------------|-------------------------------------|
| GET    | /health          | Health check                        |
| POST   | /process         | Image → RAW Donut JSON              |

---

## ML Pipeline Details

### Donut Model Output (RAW — not modified by ML service)

```json
{
  "menu": [
    { "nm": "Full Cream Milk", "cnt": "2", "price": "SR 12.50" }
  ],
  "sub_total": { "subtotal_price": "SR 12.50" },
  "total": { "total_price": "SR 12.50" }
}
```

### After `server/utils/parser.js` (clean format stored in MongoDB)

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

---

## Fallback Behaviour

If the ML service is unreachable (503/502), the frontend automatically
falls back to the existing mock-data upload endpoint so the app remains
usable during development without the Python service running.

---

## New Files Added

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

## Category Classification

Rule-based keyword matching in `parser.js`:

| Category           | Keywords                                      |
|--------------------|-----------------------------------------------|
| dairy              | milk, cheese, butter, yogurt, cream, paneer   |
| grains             | rice, wheat, flour, bread, pasta, oat         |
| beverages          | tea, coffee, juice, water, soda               |
| fruits & vegetables| apple, banana, tomato, onion, potato          |
| meat & protein     | chicken, beef, fish, egg, prawn               |
| snacks             | biscuit, chips, chocolate, wafer              |
| household          | soap, shampoo, detergent, tissue              |
| oil & spices       | oil, salt, sugar, masala, turmeric            |
| others             | (fallback)                                    |
