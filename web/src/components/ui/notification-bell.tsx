/**
 * NotificationBell Component
 * 
 * Bildirim zili ve dropdown menüsü
 * Super Admin'den gelen bildirimleri gösterir
 */
import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle2, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notificationService, Notification } from '@/services/notificationService';

interface NotificationBellProps {
    className?: string;
}

const typeIcons = {
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
    success: CheckCircle2,
    announcement: Megaphone,
};

const typeColors = {
    info: 'text-blue-500 bg-blue-500/10',
    warning: 'text-yellow-500 bg-yellow-500/10',
    error: 'text-red-500 bg-red-500/10',
    success: 'text-green-500 bg-green-500/10',
    announcement: 'text-purple-500 bg-purple-500/10',
};

const priorityColors = {
    low: '',
    normal: '',
    high: 'border-l-2 border-l-yellow-500',
    urgent: 'border-l-2 border-l-red-500 bg-red-500/5',
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Bildirimleri dinle
        const unsubNotifications = notificationService.onNotifications((n) => {
            setNotifications(n);
        });

        const unsubCount = notificationService.onUnreadCountChange((count) => {
            setUnreadCount(count);
        });

        // Initial fetch
        notificationService.fetchNotifications();

        return () => {
            unsubNotifications();
            unsubCount();
        };
    }, []);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (id: string) => {
        await notificationService.markAsRead(id);
    };

    const handleMarkAllAsRead = async () => {
        await notificationService.markAllAsRead();
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Şimdi';
        if (diffMins < 60) return `${diffMins}dk önce`;
        if (diffHours < 24) return `${diffHours}sa önce`;
        if (diffDays < 7) return `${diffDays}g önce`;
        return date.toLocaleDateString('tr-TR');
    };

    return (
        <div className={cn('relative', className)} ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'relative p-2 rounded-lg',
                    'text-muted-foreground hover:text-foreground',
                    'hover:bg-muted/60',
                    'transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
                aria-label="Bildirimler"
            >
                <Bell className="h-5 w-5" />
                {/* Notification Badge */}
                {unreadCount > 0 && (
                    <span className={cn(
                        'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px]',
                        'flex items-center justify-center',
                        'text-[10px] font-medium text-white',
                        'bg-red-500 rounded-full',
                        'ring-2 ring-background',
                        unreadCount > 0 && 'animate-pulse'
                    )}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className={cn(
                    'absolute right-0 top-12 z-50',
                    'w-96 max-h-[480px]',
                    'bg-popover border border-border rounded-xl shadow-xl',
                    'overflow-hidden',
                    'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2',
                    'duration-200'
                )}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                        <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">Bildirimler</span>
                            {unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                                    {unreadCount} yeni
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                <span>Tümünü oku</span>
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="overflow-y-auto max-h-[380px]">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                    <Bell className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">Bildirim yok</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                    Yeni bildirimler burada görünecek
                                </p>
                            </div>
                        ) : (
                            notifications.map((notification) => {
                                const Icon = typeIcons[notification.notification_type] || Info;
                                const colorClass = typeColors[notification.notification_type] || typeColors.info;
                                const priorityClass = priorityColors[notification.priority] || '';

                                return (
                                    <div
                                        key={notification.id}
                                        className={cn(
                                            'p-4 border-b border-border/50 last:border-b-0',
                                            'hover:bg-muted/30 transition-colors cursor-pointer',
                                            !notification.is_read && 'bg-primary/5',
                                            priorityClass
                                        )}
                                        onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                                    >
                                        <div className="flex gap-3">
                                            {/* Icon */}
                                            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', colorClass)}>
                                                <Icon className="h-4 w-4" />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className={cn(
                                                        'text-sm font-medium truncate',
                                                        !notification.is_read && 'text-foreground',
                                                        notification.is_read && 'text-muted-foreground'
                                                    )}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-xs text-muted-foreground shrink-0">
                                                        {formatTime(notification.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                    {notification.message}
                                                </p>

                                                {/* Action Button */}
                                                {notification.action_url && notification.action_label && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(notification.action_url, '_blank');
                                                            handleMarkAsRead(notification.id);
                                                        }}
                                                        className="mt-2 text-xs text-primary hover:underline font-medium"
                                                    >
                                                        {notification.action_label} →
                                                    </button>
                                                )}
                                            </div>

                                            {/* Unread Indicator */}
                                            {!notification.is_read && (
                                                <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
