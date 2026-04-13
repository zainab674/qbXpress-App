
import React, { useState, useMemo, useEffect } from 'react';
import { Item, Transaction, Warehouse } from '../types';
import { createSerialNumbers, fetchWarehouses } from '../services/api';

interface Props {
    items: Item[];
    onSave: (adj: Transaction) => Promise<void>;
    onClose: () => void;
    // Work Order context (set when opened from a Work Order)
    linkedWorkOrderId?: string;
    linkedWorkOrderRefNo?: string;
    workOrderPlannedQty?: number;
    workOrderRemainingQty?: number;
    preselectedAssemblyId?: string;
}

const BuildAssemblyForm: React.FC<Props> = ({
    items, onSave, onClose,
    linkedWorkOrderId, linkedWorkOrderRefNo,
    workOrderPlannedQty, workOrderRemainingQty,
    preselectedAssemblyId,
}) => {
    const [selectedAssemblyId, setSelectedAssemblyId] = useState(preselectedAssemblyId || '');
    const [quantityToBuild, setQuantityToBuild] = useState(workOrderRemainingQty || 1);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    // Warehouse: source = pull components from; dest = deposit finished assembly to
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [sourceWarehouseId, setSourceWarehouseId] = useState('');
    const [destWarehouseId, setDestWarehouseId] = useState('');

    useEffect(() => {
        fetchWarehouses()
            .then((whs: Warehouse[]) => {
                setWarehouses(whs);
                const def = whs.find((w: Warehouse) => w.isDefault);
                if (def) { setSourceWarehouseId(def.id); setDestWarehouseId(def.id); }
            })
            .catch(() => {});
    }, []);
    // Output serial numbers (one per unit when assembly is serial-tracked)
    const [outputSerials, setOutputSerials] = useState<string[]>([]);
    // Output lot assignment (when assembly is lot-tracked)
    const [outputLotNumber, setOutputLotNumber] = useState('');
    const [outputLotExpiration, setOutputLotExpiration] = useState('');
    const [outputLotMfgDate, setOutputLotMfgDate] = useState('');

    const assemblies = items.filter(i => i.type === 'Inventory Assembly');
    const selectedAssembly = useMemo(() => items.find(i => i.id === selectedAssemblyId), [items, selectedAssemblyId]);

    const components = useMemo(() => {
        if (!selectedAssembly || !selectedAssembly.assemblyItems) return [];
        return selectedAssembly.assemblyItems.map(c => {
            const item = items.find(i => i.id === c.itemId);
            const isStocked = item?.type === 'Inventory Part' || item?.type === 'Inventory Assembly';
            const scrap = (c as any).scrapPercent || 0;
            const yield_ = (c as any).yieldPercent || 100;
            const effQtyPerBuild = c.quantity * (1 + scrap / 100) / (yield_ / 100);
            const needed = effQtyPerBuild * quantityToBuild;
            return {
                ...c,
                name: item?.name || 'Unknown Item',
                type: item?.type || 'Unknown',
                isStocked,
                onHand: item?.onHand || 0,
                needed,
                baseNeeded: c.quantity * quantityToBuild,
                effQtyPerBuild,
                scrap,
                yield_,
                unitCost: item?.averageCost || (item as any)?.cost || 0,
            };
        });
    }, [selectedAssembly, items, quantityToBuild]);

    const costVarianceSummary = useMemo(() => {
        if (!selectedAssembly || components.length === 0) return null;
        const actualCost = components
            .filter(c => c.isStocked)
            .reduce((s, c) => s + c.needed * c.unitCost, 0);
        const standardCost = ((selectedAssembly as any).standardCost || 0) * quantityToBuild;
        if (standardCost === 0) return null;
        const variance = actualCost - standardCost;
        const variancePct = (variance / standardCost) * 100;
        return { actualCost, standardCost, variance, variancePct };
    }, [selectedAssembly, components, quantityToBuild]);

    const maxPossible = useMemo(() => {
        if (!selectedAssembly || !selectedAssembly.assemblyItems) return 0;
        // Only stocked items (Inventory Part/Assembly) constrain the build qty — services are unlimited
        const stockedComponents = selectedAssembly.assemblyItems.filter(c => {
            const item = items.find(i => i.id === c.itemId);
            return item?.type === 'Inventory Part' || item?.type === 'Inventory Assembly';
        });
        if (stockedComponents.length === 0) return Infinity;
        const limits = stockedComponents.map(c => {
            const item = items.find(i => i.id === c.itemId);
            const onHand = item?.onHand || 0;
            return Math.floor(onHand / c.quantity);
        });
        return Math.min(...limits);
    }, [selectedAssembly, items]);

    // If opened from WO, clamp max buildable to WO remaining qty
    const effectiveMax = workOrderRemainingQty != null
        ? Math.min(maxPossible, workOrderRemainingQty)
        : maxPossible;

    const handleBuild = async () => {
        if (!selectedAssembly) return;
        if (quantityToBuild <= 0) { alert('Quantity must be greater than 0.'); return; }
        if (workOrderRemainingQty != null && quantityToBuild > workOrderRemainingQty) {
            alert(`Cannot build more than the Work Order remaining quantity (${workOrderRemainingQty}).`);
            return;
        }
        if (quantityToBuild > maxPossible) {
            if (!confirm("You don't have enough components for this build. Build anyway? (Will result in negative inventory)")) return;
        }

        // Validate lot number for lot-tracked assemblies
        if ((selectedAssembly as any).trackLots && !outputLotNumber.trim()) {
            alert(`Lot number required: "${selectedAssembly.name}" is lot-tracked. Enter an output lot number.`);
            return;
        }

        // Validate serial numbers for serial-tracked assemblies
        if (selectedAssembly.trackSerialNumbers) {
            const filled = outputSerials.filter(s => s.trim());
            if (filled.length < quantityToBuild) {
                alert(`Serial numbers required for "${selectedAssembly.name}". Enter ${quantityToBuild} serial number(s) — ${filled.length} entered.`);
                return;
            }
            const unique = new Set(filled.map(s => s.trim()));
            if (unique.size < filled.length) {
                alert('Duplicate serial numbers found. Each built unit must have a unique serial number.');
                return;
            }
        }

        const buildRefNo = 'BUILD-' + Date.now().toString().slice(-6);

        const tx: Transaction = {
            id: crypto.randomUUID(),
            type: 'ASSEMBLY_BUILD',
            refNo: buildRefNo,
            date,
            entityId: 'Internal',
            items: [
                {
                    id: selectedAssemblyId,
                    description: `Build Assembly: ${selectedAssembly.name} (Qty: ${quantityToBuild})${linkedWorkOrderRefNo ? ` | WO: ${linkedWorkOrderRefNo}` : ''}`,
                    quantity: quantityToBuild,
                    rate: 0,
                    amount: 0,
                    tax: false,
                    // No serialNumber here — batch API handles all units to avoid double-creation
                }
            ],
            total: 0,
            status: 'CLEARED',
            // Lot assignment for finished assembly
            ...(outputLotNumber.trim() ? {
                outputLotNumber: outputLotNumber.trim(),
                outputLotExpirationDate: outputLotExpiration || undefined,
                outputLotManufacturingDate: outputLotMfgDate || undefined,
            } : {}),
            // Warehouse routing: source = pull components, dest = deposit finished good
            ...(sourceWarehouseId ? { sourceWarehouseId } : {}),
            ...(destWarehouseId ? { warehouseId: destWarehouseId } : {}),
            // Work Order linkage
            ...(linkedWorkOrderId ? { linkedWorkOrderId } : {}),
        };

        try {
            await onSave(tx);

            // Batch-create serial records for all output units
            if (selectedAssembly.trackSerialNumbers) {
                const serials = outputSerials.filter(s => s.trim()).map(s => s.trim());
                if (serials.length > 0) {
                    try {
                        await createSerialNumbers(selectedAssemblyId, {
                            serialNumbers: serials,
                            unitCost: selectedAssembly.standardCost || selectedAssembly.averageCost,
                            dateReceived: new Date().toISOString().split('T')[0],
                            notes: `Built via ${buildRefNo}${linkedWorkOrderRefNo ? ` | WO: ${linkedWorkOrderRefNo}` : ''}`,
                        });
                    } catch { /* non-fatal */ }
                }
            }
            const hasVariance = costVarianceSummary && Math.abs(costVarianceSummary.variance) >= 0.005;
            if (hasVariance) {
                const direction = costVarianceSummary!.variance > 0 ? 'Unfavorable' : 'Favorable';
                const sign = costVarianceSummary!.variance >= 0 ? '+' : '';
                alert(
                    `Built ${quantityToBuild} of ${selectedAssembly.name}.\n\n` +
                    `Inventory updated. GL journal entry posted:\n` +
                    `  DR  Finished Goods (${selectedAssembly.name})  $${costVarianceSummary!.standardCost.toFixed(2)}\n` +
                    `  CR  Component Inventories                       $${costVarianceSummary!.actualCost.toFixed(2)}\n` +
                    `  ${costVarianceSummary!.variance > 0 ? 'DR ' : 'CR '}  Manufacturing Variance (${direction})          $${sign}${costVarianceSummary!.variance.toFixed(2)}`
                );
            } else {
                alert(`Built ${quantityToBuild} of ${selectedAssembly.name}. Inventory has been updated atomically.`);
            }
            onClose();
        } catch (err) {
            alert("Failed to build assembly. Please check component availability.");
        }
    };

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col p-4 font-sans">
            <div className="bg-white border border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">
                <div className="p-4 bg-[#003366] text-white flex justify-between items-center select-none">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🛠️</span>
                        <h2 className="text-lg font-bold">Build Assemblies</h2>
                        {linkedWorkOrderRefNo && (
                            <span className="ml-3 text-[11px] bg-blue-500 text-white px-2 py-0.5 rounded font-bold">
                                WO: {linkedWorkOrderRefNo}
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="hover:bg-red-600 px-2">✕</button>
                </div>

                <div className="p-6 bg-gray-50 border-b space-y-4">
                    <div className="flex items-end gap-6 flex-wrap">
                        <div className="flex flex-col gap-1 w-64">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Assembly Item</label>
                            <select
                                className="border p-2 text-sm bg-white outline-none font-bold shadow-sm"
                                value={selectedAssemblyId}
                                onChange={e => setSelectedAssemblyId(e.target.value)}
                                disabled={!!preselectedAssemblyId}
                            >
                                <option value="">--Select Assembly--</option>
                                {assemblies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1 w-32 text-center">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest underline">Qty on Hand</label>
                            <div className="text-xl font-black text-blue-900 mt-1">{selectedAssembly?.onHand || 0}</div>
                        </div>
                        <div className="flex flex-col gap-1 w-36 text-center border-l pl-6">
                            <label className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
                                Quantity to Build
                                {workOrderRemainingQty != null && (
                                    <span className="ml-1 text-orange-500">/ {workOrderRemainingQty} rem.</span>
                                )}
                            </label>
                            <input
                                type="number"
                                className="border-2 border-blue-400 p-2 text-center font-black text-lg outline-none"
                                value={quantityToBuild}
                                min={1}
                                max={workOrderRemainingQty ?? undefined}
                                onChange={e => setQuantityToBuild(parseInt(e.target.value) || 0)}
                            />
                        </div>

                        {/* Warehouse Routing — Source (components) & Destination (finished good) */}
                        {warehouses.length > 0 && (
                            <div className="flex flex-col gap-1 border-l pl-6">
                                <label className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Warehouse Routing</label>
                                <div className="flex gap-3 items-end">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase">Pull Components From</span>
                                        <select
                                            className="border border-indigo-200 rounded px-2 py-1 text-xs font-bold text-indigo-900 bg-white outline-none focus:border-indigo-500 w-44"
                                            value={sourceWarehouseId}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSourceWarehouseId(e.target.value)}
                                        >
                                            <option value="">-- Any / Default --</option>
                                            {warehouses.map((w: Warehouse) => (
                                                <option key={w.id} value={w.id}>{w.name}{w.isDefault ? ' \u2713' : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <span className="text-indigo-300 text-lg mb-1">\u2192</span>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase">Deposit Finished Good To</span>
                                        <select
                                            className="border border-indigo-200 rounded px-2 py-1 text-xs font-bold text-indigo-900 bg-white outline-none focus:border-indigo-500 w-44"
                                            value={destWarehouseId}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDestWarehouseId(e.target.value)}
                                        >
                                            <option value="">-- Any / Default --</option>
                                            {warehouses.map((w: Warehouse) => (
                                                <option key={w.id} value={w.id}>{w.name}{w.isDefault ? ' \u2713' : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Lot number input — shown when assembly is lot-tracked */}
                        {selectedAssembly && (selectedAssembly as any).trackLots && (
                            <div className="flex flex-col gap-1 border-l pl-6">
                                <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                                    Output Lot # <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="LOT-XXXXXX"
                                    className={`border-2 rounded px-2 py-1.5 text-sm font-mono w-40 outline-none ${!outputLotNumber.trim() ? 'border-red-300 bg-red-50' : 'border-amber-400 bg-white'}`}
                                    value={outputLotNumber}
                                    onChange={e => setOutputLotNumber(e.target.value)}
                                />
                                <div className="flex gap-2 mt-1">
                                    <div className="flex flex-col gap-0.5">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Mfg Date</label>
                                        <input type="date" className="border px-1 py-0.5 text-xs w-32 outline-none" value={outputLotMfgDate} onChange={e => setOutputLotMfgDate(e.target.value)} />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <label className="text-[9px] font-bold text-gray-400 uppercase">Expiry Date</label>
                                        <input type="date" className="border px-1 py-0.5 text-xs w-32 outline-none" value={outputLotExpiration} onChange={e => setOutputLotExpiration(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Serial number input — shown when assembly is serial-tracked */}
                        {selectedAssembly?.trackSerialNumbers && quantityToBuild > 0 && (
                            <div className="flex flex-col gap-1 border-l pl-6">
                                <label className="text-[10px] font-black text-teal-700 uppercase tracking-widest">
                                    Output Serial #s <span className="text-red-500">*</span>
                                </label>
                                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
                                    {Array.from({ length: Math.max(1, quantityToBuild) }).map((_, idx) => (
                                        <input
                                            key={idx}
                                            type="text"
                                            placeholder={`Unit ${idx + 1} S/N`}
                                            className={`border rounded px-2 py-1 text-xs font-mono text-teal-900 outline-none focus:border-teal-500 w-40 ${!(outputSerials[idx] || '').trim() ? 'border-red-300 bg-red-50' : 'border-teal-300 bg-white'}`}
                                            value={outputSerials[idx] || ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                const updated = [...outputSerials];
                                                updated[idx] = e.target.value;
                                                setOutputSerials(updated);
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex-1 text-right self-end">
                            <button
                                onClick={handleBuild}
                                className="bg-blue-600 text-white px-10 py-3 rounded font-bold hover:bg-blue-700 shadow-md transform active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                disabled={!selectedAssemblyId || quantityToBuild <= 0}
                            >
                                {linkedWorkOrderId ? 'POST BUILD' : 'BUILD & CLOSE'}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] font-bold text-gray-500 italic">
                        <div>Build Point: {selectedAssembly?.buildPoint || 'None'}</div>
                        <div className={effectiveMax === 0 ? 'text-red-500 animate-pulse' : 'text-green-600'}>
                            Max. possible builds based on component quantities: <span className="text-lg ml-2">{effectiveMax === Infinity ? '∞' : effectiveMax}</span>
                        </div>
                    </div>

                    {/* Cost Variance Summary — only shown for Standard Cost assemblies */}
                    {costVarianceSummary && (
                        <div className="mt-3 bg-white border border-gray-200 rounded overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 border-b border-gray-200">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Standard Cost Analysis</span>
                                {Math.abs(costVarianceSummary.variance) >= 0.005 ? (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${costVarianceSummary.variance > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                        {costVarianceSummary.variance > 0 ? '▲ Unfavorable' : '▼ Favorable'} — GL Entry will post to Manufacturing Variance
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                                        Zero variance — GL entry posts to inventory accounts only
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-4 gap-3 text-center p-3">
                                <div>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Standard Cost</div>
                                    <div className="text-base font-black text-gray-700 font-mono">${costVarianceSummary.standardCost.toFixed(2)}</div>
                                    <div className="text-[9px] text-gray-400 mt-0.5">DR Finished Goods</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Actual Cost</div>
                                    <div className="text-base font-black text-blue-700 font-mono">${costVarianceSummary.actualCost.toFixed(2)}</div>
                                    <div className="text-[9px] text-gray-400 mt-0.5">CR Component Inventory</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Variance $</div>
                                    <div className={`text-base font-black font-mono ${costVarianceSummary.variance > 0 ? 'text-red-600' : costVarianceSummary.variance < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                        {costVarianceSummary.variance >= 0 ? '+' : ''}{costVarianceSummary.variance.toFixed(2)}
                                    </div>
                                    <div className={`text-[9px] mt-0.5 ${costVarianceSummary.variance > 0 ? 'text-red-400' : costVarianceSummary.variance < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                        {costVarianceSummary.variance > 0 ? 'DR' : costVarianceSummary.variance < 0 ? 'CR' : '—'} Mfg Variance Acct
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Variance %</div>
                                    <div className={`text-base font-black font-mono ${costVarianceSummary.variancePct > 0 ? 'text-red-600' : costVarianceSummary.variancePct < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                        {costVarianceSummary.variancePct >= 0 ? '+' : ''}{costVarianceSummary.variancePct.toFixed(1)}%
                                    </div>
                                    <div className="text-[9px] text-gray-400 mt-0.5">vs. standard</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-auto p-4 bg-white relative">
                    <table className="w-full text-xs text-left border border-gray-200">
                        <thead className="bg-[#e8e8e8] border-b border-gray-400 text-[#003366] font-bold sticky top-0">
                            <tr>
                                <th className="p-3 border-r">Component Item</th>
                                <th className="p-3 border-r text-right">Qty (ea)</th>
                                <th className="p-3 border-r text-right">Eff. Qty (ea)</th>
                                <th className="p-3 border-r text-right">Total Needed</th>
                                <th className="p-3 border-r text-right">On Hand</th>
                                <th className="p-3 text-right">Shortage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {components.map((c, idx) => {
                                const shortage = c.isStocked ? Math.max(0, c.needed - c.onHand) : 0;
                                const hasAdjustment = c.scrap > 0 || c.yield_ !== 100;
                                return (
                                    <tr key={idx} className={`hover:bg-blue-50/50 transition-colors ${shortage > 0 ? 'bg-red-50/30' : ''}`}>
                                        <td className="p-3 border-r font-bold text-gray-700">
                                            {c.name}
                                            {!c.isStocked && <span className="ml-2 text-[10px] font-normal text-purple-500 bg-purple-50 px-1 rounded">SERVICE</span>}
                                        </td>
                                        <td className="p-3 border-r text-right font-mono text-gray-400">{c.quantity}</td>
                                        <td className="p-3 border-r text-right font-mono">
                                            {hasAdjustment ? (
                                                <span className="text-orange-600 font-bold" title={`Scrap: ${c.scrap}%, Yield: ${c.yield_}%`}>
                                                    {c.effQtyPerBuild.toFixed(4)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">{c.quantity}</span>
                                            )}
                                        </td>
                                        <td className="p-3 border-r text-right font-black text-blue-800 font-mono">{+c.needed.toFixed(4)}</td>
                                        <td className="p-3 border-r text-right font-mono text-gray-400">{c.isStocked ? c.onHand : '∞'}</td>
                                        <td className={`p-3 text-right font-bold font-mono ${shortage > 0 ? 'text-red-600 underline decoration-double' : 'text-gray-200'}`}>
                                            {!c.isStocked ? <span className="text-purple-400 text-[10px]">N/A</span> : shortage > 0 ? +shortage.toFixed(4) : '--'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {components.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center text-gray-300 font-serif italic text-xl">Select an assembly item above to see component requirements.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
};

export default BuildAssemblyForm;
