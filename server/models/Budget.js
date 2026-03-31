/**
 * server/models/Budget.js
 * Stores per-user, per-category monthly budget limits.
 * One document per user per category — upserted on save.
 */

const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
    {
        userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        category: { type: String, required: true },   // e.g. "dairy", "grains"
        limit:    { type: Number, required: true, min: 0 }, // monthly spend cap in ₹
        month:    { type: String, required: true },   // "YYYY-MM" — budget applies to this month
    },
    { timestamps: true }
);

// One budget entry per user + category + month
budgetSchema.index({ userId: 1, category: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
