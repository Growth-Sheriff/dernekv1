import React, { useRef, useState } from 'react';
import {
    TrendingUp, TrendingDown, Minus, ArrowRight, ArrowUpRight, ArrowDownRight,
    Users, Wallet, CreditCard, AlertCircle,
    CheckCircle, Clock, Calendar, BarChart3,
    PieChart, Activity, Sparkles, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============ GLASS CARD BASE ============
const GlassCard: React.FC<{
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    glow?: string;
    onClick?: () => void;
}> = ({ children, className = '', hover = true, glow, onClick }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState('');
    const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!cardRef.current || !hover) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        const rotateY = (x - 0.5) * 6;
        const rotateX = (0.5 - y) * 6;

        setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`);
        setGlowPosition({ x: x * 100, y: y * 100 });
    };

    const handleMouseLeave = () => {
        setTransform('');
        setGlowPosition({ x: 50, y: 50 });
    };

    return (
        <div
            ref={cardRef}
            onClick={onClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={cn(
                "relative overflow-hidden rounded-2xl transition-all duration-300",
                hover && onClick && "cursor-pointer",
                className
            )}
            style={{
                transform: transform || undefined,
                transformStyle: 'preserve-3d',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.8)',
                boxShadow: glow
                    ? `0 8px 32px rgba(0,0,0,0.08), 0 0 40px -15px ${glow}50`
                    : '0 8px 32px rgba(0,0,0,0.08)',
            }}
        >
            {/* Dynamic glow */}
            {glow && (
                <div
                    className="absolute inset-0 opacity-30 pointer-events-none transition-opacity duration-300"
                    style={{
                        background: `radial-gradient(circle at ${glowPosition.x}% ${glowPosition.y}%, ${glow}40 0%, transparent 50%)`,
                    }}
                />
            )}
            {/* Glass reflection */}
            <div
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 50%)' }}
            />
            <div className="relative z-10">{children}</div>
        </div>
    );
};

// ============ STAT CARD - PREMIUM 3D ============
export interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        label?: string;
        isPositive?: boolean;
    };
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    onClick?: () => void;
    className?: string;
}

const colorConfig = {
    blue: { gradient: '#3b82f6', text: 'text-blue-600', bg: 'from-blue-400 to-blue-600' },
    green: { gradient: '#10b981', text: 'text-emerald-600', bg: 'from-emerald-400 to-emerald-600' },
    red: { gradient: '#ef4444', text: 'text-red-600', bg: 'from-red-400 to-red-600' },
    yellow: { gradient: '#f59e0b', text: 'text-amber-600', bg: 'from-amber-400 to-amber-600' },
    purple: { gradient: '#8b5cf6', text: 'text-purple-600', bg: 'from-purple-400 to-purple-600' },
    gray: { gradient: '#6b7280', text: 'text-gray-600', bg: 'from-gray-400 to-gray-600' },
};

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    trend,
    color = 'blue',
    size = 'md',
    loading = false,
    onClick,
    className,
}) => {
    const colors = colorConfig[color];

    const sizeClasses = {
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-6',
    };

    const valueSizeClasses = {
        sm: 'text-xl',
        md: 'text-2xl',
        lg: 'text-3xl',
    };

    return (
        <GlassCard
            className={cn(sizeClasses[size], className)}
            onClick={onClick}
            glow={colors.gradient}
            hover={!!onClick}
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    {subtitle && (
                        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
                    )}
                </div>
                {icon && (
                    <div
                        className={cn("p-2.5 rounded-xl bg-gradient-to-br text-white", colors.bg)}
                        style={{ boxShadow: `0 4px 12px -2px ${colors.gradient}50` }}
                    >
                        {icon}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="h-8 bg-gray-200/50 rounded animate-pulse" />
            ) : (
                <div
                    className={cn("font-bold tracking-tight", valueSizeClasses[size], colors.text)}
                    style={{ textShadow: `0 0 20px ${colors.gradient}30` }}
                >
                    {value}
                </div>
            )}

            {trend && (
                <div className={cn(
                    "flex items-center gap-1.5 mt-2 text-xs font-medium",
                    trend.value > 0 || trend.isPositive ? 'text-emerald-600' : 'text-red-500'
                )}>
                    {trend.value > 0 || trend.isPositive ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
                    {trend.label && <span className="text-gray-400">{trend.label}</span>}
                </div>
            )}
        </GlassCard>
    );
};

// ============ MINI STAT CARD ============
export interface MiniStatProps {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';
    className?: string;
}

export const MiniStat: React.FC<MiniStatProps> = ({
    label,
    value,
    icon,
    color = 'gray',
    className,
}) => {
    const colors = colorConfig[color];

    return (
        <GlassCard className={cn("px-4 py-3", className)} hover={false}>
            <div className="flex items-center gap-3">
                {icon && (
                    <div
                        className="p-2 rounded-lg"
                        style={{ background: `${colors.gradient}15` }}
                    >
                        <div style={{ color: colors.gradient }}>{icon}</div>
                    </div>
                )}
                <div>
                    <p className="text-xs font-medium text-gray-500">{label}</p>
                    <p className={cn("text-lg font-bold", colors.text)}>{value}</p>
                </div>
            </div>
        </GlassCard>
    );
};

// ============ STATS ROW ============
export interface StatsRowProps {
    stats: {
        label: string;
        value: string | number;
        color?: MiniStatProps['color'];
        icon?: React.ReactNode;
    }[];
    className?: string;
}

export const StatsRow: React.FC<StatsRowProps> = ({ stats, className }) => {
    return (
        <div className={cn("grid gap-4", className)} style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}>
            {stats.map((stat, index) => (
                <MiniStat
                    key={index}
                    label={stat.label}
                    value={stat.value}
                    color={stat.color}
                    icon={stat.icon}
                />
            ))}
        </div>
    );
};

// ============ QUICK ACTIONS CARD - PREMIUM ============
export interface QuickAction {
    id: string;
    label: string;
    description?: string;
    icon: React.ReactNode;
    onClick: () => void;
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

export interface QuickActionsCardProps {
    title?: string;
    actions: QuickAction[];
    columns?: 2 | 3 | 4;
    className?: string;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
    title = 'Hızlı İşlemler',
    actions,
    columns = 3,
    className,
}) => {
    return (
        <GlassCard className={cn("p-5", className)} hover={false}>
            {title && (
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-gray-800">{title}</h3>
                </div>
            )}
            <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
                {actions.map(action => {
                    const colors = colorConfig[action.color || 'blue'];
                    return (
                        <button
                            key={action.id}
                            onClick={action.onClick}
                            className="group flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300 hover:scale-105"
                            style={{
                                background: 'rgba(255,255,255,0.5)',
                                border: '1px solid rgba(255,255,255,0.8)',
                            }}
                        >
                            <div
                                className="w-10 h-10 flex items-center justify-center rounded-xl text-white transition-all group-hover:scale-110"
                                style={{
                                    background: `linear-gradient(135deg, ${colors.gradient} 0%, ${colors.gradient}dd 100%)`,
                                    boxShadow: `0 4px 12px -2px ${colors.gradient}40`,
                                }}
                            >
                                {action.icon}
                            </div>
                            <span className="text-xs font-medium text-gray-700 text-center">{action.label}</span>
                        </button>
                    );
                })}
            </div>
        </GlassCard>
    );
};

// ============ PROGRESS CARD - PREMIUM ============
export interface ProgressCardProps {
    title: string;
    current: number;
    total: number;
    unit?: string;
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
    showPercentage?: boolean;
    className?: string;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
    title,
    current,
    total,
    unit = '',
    color = 'blue',
    showPercentage = true,
    className,
}) => {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    const colors = colorConfig[color];

    return (
        <GlassCard className={cn("p-4", className)} hover={false}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{title}</span>
                {showPercentage && (
                    <span className={cn("text-sm font-bold", percentage >= 100 ? 'text-emerald-600' : colors.text)}>
                        {percentage}%
                    </span>
                )}
            </div>
            <div className="h-2 bg-gray-100/80 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                        width: `${Math.min(percentage, 100)}%`,
                        background: `linear-gradient(90deg, ${colors.gradient} 0%, ${colors.gradient}cc 100%)`,
                        boxShadow: `0 0 10px ${colors.gradient}50`,
                    }}
                />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>{current.toLocaleString('tr-TR')} {unit}</span>
                <span>{total.toLocaleString('tr-TR')} {unit}</span>
            </div>
        </GlassCard>
    );
};

// ============ ALERT CARD - PREMIUM ============
export interface AlertCardProps {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    onDismiss?: () => void;
    className?: string;
}

const alertTypeConfig = {
    info: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: AlertCircle },
    success: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle },
    warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: AlertCircle },
    error: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: AlertCircle },
};

export const AlertCard: React.FC<AlertCardProps> = ({
    type,
    title,
    message,
    action,
    onDismiss,
    className,
}) => {
    const config = alertTypeConfig[type];
    const Icon = config.icon;

    return (
        <GlassCard className={cn("p-4", className)} hover={false} glow={config.color}>
            <div className="flex items-start gap-3">
                <div
                    className="flex-shrink-0 p-2 rounded-xl"
                    style={{ background: config.bg }}
                >
                    <Icon className="w-5 h-5" style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{title}</p>
                    {message && (
                        <p className="text-sm text-gray-500 mt-1">{message}</p>
                    )}
                    {action && (
                        <button
                            onClick={action.onClick}
                            className="text-sm font-medium mt-2 flex items-center gap-1 transition-colors"
                            style={{ color: config.color }}
                        >
                            {action.label}
                            <ArrowRight className="w-3 h-3" />
                        </button>
                    )}
                </div>
                {onDismiss && (
                    <button onClick={onDismiss} className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-xl">
                        ×
                    </button>
                )}
            </div>
        </GlassCard>
    );
};

// ============ AI INSIGHT CARD ============
export interface AIInsightCardProps {
    insights: string[];
    title?: string;
    className?: string;
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
    insights,
    title = 'AI İçgörüleri',
    className,
}) => {
    return (
        <GlassCard className={cn("p-5", className)} hover={false} glow="#8b5cf6">
            <div className="flex items-center gap-2 mb-4">
                <div className="relative">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <span className="text-sm font-bold text-gray-800">{title}</span>
                <span className="ml-auto px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full">BETA</span>
            </div>
            <div className="space-y-3">
                {insights.map((insight, i) => (
                    <div
                        key={i}
                        className="flex gap-3 p-3 rounded-xl"
                        style={{
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(236,72,153,0.08) 100%)',
                        }}
                    >
                        <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-gray-700">{insight}</p>
                    </div>
                ))}
            </div>
        </GlassCard>
    );
};

// ============ PRESET ICONS ============
export const StatIcons = {
    users: <Users className="w-5 h-5" />,
    wallet: <Wallet className="w-5 h-5" />,
    credit: <CreditCard className="w-5 h-5" />,
    alert: <AlertCircle className="w-5 h-5" />,
    check: <CheckCircle className="w-5 h-5" />,
    clock: <Clock className="w-5 h-5" />,
    calendar: <Calendar className="w-5 h-5" />,
    chart: <BarChart3 className="w-5 h-5" />,
    pie: <PieChart className="w-5 h-5" />,
    activity: <Activity className="w-5 h-5" />,
    trendUp: <TrendingUp className="w-5 h-5" />,
    trendDown: <TrendingDown className="w-5 h-5" />,
    sparkles: <Sparkles className="w-5 h-5" />,
};

export default StatCard;
