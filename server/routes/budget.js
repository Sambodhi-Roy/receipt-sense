/**
 * server/routes/budget.js
 *
 * GET    /api/budget          → list budgets for current month + actual spending
 * POST   /api/budget          → create or update a budget limit
 * DELETE /api/budget/:id      → remove a budget entry
 * GET    /api/budget/status   → budget vs actual for current month (for alerts)
 */

const router = require('express').Router();
const auth   = require('../middleware/auth');
const Budget = require('../models/Budget');
const Bill   = require('../models/Bill');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns "YYYY-MM" for a given Date (defaults to now) */
function currentMonth(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Aggregates category spending for a user in a given "YYYY-MM" month.
 * Returns { [category]: totalSpent }
 */
async function getCategorySpending(userId, month) {
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end   = new Date(year, mon, 1);

    const bills = await Bill.find({
        userId,
        date: { $gte: start, $lt: end },
    }).lean();

    const spending = {};
    for (const bill of bills) {
        for (const item of bill.items || []) {
            const cat = item.category || 'others';
            spending[cat] = (spending[cat] || 0) + item.price * (item.quantity || 1);
        }
    }
    // Round
    for (const k of Object.keys(spending)) {
        spending[k] = parseFloat(spending[k].toFixed(2));
    }
    return spending;
}

// ─── GET /api/budget ─────────────────────────────────────────────────────────
// Returns all budget entries for the current month merged with actual spending.
router.get('/', auth, async (req, res) => {
    try {
        const month   = req.query.month || currentMonth();
        const budgets = await Budget.find({ userId: req.user.id, month }).lean();
        const spending = await getCategorySpending(req.user.id, month);

        const result = budgets.map((b) => ({
            _id:     b._id,
            category: b.category,
            limit:    b.limit,
            spent:    spending[b.category] || 0,
            month:    b.month,
            pct:      b.limit > 0
                ? parseFloat(((spending[b.category] || 0) / b.limit * 100).toFixed(1))
                : 0,
        }));

        res.json({ month, budgets: result });
    } catch (err) {
        console.error('[budget GET]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── GET /api/budget/status ──────────────────────────────────────────────────
// Returns only budgets that are at ≥80% — used by the dashboard alert banner.
router.get('/status', auth, async (req, res) => {
    try {
        const month   = currentMonth();
        const budgets = await Budget.find({ userId: req.user.id, month }).lean();
        const spending = await getCategorySpending(req.user.id, month);

        const alerts = budgets
            .map((b) => ({
                category: b.category,
                limit:    b.limit,
                spent:    spending[b.category] || 0,
                pct:      b.limit > 0
                    ? parseFloat(((spending[b.category] || 0) / b.limit * 100).toFixed(1))
                    : 0,
            }))
            .filter((b) => b.pct >= 80)
            .sort((a, z) => z.pct - a.pct);

        res.json({ month, alerts });
    } catch (err) {
        console.error('[budget/status]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── POST /api/budget ────────────────────────────────────────────────────────
// Create or update (upsert) a budget limit for a category+month.
router.post('/', auth, async (req, res) => {
    try {
        const { category, limit, month } = req.body;

        if (!category || limit === undefined) {
            return res.status(400).json({ message: 'category and limit are required' });
        }
        if (typeof limit !== 'number' || limit < 0) {
            return res.status(400).json({ message: 'limit must be a non-negative number' });
        }

        const targetMonth = month || currentMonth();

        const budget = await Budget.findOneAndUpdate(
            { userId: req.user.id, category, month: targetMonth },
            { limit },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(201).json(budget);
    } catch (err) {
        console.error('[budget POST]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// ─── DELETE /api/budget/:id ──────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
    try {
        const budget = await Budget.findOne({ _id: req.params.id, userId: req.user.id });
        if (!budget) return res.status(404).json({ message: 'Budget not found' });

        await budget.deleteOne();
        res.json({ message: 'Budget removed' });
    } catch (err) {
        console.error('[budget DELETE]', err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
