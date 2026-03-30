import { useEffect, useState } from 'react';
import api from '../api/api';
import Navbar from '../components/Navbar';
import UploadModal from '../components/UploadModal';
import CategoryPieChart from '../components/CategoryPieChart';
import MonthlyTrendChart from '../components/MonthlyTrendChart';
import InsightsSection from '../components/InsightsSection';

export default function Dashboard() {
    const [analytics, setAnalytics] = useState({ weeklyTotal: 0, monthlyTotal: 0 });
    const [extended, setExtended] = useState(null);
    const [bills, setBills] = useState([]);
    const [showUpload, setShowUpload] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [analyticsRes, billsRes, extRes] = await Promise.all([
                api.get('/analytics'),
                api.get('/bills'),
                api.get('/analytics/extended').catch(() => ({ data: null })),
            ]);
            setAnalytics(analyticsRes.data);
            setBills(billsRes.data);
            setExtended(extRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleUploaded = (newBill) => {
        setBills((prev) => [newBill, ...prev]);
        // Refresh both analytics endpoints
        Promise.all([
            api.get('/analytics').then((res) => setAnalytics(res.data)),
            api.get('/analytics/extended').then((res) => setExtended(res.data)).catch(() => {}),
        ]).catch(console.error);
    };

    const recentBills = bills.slice(0, 5);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* ── Stats row ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 text-xl">📅</span>
                            <p className="text-sm font-medium text-gray-500">This Week</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 mt-3">
                            ₹{analytics.weeklyTotal.toFixed(2)}
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                        <div className="flex items-center gap-3 mb-1">
                            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-teal-100 text-teal-600 text-xl">📆</span>
                            <p className="text-sm font-medium text-gray-500">This Month</p>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 mt-3">
                            ₹{analytics.monthlyTotal.toFixed(2)}
                        </p>
                    </div>

                    {extended && (
                        <>
                            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-100 text-violet-600 text-xl">🧾</span>
                                    <p className="text-sm font-medium text-gray-500">Total Bills</p>
                                </div>
                                <p className="text-3xl font-bold text-gray-900 mt-3">{extended.totalBills}</p>
                            </div>

                            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-600 text-xl">💰</span>
                                    <p className="text-sm font-medium text-gray-500">Avg Bill</p>
                                </div>
                                <p className="text-3xl font-bold text-gray-900 mt-3">
                                    ₹{extended.avgBillValue.toFixed(2)}
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* ── Upload button ── */}
                <button
                    onClick={() => setShowUpload(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl shadow hover:from-emerald-700 hover:to-teal-700 transition-all cursor-pointer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                    Upload Bill
                </button>

                {/* ── Charts row (only if extended data exists) ── */}
                {extended && (extended.categorySpending.length > 0 || extended.monthlySpending.length > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {extended.categorySpending.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                                <h2 className="text-base font-semibold text-gray-800 mb-4">Spending by Category</h2>
                                <CategoryPieChart data={extended.categorySpending} />
                            </div>
                        )}

                        {extended.monthlySpending.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
                                <h2 className="text-base font-semibold text-gray-800 mb-4">Monthly Trend</h2>
                                <MonthlyTrendChart data={extended.monthlySpending} />
                            </div>
                        )}
                    </div>
                )}

                {/* ── Insights ── */}
                {extended?.insights?.length > 0 && (
                    <InsightsSection insights={extended.insights} />
                )}

                {/* ── Recent Bills ── */}
                <section>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Bills</h2>

                    {recentBills.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                            <span className="text-4xl">🛒</span>
                            <p className="mt-3 text-gray-500">No bills uploaded yet. Upload your first grocery bill!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentBills.map((bill) => (
                                <div
                                    key={bill._id}
                                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between hover:shadow-md transition-shadow"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-gray-900">{bill.store_name || bill.vendor}</span>
                                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                                                {bill.category}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            {new Date(bill.date).toLocaleDateString('en-IN', {
                                                year: 'numeric', month: 'short', day: 'numeric',
                                            })}
                                            {' · '}
                                            {bill.items.length} item{bill.items.length !== 1 && 's'}
                                        </p>
                                    </div>
                                    <p className="text-lg font-bold text-gray-900 whitespace-nowrap ml-4">
                                        ₹{bill.total.toFixed(2)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            {showUpload && (
                <UploadModal
                    onClose={() => setShowUpload(false)}
                    onUploaded={handleUploaded}
                />
            )}
        </div>
    );
}

