import React, { useState, useEffect, useRef } from 'react';
import { sendEmail, fetchAvailableLots } from '../services/api';
import { useData } from '../contexts/DataContext';
import { Customer, Item, Transaction, TransactionItem, QBClass, SalesRep, Term, PriceLevel } from '../types';
import { generatePDF } from '../services/printService';

interface Props {
    customers: Customer[];
    items: Item[];
    classes: QBClass[];
    salesReps: SalesRep[];
    shipVia: string[];
    terms: Term[];
    transactions: Transaction[];
    initialData?: Transaction;
    priceLevels: PriceLevel[];
    onSave: (tx: Transaction) => void;
    onClose: () => void;
}

const SalesOrderForm: React.FC<Props> = ({ customers, items: availableItems, classes, salesReps, shipVia, terms, transactions, priceLevels, onSave, onClose, initialData }) => {
    const { formLayouts, companyConfig } = useData();
    const [activeTab, setActiveTab] = useState('Main');
    const [selectedCustomerId, setSelectedCustomerId] = useState(initialData?.entityId || customers[0]?.id || '');
    const [selectedTermId, setSelectedTermId] = useState(initialData?.terms ? (terms.find(t => t.name === initialData.terms)?.id || '') : '');
    const [date, setDate] = useState(initialData?.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }));

    const lastSO = transactions.filter(t => t.type === 'SALES_ORDER').reduce((max, t) => Math.max(max, parseInt(t.refNo) || 0), 1000);
    const [soNo, setSoNo] = useState(initialData?.refNo || (lastSO + 1).toString());
    const [memo, setMemo] = useState(initialData?.memo || '');
    const [trackingNo, setTrackingNo] = useState(initialData?.trackingNo || '');
    const [shipDate, setShipDate] = useState(initialData?.shipDate || '');
    const [fob, setFob] = useState(initialData?.fob || '');
    const [selectedShipVia, setSelectedShipVia] = useState(initialData?.shipVia || '');

    const [lineItems, setLineItems] = useState<Partial<TransactionItem>[]>(
        initialData?.items?.map(i => ({ ...i, id: i.id || crypto.randomUUID() })) ||
        [{ id: crypto.randomUUID(), description: '', quantity: 0, rate: 0, amount: 0, tax: true, classId: '' }]
    );

    const [isPrinting, setIsPrinting] = useState(false);
    const [isEmailing, setIsEmailing] = useState(false);
    const [billAddr, setBillAddr] = useState<string>(initialData?.BillAddr?.Line1 || '');
    const [shipAddr, setShipAddr] = useState<string>(initialData?.ShipAddr?.Line1 || '');
    const [email, setEmail] = useState(initialData?.email || '');
    const [availableLotsMap, setAvailableLotsMap] = useState<Record<string, any[]>>({});

    const subtotal = lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);

    const handleAddItem = () => {
        setLineItems([...lineItems, { id: crypto.randomUUID(), description: '', quantity: 0, rate: 0, amount: 0, tax: true, classId: '' }]);
    };

    const handleRemoveItem = (id: string) => {
        setLineItems(lineItems.filter(item => item.id !== id));
    };

    const updateLineItem = (id: string, updates: Partial<TransactionItem>) => {
        setLineItems(lineItems.map(item => {
            if (item.id === id) {
                const updated = { ...item, ...updates };
                if (updates.quantity !== undefined || updates.rate !== undefined) {
                    updated.amount = (updated.quantity || 0) * (updated.rate || 0);
                }
                return updated;
            }
            return item;
        }));
    };

    const handleItemSelect = async (id: string, itemId: string) => {
        const item = availableItems.find(i => i.id === itemId);
        if (item) {
            updateLineItem(id, { itemId: item.id, description: item.description || item.name, rate: item.salesPrice || 0, tax: item.taxCode === 'Tax' });

            if (item.type === 'Inventory Part' || item.type === 'Inventory Assembly') {
                try {
                    const lots = await fetchAvailableLots(item.id);
                    setAvailableLotsMap(prev => ({ ...prev, [item.id]: lots }));
                    if (lots && lots.length > 0) {
                        updateLineItem(id, { lotNumber: lots[0].lotNumber });
                    }
                } catch (err) {
                    console.error('Error fetching lots:', err);
                }
            }
        }
    };

    const handleSave = async (stayOpen = false) => {
        if (!selectedCustomerId) { alert("Please select a customer."); return; }
        const validItems = lineItems.filter(i => (i.amount || 0) !== 0 || i.description);
        if (validItems.length === 0) { alert("Please add at least one line item."); return; }

        try {
            await onSave({
                id: initialData?.id || crypto.randomUUID(),
                type: 'SALES_ORDER',
                refNo: soNo,
                date: date,
                entityId: selectedCustomerId,
                total: subtotal,
                status: 'OPEN',
                shipVia: selectedShipVia || undefined,
                memo: memo,
                trackingNo: trackingNo,
                shipDate: shipDate,
                fob: fob,
                terms: terms.find(t => t.id === selectedTermId)?.name,
                email,
                items: validItems.map(i => ({
                    id: i.id || crypto.randomUUID(),
                    itemId: i.itemId,
                    description: i.description || '',
                    quantity: i.quantity || 0,
                    rate: i.rate || 0,
                    amount: i.amount || 0,
                    tax: !!i.tax,
                    classId: i.classId,
                    lotNumber: i.lotNumber
                })),
                BillAddr: { Line1: billAddr },
                ShipAddr: { Line1: shipAddr }
            } as any);

            if (!stayOpen) onClose();
            else {
                setLineItems([{ id: crypto.randomUUID(), description: '', quantity: 0, rate: 0, amount: 0, tax: true }]);
                setSoNo((parseInt(soNo) + 1).toString());
            }
        } catch (err: any) {
            alert(err.message || "Failed to save Sales Order");
        }
    };

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col font-sans">
            <div className="bg-white border-b border-gray-300">
                <div className="flex bg-gray-100 text-sm font-bold px-2 pt-1">
                    {['Main', 'Send/Ship'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2.5 border-t border-l border-r rounded-t-sm mr-0.5 transition-colors ${activeTab === tab ? 'bg-white border-gray-400 text-[#003366]' : 'bg-gray-200 border-transparent hover:bg-gray-50 text-gray-500'}`}>{tab}</button>
                    ))}
                </div>
                <div className="p-2 flex gap-4 bg-white border-t border-gray-300 overflow-x-auto shadow-sm">
                    <button onClick={() => handleSave(false)} className="flex flex-col items-center group"><div className="w-10 h-10 bg-gray-50 border-2 border-gray-200 rounded flex items-center justify-center text-blue-700 hover:bg-blue-100 transition-colors text-xl">💾</div><span className="text-xs font-bold mt-1">Save</span></button>
                    <button onClick={onClose} className="flex flex-col items-center group"><div className="w-10 h-10 bg-gray-50 border-2 border-gray-200 rounded flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors text-xl">✖</div><span className="text-xs font-bold mt-1">Close</span></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white border border-gray-300 m-2 rounded shadow-xl">
                <div className="flex justify-between items-start mb-8">
                    <div className="space-y-4">
                        <h1 className="text-5xl font-serif italic text-[#003366] drop-shadow-sm pb-2">Sales Order</h1>
                        <div className="flex flex-col pt-2">
                            <label className="text-xs font-bold text-gray-600 uppercase italic mb-1">Customer</label>
                            <select className="border-b-2 border-blue-300 bg-blue-50/50 px-3 py-2 text-base font-bold w-96 outline-none focus:border-blue-600 shadow-sm" value={selectedCustomerId} onChange={e => {
                                const custId = e.target.value;
                                setSelectedCustomerId(custId);
                                const customer = customers.find(c => c.id === custId);
                                if (customer) {
                                    setBillAddr(customer.address || '');
                                    setShipAddr(customer.address || '');
                                    setEmail(customer.email || '');
                                }
                            }}>
                                <option value="">Select a Customer</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold text-gray-600 uppercase mb-1">Order total</div>
                        <div className="text-4xl font-black text-blue-900 drop-shadow-sm">PRs{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                </div>

                <div className="flex gap-8 mb-8">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-600 uppercase italic">Bill To</label>
                        <textarea
                            className="border-2 border-gray-300 rounded p-3 text-sm w-72 h-32 outline-none focus:ring-2 ring-blue-500 italic bg-gray-50 font-bold focus:border-blue-500 shadow-inner"
                            value={billAddr}
                            onChange={e => setBillAddr(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-gray-600 uppercase italic">Ship To</label>
                        <textarea
                            className="border-2 border-gray-300 rounded p-3 text-sm w-72 h-32 outline-none focus:ring-2 ring-blue-500 italic bg-gray-50 font-bold focus:border-blue-500 shadow-inner"
                            value={shipAddr}
                            onChange={e => setShipAddr(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-4 text-right pl-10">
                        <div className="text-xs font-bold text-gray-600 uppercase self-center">Date</div>
                        <input type="text" className="border-b-2 border-gray-300 px-2 py-1.5 text-sm text-right outline-none focus:border-blue-600 font-bold" value={date} onChange={e => setDate(e.target.value)} />
                        <div className="text-xs font-bold text-gray-600 uppercase self-center">Sales Order #</div>
                        <input type="text" className="border-b-2 border-gray-300 px-2 py-1.5 text-sm text-right outline-none focus:border-blue-600 font-mono font-bold" value={soNo} onChange={e => setSoNo(e.target.value)} />
                    </div>
                </div>

                <div className="border-2 border-gray-400 rounded-lg overflow-hidden bg-gray-50 shadow-md">
                    <table className="w-full text-sm">
                        <thead className="bg-[#003366] border-b-2 border-gray-900 text-white font-bold">
                            <tr>
                                <th className="px-4 py-3 text-left w-24 border-r border-gray-600">Qty</th>
                                <th className="px-4 py-3 text-left w-64 border-r border-gray-600">Item</th>
                                <th className="px-4 py-3 text-left border-r border-gray-600">Description</th>
                                <th className="px-4 py-3 text-left w-32 border-r border-gray-600">Lot</th>
                                <th className="px-4 py-3 text-right w-32 border-r border-gray-600">Rate</th>
                                <th className="px-4 py-3 text-right w-32 border-r border-gray-600">Amount</th>
                                <th className="px-4 py-3 text-center w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {lineItems.map(item => (
                                <tr key={item.id} className="border-b-2 border-gray-200 hover:bg-blue-50/80 group transition-colors">
                                    <td className="p-0 border-r-2 border-gray-200"><input type="number" className="w-full px-4 py-3 bg-transparent outline-none text-right font-bold text-sm" value={item.quantity || ''} onChange={e => updateLineItem(item.id!, { quantity: parseFloat(e.target.value) || 0 })} /></td>
                                    <td className="p-0 border-r-2 border-gray-200"><select className="w-full px-4 py-3 bg-transparent outline-none appearance-none font-bold text-sm" value={item.itemId} onChange={e => handleItemSelect(item.id!, e.target.value)}><option value="">Select Item...</option>{availableItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></td>
                                    <td className="p-0 border-r-2 border-gray-200"><input className="w-full px-4 py-3 bg-transparent outline-none italic text-gray-700 font-medium text-sm" value={item.description || ''} onChange={e => updateLineItem(item.id!, { description: e.target.value })} /></td>
                                    <td className="p-0 border-r-2 border-gray-200">
                                        <select
                                            className="w-full px-4 py-3 bg-transparent outline-none appearance-none font-bold text-xs"
                                            value={item.lotNumber || ''}
                                            onChange={e => updateLineItem(item.id!, { lotNumber: e.target.value })}
                                        >
                                            <option value="">--Lot--</option>
                                            {availableLotsMap[item.itemId!]?.map(lot => (
                                                <option key={lot.lotNumber} value={lot.lotNumber}>
                                                    {lot.lotNumber} ({lot.quantityRemaining} left)
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-0 border-r-2 border-gray-200"><input type="number" className="w-full px-4 py-3 bg-transparent outline-none text-right font-bold text-sm" value={item.rate || ''} onChange={e => updateLineItem(item.id!, { rate: parseFloat(e.target.value) || 0 })} /></td>
                                    <td className="px-4 py-3 border-r-2 border-gray-200 text-right font-black text-blue-900 text-sm">{(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="px-1 py-3 text-center"><button onClick={() => handleRemoveItem(item.id!)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-base">✕</button></td>
                                </tr>
                            ))}
                            <tr className="bg-gray-100/50 hover:bg-gray-100 transition-colors"><td colSpan={7} className="px-4 py-2"><button onClick={handleAddItem} className="text-xs font-black text-blue-700 hover:text-blue-900 uppercase tracking-wide cursor-pointer flex items-center gap-2"><span className="text-lg">+</span> Add Line Item</button></td></tr>
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 flex justify-end gap-3 border-t pt-6">
                    <button onClick={() => handleSave(true)} className="px-8 py-2 bg-white border border-gray-400 rounded-sm text-xs font-bold hover:bg-gray-50 shadow-sm active:translate-y-px transition-all">Save & New</button>
                    <button onClick={() => handleSave(false)} className="px-8 py-2 bg-[#0077c5] text-white rounded-sm text-xs font-bold hover:bg-[#005fa0] shadow-md active:translate-y-px transition-all">Save & Close</button>
                </div>
            </div>
        </div>
    );
};

export default SalesOrderForm;
