/**
 * server/routes/upload-bill.js
 *
 * NEW route: POST /api/bills/upload-bill
 * Pipeline: image → FastAPI Donut → RAW JSON → parser.js → MongoDB
 *
 * Does NOT modify the existing /api/bills/upload route.
 */

const router = require('express').Router();
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');
const auth = require('../middleware/auth');
const Bill = require('../models/Bill');
const { parseReceiptRaw } = require('../utils/parser');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Memory storage — we forward the image directly, no disk write needed
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are accepted'));
  },
});

/**
 * POST /api/bills/upload-bill
 * Expects: multipart/form-data with field "image"
 * Returns: saved Bill document
 */
router.post('/', auth, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Image file is required' });
  }

  // ── 1. Forward image to FastAPI ML service ────────────────────────────────
  let rawJson;
  try {
    const form = new FormData();
    form.append('image', req.file.buffer, {
      filename: req.file.originalname || 'receipt.jpg',
      contentType: req.file.mimetype,
    });

    const mlResponse = await fetch(`${ML_SERVICE_URL}/process`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });

    if (!mlResponse.ok) {
      const errText = await mlResponse.text();
      console.error('[upload-bill] ML service error:', errText);
      return res.status(502).json({ message: 'ML service error', detail: errText });
    }

    rawJson = await mlResponse.json();
  } catch (err) {
    console.error('[upload-bill] Failed to reach ML service:', err.message);
    return res.status(503).json({
      message: 'ML service unavailable. Is the FastAPI server running?',
      detail: err.message,
    });
  }

  // ── 2. Post-process RAW JSON ──────────────────────────────────────────────
  let parsed;
  try {
    parsed = parseReceiptRaw(rawJson);
  } catch (err) {
    console.error('[upload-bill] Parsing failed:', err.message);
    return res.status(422).json({ message: 'Failed to parse receipt data', detail: err.message });
  }

  // ── 3. Persist to MongoDB ─────────────────────────────────────────────────
  try {
    const bill = await Bill.create({
      userId: req.user.id,
      // Fields required by existing schema
      vendor: parsed.store_name || 'Unknown Store',
      date: parsed.date ? new Date(parsed.date) : new Date(),
      items: parsed.items.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        category: item.category,
      })),
      total: parsed.total_amount,
      category: 'Groceries',
      // Extended fields
      total_amount: parsed.total_amount,
      store_name: parsed.store_name,
      parsed_date: parsed.date,
      raw_data: rawJson,
    });

    return res.status(201).json(bill);
  } catch (err) {
    console.error('[upload-bill] DB save failed:', err.message);
    return res.status(500).json({ message: 'Failed to save bill', detail: err.message });
  }
});

module.exports = router;
