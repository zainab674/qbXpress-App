import React, { useState, useEffect, useRef } from 'react';
import { sendEmail, fetchAvailableLots, fetchWarehouses, fetchSerialNumbers, fetchItemByBarcode } from '../services/api';
import BarcodeScanner from './BarcodeScanner';
import { useData } from '../contexts/DataContext';
import { Customer, Item, Transaction, TransactionItem, QBClass, SalesRep, Term, PriceLevel, Warehouse } from '../types';
import AddressSelector, { formatAddress } from './AddressSelector';
import { generatePDF } from '../services/printService';

interface Props {
    customers: Customer[];
    items: Item[];
    classes: QBClass[];
    salesReps: SalesRep[];
    shipVia: { id: string; name: string }[];
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
    const [linkedPOId, setLinkedPOId] = useState(
        initialData?.purchaseOrderId ||
        initialData?.linkedDocumentIds?.find(id => transactions.find(t => t.id === id && t.type === 'PURCHASE_ORDER')) ||
        ''
    );

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
    const [availableSerialsMap, setAvailableSerialsMap] = useState<Record<string, any[]>>({});
    const [oosSubstituteSuggestion, setOosSubstituteSuggestion] = useState<{ lineId: string; itemName: string; substitutes: { itemId: string; reason?: string }[] } | null>(null);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [fulfillmentWarehouseId, setFulfillmentWarehouseId] = useState(initialData?.fulfillmentWarehouseId || '');

    useEffect(() => {
        fetchWarehouses()
            .then((whs: Warehouse[]) => {
                setWarehouses(whs);
                if (!initialData?.fulfillmentWarehouseId) {
                    const def = whs.find(w => w.isDefault);
                    if (def) setFulfillmentWarehouseId(def.id);
                }
            })
            .catch(() => {});
    }, []);

    const subtotal = lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);

    const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

    const handleBarcodeDetected = async (barcode: string) => {
        setShowBarcodeScanner(false);
        try {
            const found = await fetchItemByBarcode(barcode);
            if (found) {
                const newId = crypto.randomUUID();
                setLineItems(prev => [...prev, {
                    id: newId,
                    itemId: found.id,
                    description: found.description || found.name || '',
                    quantity: 1,
                    rate: found.salesPrice || found.cost || 0,
                    amount: found.salesPrice || found.cost || 0,
                    tax: true,
                    classId: '',
                }]);
            } else {
                alert(`No item found for barcode: ${barcode}`);
            }
        } catch {
            alert(`No item found for barcode: ${barcode}`);
        }
    };

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
        const customer = customers.find(c => c.id === selectedCustomerId);
        const priceLevel = priceLevels.find(pl => pl.id === (customer as any)?.priceLevelId);
        if (item) {
            let rate = item.salesPrice || 0;
            if (priceLevel) {
                if (priceLevel.type === 'Fixed %') {
                    rate = rate * (1 + ((priceLevel as any).percentage || 0) / 100);
                } else if (priceLevel.type === 'Formula' && (priceLevel as any).formulaConfig) {
                    const fc = (priceLevel as any).formulaConfig;
                    const base = fc.baseOn === 'Cost' ? (item.cost || 0) : rate;
                    const factor = fc.adjustmentType === 'Increase' ? 1 : -1;
                    rate = base * (1 + (factor * fc.adjustmentAmount / 100));
                } else if (priceLevel.type === 'Per Item') {
                    const pl = priceLevel as any;
                    const fromObj = pl.perItemPrices?.[item.id];
                    const fromArr = (pl.itemPrices as { itemId: string; price: number }[] | undefined)?.find(ip => ip.itemId === item.id)?.price;
                    rate = fromObj ?? fromArr ?? rate;
                }
            }
            updateLineItem(id, { itemId: item.id, description: item.description || item.name, rate, tax: item.taxCode === 'Tax' });

            // QB Enterprise: only fetch/auto-suggest lots for items with lot tracking enabled
            if ((item.type === 'Inventory Part' || item.type === 'Inventory Assembly') && item.trackLots) {
                try {
                    const lots = await fetchAvailableLots(item.id);
                    setAvailableLotsMap(prev => ({ ...prev, [item.id]: lots }));
                    if (lots && lots.length > 0) {
                        updateLineItem(id, { lotNumber: lots[0].lotNumber });
                    }
                } catch (err) {
                    console.error('Error fetching lots:', err);
                }
            } else {
                updateLineItem(id, { lotNumber: '' });
            }
            // Fetch available in-stock serials for serial-tracked items
            if ((item.type === 'Inventory Part' || item.type === 'Inventory Assembly') && item.trackSerialNumbers) {
                fetchSerialNumbers(itemId, 'in-stock')
                    .then((serials: any[]) => setAvailableSerialsMap(prev => ({ ...prev, [itemId]: serials })))
                    .catch(() => {});
            } else {
                updateLineItem(id, { serialNumber: '' });
            }
            // QB Enterprise: if item is out of stock and has substitutes, suggest them
            const subs = (item as any).substituteItems as { itemId: string; reason?: string }[] | undefined;
            if ((item.onHand ?? 0) <= 0 && subs && subs.length > 0) {
                setOosSubstituteSuggestion({ lineId: id, itemName: item.name, substitutes: subs });
            } else {
                // Only dismiss the suggestion if it was for this same line (not for a different line)
                setOosSubstituteSuggestion(prev => prev?.lineId === id ? null : prev);
            }
        }
    };

    const handleSave = async (stayOpen = false) => {
        if (!selectedCustomerId) { alert("Please select a customer."); return; }
        const validItems = lineItems.filter(i => (i.amount || 0) !== 0 || i.description);
        if (validItems.length === 0) { alert("Please add at least one line item."); return; }
        // QB Enterprise: lot number is required for all lot-tracked items
        const missingLot = validItems.find(li => {
            const itm = availableItems.find(a => a.id === li.itemId);
            return itm?.trackLots && !li.lotNumber;
        });
        if (missingLot) {
            const itm = availableItems.find(a => a.id === missingLot.itemId);
            alert(`Lot number is required for "${itm?.name || missingLot.itemId}". Please select or enter a lot number before saving.`);
            return;
        }
        // Serial number required for serial-tracked items
        const missingSerial = validItems.find(li => {
            const itm = availableItems.find(a => a.id === li.itemId);
            return itm?.trackSerialNumbers && !li.serialNumber;
        });
        if (missingSerial) {
            const itm = availableItems.find(a => a.id === missingSerial.itemId);
            alert(`Serial number is required for "${itm?.name || missingSerial.itemId}". Please select a serial number before saving.`);
            return;
        }

        try {
            const soId = initialData?.id || crypto.randomUUID();

            // Build linked document IDs for the SO
            const existingLinkedIds: string[] = initialData?.linkedDocumentIds
                ? [...initialData.linkedDocumentIds]
                : [];
            if (linkedPOId && !existingLinkedIds.includes(linkedPOId)) {
                existingLinkedIds.push(linkedPOId);
            }

            await onSave({
                id: soId,
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
                purchaseOrderId: linkedPOId || undefined,
                fulfillmentWarehouseId: fulfillmentWarehouseId || undefined,
                linkedDocumentIds: existingLinkedIds.length > 0 ? existingLinkedIds : undefined,
                items: validItems.map(i => ({
                    id: i.id || crypto.randomUUID(),
                    itemId: i.itemId,
                    description: i.description || '',
                    quantity: i.quantity || 0,
                    rate: i.rate || 0,
                    amount: i.amount || 0,
                    tax: !!i.tax,
                    classId: i.classId,
                    lotNumber: i.lotNumber,
                    serialNumber: i.serialNumber,
                })),
                BillAddr: { Line1: billAddr },
                ShipAddr: { Line1: shipAddr }
            } as any);

            // Bidirectional: also update the linked PO to reference this SO
            if (linkedPOId) {
                const linkedPO = transactions.find(t => t.id === linkedPOId);
                if (linkedPO && !linkedPO.linkedDocumentIds?.includes(soId)) {
                    const updatedPOLinkedIds = [...(linkedPO.linkedDocumentIds || []), soId];
                    await onSave({ ...linkedPO, linkedDocumentIds: updatedPOLinkedIds } as any);
                }
            }

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
            {showBarcodeScanner && (
                <BarcodeScanner
                    onDetected={handleBarcodeDetected}
                    onClose={() => setShowBarcodeScanner(false)}
                />
            )}
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
                                    const bill = formatAddress(customer.BillAddr) || customer.address || '';
                                    const ship = formatAddress(customer.ShipAddr) || bill;
                                    setBillAddr(bill);
                                    setShipAddr(ship);
                                    setEmail(customer.email || '');
                                    // Reprice existing lines with the new customer's price level
                                    const priceLevel = priceLevels.find(pl => pl.id === (customer as any).priceLevelId);
                                    if (priceLevel) {
                                        setLineItems(prev => prev.map(li => {
                                            const itm = availableItems.find(a => a.id === li.itemId);
                                            if (!itm) return li;
                                            let rate = itm.salesPrice || 0;
                                            if (priceLevel.type === 'Fixed %') {
                                                rate = rate * (1 + ((priceLevel as any).percentage || 0) / 100);
                                            } else if (priceLevel.type === 'Formula' && (priceLevel as any).formulaConfig) {
                                                const fc = (priceLevel as any).formulaConfig;
                                                const base = fc.baseOn === 'Cost' ? (itm.cost || 0) : rate;
                                                const factor = fc.adjustmentType === 'Increase' ? 1 : -1;
                                                rate = base * (1 + (factor * fc.adjustmentAmount / 100));
                                            } else if (priceLevel.type === 'Per Item') {
                                                const pl = priceLevel as any;
                                                const fromObj = pl.perItemPrices?.[itm.id];
                                                const fromArr = (pl.itemPrices as { itemId: string; price: number }[] | undefined)?.find(ip => ip.itemId === itm.id)?.price;
                                                rate = fromObj ?? fromArr ?? rate;
                                            }
                                            const amount = (li.quantity || 0) * rate;
                                            return { ...li, rate, amount };
                                        }));
                                    }
                                }
                                // OOS status is independent of customer — keep the suggestion visible
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
                    <div className="w-72">
                        <AddressSelector
                            entity={customers.find(c => c.id === selectedCustomerId) || null}
                            value={billAddr}
                            onChange={setBillAddr}
                            label="Bill To"
                        />
                    </div>
                    <div className="w-72">
                        <AddressSelector
                            entity={customers.find(c => c.id === selectedCustomerId) || null}
                            value={shipAddr}
                            onChange={setShipAddr}
                            label="Ship To"
                        />
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-4 text-right pl-10">
                        <div className="text-xs font-bold text-gray-600 uppercase self-center">Date</div>
                        <input type="text" className="border-b-2 border-gray-300 px-2 py-1.5 text-sm text-right outline-none focus:border-blue-600 font-bold" value={date} onChange={e => setDate(e.target.value)} />
                        <div className="text-xs font-bold text-gray-600 uppercase self-center">Sales Order #</div>
                        <input type="text" className="border-b-2 border-gray-300 px-2 py-1.5 text-sm text-right outline-none focus:border-blue-600 font-mono font-bold" value={soNo} onChange={e => setSoNo(e.target.value)} />
                        <div className="text-xs font-bold text-gray-600 uppercase self-center">Purchase Order</div>
                        <select
                            className="border-b-2 border-indigo-300 bg-indigo-50/40 px-2 py-1.5 text-sm text-right outline-none focus:border-indigo-600 font-bold appearance-none"
                            value={linkedPOId}
                            onChange={e => setLinkedPOId(e.target.value)}
                        >
                            <option value="">-- None --</option>
                            {transactions
                                .filter(t => t.type === 'PURCHASE_ORDER')
                                .map(po => (
                                    <option key={po.id} value={po.id}>
                                        PO #{po.refNo}
                                    </option>
                                ))
                            }
                        </select>
                        <div className="text-xs font-bold text-emerald-700 uppercase self-center">Fulfillment Site</div>
                        <select
                            className="border-b-2 border-emerald-300 bg-emerald-50/40 px-2 py-1.5 text-sm text-right outline-none focus:border-emerald-600 font-bold appearance-none"
                            value={fulfillmentWarehouseId}
                            onChange={e => setFulfillmentWarehouseId(e.target.value)}
                        >
                            <option value="">-- No Warehouse --</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>
                                    {w.name}{w.isDefault ? ' (Default)' : ''}{w.code ? ` [${w.code}]` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* OOS Substitute Item Suggestion Banner */}
                {oosSubstituteSuggestion && (
                    <div className="mb-3 bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-start gap-4 shadow-sm">
                        <span className="text-2xl mt-0.5">⚠️</span>
                        <div className="flex-1">
                            <p className="text-xs font-black text-amber-800 uppercase tracking-wide mb-1">
                                "{oosSubstituteSuggestion.itemName}" is out of stock — substitute items available
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {oosSubstituteSuggestion.substitutes.map(sub => {
                                    const subItem = availableItems.find(i => i.id === sub.itemId);
                                    if (!subItem) return null;
                                    return (
                                        <button
                                            key={sub.itemId}
                                            onClick={() => {
                                                handleItemSelect(oosSubstituteSuggestion.lineId, sub.itemId);
                                                updateLineItem(oosSubstituteSuggestion.lineId, { itemId: sub.itemId });
                                                setOosSubstituteSuggestion(null);
                                            }}
                                            className="flex items-center gap-2 bg-white border-2 border-amber-300 hover:border-amber-500 hover:bg-amber-50 rounded-lg px-3 py-1.5 text-xs font-bold text-amber-900 transition-all"
                                        >
                                            <span className="font-black">{subItem.name}</span>
                                            {subItem.onHand !== undefined && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${subItem.onHand > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                                    {subItem.onHand} on hand
                                                </span>
                                            )}
                                            {sub.reason && <span className="text-[10px] text-amber-500 italic">— {sub.reason}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <button onClick={() => setOosSubstituteSuggestion(null)} className="text-amber-400 hover:text-amber-700 font-black text-lg leading-none">×</button>
                    </div>
                )}

                <div className="border-2 border-gray-400 rounded-lg overflow-hidden bg-gray-50 shadow-md">
                    <table className="w-full text-sm">
                        <thead className="bg-[#003366] border-b-2 border-gray-900 text-white font-bold">
                            <tr>
                                <th className="px-4 py-3 text-left w-24 border-r border-gray-600">Qty</th>
                                <th className="px-4 py-3 text-left w-64 border-r border-gray-600">Item</th>
                                <th className="px-4 py-3 text-left border-r border-gray-600">Description</th>
                                <th className="px-4 py-3 text-left w-32 border-r border-gray-600">Lot</th>
                                <th className="px-4 py-3 text-left w-32 border-r border-gray-600 text-teal-300">Serial #</th>
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
                                        {(() => {
                                            const lineItem = availableItems.find(a => a.id === item.itemId);
                                            // QB Enterprise: lot cell is only active for items with lot tracking enabled
                                            if (!lineItem?.trackLots) {
                                                return <span className="px-4 py-3 block text-gray-300 text-xs select-none">—</span>;
                                            }
                                            const lots = availableLotsMap[item.itemId!] || [];
                                            const selectedLot = lots.find((l: any) => l.lotNumber === item.lotNumber);
                                            const now = new Date();
                                            const isExpired = selectedLot?.expirationDate && new Date(selectedLot.expirationDate) <= now;
                                            const expiringSoon = selectedLot?.expirationDate && !isExpired && (new Date(selectedLot.expirationDate).getTime() - now.getTime()) < 30 * 24 * 60 * 60 * 1000;
                                            const missingRequired = !item.lotNumber;
                                            return (
                                                <div className="relative">
                                                    <select
                                                        className={`w-full px-4 py-3 bg-transparent outline-none appearance-none font-bold text-xs
                                                            ${isExpired ? 'text-red-700' : expiringSoon ? 'text-amber-700' : ''}
                                                            ${missingRequired ? 'border-l-2 border-red-400' : ''}`}
                                                        value={item.lotNumber || ''}
                                                        onChange={e => updateLineItem(item.id!, { lotNumber: e.target.value })}
                                                    >
                                                        <option value="">-- Required * --</option>
                                                        {lots.map((lot: any) => {
                                                            const lotExpired = lot.expirationDate && new Date(lot.expirationDate) <= now;
                                                            const lotExpiringSoon = lot.expirationDate && !lotExpired && (new Date(lot.expirationDate).getTime() - now.getTime()) < 30 * 24 * 60 * 60 * 1000;
                                                            const expLabel = lot.expirationDate ? ` · exp ${new Date(lot.expirationDate).toLocaleDateString()}` : '';
                                                            const flag = lotExpired ? ' ⚠ EXPIRED' : lotExpiringSoon ? ' ⚠ Exp Soon' : '';
                                                            return (
                                                                <option key={lot.lotNumber} value={lot.lotNumber}>
                                                                    {lot.lotNumber} ({lot.quantityRemaining} left{expLabel}{flag})
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                    {isExpired && <div className="absolute bottom-0 left-0 right-0 text-[8px] font-black text-red-600 bg-red-50 text-center leading-3 pb-0.5">EXPIRED LOT</div>}
                                                    {expiringSoon && !isExpired && <div className="absolute bottom-0 left-0 right-0 text-[8px] font-black text-amber-600 bg-amber-50 text-center leading-3 pb-0.5">EXPIRING SOON</div>}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="p-0 border-r-2 border-gray-200">
                                        {(() => {
                                            const lineItem = availableItems.find(a => a.id === item.itemId);
                                            if (!lineItem?.trackSerialNumbers) {
                                                return <span className="px-4 py-3 block text-gray-300 text-xs select-none">—</span>;
                                            }
                                            const serials = availableSerialsMap[item.itemId!] || [];
                                            const missing = !item.serialNumber;
                                            return (
                                                <select
                                                    className={`w-full px-4 py-3 bg-transparent outline-none appearance-none font-bold text-xs text-teal-800 ${missing ? 'border-l-2 border-red-400' : ''}`}
                                                    value={item.serialNumber || ''}
                                                    onChange={e => updateLineItem(item.id!, { serialNumber: e.target.value })}
                                                >
                                                    <option value="">-- Required * --</option>
                                                    {serials.map((sn: any) => (
                                                        <option key={sn.serialNumber} value={sn.serialNumber}>
                                                            {sn.serialNumber}{sn.warehouseId && sn.warehouseId !== 'DEFAULT' ? ` · ${sn.warehouseId}` : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            );
                                        })()}
                                    </td>
                                    <td className="p-0 border-r-2 border-gray-200"><input type="number" className="w-full px-4 py-3 bg-transparent outline-none text-right font-bold text-sm" value={item.rate || ''} onChange={e => updateLineItem(item.id!, { rate: parseFloat(e.target.value) || 0 })} /></td>
                                    <td className="px-4 py-3 border-r-2 border-gray-200 text-right font-black text-blue-900 text-sm">{(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="px-1 py-3 text-center"><button onClick={() => handleRemoveItem(item.id!)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-base">✕</button></td>
                                </tr>
                            ))}
                            <tr className="bg-gray-100/50 hover:bg-gray-100 transition-colors"><td colSpan={8} className="px-4 py-2 flex items-center gap-4"><button onClick={handleAddItem} className="text-xs font-black text-blue-700 hover:text-blue-900 uppercase tracking-wide cursor-pointer flex items-center gap-2"><span className="text-lg">+</span> Add Line Item</button><button type="button" onClick={() => setShowBarcodeScanner(true)} className="text-xs font-black text-orange-600 hover:text-orange-800 uppercase tracking-wide cursor-pointer flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M3 17v2a2 2 0 002 2h2m10-18h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2" /></svg> Scan Barcode</button></td></tr>
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
