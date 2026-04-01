/**
 * server/models/Bill.js
 * EXTENDED (not replaced) — all original fields are untouched.
 * New fields are optional so existing documents remain valid.
 */

const mongoose = require('mongoose');

const billSchema = new mongoose.Schema(
    {
        // ── Original required fields (unchanged) ─────────────────────────────
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        vendor: { type: String, required: true },
        date: { type: Date, required: true },
        items: [
            {
                name: { type: String, required: true },
                price: { type: Number, required: true },
                // ── Extended item fields (optional) ──────────────────────────
                quantity: { type: Number, default: 1 },
                category: { type: String, default: 'others' },
            },
        ],
        total: { type: Number, required: true },
        category: { type: String, default: 'Groceries' },

        // ── Extended bill-level fields (optional, for ML pipeline) ───────────
        store_name:   { type: String, default: '' },
        total_amount: { type: Number, default: null },
        parsed_date:  { type: String, default: null },
        raw_data:     { type: mongoose.Schema.Types.Mixed, default: null },
    },
    { timestamps: true }
);

// Index for faster analytics queries
billSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Bill', billSchema);
