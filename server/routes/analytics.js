const router = require('express').Router();
const auth = require('../middleware/auth');
const Bill = require('../models/Bill');

// ─── Existing route (UNCHANGED) ───────────────────────────────────────────────
// GET /api/analytics
router.get('/', auth, async (req, res) => {
    try {
        const bills = await Bill.find({ userId: req.user.id });

        const now = new Date();

        // Start of current week (Monday)
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(now);
        weekStart.setHours(0, 0, 0, 0);
        weekStart.setDate(now.getDate() - diffToMonday);

        // Start of current month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        let weeklyTotal = 0;
        let monthlyTotal = 0;

        for (const bill of bills) {
            const billDate = new Date(bill.date);
            if (billDate >= monthStart) monthlyTotal += bill.total;
            if (billDate >= weekStart) weeklyTotal += bill.total;
        }

        res.json({
            weeklyTotal: parseFloat(weeklyTotal.toFixed(2)),
            monthlyTotal: parseFloat(monthlyTotal.toFixed(2)),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── NEW: Extended analytics ──────────────────────────────────────────────────

/**
 * GET /api/analytics/extended
 * Returns richer analytics built on top of the existing Bill collection.
 * New fields: monthlySpending, categorySpending, dailyTrends,
 *             avgBillValue, topCategories, totalBills, allTimeTotal
 */
router.get('/extended', auth, async (req, res) => {
    try {
        const bills = await Bill.find({ userId: req.user.id }).lean();

        if (bills.length === 0) {
            return res.json(emptyExtendedResponse());
        }

        // ── Monthly spending (last 6 months) ─────────────────────────────────
        const monthlyMap = {};
        for (const bill of bills) {
            const d = new Date(bill.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyMap[key] = (monthlyMap[key] || 0) + bill.total;
        }
        const monthlySpending = Object.entries(monthlyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6)
            .map(([month, amount]) => ({ month, amount: parseFloat(amount.toFixed(2)) }));

        // ── Category-wise spending ────────────────────────────────────────────
        const categoryMap = {};
        for (const bill of bills) {
            for (const item of bill.items || []) {
                const cat = item.category || 'others';
                categoryMap[cat] = (categoryMap[cat] || 0) + item.price * (item.quantity || 1);
            }
        }
        const categorySpending = Object.entries(categoryMap)
            .map(([category, amount]) => ({ category, amount: parseFloat(amount.toFixed(2)) }))
            .sort((a, b) => b.amount - a.amount);

        // ── Daily trends (last 14 days) ───────────────────────────────────────
        const dailyMap = {};
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 13);
        cutoff.setHours(0, 0, 0, 0);

        for (const bill of bills) {
            const d = new Date(bill.date);
            if (d < cutoff) continue;
            const key = d.toISOString().split('T')[0];
            dailyMap[key] = (dailyMap[key] || 0) + bill.total;
        }
        const dailyTrends = Object.entries(dailyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, amount]) => ({ date, amount: parseFloat(amount.toFixed(2)) }));

        // ── Summary stats ─────────────────────────────────────────────────────
        const allTimeTotal = bills.reduce((s, b) => s + b.total, 0);
        const avgBillValue = bills.length > 0 ? allTimeTotal / bills.length : 0;

        const topCategories = categorySpending.slice(0, 3).map((c) => c.category);

        // ── Insights text ─────────────────────────────────────────────────────
        const insights = generateInsights({ categorySpending, monthlySpending, avgBillValue });

        res.json({
            totalBills: bills.length,
            allTimeTotal: parseFloat(allTimeTotal.toFixed(2)),
            avgBillValue: parseFloat(avgBillValue.toFixed(2)),
            topCategories,
            monthlySpending,
            categorySpending,
            dailyTrends,
            insights,
        });
    } catch (err) {
        console.error('[analytics/extended]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyExtendedResponse() {
    return {
        totalBills: 0,
        allTimeTotal: 0,
        avgBillValue: 0,
        topCategories: [],
        monthlySpending: [],
        categorySpending: [],
        dailyTrends: [],
        insights: ['Upload your first receipt to see personalised insights!'],
    };
}

function generateInsights({ categorySpending, monthlySpending, avgBillValue }) {
    const insights = [];

    // Top category insight
    if (categorySpending.length > 0) {
        const top = categorySpending[0];
        insights.push(`Most spending on ${top.category} (₹${top.amount.toFixed(2)})`);
    }

    // Month-over-month trend
    if (monthlySpending.length >= 2) {
        const last = monthlySpending[monthlySpending.length - 1].amount;
        const prev = monthlySpending[monthlySpending.length - 2].amount;
        if (prev > 0) {
            const pct = (((last - prev) / prev) * 100).toFixed(0);
            const direction = last > prev ? 'increased' : 'decreased';
            insights.push(`Spending ${direction} by ${Math.abs(pct)}% compared to last month`);
        }
    }

    // Average bill
    if (avgBillValue > 0) {
        insights.push(`Average bill value is ₹${avgBillValue.toFixed(2)}`);
    }

    return insights.length > 0 ? insights : ['Keep uploading receipts for spending insights!'];
}


// ─── NEW: Spending Forecast ───────────────────────────────────────────────────

/**
 * GET /api/analytics/forecast
 * Uses simple linear regression on the last 6 months of spending to predict
 * the next month's total. Also returns confidence level and category forecasts.
 */
router.get('/forecast', auth, async (req, res) => {
    try {
        const bills = await Bill.find({ userId: req.user.id }).lean();

        if (bills.length === 0) {
            return res.json({ hasData: false, message: 'Upload more bills to see your spending forecast.' });
        }

        // ── Build monthly totals ─────────────────────────────────────────────
        const monthlyMap = {};
        const categoryMonthlyMap = {}; // { category: { "YYYY-MM": amount } }

        for (const bill of bills) {
            const d = new Date(bill.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyMap[key] = (monthlyMap[key] || 0) + bill.total;

            for (const item of bill.items || []) {
                const cat = item.category || 'others';
                if (!categoryMonthlyMap[cat]) categoryMonthlyMap[cat] = {};
                categoryMonthlyMap[cat][key] = (categoryMonthlyMap[cat][key] || 0)
                    + item.price * (item.quantity || 1);
            }
        }

        const sortedMonths = Object.keys(monthlyMap).sort();
        const recent = sortedMonths.slice(-6); // up to last 6 months

        if (recent.length < 2) {
            return res.json({
                hasData: false,
                message: 'Need at least 2 months of data for a forecast. Keep uploading!',
            });
        }

        // ── Linear regression helper ─────────────────────────────────────────
        function linearForecast(values) {
            const n = values.length;
            const xs = values.map((_, i) => i);
            const ys = values;
            const xMean = xs.reduce((a, b) => a + b, 0) / n;
            const yMean = ys.reduce((a, b) => a + b, 0) / n;
            const num   = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0);
            const den   = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
            const slope = den === 0 ? 0 : num / den;
            const intercept = yMean - slope * xMean;
            const nextX = n;
            const predicted = intercept + slope * nextX;

            // R² for confidence
            const ssTot = ys.reduce((s, y) => s + (y - yMean) ** 2, 0);
            const ssRes = ys.reduce((s, y, i) => s + (y - (intercept + slope * i)) ** 2, 0);
            const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);

            return { predicted: Math.max(0, predicted), slope, r2 };
        }

        // ── Overall forecast ─────────────────────────────────────────────────
        const overallValues = recent.map((m) => monthlyMap[m]);
        const overall = linearForecast(overallValues);

        // Next month label
        const lastMonth = recent[recent.length - 1];
        const [ly, lm] = lastMonth.split('-').map(Number);
        const nextDate  = new Date(ly, lm, 1);
        const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

        // ── Category forecasts ───────────────────────────────────────────────
        const categoryForecasts = [];
        for (const [cat, monthMap] of Object.entries(categoryMonthlyMap)) {
            const catValues = recent.map((m) => monthMap[m] || 0);
            if (catValues.filter(Boolean).length < 2) continue;
            const { predicted, slope } = linearForecast(catValues);
            categoryForecasts.push({
                category: cat,
                predicted: parseFloat(predicted.toFixed(2)),
                trend: slope > 0.5 ? 'up' : slope < -0.5 ? 'down' : 'stable',
            });
        }
        categoryForecasts.sort((a, b) => b.predicted - a.predicted);

        // ── Confidence label ─────────────────────────────────────────────────
        const confidence = overall.r2 > 0.8 ? 'high' : overall.r2 > 0.5 ? 'medium' : 'low';

        // ── Historical series for chart ──────────────────────────────────────
        const historical = recent.map((m) => ({
            month: m,
            amount: parseFloat(monthlyMap[m].toFixed(2)),
        }));

        res.json({
            hasData: true,
            nextMonth,
            predicted: parseFloat(overall.predicted.toFixed(2)),
            confidence,
            r2: parseFloat(overall.r2.toFixed(3)),
            trend: overall.slope > 5 ? 'up' : overall.slope < -5 ? 'down' : 'stable',
            historical,
            categoryForecasts: categoryForecasts.slice(0, 6),
        });
    } catch (err) {
        console.error('[analytics/forecast]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
