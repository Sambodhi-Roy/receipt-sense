const router = require('express').Router();
const auth = require('../middleware/auth');
const Bill = require('../models/Bill');

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

module.exports = router;
