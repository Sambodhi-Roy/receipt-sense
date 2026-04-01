/**
 * client/src/pages/BillsPage.jsx
 * Full bill history with search, category filter, and date range.
 */

import { useEffect, useState, useCallback } from 'react';
import api from '../api/api';
import Navbar from '../components/Navbar';

const ALL_CATEGORIES = [
    'all', 'dairy', 'grains', 'beverages', 'fruits & vegetables',
    'meat & protein', 'snacks', 'household', 'oil & spices', 'others',
];

const CAT_EMOJI = {
    dairy: '🥛', grains: '🌾', beverages: '🥤', 'fruits & vegetables': '🥦',
    'meat & protein': '🍗', snacks: '🍪', household: '🧴', 'oil & spices': '🌶️', others: '🛒', all: '📋',
};

const CAT_COLORS = {
    dairy: 'bg-blue-100 text-blue-700',
    grains: 'bg-yellow-100 text-yellow-700',
    beverages: 'bg-cyan-100 text-cyan-700',
    'fruits & vegetables': 'bg-green-100 text-green-700',
    'meat & protein': 'bg-orange-100 text-orange-700',
    snacks: 'bg-pink-100 text-pink-700',
    household: 'bg-purple-100 text-purple-700',
    'oil & spices': 'bg-red-100 text-red-700',
    others: 'bg-gray-100 text-gray-700',
};

export default function BillsPage() {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    // Filter state
    const [search, setSearch]       = useState('');
    const [category, setCategory]   = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate]     = useState('');

    // Debounced search fetch
    const fetchBills = useCallback(async (params = {}) => {
        setLoading(true);
        try {
            const q = new URLSearchParams();
            if (params.search)    q.set('search', params.search);
            if (params.category && params.category !== 'all') q.set('category', params.category);
            if (params.startDate) q.set('startDate', params.startDate);
            if (params.endDate)   q.set('endDate', params.endDate);

            const { data } = await api.get(`/bills?${q.toString()}`);
            setBills(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => { fetchBills({}); }, [fetchBills]);

    // Debounce search input
    useEffect(() => {
        const t = setTimeout(() => {
            fetchBills({ search, category, startDate, endDate });
        }, 350);
        return () => clearTimeout(t);
    }, [search, category, startDate, endDate, fetchBills]);

    const clearFilters = () => {
        setSearch('');
        setCategory('all');
        setStartDate('');
        setEndDate('');
    };

    const hasFilters = search || category !== 'all' || startDate || endDate;

    const totalFiltered = bills.reduce((s, b) => s + b.total, 0);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">All Bills</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Search, filter and browse your complete bill history</p>
                </div>

                {/* Filter bar */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by store or item name…"
                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">×</button>
                        )}
                    </div>

                    {/* Category + date row */}
                    <div className="flex flex-wrap gap-2">
                        {/* Category pills */}
                        <div className="flex flex-wrap gap-1.5">
                            {ALL_CATEGORIES.map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setCategory(c)}
                                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-all cursor-pointer capitalize ${
                                        category === c
                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                                    }`}
                                >
                                    {CAT_EMOJI[c]} {c}
                                </button>
                            ))}
                        </div>

                        {/* Date range */}
                        <div className="flex items-center gap-2 ml-auto">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                            />
                            <span className="text-xs text-gray-400">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Clear filters + result count */}
                    {hasFilters && (
                        <div className="flex items-center justify-between pt-1">
                            <p className="text-xs text-gray-400">
                                {bills.length} result{bills.length !== 1 && 's'}
                                {bills.length > 0 && ` · ₹${totalFiltered.toFixed(2)} total`}
                            </p>
                            <button onClick={clearFilters} className="text-xs text-emerald-600 hover:underline cursor-pointer">
                                Clear filters
                            </button>
                        </div>
                    )}
                </div>

                {/* Bills list */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
                    </div>
                ) : bills.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                        <span className="text-4xl">🔍</span>
                        <p className="mt-3 text-gray-500">No bills found matching your filters.</p>
                        {hasFilters && (
                            <button onClick={clearFilters} className="mt-2 text-sm text-emerald-600 hover:underline cursor-pointer">
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {bills.map((bill) => {
                            const isExpanded = expandedId === bill._id;
                            return (
                                <div
                                    key={bill._id}
                                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                                >
                                    {/* Bill header row */}
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : bill._id)}
                                        className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-gray-900">
                                                    {bill.store_name || bill.vendor}
                                                </span>
                                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                                    {bill.category}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-0.5">
                                                {new Date(bill.date).toLocaleDateString('en-IN', {
                                                    year: 'numeric', month: 'short', day: 'numeric',
                                                })}
                                                {' · '}{bill.items.length} item{bill.items.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                            <span className="text-lg font-bold text-gray-900">₹{bill.total.toFixed(2)}</span>
                                            <svg
                                                className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                    </button>

                                    {/* Expanded items */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-50 px-5 py-3 space-y-2">
                                            {bill.items.map((item, i) => (
                                                <div key={i} className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${CAT_COLORS[item.category || 'others'] || 'bg-gray-100 text-gray-600'}`}>
                                                            {item.category || 'others'}
                                                        </span>
                                                        <span className="text-gray-700 capitalize truncate">{item.name}</span>
                                                        {item.quantity > 1 && (
                                                            <span className="text-gray-400 text-xs">×{item.quantity}</span>
                                                        )}
                                                    </div>
                                                    <span className="font-medium text-gray-900 flex-shrink-0 ml-4">
                                                        ₹{item.price.toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                            <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-sm">
                                                <span className="text-gray-700">Total</span>
                                                <span className="text-emerald-700">₹{bill.total.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
