import { useNavigate } from 'react-router-dom';

export default function Navbar() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <nav className="bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🧾</span>
                        <h1 className="text-xl font-bold text-white tracking-tight">
                            ReceiptSense
                        </h1>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-medium text-emerald-100 bg-white/15 rounded-lg hover:bg-white/25 backdrop-blur transition-all cursor-pointer"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}
