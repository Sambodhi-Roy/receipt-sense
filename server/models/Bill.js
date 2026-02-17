const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendor: { type: String, required: true },
    date: { type: Date, required: true },
    items: [
        {
            name: { type: String, required: true },
            price: { type: Number, required: true },
        },
    ],
    total: { type: Number, required: true },
    category: { type: String, default: 'Groceries' },
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);
