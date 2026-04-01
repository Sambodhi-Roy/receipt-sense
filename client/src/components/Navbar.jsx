import { useNavigate, useLocation, NavLink } from 'react-router-dom';

const NAV_LINKS = [
    { to: '/dashboard', label: 'Dashboard', emoji: '📊' },
    { to: '/bills',     label: 'Bills',     emoji: '🧾' },
    { to: '/budget',    label: 'Budget',    emoji: '💰' },
    { to: '/forecast',  label: 'Forecast',  emoji: '📈' },
];

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <nav className="bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-2xl">🧾</span>
                        <h1 className="text-xl font-bold text-white tracking-tight">ReceiptSense</h1>
                    </div>

                    {/* Nav links — hidden on mobile, shown md+ */}
                    <div className="hidden md:flex items-center gap-1">
                        {NAV_LINKS.map(({ to, label, emoji }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                        isActive
                                            ? 'bg-white/25 text-white'
                                            : 'text-emerald-100 hover:bg-white/15 hover:text-white'
                                    }`
                                }
                            >
                                <span>{emoji}</span>
                                {label}
                            </NavLink>
                        ))}
                    </div>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-medium text-emerald-100 bg-white/15 rounded-lg hover:bg-white/25 backdrop-blur transition-all cursor-pointer"
                    >
                        Logout
                    </button>
                </div>

                {/* Mobile bottom nav row */}
                <div className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto">
                    {NAV_LINKS.map(({ to, label, emoji }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                                    isActive
                                        ? 'bg-white/25 text-white'
                                        : 'text-emerald-100 hover:bg-white/15'
                                }`
                            }
                        >
                            {emoji} {label}
                        </NavLink>
                    ))}
                </div>
            </div>
        </nav>
    );
}
