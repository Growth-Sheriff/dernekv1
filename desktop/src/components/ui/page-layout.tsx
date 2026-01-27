import React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

// ============ PREMIUM GLASS CARD ============
export const GlassCard: React.FC<{
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    glow?: string;
    onClick?: () => void;
}> = ({ children, className = '', hover = true, glow, onClick }) => (
    <div
        onClick={onClick}
        className={cn(
            "relative overflow-hidden rounded-2xl",
            hover && "transition-all duration-300 hover:scale-[1.01] hover:shadow-xl",
            className
        )}
        style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.8)',
            boxShadow: glow
                ? `0 8px 32px rgba(0,0,0,0.08), 0 0 40px -15px ${glow}50`
                : '0 8px 32px rgba(0,0,0,0.08)',
        }}
    >
        {/* Glass reflection */}
        <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 50%)' }}
        />
        <div className="relative z-10">{children}</div>
    </div>
);

// ============ PAGE LAYOUT - PREMIUM ============
export interface PageLayoutProps {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
    stats?: React.ReactNode;
    filters?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    premium?: boolean;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
    title,
    subtitle,
    icon,
    actions,
    stats,
    filters,
    children,
    className,
    premium = true,
}) => {
    return (
        <div
            className={cn("min-h-screen p-6", className)}
            style={premium ? {
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 50%, #fdf4ff 100%)',
            } : undefined}
        >
            {/* Animated Background (Premium) */}
            {premium && (
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div
                        className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full opacity-30"
                        style={{
                            background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)',
                            animation: 'float 20s ease-in-out infinite',
                        }}
                    />
                    <div
                        className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-30"
                        style={{
                            background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)',
                            animation: 'float 25s ease-in-out infinite reverse',
                        }}
                    />
                </div>
            )}

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(30px, -30px) scale(1.05); }
                }
            `}</style>

            <div className="relative z-10 space-y-6 max-w-[1600px] mx-auto">
                {/* Premium Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-center gap-4">
                        {icon && (
                            <div
                                className="relative flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-white"
                                style={{
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                    boxShadow: '0 8px 24px -8px rgba(59,130,246,0.5)',
                                }}
                            >
                                {/* Glow effect */}
                                <div
                                    className="absolute inset-0 rounded-2xl blur-lg opacity-40"
                                    style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
                                />
                                <div className="relative z-10">{icon}</div>
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                                {premium && (
                                    <span
                                        className="px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1"
                                        style={{
                                            background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                                            color: 'white',
                                        }}
                                    >
                                        <Sparkles className="w-3 h-3" /> PRO
                                    </span>
                                )}
                            </div>
                            {subtitle && (
                                <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
                            )}
                        </div>
                    </div>
                    {actions && (
                        <div className="flex items-center gap-3">
                            {actions}
                        </div>
                    )}
                </div>

                {/* Stats Row */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {stats}
                    </div>
                )}

                {/* Filters - Glass Style */}
                {filters && (
                    <GlassCard className="p-4" hover={false}>
                        {filters}
                    </GlassCard>
                )}

                {/* Main Content */}
                <div>
                    {children}
                </div>
            </div>
        </div>
    );
};

// ============ SECTION CARD - GLASS ============
export interface SectionCardProps {
    title?: string;
    subtitle?: string;
    icon?: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    className?: string;
    glass?: boolean;
    glow?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
    title,
    subtitle,
    icon,
    actions,
    children,
    padding = 'md',
    className,
    glass = true,
    glow,
}) => {
    const paddingClasses = {
        none: '',
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-6',
    };

    if (glass) {
        return (
            <GlassCard className={className} hover={false} glow={glow}>
                {(title || actions) && (
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100/50">
                        <div className="flex items-center gap-3">
                            {icon && (
                                <div
                                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                                    style={{
                                        background: glow ? `${glow}15` : 'rgba(59,130,246,0.1)',
                                    }}
                                >
                                    {icon}
                                </div>
                            )}
                            <div>
                                {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
                                {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                            </div>
                        </div>
                        {actions && <div className="flex items-center gap-2">{actions}</div>}
                    </div>
                )}
                <div className={paddingClasses[padding]}>
                    {children}
                </div>
            </GlassCard>
        );
    }

    return (
        <div className={cn("bg-white rounded-2xl border shadow-sm overflow-hidden", className)}>
            {(title || actions) && (
                <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        {icon && (
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                {icon}
                            </div>
                        )}
                        <div>
                            {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
                            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                        </div>
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>
            )}
            <div className={paddingClasses[padding]}>
                {children}
            </div>
        </div>
    );
};

// ============ SPLIT VIEW ============
export interface SplitViewProps {
    left: React.ReactNode;
    right: React.ReactNode;
    leftWidth?: string;
    rightWidth?: string;
    gap?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const SplitView: React.FC<SplitViewProps> = ({
    left,
    right,
    leftWidth = '2fr',
    rightWidth = '1fr',
    gap = 'md',
    className,
}) => {
    const gapClasses = {
        sm: 'gap-4',
        md: 'gap-6',
        lg: 'gap-8',
    };

    return (
        <div
            className={cn("grid", gapClasses[gap], className)}
            style={{ gridTemplateColumns: `${leftWidth} ${rightWidth}` }}
        >
            <div>{left}</div>
            <div>{right}</div>
        </div>
    );
};

// ============ TAB PANEL - GLASS ============
export interface TabItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
    badge?: number | string;
    content: React.ReactNode;
}

export interface TabPanelProps {
    tabs: TabItem[];
    activeTab?: string;
    onTabChange?: (tabId: string) => void;
    variant?: 'default' | 'pills' | 'underline';
    className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
    tabs,
    activeTab: externalActiveTab,
    onTabChange,
    variant = 'default',
    className,
}) => {
    const [internalActiveTab, setInternalActiveTab] = React.useState(tabs[0]?.id);
    const activeTab = externalActiveTab ?? internalActiveTab;

    const handleTabChange = (tabId: string) => {
        setInternalActiveTab(tabId);
        onTabChange?.(tabId);
    };

    const activeContent = tabs.find(t => t.id === activeTab)?.content;

    const tabStyles = {
        default: {
            container: 'bg-gray-100/80 backdrop-blur-sm p-1 rounded-xl',
            tab: 'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            active: 'bg-white text-gray-900 shadow-sm',
            inactive: 'text-gray-600 hover:text-gray-900',
        },
        pills: {
            container: 'flex gap-2',
            tab: 'px-4 py-2 rounded-full text-sm font-medium transition-all border',
            active: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-transparent shadow-lg shadow-blue-500/30',
            inactive: 'bg-white/80 text-gray-600 border-gray-200/80 hover:border-gray-300',
        },
        underline: {
            container: 'border-b border-gray-200/50',
            tab: 'px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px',
            active: 'text-blue-600 border-blue-600',
            inactive: 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300',
        },
    };

    const styles = tabStyles[variant];

    return (
        <div className={className}>
            <div className={cn("flex", styles.container)}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={cn(
                            styles.tab,
                            activeTab === tab.id ? styles.active : styles.inactive
                        )}
                    >
                        <span className="flex items-center gap-2">
                            {tab.icon}
                            {tab.label}
                            {tab.badge !== undefined && (
                                <span className={cn(
                                    "px-1.5 py-0.5 text-xs rounded-full",
                                    activeTab === tab.id
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-200 text-gray-600"
                                )}>
                                    {tab.badge}
                                </span>
                            )}
                        </span>
                    </button>
                ))}
            </div>
            <div className="mt-4">
                {activeContent}
            </div>
        </div>
    );
};

// ============ EMPTY STATE - GLASS ============
export interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    className,
}) => {
    return (
        <GlassCard className={cn("py-16 text-center", className)} hover={false}>
            <div className="flex flex-col items-center">
                {icon && (
                    <div
                        className="w-16 h-16 mb-4 rounded-2xl flex items-center justify-center text-gray-400"
                        style={{
                            background: 'linear-gradient(135deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.05) 100%)',
                        }}
                    >
                        {icon}
                    </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                {description && (
                    <p className="text-sm text-gray-500 mt-1 max-w-md">{description}</p>
                )}
                {action && (
                    <button
                        onClick={action.onClick}
                        className="mt-4 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:scale-105"
                        style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            boxShadow: '0 8px 24px -8px rgba(59,130,246,0.5)',
                        }}
                    >
                        {action.label}
                    </button>
                )}
            </div>
        </GlassCard>
    );
};

// ============ SKELETON LOADERS - GLASS ============
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
    <GlassCard className={cn("p-5", className)} hover={false}>
        <div className="animate-pulse">
            <div className="h-4 bg-gray-200/60 rounded w-1/3 mb-3" />
            <div className="h-8 bg-gray-200/60 rounded w-1/2 mb-2" />
            <div className="h-3 bg-gray-100/60 rounded w-2/3" />
        </div>
    </GlassCard>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number; className?: string }> = ({
    rows = 5,
    columns = 4,
    className,
}) => (
    <GlassCard className={cn("overflow-hidden", className)} hover={false}>
        <div className="animate-pulse">
            <div className="p-4 flex gap-4 border-b border-gray-100/50">
                {Array.from({ length: columns }).map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200/60 rounded flex-1" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="p-4 border-t border-gray-100/30 flex gap-4">
                    {Array.from({ length: columns }).map((_, j) => (
                        <div key={j} className="h-4 bg-gray-100/60 rounded flex-1" />
                    ))}
                </div>
            ))}
        </div>
    </GlassCard>
);

// ============ PREMIUM STAT CARD ============
export interface PremiumStatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow';
    trend?: { value: number; positive: boolean };
    onClick?: () => void;
}

const colorMap = {
    blue: { gradient: '#3b82f6', shadow: 'rgba(59,130,246,0.3)', text: 'text-blue-600' },
    green: { gradient: '#10b981', shadow: 'rgba(16,185,129,0.3)', text: 'text-emerald-600' },
    purple: { gradient: '#8b5cf6', shadow: 'rgba(139,92,246,0.3)', text: 'text-purple-600' },
    orange: { gradient: '#f59e0b', shadow: 'rgba(245,158,11,0.3)', text: 'text-amber-600' },
    red: { gradient: '#ef4444', shadow: 'rgba(239,68,68,0.3)', text: 'text-red-600' },
    yellow: { gradient: '#eab308', shadow: 'rgba(234,179,8,0.3)', text: 'text-yellow-600' },
};

export const PremiumStatCard: React.FC<PremiumStatCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    color,
    trend,
    onClick,
}) => {
    const colors = colorMap[color];

    return (
        <GlassCard
            className={cn("p-5", onClick && "cursor-pointer")}
            glow={colors.gradient}
        >
            <div onClick={onClick}>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-600">{title}</span>
                    <div
                        className="p-2.5 rounded-xl"
                        style={{
                            background: `linear-gradient(135deg, ${colors.gradient} 0%, ${colors.gradient}dd 100%)`,
                            boxShadow: `0 4px 12px -2px ${colors.shadow}`,
                        }}
                    >
                        <div className="text-white">{icon}</div>
                    </div>
                </div>
                <div className={cn("text-2xl font-bold", colors.text)}>{value}</div>
                {trend && (
                    <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-500'}`}>
                        <span>{trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
                        <span className="text-gray-400">bu ay</span>
                    </div>
                )}
                {subtitle && !trend && (
                    <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
                )}
            </div>
        </GlassCard>
    );
};

export default PageLayout;
