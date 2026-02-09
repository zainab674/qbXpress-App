
import React from 'react';

interface CustomDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm: () => void;
    onCancel?: () => void;
}

const CustomDialog: React.FC<CustomDialogProps> = ({ isOpen, title, message, type, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#f0f0f0] border-2 border-[#003366] shadow-2xl w-[400px] rounded-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-[#003366] to-[#0055aa] text-white px-3 py-2 flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider">{title}</span>
                    <button onClick={onCancel || onConfirm} className="hover:bg-red-500 rounded px-1.5 transition-colors">✕</button>
                </div>
                <div className="p-6 bg-white flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#003366] font-bold text-xl">{type === 'alert' ? '!' : '?'}</span>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-gray-700 leading-relaxed font-medium">{message}</p>
                    </div>
                </div>
                <div className="bg-[#e0e0e0] p-3 flex justify-end gap-2 border-t border-gray-300">
                    {type === 'confirm' && (
                        <button
                            onClick={onCancel}
                            className="px-5 py-1.5 border border-gray-400 bg-gray-100 hover:bg-gray-200 text-xs font-bold rounded shadow-sm transition-all"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        className="px-6 py-1.5 bg-[#003366] hover:bg-[#004488] text-white text-xs font-bold rounded shadow-md transition-all active:scale-95"
                    >
                        {type === 'confirm' ? 'Confirm' : 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomDialog;
