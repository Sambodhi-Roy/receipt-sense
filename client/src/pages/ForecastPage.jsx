/**
 * client/src/pages/ForecastPage.jsx
 * Full spending forecast page — shows prediction chart + category breakdown.
 */

import { useEffect, useState } from 'react';
import api from '../api/api';
import Navbar from '../components/Navbar';
import ForecastChart from '../components/ForecastChart';

export default function ForecastPage() {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading]   = useState(true);

    useEffect(() => {
        api.get('/analytics/forecast')
            .then(({ data }) => setForecast(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Spending Forecast</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Predicted next month's spend based on your past patterns using linear regression
                    </p>
                </div>

                {/* Main card */}
                {loading ? (
                    <div className="flex justify-center py-24">
                        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6">
                        <ForecastChart data={forecast} />
                    </div>
                )}

                {/* How it works */}
                <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-5">
                    <h3 className="font-semibold text-violet-800 mb-2 text-sm">How the forecast works</h3>
                    <ul className="text-sm text-violet-700 space-y-1.5 list-disc list-inside">
                        <li>Uses the last 6 months of your bill data</li>
                        <li>Applies linear regression to identify spending trends</li>
                        <li>Breaks down predictions by item category</li>
                        <li>Confidence level reflects how consistent your spending pattern is</li>
                        <li>More bills = better accuracy</li>
                    </ul>
                </div>
            </main>
        </div>
    );
}
