import React, { useState, useEffect } from 'react';
import { Brain, X, Sparkles, MessageSquare, Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface AssistantInsight {
    type: 'success' | 'warning' | 'info' | 'prediction';
    message: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface SmartAssistantProps {
    insights: AssistantInsight[];
    className?: string;
    autoOpen?: boolean;
}

export const SmartAssistant: React.FC<SmartAssistantProps> = ({
    insights,
    className,
    autoOpen = true
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentInsightIndex, setCurrentInsightIndex] = useState(0);
    const [hasInteracted, setHasInteracted] = useState(false);

    // Auto open with delay
    useEffect(() => {
        if (autoOpen && !hasInteracted && insights.length > 0) {
            const timer = setTimeout(() => {
                setIsOpen(true);
            }, 1500); // 1.5s delay after page load
            return () => clearTimeout(timer);
        }
    }, [autoOpen, hasInteracted, insights]);

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(false);
        setHasInteracted(true);
    };

    const handleToggle = () => {
        setIsOpen(!isOpen);
        setHasInteracted(true);
    };

    const currentInsight = insights[currentInsightIndex];

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <TrendingUp className="w-5 h-5 text-emerald-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case 'prediction': return <Sparkles className="w-5 h-5 text-purple-500" />;
            default: return <Lightbulb className="w-5 h-5 text-blue-500" />;
        }
    };

    const getGradient = (type: string) => {
        switch (type) {
            case 'success': return 'from-emerald-50 to-teal-50 border-emerald-100';
            case 'warning': return 'from-amber-50 to-orange-50 border-amber-100';
            case 'prediction': return 'from-purple-50 to-fuchsia-50 border-purple-100';
            default: return 'from-blue-50 to-indigo-50 border-blue-100';
        }
    };

    if (insights.length === 0) return null;

    return (
        <div className={cn("fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4", className)}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={cn(
                            "w-80 rounded-2xl shadow-xl border backdrop-blur-md overflow-hidden",
                            "bg-gradient-to-br",
                            getGradient(currentInsight.type)
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-white/40 border-b border-white/20">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-white/60 shadow-sm">
                                    <Brain className="w-4 h-4 text-indigo-600" />
                                </div>
                                <span className="text-sm font-bold text-gray-800">Bader AI</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-700">BETA</span>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-1 rounded-full hover:bg-black/5 transition-colors"
                                title="Gizle"
                            >
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 relative">
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 mt-1">
                                    {getIcon(currentInsight.type)}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-800 font-medium leading-relaxed">
                                        {currentInsight.message}
                                    </p>

                                    {currentInsight.action && (
                                        <button
                                            onClick={currentInsight.action.onClick}
                                            className="mt-3 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                                        >
                                            {currentInsight.action.label} →
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Navigation dots if multiple insights */}
                            {insights.length > 1 && (
                                <div className="flex justify-center gap-1.5 mt-4">
                                    {insights.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentInsightIndex(idx)}
                                            className={cn(
                                                "w-1.5 h-1.5 rounded-full transition-all",
                                                idx === currentInsightIndex
                                                    ? "bg-indigo-600 w-3"
                                                    : "bg-indigo-200 hover:bg-indigo-400"
                                            )}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Trigger Button */}
            <motion.button
                onClick={handleToggle}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                    "relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300",
                    isOpen
                        ? "bg-white text-indigo-600 border-2 border-indigo-100"
                        : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                )}
            >
                {/* Pulse Effect */}
                {!isOpen && !hasInteracted && (
                    <span className="absolute inset-0 rounded-full animate-ping bg-indigo-500 opacity-20" />
                )}

                {isOpen ? (
                    <X className="w-6 h-6" />
                ) : (
                    <Brain className="w-6 h-6" />
                )}

                {/* Badge */}
                {!isOpen && insights.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                        {insights.length}
                    </span>
                )}
            </motion.button>
        </div>
    );
};
