
import React, { useState } from 'react';
import { Address } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (address: Address) => void;
    initialAddress?: Address;
    title: string;
}

const AddressDialog: React.FC<Props> = ({ isOpen, onClose, onSave, initialAddress, title }) => {
    const [address, setAddress] = useState<Address>(() => {
        const defaults = {
            Line1: '',
            Line2: '',
            City: '',
            CountrySubDivisionCode: '',
            PostalCode: '',
            Country: 'USA'
        };
        return initialAddress ? { ...defaults, ...initialAddress } : defaults;
    });

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(address);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[500] p-4 font-sans">
            <div className="bg-white w-[95vw] h-[95vh] rounded shadow-2xl border border-gray-400 overflow-hidden flex flex-col">
                {/* Title Bar */}
                <div className="bg-[#003366] p-2 text-white font-bold text-xs flex justify-between items-center select-none">
                    <span>{title}</span>
                    <button onClick={onClose} className="hover:bg-red-600 px-2 rounded-sm transition-colors">X</button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic flex justify-between items-center">
                            <span>Street Address</span>
                            {(!address.Line3 || !address.Line4) && (
                                <button
                                    onClick={() => {
                                        if (!address.Line3) setAddress({ ...address, Line3: ' ' });
                                        else if (!address.Line4) setAddress({ ...address, Line4: ' ' });
                                    }}
                                    className="text-[8px] text-blue-600 hover:underline font-bold"
                                >
                                    + Add lines
                                </button>
                            )}
                        </label>
                        <input
                            className="w-full border p-2 text-xs outline-none focus:border-blue-500 bg-gray-50"
                            placeholder="Address Line 1"
                            value={address.Line1 || ''}
                            onChange={e => setAddress({ ...address, Line1: e.target.value })}
                        />
                        <input
                            className="w-full border p-2 text-xs outline-none focus:border-blue-500 bg-gray-50 mt-1"
                            placeholder="Address Line 2"
                            value={address.Line2 || ''}
                            onChange={e => setAddress({ ...address, Line2: e.target.value })}
                        />
                        {(address.Line3 !== undefined) && (
                            <input
                                className="w-full border p-2 text-xs outline-none focus:border-blue-500 bg-gray-50 mt-1"
                                placeholder="Address Line 3"
                                value={address.Line3 === ' ' ? '' : address.Line3}
                                onChange={e => setAddress({ ...address, Line3: e.target.value })}
                            />
                        )}
                        {(address.Line4 !== undefined) && (
                            <input
                                className="w-full border p-2 text-xs outline-none focus:border-blue-500 bg-gray-50 mt-1"
                                placeholder="Address Line 4"
                                value={address.Line4 === ' ' ? '' : address.Line4}
                                onChange={e => setAddress({ ...address, Line4: e.target.value })}
                            />
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">City</label>
                            <input
                                className="w-full border p-2 text-xs outline-none focus:border-blue-500 bg-gray-50"
                                value={address.City || ''}
                                onChange={e => setAddress({ ...address, City: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">State / Province</label>
                            <input
                                className="w-full border p-2 text-xs outline-none focus:border-blue-500 bg-gray-50"
                                value={address.CountrySubDivisionCode || ''}
                                onChange={e => setAddress({ ...address, CountrySubDivisionCode: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">ZIP / Postal Code</label>
                            <input
                                className="w-full border p-2 text-xs outline-none focus:border-blue-500 bg-gray-50"
                                value={address.PostalCode || ''}
                                onChange={e => setAddress({ ...address, PostalCode: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Country</label>
                            <input
                                className="w-full border p-2 text-xs outline-none focus:border-blue-500 bg-gray-50"
                                value={address.Country || ''}
                                onChange={e => setAddress({ ...address, Country: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="bg-blue-50 p-3 rounded border border-blue-100 mt-6">
                        <p className="text-[9px] font-bold text-blue-800 uppercase mb-2">Preview</p>
                        <div className="text-[11px] font-mono whitespace-pre-line text-gray-600 bg-white p-2 border shadow-inner min-h-[60px]">
                            {address.Line1 || '(No Street Address)'}
                            {address.Line2 ? `\n${address.Line2}` : ''}
                            {address.Line3 ? `\n${address.Line3}` : ''}
                            {address.Line4 ? `\n${address.Line4}` : ''}
                            {`\n${address.City || ''}${address.City && address.CountrySubDivisionCode ? ', ' : ''}${address.CountrySubDivisionCode || ''} ${address.PostalCode || ''}`.trim() || '\n(City, State Zip)'}
                            {address.Country ? `\n${address.Country}` : ''}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-100 p-4 border-t flex justify-end gap-3">
                    <button
                        onClick={handleSave}
                        className="px-8 py-2 bg-[#0077c5] text-white text-[10px] font-black uppercase tracking-widest rounded shadow hover:brightness-110"
                    >
                        OK
                    </button>
                    <button
                        onClick={onClose}
                        className="px-8 py-2 bg-white border border-gray-400 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded shadow hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddressDialog;
