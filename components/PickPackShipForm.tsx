import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Transaction, Item, Warehouse, Bin } from '../types';
import { fetchWarehouses, fetchBins, fetchAvailableLots, fetchSerialNumbers, fetchCarrierRates, fetchCarrierTracking, validateCarrierTracking, fetchCarrierStatus, CarrierRate } from '../services/api';

interface Props {
    salesOrder: Transaction;
    items: Item[];
    onClose: () => void;
    onShip: (shipment: ShipmentRecord) => void;
}

export interface ShipmentRecord {
    soId: string;
    soRefNo: string;
    warehouseId: string;
    binId?: string;
    lines: ShipmentLine[];
    packages: Package[];
    trackingNo: string;
    carrier: string;
    shippedDate: string;
    notes: string;
    freightCost?: number;
}

interface ShipmentLine {
    lineId: string;
    itemId: string;
    itemName: string;
    orderedQty: number;
    pickedQty: number;
    packedQty: number;
    lotNumber?: string;
    serialNumber?: string;
    binId?: string;
    packageIndex?: number; // which package this line goes into
}

interface Package {
    id: string;
    label: string; // e.g. "Box 1", "Box 2"
    weight: number;
    weightUnit: 'lb' | 'kg';
    length: number;
    width: number;
    height: number;
    dimUnit: 'in' | 'cm';
    lineIds: string[]; // which ShipmentLine IDs are in this package
}

type Step = 'PICK' | 'PACK' | 'SHIP';

const CARRIERS = ['UPS', 'FedEx', 'DHL', 'USPS', 'Freight', 'Courier', 'Other'];
const API_CARRIERS = ['UPS', 'FedEx', 'USPS'];

const newPackage = (index: number): Package => ({
    id: crypto.randomUUID(),
    label: `Box ${index + 1}`,
    weight: 0,
    weightUnit: 'lb',
    length: 0,
    width: 0,
    height: 0,
    dimUnit: 'in',
    lineIds: [],
});

const PickPackShipForm: React.FC<Props> = ({ salesOrder, items, onClose, onShip }) => {
    const [step, setStep] = useState<Step>('PICK');
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [allBins, setAllBins] = useState<Bin[]>([]);
    const [warehouseId, setWarehouseId] = useState(salesOrder.fulfillmentWarehouseId || '');
    const [binId, setBinId] = useState('');
    const [carrier, setCarrier] = useState('');
    const [trackingNo, setTrackingNo] = useState('');
    const [shippedDate, setShippedDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [freightCost, setFreightCost] = useState(0);
    const [freightEstimated, setFreightEstimated] = useState(false);

    // Carrier API state
    const [originZip, setOriginZip] = useState('');
    const [destZip, setDestZip] = useState('');
    const [carrierRates, setCarrierRates] = useState<CarrierRate[]>([]);
    const [carrierRateErrors, setCarrierRateErrors] = useState<Record<string, string>>({});
    const [ratesLoading, setRatesLoading] = useState(false);
    const [ratesFetched, setRatesFetched] = useState(false);
    const [selectedRate, setSelectedRate] = useState<CarrierRate | null>(null);
    const [configuredCarriers, setConfiguredCarriers] = useState<string[]>([]);
    const [trackingValidation, setTrackingValidation] = useState<{ valid: boolean; error?: string } | null>(null);
    const [trackingLookup, setTrackingLookup] = useState<{ status: string; estimatedDelivery: string | null; events: any[] } | null>(null);
    const [trackingLookupLoading, setTrackingLookupLoading] = useState(false);
    const trackingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [lines, setLines] = useState<ShipmentLine[]>(() =>
        salesOrder.items.map(li => {
            const catalogItem = items.find(i => i.id === li.itemId);
            return {
                lineId: li.id || crypto.randomUUID(),
                itemId: li.itemId || '',
                itemName: catalogItem?.name || li.description || li.itemId || 'Item',
                orderedQty: li.quantity || 0,
                pickedQty: li.quantity || 0,
                packedQty: li.quantity || 0,
                lotNumber: li.lotNumber,
                packageIndex: 0,
            };
        })
    );

    // Multiple packages state – starts with one default package
    const [packages, setPackages] = useState<Package[]>([newPackage(0)]);

    // FIFO lots available per itemId
    const [availableLotsMap, setAvailableLotsMap] = useState<Record<string, any[]>>({});
    // In-stock serials available per itemId
    const [availableSerialsMap, setAvailableSerialsMap] = useState<Record<string, any[]>>({});

    // Load carrier API status on mount
    useEffect(() => {
        fetchCarrierStatus()
            .then(data => setConfiguredCarriers(data.status.filter(s => s.apiEnabled).map(s => s.carrier)))
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetchWarehouses()
            .then((whs: Warehouse[]) => {
                setWarehouses(whs);
                if (!warehouseId) {
                    const def = whs.find(w => w.isDefault);
                    if (def) setWarehouseId(def.id);
                }
            })
            .catch(() => {});
        fetchBins()
            .then((bins: Bin[]) => setAllBins(bins))
            .catch(() => {});

        // Pre-load FIFO available lots and in-stock serials for every inventory line
        const uniqueItemIds = [...new Set(salesOrder.items.map((li: any) => li.itemId).filter(Boolean))];
        uniqueItemIds.forEach(async (itemId: string) => {
            try {
                const lots = await fetchAvailableLots(itemId);
                setAvailableLotsMap(prev => ({ ...prev, [itemId]: lots }));
                setLines(prev => prev.map(l =>
                    l.itemId === itemId && !l.lotNumber && lots.length > 0
                        ? { ...l, lotNumber: lots[0].lotNumber }
                        : l
                ));
            } catch { /* silent */ }
            try {
                const serials = await fetchSerialNumbers(itemId, 'in-stock');
                if (serials && serials.length > 0) {
                    setAvailableSerialsMap(prev => ({ ...prev, [itemId]: serials }));
                }
            } catch { /* silent */ }
        });
    }, []);

    const availableBins = useMemo(
        () => allBins.filter((b: Bin) => b.warehouseId === warehouseId && b.isActive),
        [allBins, warehouseId]
    );

    const selectedWarehouse = warehouses.find((w: Warehouse) => w.id === warehouseId);

    const updateLine = (lineId: string, updates: Partial<ShipmentLine>) => {
        setLines(prev => prev.map(l => l.lineId === lineId ? { ...l, ...updates } : l));
    };

    const updatePackage = (pkgId: string, updates: Partial<Package>) => {
        setPackages(prev => prev.map(p => p.id === pkgId ? { ...p, ...updates } : p));
    };

    const addPackage = () => {
        setPackages(prev => [...prev, newPackage(prev.length)]);
    };

    const removePackage = (pkgId: string) => {
        if (packages.length <= 1) return; // keep at least one
        setPackages(prev => prev.filter(p => p.id !== pkgId));
        // Unassign lines from removed package
        setLines(prev => prev.map(l =>
            packages.find(p => p.id === pkgId && p.lineIds.includes(l.lineId))
                ? { ...l, packageIndex: 0 }
                : l
        ));
    };

    const toggleLineInPackage = (pkgId: string, lineId: string) => {
        setPackages(prev => prev.map(p => {
            if (p.id === pkgId) {
                const has = p.lineIds.includes(lineId);
                return { ...p, lineIds: has ? p.lineIds.filter(id => id !== lineId) : [...p.lineIds, lineId] };
            }
            // Remove from other packages (1 line = 1 package)
            return { ...p, lineIds: p.lineIds.filter(id => id !== lineId) };
        }));
    };

    const totalPicked = lines.reduce((s, l) => s + l.pickedQty, 0);
    const totalOrdered = lines.reduce((s, l) => s + l.orderedQty, 0);
    const allPicked = lines.every(l => l.pickedQty > 0 && l.pickedQty <= l.orderedQty);
    const allPacked = lines.every(l => l.packedQty > 0 && l.packedQty <= l.pickedQty);

    const totalWeight = packages.reduce((s, p) => s + p.weight, 0);

    const handleGetRates = useCallback(async () => {
        if (!originZip || !destZip) {
            alert('Enter origin and destination ZIP codes to get live rates.');
            return;
        }
        if (totalWeight === 0) {
            alert('Enter package weights in the Pack step before fetching rates.');
            return;
        }

        setRatesLoading(true);
        setCarrierRates([]);
        setCarrierRateErrors({});
        setRatesFetched(false);

        // Determine which carriers to query
        const carriersToQuery = carrier && API_CARRIERS.includes(carrier)
            ? [carrier]
            : configuredCarriers.filter(c => API_CARRIERS.includes(c));

        try {
            const response = await fetchCarrierRates({
                carriers: carriersToQuery.length > 0 ? carriersToQuery : undefined,
                originZip,
                destZip,
                packages: packages.map(pkg => ({
                    weight: pkg.weight,
                    weightUnit: pkg.weightUnit,
                    length: pkg.length,
                    width: pkg.width,
                    height: pkg.height,
                    dimUnit: pkg.dimUnit,
                })),
            });

            setCarrierRates(response.allRates || []);
            setCarrierRateErrors(response.errors || {});
            setRatesFetched(true);
        } catch (err: any) {
            setCarrierRateErrors({ general: err.message || 'Failed to fetch rates' });
            setRatesFetched(true);
        } finally {
            setRatesLoading(false);
        }
    }, [originZip, destZip, carrier, packages, totalWeight, configuredCarriers]);

    const handleSelectRate = (rate: CarrierRate) => {
        setSelectedRate(rate);
        setCarrier(rate.carrier);
        setFreightCost(rate.totalCharges);
        setFreightEstimated(true);
    };

    const handleTrackingChange = useCallback((value: string) => {
        setTrackingNo(value);
        setTrackingValidation(null);
        setTrackingLookup(null);

        if (trackingDebounceRef.current) clearTimeout(trackingDebounceRef.current);

        if (!value || value.length < 5) return;

        trackingDebounceRef.current = setTimeout(async () => {
            if (!carrier) return;

            // Format validation (instant, no API call)
            try {
                const validation = await validateCarrierTracking(carrier, value);
                setTrackingValidation(validation);
            } catch {
                // Ignore validation errors
            }
        }, 500);
    }, [carrier]);

    const handleLookupTracking = async () => {
        if (!carrier || !trackingNo || !API_CARRIERS.includes(carrier)) return;
        setTrackingLookupLoading(true);
        setTrackingLookup(null);
        try {
            const result = await fetchCarrierTracking(carrier, trackingNo);
            setTrackingLookup(result);
        } catch (err: any) {
            setTrackingLookup({ status: `Error: ${err.message}`, estimatedDelivery: null, events: [] });
        } finally {
            setTrackingLookupLoading(false);
        }
    };

    const handlePrintPackingSlip = () => {
        const html = `<!DOCTYPE html><html><head><title>Packing Slip – SO #${salesOrder.refNo}</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
                h1 { font-size: 20px; margin-bottom: 4px; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                th { background: #003366; color: white; padding: 6px 8px; text-align: left; font-size: 11px; }
                td { padding: 5px 8px; border-bottom: 1px solid #ddd; }
                .header { display: flex; justify-content: space-between; margin-bottom: 16px; }
                .section { margin-top: 16px; }
                .pkg { border: 1px solid #ccc; padding: 8px; margin-top: 8px; border-radius: 4px; }
                @media print { body { padding: 0; } }
            </style></head><body>
            <div class="header">
                <div><h1>Packing Slip</h1><p>Sales Order: <strong>#${salesOrder.refNo}</strong></p><p>Ship Date: <strong>${shippedDate}</strong></p></div>
                <div style="text-align:right"><p>Carrier: <strong>${carrier || '—'}</strong></p><p>Tracking: <strong>${trackingNo || '—'}</strong></p></div>
            </div>
            <table>
                <thead><tr><th>Item</th><th>Description</th><th>Lot #</th><th>Serial #</th><th>Qty Packed</th></tr></thead>
                <tbody>
                    ${lines.map(l => `<tr><td>${l.itemName}</td><td></td><td>${l.lotNumber || '—'}</td><td>${l.serialNumber || '—'}</td><td><strong>${l.packedQty}</strong></td></tr>`).join('')}
                </tbody>
            </table>
            ${packages.length > 1 ? `<div class="section"><strong>Package Breakdown:</strong>${packages.map((p) => `<div class="pkg"><strong>${p.label}</strong> — ${p.weight} ${p.weightUnit} — ${p.length}×${p.width}×${p.height} ${p.dimUnit}<br/>${p.lineIds.map(lid => { const l = lines.find(x => x.lineId === lid); return l ? `&nbsp;&nbsp;• ${l.itemName} (${l.packedQty})` : ''; }).join('<br/>')}</div>`).join('')}</div>` : ''}
            <div style="margin-top:24px;font-size:10px;color:#666;">Generated by qbXpress · ${new Date().toLocaleString()}</div>
            </body></html>`;

        // Use a hidden iframe + blob URL to avoid popup blocker interference
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const frame = document.createElement('iframe');
        frame.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;';
        document.body.appendChild(frame);
        frame.src = url;
        frame.onload = () => {
            try {
                frame.contentWindow?.focus();
                frame.contentWindow?.print();
            } finally {
                setTimeout(() => {
                    document.body.removeChild(frame);
                    URL.revokeObjectURL(url);
                }, 500);
            }
        };
    };

    const handleShip = () => {
        if (!carrier) { alert('Please select a carrier.'); return; }
        onShip({
            soId: salesOrder.id,
            soRefNo: salesOrder.refNo,
            warehouseId,
            binId: binId || undefined,
            lines,
            packages,
            trackingNo,
            carrier,
            shippedDate,
            notes,
            freightCost: freightCost || undefined,
        });
    };

    const stepIndex = { PICK: 0, PACK: 1, SHIP: 2 }[step];

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col font-sans">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-300">
                <div className="flex bg-gray-100 text-sm font-bold px-2 pt-1">
                    <button className="px-5 py-2.5 border-t border-l border-r rounded-t-sm bg-white border-gray-400 text-[#003366]">
                        Pick, Pack &amp; Ship
                    </button>
                </div>
                <div className="p-2 flex gap-4 bg-white border-t border-gray-300">
                    <button onClick={onClose} className="flex flex-col items-center group">
                        <div className="w-10 h-10 bg-gray-50 border-2 border-gray-200 rounded flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors text-xl">✖</div>
                        <span className="text-xs font-bold mt-1">Close</span>
                    </button>
                    {step === 'PACK' && (
                        <button onClick={handlePrintPackingSlip} className="flex flex-col items-center group">
                            <div className="w-10 h-10 bg-gray-50 border-2 border-gray-200 rounded flex items-center justify-center text-gray-700 hover:bg-gray-100 transition-colors text-xl">🖨️</div>
                            <span className="text-xs font-bold mt-1">Packing Slip</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white border border-gray-300 m-2 rounded shadow-xl">
                {/* Step Header */}
                <div className="flex items-center gap-0 mb-8">
                    {(['PICK', 'PACK', 'SHIP'] as Step[]).map((s, i) => {
                        const icons = ['🔍', '📦', '🚚'];
                        const labels = ['1. Pick', '2. Pack', '3. Ship'];
                        const done = i < stepIndex;
                        const active = s === step;
                        return (
                            <React.Fragment key={s}>
                                <button
                                    onClick={() => { if (done || active) setStep(s); }}
                                    className={`flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest rounded-full transition-all
                                        ${active ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' :
                                          done ? 'bg-emerald-100 text-emerald-700 cursor-pointer' :
                                          'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                >
                                    <span className="text-base">{icons[i]}</span>
                                    {labels[i]}
                                    {done && <span className="ml-1">✓</span>}
                                </button>
                                {i < 2 && <div className={`h-0.5 w-8 ${i < stepIndex ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
                            </React.Fragment>
                        );
                    })}
                    <div className="ml-auto text-right">
                        <p className="text-xs text-gray-400 font-bold uppercase">Sales Order</p>
                        <p className="text-lg font-black text-blue-900 font-mono">#{salesOrder.refNo}</p>
                    </div>
                </div>

                {/* Warehouse / Bin selector (shown on all steps) */}
                <div className="flex gap-4 mb-6 p-4 bg-violet-50 border border-violet-200 rounded-xl">
                    <div className="flex flex-col gap-1 flex-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-violet-600">Fulfillment Warehouse</label>
                        <select
                            className="border-2 border-violet-200 bg-white px-3 py-2 text-sm font-bold text-violet-900 outline-none focus:border-violet-500 rounded-lg"
                            value={warehouseId}
                            onChange={e => { setWarehouseId(e.target.value); setBinId(''); }}
                        >
                            <option value="">-- Select Warehouse --</option>
                            {warehouses.map((w: Warehouse) => (
                                <option key={w.id} value={w.id}>
                                    {w.name}{w.isDefault ? ' (Default)' : ''}{(w as any).code ? ` [${(w as any).code}]` : ''}
                                </option>
                            ))}
                        </select>
                        {(selectedWarehouse as any)?.address && (
                            <p className="text-[10px] text-violet-400 italic pl-1">{(selectedWarehouse as any).address}</p>
                        )}
                    </div>
                    {availableBins.length > 0 && (
                        <div className="flex flex-col gap-1 flex-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-violet-600">Dispatch Bin</label>
                            <select
                                className="border-2 border-violet-200 bg-white px-3 py-2 text-sm font-bold text-violet-900 outline-none focus:border-violet-500 rounded-lg"
                                value={binId}
                                onChange={e => setBinId(e.target.value)}
                            >
                                <option value="">-- Any Bin --</option>
                                {availableBins.map((b: Bin) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}{(b as any).zone ? ` | Zone: ${(b as any).zone}` : ''}{(b as any).aisle ? ` | Aisle: ${(b as any).aisle}` : ''}
                                        {(b as any).shelf ? ` | Shelf: ${(b as any).shelf}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* ── PICK STEP ── */}
                {step === 'PICK' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-black text-slate-800">Pick Items from Warehouse</h2>
                            <span className="text-xs font-bold text-slate-500">{totalPicked} / {totalOrdered} units to pick</span>
                        </div>
                        <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-[#003366] text-white">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-black uppercase text-xs">Item</th>
                                        <th className="px-4 py-3 text-left font-black uppercase text-xs">Lot #</th>
                                        <th className="px-4 py-3 text-left font-black uppercase text-xs text-teal-300">Serial #</th>
                                        <th className="px-4 py-3 text-center font-black uppercase text-xs">Ordered</th>
                                        <th className="px-4 py-3 text-center font-black uppercase text-xs text-amber-300">Pick Qty</th>
                                        <th className="px-4 py-3 text-left font-black uppercase text-xs">Bin Location</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {lines.map(line => (
                                        <tr key={line.lineId} className="hover:bg-violet-50/40 transition-colors">
                                            <td className="px-4 py-3 font-bold text-slate-800">{line.itemName}</td>
                                            <td className="px-4 py-3">
                                                {(() => {
                                                    const lots: any[] = availableLotsMap[line.itemId] || [];
                                                    if (lots.length === 0) {
                                                        return (
                                                            <input
                                                                type="text"
                                                                placeholder="Lot #"
                                                                className="w-28 border border-violet-200 rounded px-2 py-1 text-xs font-mono text-violet-900 bg-white outline-none focus:border-violet-500"
                                                                value={line.lotNumber || ''}
                                                                onChange={e => updateLine(line.lineId, { lotNumber: e.target.value })}
                                                            />
                                                        );
                                                    }
                                                    return (
                                                        <div className="flex flex-col gap-0.5">
                                                            <select
                                                                className="w-36 border border-violet-200 rounded px-2 py-1 text-xs font-bold text-violet-900 bg-white outline-none focus:border-violet-500"
                                                                value={line.lotNumber || ''}
                                                                onChange={e => updateLine(line.lineId, { lotNumber: e.target.value })}
                                                            >
                                                                <option value="">-- FIFO Lot --</option>
                                                                {lots.map((l: any) => (
                                                                    <option key={l.lotNumber} value={l.lotNumber}>
                                                                        {l.lotNumber} ({l.quantityRemaining} avail)
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {line.lotNumber && (() => {
                                                                const chosen = lots.find((l: any) => l.lotNumber === line.lotNumber);
                                                                return chosen?.expirationDate ? (
                                                                    <span className="text-[9px] text-amber-600 font-bold pl-1">
                                                                        Exp: {new Date(chosen.expirationDate).toLocaleDateString()}
                                                                    </span>
                                                                ) : null;
                                                            })()}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-4 py-3">
                                                {(() => {
                                                    const serials: any[] = availableSerialsMap[line.itemId] || [];
                                                    if (serials.length === 0) {
                                                        return <span className="text-xs text-slate-300 italic">—</span>;
                                                    }
                                                    return (
                                                        <select
                                                            className="w-36 border border-teal-200 rounded px-2 py-1 text-xs font-bold text-teal-900 bg-white outline-none focus:border-teal-500"
                                                            value={line.serialNumber || ''}
                                                            onChange={e => updateLine(line.lineId, { serialNumber: e.target.value })}
                                                        >
                                                            <option value="">-- Select S/N --</option>
                                                            {serials.map((sn: any) => (
                                                                <option key={sn.serialNumber} value={sn.serialNumber}>{sn.serialNumber}</option>
                                                            ))}
                                                        </select>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-slate-500">{line.orderedQty}</td>
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={line.orderedQty}
                                                    className="w-20 border-2 border-amber-200 rounded-lg px-2 py-1 text-center font-black text-amber-800 bg-amber-50 outline-none focus:border-amber-500"
                                                    value={line.pickedQty}
                                                    onChange={e => updateLine(line.lineId, { pickedQty: Math.min(line.orderedQty, Math.max(0, parseFloat(e.target.value) || 0)) })}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                {availableBins.length > 0 ? (
                                                    <select
                                                        className="border border-gray-200 rounded px-2 py-1 text-xs font-bold text-slate-600 bg-white outline-none focus:border-violet-400"
                                                        value={line.binId || ''}
                                                        onChange={e => updateLine(line.lineId, { binId: e.target.value })}
                                                    >
                                                        <option value="">-- Any --</option>
                                                        {availableBins.map((b: Bin) => (
                                                            <option key={b.id} value={b.id}>
                                                                {b.name}{(b as any).aisle ? ` A${(b as any).aisle}` : ''}{(b as any).shelf ? `-S${(b as any).shelf}` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">No bins configured</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setStep('PACK')}
                                disabled={!allPicked}
                                className="px-8 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-2"
                            >
                                Next: Pack
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PACK STEP ── */}
                {step === 'PACK' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-black text-slate-800">Pack Items for Shipment</h2>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-500">{packages.length} package{packages.length !== 1 ? 's' : ''}</span>
                                <button
                                    onClick={addPackage}
                                    className="px-4 py-2 bg-violet-100 hover:bg-violet-200 text-violet-800 font-black text-xs rounded-lg transition-colors"
                                >
                                    + Add Package
                                </button>
                            </div>
                        </div>

                        {/* Per-package cards */}
                        <div className="space-y-4 mb-6">
                            {packages.map((pkg, pkgIdx) => (
                                <div key={pkg.id} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                                    {/* Package header */}
                                    <div className="bg-slate-700 text-white px-4 py-2 flex items-center gap-4">
                                        <input
                                            type="text"
                                            className="bg-transparent border-b border-slate-400 text-sm font-black outline-none focus:border-white w-24"
                                            value={pkg.label}
                                            onChange={e => updatePackage(pkg.id, { label: e.target.value })}
                                        />
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-slate-300">Weight:</span>
                                            <input
                                                type="number"
                                                min={0}
                                                step={0.1}
                                                className="bg-slate-600 border border-slate-500 rounded px-2 py-0.5 w-16 text-center font-bold outline-none focus:border-slate-300"
                                                value={pkg.weight || ''}
                                                onChange={e => updatePackage(pkg.id, { weight: parseFloat(e.target.value) || 0 })}
                                            />
                                            <select
                                                className="bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-xs font-bold outline-none"
                                                value={pkg.weightUnit}
                                                onChange={e => updatePackage(pkg.id, { weightUnit: e.target.value as 'lb' | 'kg' })}
                                            >
                                                <option>lb</option>
                                                <option>kg</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                            <span className="text-slate-300">L×W×H:</span>
                                            {(['length', 'width', 'height'] as const).map((dim, di) => (
                                                <React.Fragment key={dim}>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step={0.5}
                                                        className="bg-slate-600 border border-slate-500 rounded px-1 py-0.5 w-12 text-center font-bold outline-none focus:border-slate-300"
                                                        value={pkg[dim] || ''}
                                                        onChange={e => updatePackage(pkg.id, { [dim]: parseFloat(e.target.value) || 0 })}
                                                    />
                                                    {di < 2 && <span className="text-slate-400">×</span>}
                                                </React.Fragment>
                                            ))}
                                            <select
                                                className="bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-xs font-bold outline-none ml-1"
                                                value={pkg.dimUnit}
                                                onChange={e => updatePackage(pkg.id, { dimUnit: e.target.value as 'in' | 'cm' })}
                                            >
                                                <option>in</option>
                                                <option>cm</option>
                                            </select>
                                        </div>
                                        <div className="ml-auto flex items-center gap-2">
                                            {packages.length > 1 && (
                                                <button
                                                    onClick={() => removePackage(pkg.id)}
                                                    className="text-red-300 hover:text-red-100 text-xs font-bold"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Items in this package */}
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100 text-gray-600 text-xs">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-black uppercase w-8">In</th>
                                                <th className="px-4 py-2 text-left font-black uppercase">Item</th>
                                                <th className="px-4 py-2 text-left font-black uppercase">Lot #</th>
                                                <th className="px-4 py-2 text-center font-black uppercase">Picked</th>
                                                <th className="px-4 py-2 text-center font-black uppercase text-emerald-700">Pack Qty</th>
                                                <th className="px-4 py-2 text-center font-black uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {lines.map(line => {
                                                const inThisPkg = pkg.lineIds.includes(line.lineId) || packages.length === 1;
                                                const packPct = line.pickedQty > 0 ? (line.packedQty / line.pickedQty) * 100 : 0;
                                                return (
                                                    <tr key={line.lineId} className={`hover:bg-emerald-50/30 transition-colors ${!inThisPkg && packages.length > 1 ? 'opacity-30' : ''}`}>
                                                        {packages.length > 1 && (
                                                            <td className="px-4 py-3 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={inThisPkg}
                                                                    onChange={() => toggleLineInPackage(pkg.id, line.lineId)}
                                                                    className="w-4 h-4 accent-violet-600 cursor-pointer"
                                                                />
                                                            </td>
                                                        )}
                                                        {packages.length === 1 && <td className="px-4 py-3" />}
                                                        <td className="px-4 py-3 font-bold text-slate-800">{line.itemName}</td>
                                                        <td className="px-4 py-3">
                                                            {line.lotNumber
                                                                ? <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">{line.lotNumber}</span>
                                                                : <span className="text-xs text-slate-400 italic">—</span>}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-amber-600">{line.pickedQty}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={line.pickedQty}
                                                                className="w-20 border-2 border-emerald-200 rounded-lg px-2 py-1 text-center font-black text-emerald-800 bg-emerald-50 outline-none focus:border-emerald-500"
                                                                value={line.packedQty}
                                                                onChange={e => updateLine(line.lineId, { packedQty: Math.min(line.pickedQty, Math.max(0, parseFloat(e.target.value) || 0)) })}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                                    <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${packPct}%` }} />
                                                                </div>
                                                                <span className="text-[9px] text-slate-400 font-bold">{packPct.toFixed(0)}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>

                        {/* Package summary */}
                        {packages.length > 1 && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex gap-6 text-xs text-slate-600">
                                <span><strong>{packages.length}</strong> packages</span>
                                <span>Total weight: <strong>{totalWeight.toFixed(1)} {packages[0]?.weightUnit}</strong></span>
                            </div>
                        )}

                        <div className="mt-6 flex justify-between">
                            <button onClick={() => setStep('PICK')} className="px-6 py-2 border border-gray-300 text-gray-600 font-black text-xs uppercase tracking-widest rounded-lg hover:bg-gray-50 transition-all">
                                ← Back to Pick
                            </button>
                            <button
                                onClick={() => setStep('SHIP')}
                                disabled={!allPacked}
                                className="px-8 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-md transition-all active:scale-95 flex items-center gap-2"
                            >
                                Next: Ship
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* ── SHIP STEP ── */}
                {step === 'SHIP' && (
                    <div>
                        <h2 className="text-xl font-black text-slate-800 mb-6">Record Shipment</h2>

                        {/* Shipment Summary */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Shipment Summary</p>
                            <div className="space-y-1">
                                {lines.map(line => (
                                    <div key={line.lineId} className="flex items-center justify-between text-sm">
                                        <span className="font-bold text-slate-700">{line.itemName}</span>
                                        <div className="flex items-center gap-4 text-xs">
                                            {line.lotNumber && <span className="font-mono text-slate-400">Lot: {line.lotNumber}</span>}
                                            {line.serialNumber && <span className="font-mono text-teal-600">S/N: {line.serialNumber}</span>}
                                            <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{line.packedQty} packed</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {packages.length > 1 && (
                                <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500 flex gap-4">
                                    <span>{packages.length} packages</span>
                                    <span>Total weight: {totalWeight.toFixed(1)} {packages[0]?.weightUnit}</span>
                                </div>
                            )}
                        </div>

                        {/* Carrier & Tracking */}
                        <div className="grid grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block">Carrier *</label>
                                <select
                                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-violet-500 bg-white"
                                    value={carrier}
                                    onChange={e => {
                                        setCarrier(e.target.value);
                                        setFreightEstimated(false);
                                        setSelectedRate(null);
                                        setCarrierRates([]);
                                        setRatesFetched(false);
                                        setTrackingValidation(null);
                                    }}
                                >
                                    <option value="">-- Select Carrier --</option>
                                    {CARRIERS.map(c => (
                                        <option key={c} value={c}>
                                            {c}{configuredCarriers.includes(c) ? ' ✓' : ''}
                                        </option>
                                    ))}
                                </select>
                                {configuredCarriers.length > 0 && (
                                    <p className="text-[9px] text-emerald-600 font-bold mt-1">✓ = Live API enabled</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block">Tracking Number</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className={`flex-1 border-2 rounded-lg px-3 py-2.5 text-sm font-mono font-bold text-slate-800 outline-none transition-colors ${
                                            trackingValidation === null ? 'border-gray-200 focus:border-violet-500' :
                                            trackingValidation.valid ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50'
                                        }`}
                                        placeholder="1Z999AA10123456784"
                                        value={trackingNo}
                                        onChange={e => handleTrackingChange(e.target.value)}
                                    />
                                    {carrier && API_CARRIERS.includes(carrier) && trackingNo.length > 5 && (
                                        <button
                                            onClick={handleLookupTracking}
                                            disabled={trackingLookupLoading}
                                            className="px-3 py-2 bg-slate-700 hover:bg-slate-800 disabled:bg-gray-300 text-white font-black text-xs rounded-lg transition-colors whitespace-nowrap"
                                            title="Look up tracking status"
                                        >
                                            {trackingLookupLoading ? '...' : 'Track'}
                                        </button>
                                    )}
                                </div>
                                {trackingValidation && !trackingValidation.valid && (
                                    <p className="text-[9px] text-red-600 font-bold mt-1">{trackingValidation.error}</p>
                                )}
                                {trackingValidation?.valid && (
                                    <p className="text-[9px] text-emerald-600 font-bold mt-1">Valid {carrier} format</p>
                                )}
                                {/* Inline tracking result */}
                                {trackingLookup && (
                                    <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                                        <p className="font-black text-slate-700">{trackingLookup.status}</p>
                                        {trackingLookup.estimatedDelivery && (
                                            <p className="text-slate-500">Est. delivery: {trackingLookup.estimatedDelivery}</p>
                                        )}
                                        {trackingLookup.events.length > 0 && (
                                            <div className="mt-1 space-y-0.5 max-h-24 overflow-y-auto">
                                                {trackingLookup.events.slice(0, 5).map((ev, i) => (
                                                    <div key={i} className="text-[9px] text-slate-500">
                                                        <span className="font-bold">{ev.timestamp}</span> — {ev.description}
                                                        {ev.location && <span className="text-slate-400"> ({ev.location})</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block">Ship Date</label>
                                <input
                                    type="date"
                                    className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-800 outline-none focus:border-violet-500"
                                    value={shippedDate}
                                    onChange={e => setShippedDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block">Ship From Warehouse</label>
                                <div className="border-2 border-violet-100 bg-violet-50 rounded-lg px-3 py-2.5 text-sm font-bold text-violet-800">
                                    {selectedWarehouse?.name || '—'}
                                    {(selectedWarehouse as any)?.code && <span className="ml-2 text-xs font-mono text-violet-400">[{(selectedWarehouse as any).code}]</span>}
                                </div>
                            </div>
                        </div>

                        {/* Live Carrier Rates */}
                        <div className="mb-6 p-4 bg-violet-50 border border-violet-200 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">
                                    {configuredCarriers.length > 0 ? 'Live Shipping Rates' : 'Shipping Rate'}
                                </p>
                                {configuredCarriers.length === 0 && (
                                    <span className="text-[9px] text-amber-600 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                        No carrier APIs configured — set UPS/FedEx/USPS env vars for live rates
                                    </span>
                                )}
                            </div>

                            {configuredCarriers.length > 0 && (
                                <>
                                    {/* ZIP inputs for rate lookup */}
                                    <div className="grid grid-cols-3 gap-3 mb-3">
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-violet-600 mb-1 block">Origin ZIP</label>
                                            <input
                                                type="text"
                                                maxLength={10}
                                                className="w-full border-2 border-violet-200 rounded-lg px-2 py-1.5 text-sm font-mono font-bold text-slate-800 outline-none focus:border-violet-500"
                                                placeholder="90210"
                                                value={originZip}
                                                onChange={e => setOriginZip(e.target.value.replace(/[^\d-]/g, ''))}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-violet-600 mb-1 block">Destination ZIP</label>
                                            <input
                                                type="text"
                                                maxLength={10}
                                                className="w-full border-2 border-violet-200 rounded-lg px-2 py-1.5 text-sm font-mono font-bold text-slate-800 outline-none focus:border-violet-500"
                                                placeholder="10001"
                                                value={destZip}
                                                onChange={e => setDestZip(e.target.value.replace(/[^\d-]/g, ''))}
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <button
                                                onClick={handleGetRates}
                                                disabled={ratesLoading || !originZip || !destZip || totalWeight === 0}
                                                className="w-full px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-xs uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-1"
                                            >
                                                {ratesLoading ? (
                                                    <>
                                                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                                        </svg>
                                                        Fetching...
                                                    </>
                                                ) : 'Get Rates'}
                                            </button>
                                        </div>
                                    </div>
                                    {totalWeight === 0 && (
                                        <p className="text-[9px] text-amber-600 font-bold mb-2">Enter package weights in the Pack step to enable rate lookup.</p>
                                    )}

                                    {/* Rate cards */}
                                    {ratesFetched && carrierRates.length > 0 && (
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                            {carrierRates.map((rate, i) => (
                                                <button
                                                    key={`${rate.carrier}-${rate.serviceCode}-${i}`}
                                                    onClick={() => handleSelectRate(rate)}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border-2 text-left transition-all ${
                                                        selectedRate?.serviceCode === rate.serviceCode && selectedRate?.carrier === rate.carrier
                                                            ? 'border-violet-500 bg-violet-100'
                                                            : 'border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                                                            rate.carrier === 'UPS' ? 'bg-amber-100 text-amber-800' :
                                                            rate.carrier === 'FedEx' ? 'bg-purple-100 text-purple-800' :
                                                            'bg-blue-100 text-blue-800'
                                                        }`}>{rate.carrier}</span>
                                                        <span className="text-xs font-bold text-slate-700">{rate.serviceName}</span>
                                                        {rate.deliveryDays && (
                                                            <span className="text-[9px] text-slate-400">({rate.deliveryDays} day{rate.deliveryDays !== 1 ? 's' : ''})</span>
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-black text-slate-900">${rate.totalCharges.toFixed(2)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {ratesFetched && carrierRates.length === 0 && Object.keys(carrierRateErrors).length === 0 && (
                                        <p className="text-xs text-slate-500 italic text-center py-2">No rates returned for these parameters.</p>
                                    )}
                                    {Object.entries(carrierRateErrors).map(([c, msg]) => (
                                        <p key={c} className="text-[9px] text-red-600 font-bold mt-1">{c}: {msg}</p>
                                    ))}
                                </>
                            )}

                            {/* Weight-based rough estimate when no APIs configured */}
                            {configuredCarriers.length === 0 && totalWeight > 0 && (
                                <div className="mt-2 mb-1 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-amber-700 mb-1.5">Rough estimate (carrier API not configured)</p>
                                    <div className="grid grid-cols-3 gap-2 text-xs text-amber-800">
                                        <div className="bg-white border border-amber-200 rounded p-2">
                                            <p className="text-[9px] font-black uppercase text-amber-500 mb-0.5">Ground</p>
                                            <p className="font-black">${(totalWeight * 0.65).toFixed(2)}–${(totalWeight * 0.80).toFixed(2)}</p>
                                        </div>
                                        <div className="bg-white border border-amber-200 rounded p-2">
                                            <p className="text-[9px] font-black uppercase text-amber-500 mb-0.5">Express</p>
                                            <p className="font-black">${(totalWeight * 0.90).toFixed(2)}–${(totalWeight * 1.10).toFixed(2)}</p>
                                        </div>
                                        <div className="bg-white border border-amber-200 rounded p-2">
                                            <p className="text-[9px] font-black uppercase text-amber-500 mb-0.5">Overnight</p>
                                            <p className="font-black">${(totalWeight * 1.05).toFixed(2)}–${(totalWeight * 1.20).toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <p className="text-[8px] text-amber-400 mt-1.5">Based on {totalWeight.toFixed(1)} {packages[0]?.weightUnit || 'lb'} at $0.65–$1.20/lb. Configure carrier API keys for live rates.</p>
                                </div>
                            )}

                            {/* Manual freight cost (always shown) */}
                            <div className={`flex items-end gap-3 ${configuredCarriers.length > 0 ? 'mt-3 pt-3 border-t border-violet-200' : ''}`}>
                                <div className="text-xs text-slate-500 flex-1">
                                    Total weight: <span className="font-black">{totalWeight.toFixed(1)} {packages[0]?.weightUnit || 'lb'}</span>
                                    {selectedRate && (
                                        <span className="ml-2 text-violet-600 font-bold">— {selectedRate.serviceName} selected</span>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1 block">Freight Cost ($)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-400 text-xs font-bold">$</span>
                                        <input
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            className={`w-32 border-2 rounded-lg pl-7 pr-2 py-2 text-sm font-black text-slate-800 outline-none focus:border-violet-500 ${freightEstimated ? 'border-violet-400 bg-violet-50' : 'border-gray-200 bg-white'}`}
                                            value={freightCost || ''}
                                            onChange={e => { setFreightCost(parseFloat(e.target.value) || 0); setFreightEstimated(false); setSelectedRate(null); }}
                                        />
                                    </div>
                                    {freightEstimated && selectedRate && (
                                        <p className="text-[9px] text-violet-600 font-bold pl-1 mt-0.5">From live rate</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 block">Shipping Notes</label>
                            <textarea
                                className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-500 resize-none h-20"
                                placeholder="Fragile items, special instructions..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-between items-center">
                            <button onClick={() => setStep('PACK')} className="px-6 py-2 border border-gray-300 text-gray-600 font-black text-xs uppercase tracking-widest rounded-lg hover:bg-gray-50 transition-all">
                                ← Back to Pack
                            </button>
                            <button
                                onClick={handleShip}
                                disabled={!carrier || !warehouseId}
                                className="px-10 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center gap-3"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Confirm Shipment
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PickPackShipForm;
