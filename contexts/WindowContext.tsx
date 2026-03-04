
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ViewState, AppWindow } from '../types';

interface WindowContextType {
    openWindows: AppWindow[];
    activeWindowId: string | null;
    currentView: ViewState;
    openNewWindow: (type: ViewState, title: string, params?: any) => void;
    closeWindow: (id: string) => void;
    focusWindow: (id: string) => void;
    setCurrentView: (view: ViewState) => void;
    setOpenWindows: React.Dispatch<React.SetStateAction<AppWindow[]>>;
}

const WindowContext = createContext<WindowContextType | undefined>(undefined);

export const WindowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [openWindows, setOpenWindows] = useState<AppWindow[]>(() => {
        const saved = localStorage.getItem('openWindows');
        return saved ? JSON.parse(saved) : [];
    });
    const [currentView, setCurrentView] = useState<ViewState>(() => {
        const saved = localStorage.getItem('currentView');
        return (saved as ViewState) || 'LANDING';
    });

    useEffect(() => {
        localStorage.setItem('openWindows', JSON.stringify(openWindows));
    }, [openWindows]);

    useEffect(() => {
        localStorage.setItem('currentView', currentView);
    }, [currentView]);

    const focusWindow = (id: string) => {
        setOpenWindows(prev => {
            const maxZ = Math.max(...prev.map(w => w.zIndex), 0);
            const targetWin = prev.find(w => w.id === id);
            if (targetWin) setCurrentView(targetWin.type);
            return prev.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 } : w);
        });
    };

    const openNewWindow = (type: ViewState, title: string, params?: any) => {
        setOpenWindows(prev => {
            const existing = prev.find(w => w.type === type && JSON.stringify(w.params) === JSON.stringify(params));
            const maxZ = Math.max(...prev.map(w => w.zIndex), 0);
            if (existing) {
                setCurrentView(type);
                return prev.map(w => w.id === existing.id ? { ...w, zIndex: maxZ + 1 } : w);
            }
            const offset = (prev.length % 10) * 30;
            const newWin: AppWindow = {
                id: crypto.randomUUID(),
                type, title, zIndex: maxZ + 1, isMaximized: true,
                x: 40 + offset, y: 40 + offset, width: '100%', height: '100%', params
            };
            setCurrentView(type);
            return [...prev, newWin];
        });
    };

    const closeWindow = (id: string) => {
        setOpenWindows(prev => {
            const filtered = prev.filter(w => w.id !== id);
            if (filtered.length > 0) {
                const top = [...filtered].sort((a, b) => b.zIndex - a.zIndex)[0];
                setCurrentView(top.type);
            } else {
                setCurrentView('HOME');
            }
            return filtered;
        });
    };

    const activeWindowId = openWindows.length > 0 ? [...openWindows].sort((a, b) => b.zIndex - a.zIndex)[0].id : null;

    return (
        <WindowContext.Provider value={{ openWindows, activeWindowId, currentView, openNewWindow, closeWindow, focusWindow, setCurrentView, setOpenWindows }}>
            {children}
        </WindowContext.Provider>
    );
};

export const useWindow = () => {
    const context = useContext(WindowContext);
    if (!context) throw new Error('useWindow must be used within a WindowProvider');
    return context;
};
