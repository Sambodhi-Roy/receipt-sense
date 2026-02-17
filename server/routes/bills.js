const router = require('express').Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const Bill = require('../models/Bill');

// Multer — store in memory, we discard the file
const upload = multer({ storage: multer.memoryStorage() });

// Mock ML data generator
function generateMockBill() {
    const vendors = ['SuperMart', 'FreshGrocer', 'QuickStop', 'GreenBasket', 'DailyNeeds'];
    const allItems = [
        { name: 'Milk', price: 2.5 },
        { name: 'Bread', price: 1.5 },
        { name: 'Eggs', price: 3.0 },
        { name: 'Rice', price: 5.0 },
        { name: 'Butter', price: 2.0 },
        { name: 'Apples', price: 4.0 },
        { name: 'Chicken', price: 8.5 },
        { name: 'Pasta', price: 1.75 },
        { name: 'Tomatoes', price: 2.25 },
        { name: 'Cheese', price: 3.5 },
    ];

    const count = Math.floor(Math.random() * 4) + 2; // 2-5 items
    const shuffled = allItems.sort(() => 0.5 - Math.random());
    const items = shuffled.slice(0, count);
    const total = parseFloat(items.reduce((s, i) => s + i.price, 0).toFixed(2));

    return {
        vendor: vendors[Math.floor(Math.random() * vendors.length)],
        date: new Date().toISOString().split('T')[0],
        items,
        total,
        category: 'Groceries',
    };
}

// POST /api/bills/upload
router.post('/upload', auth, upload.single('image'), async (req, res) => {
    try {
        const mockData = generateMockBill();

        const bill = await Bill.create({
            userId: req.user.id,
            ...mockData,
        });

        res.status(201).json(bill);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/bills
router.get('/', auth, async (req, res) => {
    try {
        const bills = await Bill.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(bills);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
