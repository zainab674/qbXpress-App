
import React, { useState } from 'react';

interface PrinterSetupProps {
    isOpen: boolean;
    onClose: () => void;
}

const PrinterSetupDialog: React.FC<PrinterSetupProps> = ({ isOpen, onClose }) => {
    const [formType, setFormType] = useState('Check/Paycheck');
    const [printer, setPrinter] = useState('System Default Printer');
    const [orientation, setOrientation] = useState('Portrait');

    if (!isOpen) return null;

    return (
        <div className="h-full w-full bg-[#f0f0f0] flex flex-col font-sans overflow-hidden">
            <div className="flex-1 flex flex-col bg-white overflow-hidden shadow-2xl border border-gray-400">
                <div className="bg-[#003366] text-white px-2 py-1 flex justify-between items-center text-sm font-bold">
                    <span>Printer Setup</span>
                    <button onClick={onClose} className="hover:bg-red-600 px-1">✕</button>
                </div>

                <div className="p-4 space-y-4 text-[12px]">
                    <div>
                        <label className="block font-bold mb-1">Form Name:</label>
                        <select
                            className="w-full border border-gray-400 p-1 bg-white"
                            value={formType}
                            onChange={(e) => setFormType(e.target.value)}
                        >
                            <option>Check/Paycheck</option>
                            <option>Invoice</option>
                            <option>Label</option>
                            <option>Credit Memo</option>
                            <option>Purchase Order</option>
                            <option>Report</option>
                        </select>
                    </div>

                    <div className="border border-gray-300 p-3 bg-white/50">
                        <h4 className="font-bold border-b border-gray-200 mb-2 pb-1">Printer Settings</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span>Printer Name:</span>
                                <span className="font-mono bg-white px-2 border">{printer}</span>
                            </div>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-1">
                                    <input type="radio" name="orient" checked={orientation === 'Portrait'} onChange={() => setOrientation('Portrait')} /> Portrait
                                </label>
                                <label className="flex items-center gap-1">
                                    <input type="radio" name="orient" checked={orientation === 'Landscape'} onChange={() => setOrientation('Landscape')} /> Landscape
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2 border-t border-gray-300">
                        <button onClick={onClose} className="bg-white border border-gray-400 px-4 py-1 hover:bg-gray-100 min-w-[80px]">OK</button>
                        <button onClick={onClose} className="bg-white border border-gray-400 px-4 py-1 hover:bg-gray-100 min-w-[80px]">Cancel</button>
                        <button className="bg-white border border-gray-400 px-4 py-1 hover:bg-gray-100 min-w-[80px]">Help</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrinterSetupDialog;
