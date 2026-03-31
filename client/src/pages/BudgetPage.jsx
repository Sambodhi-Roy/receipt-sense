/**
 * client/src/pages/BudgetPage.jsx
 * Full budget planner — set monthly limits per category, see live progress bars.
 */

import { useEffect, useState } from 'react';
import api from '../api/api';
import Navbar from '../components/Navbar';

const ALL_CATEGORIES = [
    'dairy', 'grains', 'beverages', 'fruits & vegetables',
    'meat & protein', 'snacks', 'household', 'oil & spices', 'others',
];

const CAT_EMOJI = {
    dairy: '🥛', grains: '🌾', beverages: '🥤', 'fruits & vegetables': '🥦',
    'meat & protein': '🍗', snacks: '🍪', household: '🧴', 'oil & spices': '🌶️', others: '🛒',
};

function currentMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(yyyyMM) {
    const [y, m] = yyyyMM.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

function ProgressBar({ pct }) {
    const clamped = Math.min(pct, 100);
    const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-500';
    return (
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
                className={`h-2 rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${clamped}%` }}
            />
        </div>
    );
}

export default function BudgetPage() {
    const [month, setMonth] = useState(currentMonth());
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);   // category being saved
    const [editValues, setEditValues] = useState({});  // { [category]: string }
    const [addCategory, setAddCategory] = useState('');
    const [addLimit, setAddLimit] = useState('');
    const [addError, setAddError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const fetchBudgets = async (m = month) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/budget?month=${m}`);
            setBudgets(data.budgets);
            // Seed edit values with current limits
            const vals = {};
            for (const b of data.budgets) vals[b.category] = String(b.limit);
            setEditValues(vals);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBudgets(month); }, [month]);

    const handleSave = async (category) => {
        const rawVal = editValues[category];
        const limit = parseFloat(rawVal);
        if (isNaN(limit) || limit < 0) return;
        setSaving(category);
        try {
            await api.post('/budget', { category, limit, month });
            await fetchBudgets(month);
            flash('Budget saved!');
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(null);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/budget/${id}`);
            await fetchBudgets(month);
            flash('Budget removed.');
        } catch (err) {
            console.error(err);
        }
    };

    const handleAdd = async () => {
        if (!addCategory) { setAddError('Select a category'); return; }
        const limit = parseFloat(addLimit);
        if (isNaN(limit) || limit <= 0) { setAddError('Enter a valid limit'); return; }
        setAddError('');
        try {
            await api.post('/budget', { category: addCategory, limit, month });
            setAddCategory('');
            setAddLimit('');
            await fetchBudgets(month);
            flash('Budget added!');
        } catch (err) {
            setAddError(err.response?.data?.message || 'Failed to add budget');
        }
    };

    const flash = (msg) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 2500);
    };

    const existingCategories = new Set(budgets.map((b) => b.category));
    const availableToAdd = ALL_CATEGORIES.filter((c) => !existingCategories.has(c));

    const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
    const totalSpent  = budgets.reduce((s, b) => s + b.spent, 0);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Budget Planner</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Set monthly limits per category and track your progress</p>
                    </div>
                    {/* Month selector */}
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                    />
                </div>

                {/* Month summary card */}
                {budgets.length > 0 && (
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white">
                        <p className="text-emerald-100 text-sm mb-1">{monthLabel(month)}</p>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-3xl font-bold">₹{totalSpent.toFixed(0)}</p>
                                <p className="text-emerald-100 text-sm">spent of ₹{totalBudget.toFixed(0)} budget</p>
                            </div>
                            <p className={`text-2xl font-bold ${totalSpent > totalBudget ? 'text-red-300' : 'text-emerald-100'}`}>
                                {totalBudget > 0 ? `${Math.round((totalSpent / totalBudget) * 100)}%` : '—'}
                            </p>
                        </div>
                        <div className="mt-3 bg-white/20 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all ${totalSpent > totalBudget ? 'bg-red-400' : 'bg-white'}`}
                                style={{ width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Success toast */}
                {successMsg && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">
                        ✓ {successMsg}
                    </div>
                )}

                {/* Budget list */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {budgets.length === 0 && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                                <span className="text-4xl">💰</span>
                                <p className="mt-3 text-gray-500">No budgets set for {monthLabel(month)} yet.</p>
                                <p className="text-sm text-gray-400">Add a category below to get started.</p>
                            </div>
                        )}

                        {budgets.map((b) => (
                            <div key={b._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                {/* Top row */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{CAT_EMOJI[b.category] || '🛒'}</span>
                                        <span className="font-semibold text-gray-800 capitalize">{b.category}</span>
                                        {b.pct >= 100 && (
                                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">OVER</span>
                                        )}
                                        {b.pct >= 80 && b.pct < 100 && (
                                            <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-semibold">NEAR</span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDelete(b._id)}
                                        className="text-gray-300 hover:text-red-400 text-lg leading-none transition-colors cursor-pointer"
                                        title="Remove budget"
                                    >
                                        ×
                                    </button>
                                </div>

                                {/* Progress bar */}
                                <ProgressBar pct={b.pct} />

                                {/* Amounts + edit */}
                                <div className="flex items-center justify-between mt-3 gap-3">
                                    <p className="text-sm text-gray-500">
                                        <span className="font-semibold text-gray-800">₹{b.spent.toFixed(0)}</span>
                                        {' / '}₹{b.limit.toFixed(0)}
                                        <span className="ml-1 text-gray-400">({b.pct}%)</span>
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-400">₹</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={editValues[b.category] ?? ''}
                                            onChange={(e) => setEditValues((prev) => ({ ...prev, [b.category]: e.target.value }))}
                                            className="w-24 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                            placeholder="Limit"
                                        />
                                        <button
                                            onClick={() => handleSave(b.category)}
                                            disabled={saving === b.category}
                                            className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                                        >
                                            {saving === b.category ? '…' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add new budget */}
                {availableToAdd.length > 0 && (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Add New Budget</h3>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <select
                                value={addCategory}
                                onChange={(e) => { setAddCategory(e.target.value); setAddError(''); }}
                                className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer capitalize"
                            >
                                <option value="">Select category…</option>
                                {availableToAdd.map((c) => (
                                    <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>
                                ))}
                            </select>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-sm">₹</span>
                                <input
                                    type="number"
                                    min="1"
                                    value={addLimit}
                                    onChange={(e) => { setAddLimit(e.target.value); setAddError(''); }}
                                    placeholder="Monthly limit"
                                    className="w-36 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                />
                                <button
                                    onClick={handleAdd}
                                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all cursor-pointer whitespace-nowrap"
                                >
                                    + Add
                                </button>
                            </div>
                        </div>
                        {addError && <p className="text-red-500 text-xs mt-2">{addError}</p>}
                    </div>
                )}
            </main>
        </div>
    );
}
