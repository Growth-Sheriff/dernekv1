import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Shield, Lock, Mail, Eye, EyeOff } from 'lucide-react';

const API_URL = 'http://157.90.154.48:8000';

interface SuperAdminUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
}

// Super Admin Store - localStorage based
export const superAdminStore = {
    getToken: () => localStorage.getItem('super_admin_token'),
    getUser: (): SuperAdminUser | null => {
        const user = localStorage.getItem('super_admin_user');
        return user ? JSON.parse(user) : null;
    },
    setAuth: (token: string, user: SuperAdminUser) => {
        localStorage.setItem('super_admin_token', token);
        localStorage.setItem('super_admin_user', JSON.stringify(user));
    },
    clearAuth: () => {
        localStorage.removeItem('super_admin_token');
        localStorage.removeItem('super_admin_user');
    },
    isAuthenticated: () => !!localStorage.getItem('super_admin_token'),
};

export default function SuperAdminLoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Backend login
            const response = await fetch(`${API_URL}/api/v1/auth/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ username: email, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Giriş başarısız');
            }

            const data = await response.json();

            // Check if user is super_admin (case-insensitive)
            const userRole = data.user?.role?.toUpperCase();
            if (userRole !== 'SUPER_ADMIN') {
                throw new Error('Bu sayfa sadece Super Admin kullanıcıları içindir');
            }

            // Save auth
            superAdminStore.setAuth(data.access_token, data.user);

            toast.success('Super Admin girişi başarılı!');
            navigate('/super-admin/dashboard');
        } catch (error: any) {
            toast.error(error.message || 'Giriş başarısız');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4 shadow-2xl shadow-purple-500/30">
                        <Shield className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">BADER</h1>
                    <p className="text-purple-300 mt-2 font-medium">Super Admin Panel</p>
                </div>

                {/* Login Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-purple-200 mb-2">
                                Email Adresi
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    placeholder="admin@baderyazilim.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-purple-200 mb-2">
                                Şifre
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Giriş yapılıyor...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Shield className="w-5 h-5" />
                                    Super Admin Girişi
                                </span>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="mt-8 pt-6 border-t border-white/10">
                        <p className="text-center text-sm text-purple-300/80">
                            Müşteri girişi için{' '}
                            <a href="/login" className="text-purple-400 hover:text-purple-300 underline underline-offset-2 transition-colors">
                                buraya tıklayın
                            </a>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-purple-400/50 mt-8">
                    © 2026 BADER - Dernek Yönetim Sistemi | Super Admin Panel
                </p>
            </div>
        </div>
    );
}
