
import React, { createContext, useContext, useState, ReactNode } from 'react';
import CustomDialog from '../components/CustomDialog';

interface DialogContextType {
    showAlert: (message: string, title?: string) => void;
    showConfirm: (message: string, onConfirm: () => void, title?: string) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [dialog, setDialog] = useState<{ isOpen: boolean, title: string, message: string, type: 'alert' | 'confirm', onConfirm?: () => void, onCancel?: () => void }>({
        isOpen: false, title: '', message: '', type: 'alert'
    });

    const showAlert = (message: string, title: string = 'QuickBooks Message') => {
        setDialog({ isOpen: true, title, message, type: 'alert', onConfirm: () => setDialog(d => ({ ...d, isOpen: false })) });
    };

    const showConfirm = (message: string, onConfirm: () => void, title: string = 'QuickBooks Confirmation') => {
        setDialog({ isOpen: true, title, message, type: 'confirm', onConfirm: () => { onConfirm(); setDialog(d => ({ ...d, isOpen: false })); }, onCancel: () => setDialog(d => ({ ...d, isOpen: false })) });
    };

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm }}>
            {children}
            <CustomDialog
                isOpen={dialog.isOpen}
                title={dialog.title}
                message={dialog.message}
                type={dialog.type}
                onConfirm={dialog.onConfirm || (() => { })}
                onCancel={dialog.onCancel || (() => { })}
            />
        </DialogContext.Provider>
    );
};

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) throw new Error('useDialog must be used within a DialogProvider');
    return context;
};
