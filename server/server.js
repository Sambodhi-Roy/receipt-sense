require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const billRoutes = require('./routes/bills');
const analyticsRoutes = require('./routes/analytics');
const uploadBillRoute = require('./routes/upload-bill'); // NEW

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes (existing — unchanged)
app.use('/api/auth', authRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/analytics', analyticsRoutes);

// NEW: ML-powered upload route
app.use('/api/bills/upload-bill', uploadBillRoute);

// Health check
app.get('/', (_req, res) => res.json({ status: 'ok' }));

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err.message);
        process.exit(1);
    });
