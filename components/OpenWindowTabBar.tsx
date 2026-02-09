import React from 'react';
import { AppWindow } from '../types';

const XIcon = ({ size = 12 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

const HomeIcon = ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
);

interface TabBarProps {
    openWindows: AppWindow[];
    activeWindowId: string | null;
    onFocus: (id: string) => void;
    onClose: (id: string) => void;
    onOpenHome: () => void;
}

export const OpenWindowTabBar: React.FC<TabBarProps> = ({ openWindows, activeWindowId, onFocus, onClose, onOpenHome }) => {
    return (
        <div className="flex items-center bg-[#e1e6eb] border-b border-gray-300 h-9 px-1 gap-0.5 overflow-x-auto no-scrollbar select-none">
            <button
                onClick={onOpenHome}
                className={`flex items-center gap-2 px-4 h-full text-[12px] font-medium transition-all border-r border-gray-300 hover:bg-white/50 ${!activeWindowId ? 'bg-white text-blue-700 shadow-[0_-2px_0_inset_#1a5fb4]' : 'text-gray-600'}`}
            >
                <HomeIcon size={14} />
                <span>Home</span>
            </button>

            {openWindows.map((win) => {
                const isActive = win.id === activeWindowId;
                return (
                    <div
                        key={win.id}
                        className={`group relative flex items-center min-w-[120px] max-w-[200px] h-full text-[12px] transition-all border-r border-gray-300 cursor-pointer ${isActive ? 'bg-white text-blue-700 shadow-[0_-2px_0_inset_#1a5fb4]' : 'bg-[#d1d9e0] text-gray-600 hover:bg-[#c4cfd9]'}`}
                        onClick={() => onFocus(win.id)}
                    >
                        <div className="flex items-center gap-2 px-3 flex-1 overflow-hidden">
                            <span className="truncate whitespace-nowrap">{win.title}</span>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose(win.id);
                            }}
                            className={`p-1 mr-1 rounded-full bg-transparent hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        >
                            <XIcon size={12} />
                        </button>
                    </div>
                );
            })}

            {openWindows.length === 0 && !activeWindowId && (
                <div className="flex-1 flex items-center justify-center">
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">No Open Windows</span>
                </div>
            )}
        </div>
    );
};
