
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { FormLayout, FormLayoutField } from '../types';

const LayoutDesigner: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { formLayouts, setFormLayouts } = useData();
    const invoiceLayout = formLayouts.find(l => l.formType === 'INVOICE');

    const [fields, setFields] = useState<FormLayoutField[]>(invoiceLayout?.fields || [
        { id: 'date', label: 'Date', showOnScreen: true, showOnPrint: true },
        { id: 'refNo', label: 'Invoice #', showOnScreen: true, showOnPrint: true },
        { id: 'terms', label: 'Terms', showOnScreen: true, showOnPrint: true },
        { id: 'dueDate', label: 'Due Date', showOnScreen: true, showOnPrint: true },
        { id: 'shipDate', label: 'Ship Date', showOnScreen: false, showOnPrint: true },
        { id: 'shipVia', label: 'Ship Via', showOnScreen: false, showOnPrint: true },
        { id: 'quantity', label: 'Qty', showOnScreen: true, showOnPrint: true },
        { id: 'item', label: 'Item', showOnScreen: true, showOnPrint: true },
        { id: 'description', label: 'Description', showOnScreen: true, showOnPrint: true },
        { id: 'itemRate', label: 'Unit Price', showOnScreen: true, showOnPrint: true },
        { id: 'itemTax', label: 'Tax Column', showOnScreen: true, showOnPrint: false },
        { id: 'amount', label: 'Amount', showOnScreen: true, showOnPrint: true }
    ]);

    const toggle = (id: string, prop: 'showOnScreen' | 'showOnPrint') => {
        setFields(prev => prev.map(f => f.id === id ? { ...f, [prop]: !f[prop] } : f));
    };

    const handleSave = () => {
        const updatedLayouts = formLayouts.filter(l => l.formType !== 'INVOICE');
        updatedLayouts.push({
            formType: 'INVOICE',
            fields: fields
        });
        setFormLayouts(updatedLayouts);
        alert("Template layout saved for all future invoices.");
        onClose();
    };

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col font-sans select-none text-gray-900 border border-gray-400 shadow-2xl">
            <div className="bg-[#003366] text-white p-2 flex justify-between items-center shadow-md">
                <h2 className="text-sm font-bold flex items-center gap-2">🎨 Basic Layout Designer</h2>
                <button onClick={onClose} className="hover:bg-red-600 px-2 rounded font-bold">✕</button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-1/2 p-6 overflow-auto border-r border-gray-300 bg-white">
                    <h3 className="text-xs font-black text-blue-900 uppercase border-b-2 border-blue-900 pb-2 mb-4">Manage Columns - Invoice Template</h3>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b text-[10px] text-gray-500 font-bold uppercase">
                                <th className="text-left py-2">Field Label</th>
                                <th className="text-center py-2">Screen</th>
                                <th className="text-center py-2">Print</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fields.map(f => (
                                <tr key={f.id} className="border-b hover:bg-blue-50">
                                    <td className="py-3 font-bold">{f.label}</td>
                                    <td className="text-center">
                                        <input type="checkbox" checked={f.showOnScreen} onChange={() => toggle(f.id, 'showOnScreen')} />
                                    </td>
                                    <td className="text-center">
                                        <input type="checkbox" checked={f.showOnPrint} onChange={() => toggle(f.id, 'showOnPrint')} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex-1 bg-gray-200 p-8 flex flex-col items-center overflow-auto">
                    <div className="text-[10px] font-black text-gray-400 uppercase mb-2">Live Template Preview</div>
                    <div className="w-[400px] h-[520px] bg-white shadow-2xl border border-gray-400 p-6 flex flex-col gap-4 scale-90 origin-top">
                        <div className="flex justify-between items-start">
                            <div className="w-20 h-10 bg-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-500 uppercase">Logo</div>
                            <div className="text-right">
                                <h1 className="text-xl font-black text-blue-900 leading-none">INVOICE</h1>
                                <div className="text-[10px] text-gray-400 mt-1">#12345</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="p-2 border border-gray-100 rounded bg-gray-50">
                                <div className="text-[8px] font-bold text-gray-400 uppercase">Bill To</div>
                                <div className="h-10 text-[10px]">Customer Name</div>
                            </div>
                        </div>

                        <div className="flex-1 mt-4 border border-blue-900 rounded-sm overflow-hidden flex flex-col">
                            <div className="bg-blue-900 text-white text-[8px] flex font-bold uppercase">
                                <span className="p-2 flex-1">Description</span>
                                <span className="p-2 w-12 text-center">Qty</span>
                                {fields.find(f => f.id === 'itemRate')?.showOnPrint && <span className="p-2 w-16 text-right">Price</span>}
                                <span className="p-2 w-20 text-right">Amount</span>
                            </div>
                            <div className="flex-1 bg-white p-2">
                                <div className="flex text-[10px] border-b border-gray-100 py-1">
                                    <span className="flex-1 text-gray-700 font-bold">Service/Item Description</span>
                                    <span className="w-12 text-center">1.0</span>
                                    {fields.find(f => f.id === 'itemRate')?.showOnPrint && <span className="w-16 text-right">$150.00</span>}
                                    <span className="w-20 text-right">$150.00</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-200">
                            <div className="w-32">
                                <div className="flex justify-between text-[10px] font-black">
                                    <span>TOTAL</span>
                                    <span>$150.00</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-400 flex justify-end gap-2">
                <button onClick={handleSave} className="bg-blue-600 text-white px-8 py-2 rounded font-bold text-xs shadow-lg">Save Layout</button>
                <button onClick={onClose} className="bg-white border border-gray-300 px-8 py-2 rounded font-bold text-xs">Close</button>
            </div>
        </div>
    );
};

export default LayoutDesigner;
