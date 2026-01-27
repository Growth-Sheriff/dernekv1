import React from 'react';
import { Zap, Settings2, Sparkles } from 'lucide-react';
import { useViewMode } from '@/store/viewModeStore';
import { cn } from '@/lib/utils';

export const ViewModeToggle: React.FC = () => {
    const { mode, toggleMode, isSimple } = useViewMode();

    return (
        <div className="relative">
            {/* Glow Effect */}
            <div
                className={cn(
                    "absolute inset-0 rounded-full blur-lg opacity-40 transition-all duration-500",
                    isSimple ? "bg-gradient-to-r from-green-400 to-emerald-400" : "bg-gradient-to-r from-purple-400 to-indigo-400"
                )}
            />

            {/* Toggle Container */}
            <button
                onClick={toggleMode}
                className={cn(
                    "relative flex items-center gap-1 px-3 py-1.5 rounded-full transition-all duration-300",
                    "border shadow-lg backdrop-blur-sm",
                    isSimple
                        ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:border-green-300"
                        : "bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 hover:border-purple-300"
                )}
            >
                {/* Sliding Background */}
                <div
                    className={cn(
                        "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-out",
                        isSimple
                            ? "left-1 bg-gradient-to-r from-green-500 to-emerald-500"
                            : "left-[calc(50%+2px)] bg-gradient-to-r from-purple-500 to-indigo-500"
                    )}
                />

                {/* Simple Mode */}
                <div
                    className={cn(
                        "relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-200",
                        isSimple ? "text-white" : "text-gray-600"
                    )}
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Basit</span>
                </div>

                {/* Expert Mode */}
                <div
                    className={cn(
                        "relative z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-200",
                        !isSimple ? "text-white" : "text-gray-600"
                    )}
                >
                    <Settings2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">Expert</span>
                </div>
            </button>
        </div>
    );
};

// Compact version for smaller spaces
export const ViewModeToggleCompact: React.FC = () => {
    const { mode, toggleMode, isSimple } = useViewMode();

    return (
        <button
            onClick={toggleMode}
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200",
                "border text-sm font-medium",
                isSimple
                    ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
            )}
            title={isSimple ? "Expert moda geç" : "Basit moda geç"}
        >
            {isSimple ? (
                <>
                    <Sparkles className="w-4 h-4" />
                    Basit Mod
                </>
            ) : (
                <>
                    <Settings2 className="w-4 h-4" />
                    Expert Mod
                </>
            )}
        </button>
    );
};

// Badge Style
export const ViewModeBadge: React.FC = () => {
    const { isSimple } = useViewMode();

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                isSimple
                    ? "bg-green-100 text-green-700"
                    : "bg-purple-100 text-purple-700"
            )}
        >
            {isSimple ? (
                <>
                    <Sparkles className="w-3 h-3" />
                    Basit
                </>
            ) : (
                <>
                    <Settings2 className="w-3 h-3" />
                    Expert
                </>
            )}
        </span>
    );
};
