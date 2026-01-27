import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const menuItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/uyeler', label: 'Üyeler', icon: '👥' },
    { path: '/aidat', label: 'Aidat', icon: '💰' },
    { path: '/mali/gelirler', label: 'Gelirler', icon: '📈' },
    { path: '/mali/giderler', label: 'Giderler', icon: '📉' },
    { path: '/mali/kasalar', label: 'Kasalar', icon: '🏦' },
    { path: '/raporlar', label: 'Raporlar', icon: '📋' },
    { path: '/ayarlar/genel', label: 'Ayarlar', icon: '⚙️' },
];

function Sidebar() {
    const location = useLocation();
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();
    const { user, tenant } = useAuthStore();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10 transition-all duration-300">
            {/* Logo */}
            <div className="p-4 border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-xl font-bold">B</span>
                    </div>
                    <div>
                        <h1 className="font-bold tracking-wide">BADER</h1>
                        <p className="text-xs text-slate-400">{tenant?.name || 'Web Edition'}</p>
                    </div>
                </div>
            </div>

            {/* Menu */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path !== '/' && location.pathname.startsWith(item.path));
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <span className={`text-lg transition-transform group-hover:scale-110 ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
                            <span className="font-medium text-sm">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User */}
            <div className="p-4 border-t border-slate-700 bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center border border-slate-600">
                            <span className="text-sm font-semibold text-slate-200">
                                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-200">{user?.full_name || 'Kullanıcı'}</span>
                            <span className="text-xs text-slate-500">Admin</span>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Çıkış"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                    </button>
                </div>
            </div>
        </aside>
    );
}

export function MainLayout() {
    return (
        <div className="min-h-screen flex bg-slate-50">
            <Sidebar />
            <main className="flex-1 ml-64 p-8 overflow-x-hidden">
                <div className="max-w-7xl mx-auto animate-fade-in">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
