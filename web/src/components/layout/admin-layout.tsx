import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Toaster } from 'sonner';

const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: '⚡' },
    { path: '/admin/tenants', label: 'Dernekler', icon: '🏢' },
    { path: '/admin/licenses', label: 'Lisanslar', icon: '🔑' },
    { path: '/admin/users', label: 'Kullanıcılar', icon: '👥' },
    { path: '/admin/settings', label: 'Sistem Ayarları', icon: '⚙️' },
];

function AdminSidebar() {
    const location = useLocation();
    const logout = useAuthStore((state) => state.logout);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="w-64 bg-slate-950 text-white flex flex-col fixed h-full z-10 border-r border-slate-800">
            {/* Logo */}
            <div className="p-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-xl font-bold">A</span>
                    </div>
                    <div>
                        <h1 className="font-bold tracking-wide">BADER ADMIN</h1>
                        <p className="text-xs text-slate-500">Süper Panel</p>
                    </div>
                </div>
            </div>

            {/* Menu */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                                    ? 'bg-red-600/10 text-red-500 border border-red-900/50'
                                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                                }`}
                        >
                            <span className={`text-lg`}>{item.icon}</span>
                            <span className="font-medium text-sm">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* User */}
            <div className="p-4 border-t border-slate-800 bg-slate-950">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">v3.0.0-admin</span>
                    <button
                        onClick={handleLogout}
                        className="text-xs text-red-500 hover:text-red-400 font-medium"
                    >
                        ÇIKIŞ
                    </button>
                </div>
            </div>
        </aside>
    );
}

export function AdminLayout() {
    return (
        <div className="min-h-screen flex bg-slate-100 font-sans">
            <AdminSidebar />
            <main className="flex-1 ml-64 p-0 overflow-x-hidden">
                <Outlet />
            </main>
            <Toaster position="top-right" richColors theme="system" />
        </div>
    );
}
