import React, { useState, useEffect } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    defaultName: string;
}

const SaveAsReportDialog: React.FC<Props> = ({ isOpen, onClose, onSave, defaultName }) => {
    const [reportName, setReportName] = useState(defaultName);

    useEffect(() => {
        if (isOpen) {
            setReportName(defaultName);
        }
    }, [isOpen, defaultName]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[3000] animate-in fade-in duration-200">
            <div className="bg-white w-[500px] shadow-2xl border border-gray-300 rounded-sm overflow-hidden flex flex-col font-sans animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-[#003366] p-2 text-white font-bold text-[13px] flex justify-between items-center select-none shadow-sm">
                    <span>Save as new report?</span>
                    <button onClick={onClose} className="hover:bg-red-600 px-2 transition-colors">✕</button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <h2 className="text-xl font-bold text-gray-800">Save as new report?</h2>
                    <p className="text-[13px] text-gray-600 leading-relaxed">
                        Changes will be saved to the new report. This report will remain unchanged.
                    </p>

                    <div className="pt-2">
                        <label className="block text-[12px] text-gray-500 mb-1.5 font-medium">Report name</label>
                        <input
                            autoFocus
                            type="text"
                            className="w-full border border-gray-300 p-2 text-[14px] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all rounded-sm shadow-sm"
                            value={reportName}
                            onChange={(e) => setReportName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onSave(reportName);
                                if (e.key === 'Escape') onClose();
                            }}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end gap-2.5">
                    <button
                        onClick={onClose}
                        className="px-6 py-1.5 bg-white border border-gray-300 text-[12px] font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm rounded-sm active:bg-gray-100"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(reportName)}
                        className="px-8 py-1.5 bg-[#003366] text-white text-[12px] font-bold hover:bg-[#004080] transition-all shadow-md active:scale-95 rounded-sm"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveAsReportDialog;
