
import React, { useState, useMemo, useEffect } from 'react';
import { Vendor, Transaction, Item, Warehouse, Bin, ShipViaEntry } from '../types';
import { fetchWarehouses, fetchBins, fetchAvailableLots, createSerialNumbers } from '../services/api';
import { createShippingBill } from '../services/shippingService';

interface Props {
  vendors: Vendor[];
  transactions: Transaction[];
  items: Item[];
  shipVia?: ShipViaEntry[];
  onSave: (receipt: Transaction) => Promise<void> | void;
  onClose: () => void;
  initialVendorId?: string;
  initialPoId?: string;
}

interface DirectLine {
  id: string;
  itemId: string;
  description: string;
  qty: number;
  rate: number;
  warehouseId: string;
  binId: string;
  lotNumber: string;
  lotExpiry: string;
  lotVendorLot: string;
  lotMfgDate: string;
  serials: string[];
}

const ReceiveInventoryForm: React.FC<Props> = ({ vendors, transactions, items, shipVia = [], onSave, onClose, initialVendorId = '', initialPoId = '' }) => {
  const [vendorId, setVendorId] = useState(initialVendorId);
  const [selectedPoId, setSelectedPoId] = useState(initialPoId);
  const [receiveWithBill, setReceiveWithBill] = useState(true);
  const [refNo] = useState('RECV-' + Date.now().toString().slice(-4));
  // Per-line lot assignment: lineId -> { lotNumber, isNew, expiry, vendorLot, mfgDate }
  const [lineLots, setLineLots] = useState<Record<string, { lotNumber: string; isNew: boolean; expiry: string; vendorLot: string; mfgDate: string }>>({});
  // Available lots per itemId (FIFO, for dropdown when receiving against existing lots)
  const [availableLotsMap, setAvailableLotsMap] = useState<Record<string, any[]>>({});
  const [receivedQtys, setReceivedQtys] = useState<Record<string, number>>({});
  const [closedLines, setClosedLines] = useState<Record<string, boolean>>({});
  const [memoText, setMemoText] = useState('');
  // Per-line serial numbers: lineId -> array of serial number strings (one per unit)
  const [lineSerials, setLineSerials] = useState<Record<string, string[]>>({});
  // Per-line warehouse/bin overrides (PO-based receiving)
  const [lineWarehouses, setLineWarehouses] = useState<Record<string, string>>({});
  const [lineBins, setLineBins] = useState<Record<string, string>>({});
  // Direct receipt mode (no PO required)
  const [directReceiptMode, setDirectReceiptMode] = useState(false);
  const [directLines, setDirectLines] = useState<DirectLine[]>([
    { id: Date.now().toString(36) + Math.random().toString(36).slice(2), itemId: '', description: '', qty: 1, rate: 0, warehouseId: '', binId: '', lotNumber: '', lotExpiry: '', lotVendorLot: '', lotMfgDate: '', serials: [] }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  // ── Shipping module state ──────────────────────────────────────────────────
  const [selectedShipViaId, setSelectedShipViaId] = useState(shipVia.find(sv => sv.isDefault)?.id || '');
  const [shippingCost, setShippingCost] = useState(0);
  // ── Warehouse + Bin selection ──────────────────────────────────────────────
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [allBins, setAllBins] = useState<Bin[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [binId, setBinId] = useState('');

  useEffect(() => {
    fetchWarehouses()
      .then((whs: Warehouse[]) => {
        setWarehouses(whs);
        const def = whs.find(w => w.isDefault);
        if (def) setWarehouseId(def.id);
      })
      .catch(() => {});
    fetchBins()
      .then((bins: Bin[]) => setAllBins(bins))
      .catch(() => {});
  }, []);

  // Bins filtered to selected warehouse
  const availableBins = useMemo(
    () => allBins.filter((b: Bin) => b.warehouseId === warehouseId && b.isActive),
    [allBins, warehouseId]
  );

  // Helper: bins for any warehouse (for per-line and direct-line selects)
  const getBinsForWarehouse = (whId: string) => allBins.filter((b: Bin) => b.warehouseId === whId && b.isActive);

  // Show OPEN and PARTIALLY_RECEIVED POs for partial receiving
  const vendorPos = transactions.filter(
    t => t.type === 'PURCHASE_ORDER' &&
      t.entityId === vendorId &&
      (t.status === 'OPEN' || t.status === 'PARTIALLY_RECEIVED')
  );
  const selectedPo = vendorPos.find(p => p.id === selectedPoId);

  // All receipts (BILL or RECEIVE_ITEM) against this PO, for history
  const priorReceipts = useMemo(() =>
    transactions.filter(
      t => (t.type === 'BILL' || t.type === 'RECEIVE_ITEM') &&
        t.purchaseOrderId === selectedPoId
    ),
    [transactions, selectedPoId]
  );

  const handleQtyChange = (lineId: string, qty: number) => {
    setReceivedQtys(prev => ({ ...prev, [lineId]: qty }));
  };

  const handleCloseLineToggle = (lineId: string, checked: boolean) => {
    setClosedLines(prev => ({ ...prev, [lineId]: checked }));
  };

  // Per-line data: ordered, previously received, remaining, default receive qty
  const lineData = useMemo(() => {
    if (!selectedPo) return [];
    return selectedPo.items.map(item => {
      const orderedQty = item.quantity;
      const prevReceived = item.receivedQuantity ?? 0;
      const remaining = Math.max(0, orderedQty - prevReceived);
      const defaultQty = remaining;
      const lineId = item.id!;
      const qtyToReceive = receivedQtys[lineId] !== undefined ? receivedQtys[lineId] : defaultQty;
      const isForceClosed = closedLines[lineId] ?? item.isClosed ?? false;
      const progressPct = orderedQty > 0 ? Math.min(100, ((prevReceived + qtyToReceive) / orderedQty) * 100) : 0;
      return {
        ...item,
        lineId,
        orderedQty,
        prevReceived,
        remaining,
        qtyToReceive,
        isForceClosed,
        progressPct,
        lineTotal: qtyToReceive * item.rate,
      };
    });
  }, [selectedPo, receivedQtys, closedLines]);

  const currentTotal = lineData.reduce((sum, l) => sum + l.lineTotal, 0);

  // Progress summary
  const totalOrdered = lineData.reduce((s, l) => s + l.orderedQty, 0);
  const totalPrevReceived = lineData.reduce((s, l) => s + l.prevReceived, 0);
  const totalReceiving = lineData.reduce((s, l) => s + l.qtyToReceive, 0);
  const overallPct = totalOrdered > 0 ? Math.min(100, ((totalPrevReceived + totalReceiving) / totalOrdered) * 100) : 0;

  const handleRecord = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
    // ── Direct Receipt (no PO) ────────────────────────────────────────────────
    if (directReceiptMode) {
      if (!vendorId) { alert('Please select a vendor.'); return; }
      const validLines = directLines.filter(l => l.itemId && l.qty > 0);
      if (!validLines.length) { alert('Add at least one item to receive.'); return; }

      for (const l of validLines) {
        const itemDef = items.find((i: Item) => i.id === l.itemId);
        if (itemDef?.trackLots && !l.lotNumber) {
          alert(`Lot number required for "${itemDef.name}".`); return;
        }
        if (itemDef?.trackSerialNumbers) {
          const requiredSerials = Math.floor(l.qty);
          const serials = l.serials.filter(s => s.trim());
          if (serials.length < requiredSerials) {
            alert(`${requiredSerials} serial number(s) required for "${itemDef.name}" — ${serials.length} entered.`); return;
          }
          if (new Set(serials.map(s => s.trim())).size < serials.length) {
            alert(`Duplicate serial numbers for "${itemDef.name}".`); return;
          }
        }
      }

      const directTotal = validLines.reduce((s, l) => s + l.qty * l.rate, 0);
      const selectedShipViaEntry = shipVia.find(sv => sv.id === selectedShipViaId);
      const receipt: Transaction = {
        id: Math.random().toString(),
        type: receiveWithBill ? 'BILL' : 'RECEIVE_ITEM',
        refNo,
        date: new Date().toLocaleDateString('en-US'),
        entityId: vendorId,
        items: validLines.map(l => ({
          id: l.id,
          itemId: l.itemId,
          description: l.description,
          quantity: l.qty,
          rate: l.rate,
          amount: l.qty * l.rate,
          warehouseId: l.warehouseId || warehouseId || undefined,
          binId: l.binId || binId || undefined,
          lotNumber: l.lotNumber || undefined,
          expirationDate: l.lotExpiry || undefined,
          vendorLotNumber: l.lotVendorLot || undefined,
          manufacturingDate: l.lotMfgDate || undefined,
        })),
        total: directTotal,
        status: receiveWithBill ? 'OPEN' : 'RECEIVED',
        warehouseId: warehouseId || undefined,
        binId: binId || undefined,
        memo: memoText || undefined,
        shipVia: selectedShipViaEntry?.name,
        shipViaId: selectedShipViaId || undefined,
        shippingCost: shippingCost > 0 ? shippingCost : undefined,
      };
      await onSave(receipt);
      if (selectedShipViaEntry?.vendorId && shippingCost > 0) {
        await createShippingBill(receipt, selectedShipViaEntry, shippingCost, onSave as any);
      }

      for (const l of validLines) {
        const itemDef = items.find((i: Item) => i.id === l.itemId);
        if (!itemDef?.trackSerialNumbers) continue;
        const serials = l.serials.filter(s => s.trim()).map(s => s.trim());
        if (!serials.length) continue;
        try {
          await createSerialNumbers(l.itemId, {
            serialNumbers: serials,
            unitCost: l.rate,
            dateReceived: new Date().toISOString().split('T')[0],
            vendorName: vendors.find((v: Vendor) => v.id === vendorId)?.name,
            warehouseId: l.warehouseId || warehouseId || undefined,
            lotNumber: l.lotNumber || undefined,
          });
        } catch { /* non-fatal */ }
      }
      onClose();
      return;
    }

    // ── PO-based Receiving ────────────────────────────────────────────────────
    if (!selectedPo) return;

    // Validate lot numbers
    const missingLotLine = lineData.find((l: any) => {
      if (l.qtyToReceive <= 0 || l.isForceClosed) return false;
      const itemDef = items.find((i: any) => i.id === (l.itemId || (l as any).id));
      if (!itemDef?.trackLots) return false;
      return !lineLots[l.lineId]?.lotNumber;
    });
    if (missingLotLine) {
      const itemDef = items.find((i: any) => i.id === (missingLotLine.itemId || (missingLotLine as any).id));
      alert(`Lot number is required for "${itemDef?.name || missingLotLine.itemId}". Please enter a lot number before receiving.`);
      return;
    }

    // Validate serial numbers: serial-tracked items need exactly qtyToReceive unique serials
    for (const l of lineData) {
      if (l.qtyToReceive <= 0 || l.isForceClosed) continue;
      const itemDef = items.find((i: any) => i.id === (l.itemId || (l as any).id));
      if (!itemDef?.trackSerialNumbers) continue;
      const serials = (lineSerials[l.lineId] || []).filter((s: string) => s.trim());
      if (serials.length < l.qtyToReceive) {
        alert(`Serial numbers required for "${itemDef.name}". Enter ${l.qtyToReceive} serial number(s) — ${serials.length} entered.`);
        return;
      }
      const unique = new Set(serials.map((s: string) => s.trim()));
      if (unique.size < serials.length) {
        alert(`Duplicate serial numbers found for "${itemDef.name}". Each serial number must be unique.`);
        return;
      }
    }

    const receiptItems = lineData
      .filter(l => l.qtyToReceive > 0 || l.isForceClosed)
      .map(l => ({
        ...l,
        quantity: l.qtyToReceive,
        amount: l.lineTotal,
        isClosed: l.isForceClosed || l.qtyToReceive >= l.remaining,
        lotNumber: lineLots[l.lineId]?.lotNumber || undefined,
        expirationDate: lineLots[l.lineId]?.expiry || undefined,
        vendorLotNumber: lineLots[l.lineId]?.vendorLot || undefined,
        manufacturingDate: lineLots[l.lineId]?.mfgDate || undefined,
        warehouseId: lineWarehouses[l.lineId] || warehouseId || undefined,
        binId: lineBins[l.lineId] || binId || undefined,
      }));

    const selectedShipViaEntry2 = shipVia.find(sv => sv.id === selectedShipViaId);
    const receipt: Transaction = {
      id: Math.random().toString(),
      type: receiveWithBill ? 'BILL' : 'RECEIVE_ITEM',
      refNo: refNo,
      date: new Date().toLocaleDateString('en-US'),
      entityId: vendorId,
      items: receiptItems,
      total: currentTotal,
      status: receiveWithBill ? 'OPEN' : 'RECEIVED',
      purchaseOrderId: selectedPoId,
      warehouseId: warehouseId || undefined,
      binId: binId || undefined,
      memo: memoText || undefined,
      shipVia: selectedShipViaEntry2?.name,
      shipViaId: selectedShipViaId || undefined,
      shippingCost: shippingCost > 0 ? shippingCost : undefined,
    };

    await onSave(receipt);
    if (selectedShipViaEntry2?.vendorId && shippingCost > 0) {
      await createShippingBill(receipt, selectedShipViaEntry2, shippingCost, onSave as any);
    }

    // Batch-create serial number records for serial-tracked lines
    for (const l of lineData) {
      if (l.qtyToReceive <= 0 || l.isForceClosed) continue;
      const itemDef = items.find((i: any) => i.id === (l.itemId || (l as any).id));
      if (!itemDef?.trackSerialNumbers) continue;
      const serials = (lineSerials[l.lineId] || []).filter((s: string) => s.trim()).map((s: string) => s.trim());
      if (serials.length === 0) continue;
      try {
        await createSerialNumbers(l.itemId || (l as any).id, {
          serialNumbers: serials,
          unitCost: l.rate,
          dateReceived: new Date().toISOString().split('T')[0],
          purchaseOrderId: selectedPoId,
          vendorName: vendors.find((v: Vendor) => v.id === vendorId)?.name,
          warehouseId: lineWarehouses[l.lineId] || warehouseId || undefined,
          lotNumber: lineLots[l.lineId]?.lotNumber || undefined,
        });
      } catch { /* non-fatal — receipt already saved */ }
    }

    onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === 'PARTIALLY_RECEIVED')
      return <span className="text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full ml-2">Partial</span>;
    if (status === 'OPEN')
      return <span className="text-[9px] font-black uppercase tracking-widest bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.5 rounded-full ml-2">Open</span>;
    return null;
  };

  const canSave = directReceiptMode
    ? vendorId && directLines.some(l => l.itemId && l.qty > 0)
    : selectedPoId && lineData.some(l => l.qtyToReceive > 0 || l.isForceClosed);

  return (
    <div className="bg-[#f0f0f0] h-full flex flex-col p-4 font-sans">
      <div className="bg-white border-2 border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="p-4 bg-white border-b-4 border-blue-900 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-serif italic text-[#003366] drop-shadow-sm">Receive Inventory</h2>
            <div className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200 shadow-inner">Partial Receiving</div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRecord}
              disabled={!canSave || isSaving}
              className="bg-[#0077c5] text-white px-10 py-2 text-xs font-black rounded shadow-md hover:bg-[#005fa0] disabled:bg-gray-400 transition-all uppercase tracking-widest shadow-lg"
            >
              {isSaving ? 'Saving…' : 'Receive Items'}
            </button>
            <button onClick={onClose} className="bg-white border border-gray-400 px-10 py-2 text-xs font-black rounded hover:bg-gray-50 transition-all uppercase tracking-widest shadow-sm">Cancel</button>
          </div>
        </div>

        <div className="p-8 space-y-6 bg-[#f8f9fa] flex-1 overflow-auto custom-scrollbar">

          {/* Receive Mode Radio */}
          <div className="bg-white p-6 border-2 border-gray-100 rounded-sm shadow-xl flex justify-around items-center flex-wrap gap-4">
            <label className="flex items-center gap-4 cursor-pointer group">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${receiveWithBill ? 'bg-blue-600 border-blue-700 shadow-inner' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                {receiveWithBill && <div className="w-2 h-2 bg-white rounded-full"></div>}
              </div>
              <input type="radio" className="hidden" checked={receiveWithBill} onChange={() => setReceiveWithBill(true)} />
              <span className={`text-sm font-black uppercase tracking-widest ${receiveWithBill ? 'text-blue-900' : 'text-gray-400'}`}>Receive items with bill</span>
            </label>
            <div className="h-10 w-px bg-gray-200"></div>
            <label className="flex items-center gap-4 cursor-pointer group">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${!receiveWithBill ? 'bg-blue-600 border-blue-700 shadow-inner' : 'bg-white border-gray-300 group-hover:border-blue-400'}`}>
                {!receiveWithBill && <div className="w-2 h-2 bg-white rounded-full"></div>}
              </div>
              <input type="radio" className="hidden" checked={!receiveWithBill} onChange={() => setReceiveWithBill(false)} />
              <span className={`text-sm font-black uppercase tracking-widest ${!receiveWithBill ? 'text-blue-900' : 'text-gray-400'}`}>Receive items without bill</span>
            </label>
            <div className="h-10 w-px bg-gray-200"></div>
            {/* Direct Receipt (no PO) toggle */}
            <label className="flex items-center gap-4 cursor-pointer group">
              <div
                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${directReceiptMode ? 'bg-orange-500 border-orange-600' : 'bg-white border-gray-300 group-hover:border-orange-400'}`}
                onClick={() => { setDirectReceiptMode(v => !v); setSelectedPoId(''); setReceivedQtys({}); setClosedLines({}); }}
              >
                {directReceiptMode && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className={`text-sm font-black uppercase tracking-widest ${directReceiptMode ? 'text-orange-700' : 'text-gray-400'}`}>Direct Receipt (no PO)</span>
            </label>
          </div>

          {/* Vendor / PO / Lot / Warehouse / Bin Selection */}
          <div className={`grid ${vendorId ? 'grid-cols-3' : 'grid-cols-1'} gap-8 bg-white p-8 border-2 border-gray-100 rounded shadow-lg`}>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic flex items-center gap-2">
                <span className="w-4 h-4 bg-gray-100 rounded-full flex items-center justify-center text-[8px] not-italic">V</span>
                Select Vendor
              </label>
              <select
                className="border-b-2 border-blue-200 p-2 text-lg font-bold bg-blue-50/10 outline-none focus:border-blue-600 text-[#003366] transition-colors"
                value={vendorId}
                onChange={e => { setVendorId(e.target.value); setSelectedPoId(''); setReceivedQtys({}); setClosedLines({}); }}
              >
                <option value="">--Select Vendor--</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>

            {vendorId && !directReceiptMode && (
              <div className="flex flex-col gap-2 animate-in slide-in-from-right-4 duration-300">
                <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest italic">
                  Purchase Order (Open &amp; Partial)
                </label>
                <select
                  className="border-b-2 border-blue-200 p-2 text-sm bg-blue-50/20 font-black outline-none focus:border-blue-600 text-[#003366] shadow-sm"
                  value={selectedPoId}
                  onChange={e => {
                    const poId = e.target.value;
                    setSelectedPoId(poId);
                    setReceivedQtys({});
                    setClosedLines({});
                    const po = vendorPos.find(p => p.id === poId);
                    if (po) {
                      // Reset per-line lot assignments when PO changes
                      setLineLots({});
                      setAvailableLotsMap({});
                      // Auto-prefill warehouse from PO's ship-to warehouse
                      if (po.shipToWarehouseId) {
                        setWarehouseId(po.shipToWarehouseId);
                        setBinId('');
                      }
                      // Pre-load available lots for each inventory item on this PO
                      po.items.forEach(async (li: any) => {
                        if (li.itemId) {
                          try {
                            const lots = await fetchAvailableLots(li.itemId);
                            setAvailableLotsMap((prev: Record<string, any[]>) => ({ ...prev, [li.itemId]: lots }));
                          } catch { /* silent */ }
                        }
                      });
                    }
                  }}
                >
                  <option value="">--Choose PO--</option>
                  {vendorPos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.refNo} ({p.date}) — ${p.total.toLocaleString(undefined, { minimumFractionDigits: 2 })} [{p.status}]
                    </option>
                  ))}
                </select>
                {selectedPo && (
                  <div className="flex items-center gap-2 mt-1">
                    {statusBadge(selectedPo.status)}
                    {selectedPo.status === 'PARTIALLY_RECEIVED' && (
                      <span className="text-[9px] text-amber-700 font-bold">Prior receipts exist — enter remaining quantities below</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {vendorId && !directReceiptMode && (
              <div className="flex flex-col gap-2 animate-in slide-in-from-right-4 duration-300 justify-center">
                <div className="flex items-start gap-2 bg-purple-50 border border-purple-200 rounded px-3 py-2">
                  <span className="text-purple-500 mt-0.5 text-sm flex-shrink-0">🏷️</span>
                  <div>
                    <p className="text-[10px] font-black text-purple-900 uppercase tracking-widest">Per-Line Lot Assignment</p>
                    <p className="text-[9px] text-purple-600 mt-0.5">Assign a unique lot number to each PO line below. Type a new lot or select an existing FIFO lot.</p>
                  </div>
                </div>
              </div>
            )}
            {vendorId && directReceiptMode && (
              <div className="col-span-2 flex flex-col gap-2 animate-in slide-in-from-right-4 duration-300 justify-center">
                <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded px-3 py-2">
                  <span className="text-orange-500 mt-0.5 text-sm flex-shrink-0">📋</span>
                  <div>
                    <p className="text-[10px] font-black text-orange-900 uppercase tracking-widest">Direct Receipt — No PO Required</p>
                    <p className="text-[9px] text-orange-600 mt-0.5">Add items directly below. Each line can have its own warehouse, bin, lot, and serial numbers.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Warehouse + Bin Selection */}
          {vendorId && (
            <div className="grid grid-cols-2 gap-8 bg-white p-8 border-2 border-indigo-50 rounded shadow-lg animate-in slide-in-from-top-2 duration-300">
              {/* Warehouse */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest italic flex items-center gap-2">
                  <span className="w-4 h-4 bg-indigo-100 rounded flex items-center justify-center text-[9px] not-italic">W</span>
                  Destination Warehouse
                </label>
                {warehouses.length > 0 ? (
                  <select
                    className="border-b-2 border-indigo-200 p-2 text-sm bg-indigo-50/10 font-black outline-none focus:border-indigo-600 text-[#003366] shadow-sm"
                    value={warehouseId}
                    onChange={e => { setWarehouseId(e.target.value); setBinId(''); }}
                  >
                    <option value="">-- Default Warehouse --</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}{w.isDefault ? ' (Default)' : ''}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-gray-400 italic p-2">No warehouses configured</span>
                )}
              </div>

              {/* Bin */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest italic flex items-center gap-2">
                  <span className="w-4 h-4 bg-indigo-100 rounded flex items-center justify-center text-[9px] not-italic">B</span>
                  Destination Bin
                </label>
                {warehouseId && availableBins.length > 0 ? (
                  <select
                    className="border-b-2 border-indigo-200 p-2 text-sm bg-indigo-50/10 font-black outline-none focus:border-indigo-600 text-[#003366] shadow-sm"
                    value={binId}
                    onChange={e => setBinId(e.target.value)}
                  >
                    <option value="">-- Unassigned --</option>
                    {availableBins.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}{b.zone ? ` · ${b.zone}` : ''}{b.aisle ? ` / ${b.aisle}` : ''}{b.shelf ? `-${b.shelf}` : ''}{b.position ? `-${b.position}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-gray-400 italic p-2">
                    {!warehouseId ? 'Select a warehouse first' : 'No bins in this warehouse — add bins in Warehouse Manager'}
                  </span>
                )}
              </div>

              {/* Confirmation badge */}
              {(warehouseId || binId) && (
                <div className="col-span-2 flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Receiving to:</span>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-black rounded-full border border-indigo-200">
                    {warehouses.find(w => w.id === warehouseId)?.name || 'Default Warehouse'}
                  </span>
                  {binId && availableBins.find(b => b.id === binId) && (
                    <>
                      <span className="text-indigo-300 text-[10px]">›</span>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-full border border-indigo-200">
                        {availableBins.find(b => b.id === binId)?.name}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Document Chain Panel */}
          {selectedPo && (
            <div className="bg-white border-2 border-indigo-100 rounded shadow-lg p-5">
              <div className="text-[10px] font-black uppercase tracking-widest text-indigo-700 mb-3 flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                Document Chain
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Source PO card */}
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded px-3 py-2">
                  <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-100 px-1.5 py-0.5 rounded">PO</span>
                  <div>
                    <div className="text-[10px] font-black text-indigo-900">#{selectedPo.refNo}</div>
                    <div className="text-[9px] text-indigo-500">{selectedPo.date} · ${selectedPo.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                  <span className={`ml-1 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                    selectedPo.status === 'PARTIALLY_RECEIVED' ? 'bg-amber-100 text-amber-700' :
                    selectedPo.status === 'CLOSED' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'
                  }`}>{selectedPo.status}</span>
                </div>

                {priorReceipts.length > 0 && (
                  <>
                    <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    <div className="flex flex-col gap-1">
                      {priorReceipts.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${r.type === 'BILL' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {r.type === 'BILL' ? 'Bill' : 'Receipt'}
                          </span>
                          <span className="text-[10px] font-black text-amber-900">#{r.refNo}</span>
                          <span className="text-[9px] text-amber-500">{r.date}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 border-dashed rounded px-3 py-2 opacity-70">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${receiveWithBill ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {receiveWithBill ? 'Bill' : 'Receipt'}
                  </span>
                  <span className="text-[10px] font-black text-green-800 italic">New · {refNo}</span>
                </div>
              </div>

              {/* Backorder alert: items remaining after this receipt */}
              {(() => {
                const willHaveRemaining = lineData.some(l => {
                  const afterReceive = l.prevReceived + l.qtyToReceive;
                  return afterReceive < l.orderedQty && !l.isForceClosed;
                });
                if (!willHaveRemaining) return null;
                const backorderedLines = lineData.filter(l => {
                  const afterReceive = l.prevReceived + l.qtyToReceive;
                  return afterReceive < l.orderedQty && !l.isForceClosed;
                });
                return (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-3 flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Backorder Alert</span>
                      <p className="text-[10px] text-amber-600 mt-0.5">
                        {backorderedLines.length} line{backorderedLines.length !== 1 ? 's' : ''} will remain open after this receipt.
                        PO will stay <span className="font-black">PARTIALLY RECEIVED</span> until remaining items are received or lines are closed.
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {backorderedLines.map((l, i) => {
                          const itemMaster = items.find(it => it.id === (l.itemId || l.id));
                          const afterReceive = l.prevReceived + l.qtyToReceive;
                          const stillNeeded = l.orderedQty - afterReceive;
                          return (
                            <span key={i} className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                              {itemMaster?.name || l.description || 'Item'}: {stillNeeded} remaining
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Overall Progress Bar (only when PO selected) */}
          {selectedPo && (
            <div className="bg-white border-2 border-gray-100 rounded shadow-lg p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Overall Receiving Progress</span>
                <span className="text-[10px] font-black text-blue-900">
                  {(totalPrevReceived + totalReceiving).toFixed(0)} / {totalOrdered.toFixed(0)} units &nbsp;
                  <span className="text-amber-700">({overallPct.toFixed(0)}%)</span>
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${overallPct}%`,
                    background: overallPct >= 100 ? '#16a34a' : overallPct > 0 ? '#f59e0b' : '#e5e7eb'
                  }}
                />
              </div>
              <div className="flex gap-6 mt-3 text-[9px] font-black uppercase tracking-widest">
                <span className="text-gray-400">Ordered: <span className="text-gray-700">{totalOrdered}</span></span>
                <span className="text-blue-600">Previously Received: <span className="text-blue-900">{totalPrevReceived}</span></span>
                <span className="text-amber-600">Receiving Now: <span className="text-amber-900">{totalReceiving}</span></span>
                <span className="text-gray-400">Remaining After: <span className="text-gray-700">{Math.max(0, totalOrdered - totalPrevReceived - totalReceiving)}</span></span>
              </div>
            </div>
          )}

          {/* Line Items Table */}
          <div className="bg-white border-2 border-gray-300 rounded shadow-2xl overflow-hidden min-h-[300px]">
            {selectedPo ? (
              <table className="w-full text-[11px] text-left border-collapse">
                <thead className="bg-[#e8e8e8] border-b-2 border-gray-400 text-[#003366] font-black uppercase">
                  <tr>
                    <th className="p-3 border-r border-gray-300">Item</th>
                    <th className="p-3 border-r border-gray-300">Description</th>
                    <th className="p-3 border-r border-gray-300 text-center w-24">Ordered</th>
                    <th className="p-3 border-r border-gray-300 text-center w-28 text-blue-800">Prev. Received</th>
                    <th className="p-3 border-r border-gray-300 text-center w-24 text-amber-800">Remaining</th>
                    <th className="p-3 border-r border-gray-300 text-center w-32">Qty to Receive</th>
                    <th className="p-3 border-r border-gray-300 text-left w-44 text-purple-800">Lot # <span className="font-normal normal-case text-[8px] text-purple-400">(per-line)</span></th>
                    <th className="p-3 border-r border-gray-300 text-left w-44 text-teal-800">Serial #s <span className="font-normal normal-case text-[8px] text-teal-400">(one per unit)</span></th>
                    <th className="p-3 border-r border-gray-300 text-left w-40 text-indigo-800">Warehouse / Bin <span className="font-normal normal-case text-[8px] text-indigo-400">(per-line)</span></th>
                    <th className="p-3 border-r border-gray-300 text-right w-24">Unit Cost</th>
                    <th className="p-3 border-r border-gray-300 text-right w-28">Line Total</th>
                    <th className="p-3 text-center w-24">Close Line</th>
                  </tr>
                </thead>
                <tbody>
                  {lineData.map((line, i) => {
                    const itemMaster = items.find(it => it.id === (line.itemId || line.id));
                    const isFullyReceived = line.prevReceived >= line.orderedQty;
                    const rowBg = isFullyReceived
                      ? 'bg-green-50/50'
                      : line.isForceClosed
                        ? 'bg-slate-50/80'
                        : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30';

                    return (
                      <tr key={i} className={`border-b h-auto ${rowBg} group transition-colors`}>
                        {/* Item Name */}
                        <td className="p-3 border-r border-gray-200 font-black text-gray-800 uppercase tracking-tighter">
                          {isFullyReceived && (
                            <span className="block text-[8px] text-green-600 font-black uppercase mb-0.5">✓ Complete</span>
                          )}
                          {line.isForceClosed && !isFullyReceived && (
                            <span className="block text-[8px] text-slate-500 font-black uppercase mb-0.5">Closed</span>
                          )}
                          {itemMaster?.name || line.description || 'Item'}
                        </td>

                        {/* Description */}
                        <td className="p-3 border-r border-gray-200 italic text-gray-500">{line.description}</td>

                        {/* Ordered Qty */}
                        <td className="p-3 border-r border-gray-200 text-center font-bold text-gray-500">{line.orderedQty}</td>

                        {/* Previously Received */}
                        <td className="p-3 border-r border-gray-200 text-center">
                          <span className={`font-black ${line.prevReceived > 0 ? 'text-blue-800' : 'text-gray-300'}`}>
                            {line.prevReceived}
                          </span>
                          {/* Progress bar */}
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${Math.min(100, (line.prevReceived / line.orderedQty) * 100)}%`,
                                background: isFullyReceived ? '#16a34a' : '#3b82f6'
                              }}
                            />
                          </div>
                        </td>

                        {/* Remaining */}
                        <td className="p-3 border-r border-gray-200 text-center">
                          <span className={`font-black ${line.remaining > 0 ? 'text-amber-700' : 'text-green-600'}`}>
                            {line.remaining > 0 ? line.remaining : '—'}
                          </span>
                        </td>

                        {/* Qty to Receive input */}
                        <td className="p-3 border-r border-gray-200 text-center font-black text-blue-900 bg-blue-50/30">
                          {isFullyReceived || line.isForceClosed ? (
                            <span className="text-gray-300 italic">—</span>
                          ) : (
                            <input
                              type="number"
                              min={0}
                              max={line.remaining}
                              step={1}
                              className="w-full h-full text-center bg-transparent outline-none border border-blue-200 rounded px-1 py-0.5 focus:border-blue-500"
                              value={line.qtyToReceive}
                              onChange={e => handleQtyChange(line.lineId, parseFloat(e.target.value) || 0)}
                            />
                          )}
                        </td>

                        {/* Per-Line Lot Assignment */}
                        <td className="p-2 border-r border-gray-200 bg-purple-50/20">
                          {isFullyReceived || line.isForceClosed ? (
                            <span className="text-gray-300 italic text-[10px]">—</span>
                          ) : (() => {
                            const lineId = line.lineId;
                            const itemId = line.itemId || (line as any).id;
                            const itemDef = items.find((i: any) => i.id === itemId);
                            // QB Enterprise: lot assignment only for items with lot tracking enabled
                            if (!itemDef?.trackLots) {
                              return <span className="text-gray-300 italic text-[10px] px-1">—</span>;
                            }
                            const lotState = lineLots[lineId] || { lotNumber: '', isNew: true, expiry: '', vendorLot: '', mfgDate: '' };
                            const existingLots: any[] = availableLotsMap[itemId] || [];
                            const missingLot = !lotState.lotNumber;
                            return (
                              <div className="flex flex-col gap-1">
                                {existingLots.length > 0 && (
                                  <div className="flex items-center gap-1 mb-0.5">
                                    <button
                                      onClick={() => setLineLots((prev: Record<string, any>) => ({ ...prev, [lineId]: { ...lotState, isNew: false } }))}
                                      className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded transition-colors ${!lotState.isNew ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-purple-100'}`}
                                    >Existing</button>
                                    <button
                                      onClick={() => setLineLots((prev: Record<string, any>) => ({ ...prev, [lineId]: { ...lotState, isNew: true } }))}
                                      className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded transition-colors ${lotState.isNew ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-purple-100'}`}
                                    >New Lot</button>
                                  </div>
                                )}
                                {missingLot && (
                                  <div className="text-[8px] font-black text-red-600 uppercase tracking-wide mb-0.5">* Required</div>
                                )}
                                {!lotState.isNew && existingLots.length > 0 ? (
                                  <select
                                    className={`w-full rounded px-1 py-0.5 text-[10px] font-bold text-purple-900 bg-white outline-none focus:border-purple-500 border ${missingLot ? 'border-red-400 bg-red-50' : 'border-purple-200'}`}
                                    value={lotState.lotNumber}
                                    onChange={e => setLineLots((prev: Record<string, any>) => ({ ...prev, [lineId]: { ...lotState, lotNumber: e.target.value } }))}
                                  >
                                    <option value="">-- Select Lot * --</option>
                                    {existingLots.map((l: any) => (
                                      <option key={l.lotNumber} value={l.lotNumber}>
                                        {l.lotNumber} ({l.quantityRemaining} avail)
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Lot number *"
                                    className={`w-full rounded px-1 py-0.5 text-[10px] font-bold text-purple-900 bg-white outline-none focus:border-purple-500 border ${missingLot ? 'border-red-400 bg-red-50' : 'border-purple-200'}`}
                                    value={lotState.lotNumber}
                                    onChange={e => setLineLots((prev: Record<string, any>) => ({ ...prev, [lineId]: { ...lotState, lotNumber: e.target.value } }))}
                                  />
                                )}
                                <input
                                  type="date"
                                  title="Expiration date (optional)"
                                  className="w-full border border-purple-100 rounded px-1 py-0.5 text-[9px] text-purple-600 bg-white outline-none focus:border-purple-400"
                                  value={lotState.expiry}
                                  onChange={e => setLineLots((prev: Record<string, any>) => ({ ...prev, [lineId]: { ...lotState, expiry: e.target.value } }))}
                                  placeholder="Expiry date"
                                />
                                <input
                                  type="date"
                                  title="Manufacturing / production date (optional)"
                                  className="w-full border border-purple-100 rounded px-1 py-0.5 text-[9px] text-blue-500 bg-white outline-none focus:border-blue-300"
                                  value={lotState.mfgDate || ''}
                                  onChange={e => setLineLots((prev: Record<string, any>) => ({ ...prev, [lineId]: { ...lotState, mfgDate: e.target.value } }))}
                                  placeholder="Mfg date"
                                />
                                <input
                                  type="text"
                                  title="Vendor's own lot/batch number (optional)"
                                  className="w-full border border-purple-100 rounded px-1 py-0.5 text-[9px] text-gray-500 bg-white outline-none focus:border-purple-400"
                                  value={lotState.vendorLot || ''}
                                  onChange={e => setLineLots((prev: Record<string, any>) => ({ ...prev, [lineId]: { ...lotState, vendorLot: e.target.value } }))}
                                  placeholder="Vendor lot #"
                                />
                              </div>
                            );
                          })()}
                        </td>

                        {/* Per-Line Serial Number Entry */}
                        <td className="p-2 border-r border-gray-200 bg-teal-50/20">
                          {isFullyReceived || line.isForceClosed ? (
                            <span className="text-gray-300 italic text-[10px]">—</span>
                          ) : (() => {
                            const itemDef = items.find((it: Item) => it.id === (line.itemId || (line as any).id));
                            if (!itemDef?.trackSerialNumbers) {
                              return <span className="text-gray-300 italic text-[10px] px-1">—</span>;
                            }
                            const count = Math.max(1, Math.floor(line.qtyToReceive));
                            const current = lineSerials[line.lineId] || Array(count).fill('');
                            const padded = [...current, ...Array(Math.max(0, count - current.length)).fill('')].slice(0, count);
                            return (
                              <div className="flex flex-col gap-1">
                                <div className="text-[8px] font-black text-teal-700 uppercase tracking-wide mb-0.5">
                                  {count} serial{count !== 1 ? 's' : ''} required
                                </div>
                                {padded.map((sn: string, idx: number) => (
                                  <input
                                    key={idx}
                                    type="text"
                                    placeholder={`S/N ${idx + 1}`}
                                    className={`w-full rounded px-1 py-0.5 text-[10px] font-bold text-teal-900 bg-white outline-none border focus:border-teal-500 ${!sn.trim() ? 'border-red-300 bg-red-50' : 'border-teal-200'}`}
                                    value={sn}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                      const updated = [...padded];
                                      updated[idx] = e.target.value;
                                      setLineSerials((prev: Record<string, string[]>) => ({ ...prev, [line.lineId]: updated }));
                                    }}
                                  />
                                ))}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Per-Line Warehouse / Bin */}
                        <td className="p-2 border-r border-gray-200 bg-indigo-50/20">
                          {isFullyReceived || line.isForceClosed ? (
                            <span className="text-gray-300 italic text-[10px]">—</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <select
                                className="w-full rounded px-1 py-0.5 text-[10px] font-bold text-indigo-900 bg-white outline-none border border-indigo-200 focus:border-indigo-500"
                                value={lineWarehouses[line.lineId] ?? warehouseId}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                  const wid = e.target.value;
                                  setLineWarehouses((prev: Record<string, string>) => ({ ...prev, [line.lineId]: wid }));
                                  setLineBins((prev: Record<string, string>) => { const n: Record<string, string> = { ...prev }; delete n[line.lineId]; return n; });
                                }}
                              >
                                <option value="">-- Default --</option>
                                {warehouses.map((w: Warehouse) => (
                                  <option key={w.id} value={w.id}>{w.name}{w.isDefault ? ' \u2713' : ''}</option>
                                ))}
                              </select>
                              {(() => {
                                const lineWhId = lineWarehouses[line.lineId] ?? warehouseId;
                                const lineBinsFiltered = allBins.filter((b: Bin) => b.warehouseId === lineWhId && b.isActive);
                                if (!lineWhId || lineBinsFiltered.length === 0) return null;
                                return (
                                  <select
                                    className="w-full rounded px-1 py-0.5 text-[10px] font-bold text-indigo-700 bg-white outline-none border border-indigo-100 focus:border-indigo-400"
                                    value={lineBins[line.lineId] ?? ''}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLineBins((prev: Record<string, string>) => ({ ...prev, [line.lineId]: e.target.value }))}
                                  >
                                    <option value="">-- No bin --</option>
                                    {lineBinsFiltered.map((b: Bin) => (
                                      <option key={b.id} value={b.id}>{b.name}{b.zone ? ` \u00b7 ${b.zone}` : ''}</option>
                                    ))}
                                  </select>
                                );
                              })()}
                            </div>
                          )}
                        </td>

                        {/* Unit Cost */}
                        <td className="p-3 border-r border-gray-200 text-right font-mono font-bold text-gray-600">${line.rate.toFixed(2)}</td>

                        {/* Line Total */}
                        <td className="p-3 border-r border-gray-200 text-right font-mono font-black text-gray-800">
                          ${line.lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        {/* Close Line Checkbox */}
                        <td className="p-3 text-center">
                          {isFullyReceived ? (
                            <span className="text-green-600 text-lg">✓</span>
                          ) : (
                            <label className="flex flex-col items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={line.isForceClosed}
                                onChange={e => handleCloseLineToggle(line.lineId, e.target.checked)}
                                className="w-4 h-4 accent-blue-700 cursor-pointer"
                              />
                              <span className="text-[8px] text-gray-400 font-bold uppercase">Close</span>
                            </label>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {[1, 2].map(i => (
                    <tr key={`filler-${i}`} className="h-8 border-b border-gray-100 opacity-20">
                      <td className="border-r" /><td className="border-r" /><td className="border-r" /><td className="border-r" /><td className="border-r" /><td className="border-r" /><td className="border-r" /><td className="border-r" /><td className="border-r" /><td className="border-r" /><td className="border-r" /><td />
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={10} className="p-4 text-right font-black uppercase text-[10px] tracking-widest text-gray-500">Total Receiving Value:</td>
                    <td className="p-4 text-right font-black font-mono text-xl text-blue-900">${currentTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            ) : directReceiptMode ? (
              /* Direct Receipt Items Table */
              <div className="p-4">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead className="bg-[#e8e8e8] border-b-2 border-gray-400 text-[#003366] font-black uppercase">
                    <tr>
                      <th className="p-2 border-r border-gray-300 w-40">Item</th>
                      <th className="p-2 border-r border-gray-300">Description</th>
                      <th className="p-2 border-r border-gray-300 text-center w-20">Qty</th>
                      <th className="p-2 border-r border-gray-300 text-right w-24">Unit Cost</th>
                      <th className="p-2 border-r border-gray-300 text-left w-44 text-indigo-800">Warehouse / Bin</th>
                      <th className="p-2 border-r border-gray-300 text-left w-36 text-purple-800">Lot # <span className="font-normal normal-case text-[8px] text-purple-400">(if tracked)</span></th>
                      <th className="p-2 border-r border-gray-300 text-left w-36 text-teal-800">Serial #s <span className="font-normal normal-case text-[8px] text-teal-400">(one per unit)</span></th>
                      <th className="p-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {directLines.map((dl, idx) => {
                      const itemDef = items.find((i: Item) => i.id === dl.itemId);
                      const dlBins = getBinsForWarehouse(dl.warehouseId || warehouseId);
                      const serialCount = Math.max(0, Math.floor(dl.qty));
                      const serialPadded = [...dl.serials, ...Array(Math.max(0, serialCount - dl.serials.length)).fill('')].slice(0, serialCount);

                      const updateLine = (patch: Partial<DirectLine>) =>
                        setDirectLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));

                      return (
                        <tr key={dl.id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-orange-50/20'}`}>
                          {/* Item */}
                          <td className="p-2 border-r border-gray-200">
                            <select
                              className="w-full rounded px-1 py-0.5 text-[10px] font-bold text-gray-900 bg-white outline-none border border-gray-200 focus:border-orange-400"
                              value={dl.itemId}
                              onChange={e => {
                                const itm = items.find((i: Item) => i.id === e.target.value);
                                updateLine({ itemId: e.target.value, description: itm?.purchaseDescription || itm?.description || '', rate: itm?.cost || 0 });
                              }}
                            >
                              <option value="">-- Select Item --</option>
                              {items.filter((i: Item) => i.type === 'Inventory Part' || i.type === 'Non-inventory Part' || i.type === 'Inventory Assembly').map((i: Item) => (
                                <option key={i.id} value={i.id}>{i.name}</option>
                              ))}
                            </select>
                          </td>
                          {/* Description */}
                          <td className="p-2 border-r border-gray-200">
                            <input
                              type="text"
                              className="w-full rounded px-1 py-0.5 text-[10px] text-gray-700 bg-white outline-none border border-gray-200 focus:border-orange-400"
                              value={dl.description}
                              onChange={e => updateLine({ description: e.target.value })}
                              placeholder="Description"
                            />
                          </td>
                          {/* Qty */}
                          <td className="p-2 border-r border-gray-200 text-center">
                            <input
                              type="number"
                              min={1}
                              step={1}
                              className="w-full text-center rounded px-1 py-0.5 text-[10px] font-bold bg-white outline-none border border-orange-200 focus:border-orange-500"
                              value={dl.qty}
                              onChange={e => updateLine({ qty: parseFloat(e.target.value) || 0, serials: [] })}
                            />
                          </td>
                          {/* Unit Cost */}
                          <td className="p-2 border-r border-gray-200 text-right">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              className="w-full text-right rounded px-1 py-0.5 text-[10px] font-bold bg-white outline-none border border-gray-200 focus:border-orange-400"
                              value={dl.rate}
                              onChange={e => updateLine({ rate: parseFloat(e.target.value) || 0 })}
                            />
                          </td>
                          {/* Warehouse / Bin */}
                          <td className="p-2 border-r border-gray-200 bg-indigo-50/10">
                            <div className="flex flex-col gap-1">
                              <select
                                className="w-full rounded px-1 py-0.5 text-[10px] font-bold text-indigo-900 bg-white outline-none border border-indigo-200 focus:border-indigo-500"
                                value={dl.warehouseId || warehouseId}
                                onChange={e => updateLine({ warehouseId: e.target.value, binId: '' })}
                              >
                                <option value="">-- Default --</option>
                                {warehouses.map(w => (
                                  <option key={w.id} value={w.id}>{w.name}{w.isDefault ? ' ✓' : ''}</option>
                                ))}
                              </select>
                              {dlBins.length > 0 && (
                                <select
                                  className="w-full rounded px-1 py-0.5 text-[10px] font-bold text-indigo-700 bg-white outline-none border border-indigo-100 focus:border-indigo-400"
                                  value={dl.binId}
                                  onChange={e => updateLine({ binId: e.target.value })}
                                >
                                  <option value="">-- No bin --</option>
                                  {dlBins.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}{b.zone ? ` · ${b.zone}` : ''}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                          {/* Lot # */}
                          <td className="p-2 border-r border-gray-200 bg-purple-50/10">
                            {itemDef?.trackLots ? (
                              <div className="flex flex-col gap-1">
                                <input
                                  type="text"
                                  placeholder="Lot number *"
                                  className={`w-full rounded px-1 py-0.5 text-[10px] font-bold text-purple-900 bg-white outline-none border focus:border-purple-500 ${!dl.lotNumber ? 'border-red-300 bg-red-50' : 'border-purple-200'}`}
                                  value={dl.lotNumber}
                                  onChange={e => updateLine({ lotNumber: e.target.value })}
                                />
                                <input type="date" title="Expiry" className="w-full border border-purple-100 rounded px-1 py-0.5 text-[9px] text-purple-600 bg-white outline-none" value={dl.lotExpiry} onChange={e => updateLine({ lotExpiry: e.target.value })} />
                                <input type="text" placeholder="Vendor lot #" className="w-full border border-purple-100 rounded px-1 py-0.5 text-[9px] text-gray-500 bg-white outline-none" value={dl.lotVendorLot} onChange={e => updateLine({ lotVendorLot: e.target.value })} />
                              </div>
                            ) : (
                              <span className="text-gray-300 italic text-[10px] px-1">—</span>
                            )}
                          </td>
                          {/* Serial #s */}
                          <td className="p-2 border-r border-gray-200 bg-teal-50/10">
                            {itemDef?.trackSerialNumbers ? (
                              <div className="flex flex-col gap-1">
                                <div className="text-[8px] font-black text-teal-700 uppercase">{serialCount} required</div>
                                {serialPadded.map((sn: string, si: number) => (
                                  <input
                                    key={si}
                                    type="text"
                                    placeholder={`S/N ${si + 1}`}
                                    className={`w-full rounded px-1 py-0.5 text-[10px] font-bold text-teal-900 bg-white outline-none border focus:border-teal-500 ${!sn.trim() ? 'border-red-300 bg-red-50' : 'border-teal-200'}`}
                                    value={sn}
                                    onChange={e => { const u = [...serialPadded]; u[si] = e.target.value; updateLine({ serials: u }); }}
                                  />
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-300 italic text-[10px] px-1">—</span>
                            )}
                          </td>
                          {/* Remove */}
                          <td className="p-2 text-center">
                            <button
                              onClick={() => setDirectLines(prev => prev.filter((_, i) => i !== idx))}
                              className="text-red-400 hover:text-red-600 text-lg font-black leading-none"
                              title="Remove line"
                            >×</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={8} className="p-3">
                        <button
                          onClick={() => setDirectLines(prev => [...prev, { id: Date.now().toString(36) + Math.random().toString(36).slice(2), itemId: '', description: '', qty: 1, rate: 0, warehouseId: '', binId: '', lotNumber: '', lotExpiry: '', lotMfgDate: '', lotVendorLot: '', serials: [] }])}
                          className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-800 border border-orange-300 hover:border-orange-500 px-3 py-1 rounded transition-colors"
                        >+ Add Line</button>
                        <span className="ml-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          Total: <span className="text-blue-900 font-mono text-base ml-1">
                            ${directLines.reduce((s, l) => s + l.qty * l.rate, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-300 italic p-10 text-center bg-gray-50/50">
                <span className="text-6xl mb-4 opacity-10">📦</span>
                Select a vendor and an open or partially received purchase order to view and receive items.
              </div>
            )}
          </div>

          {/* Shipping */}
          {(selectedPo || directReceiptMode) && shipVia.length > 0 && (
            <div className="bg-blue-50/40 border-2 border-blue-100 rounded shadow-lg p-5 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Inbound Shipping</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Carrier (Ship Via)</label>
                  <select
                    className="border border-gray-300 rounded px-2 py-1.5 text-xs bg-white outline-none focus:border-blue-500 font-bold"
                    value={selectedShipViaId}
                    onChange={e => setSelectedShipViaId(e.target.value)}
                  >
                    <option value="">-- Select --</option>
                    {shipVia.filter(sv => sv.isActive).map(sv => (
                      <option key={sv.id} value={sv.id}>{sv.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500">Shipping Cost</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="border border-gray-300 rounded pl-5 pr-2 py-1.5 text-xs w-full outline-none focus:border-blue-500 font-bold"
                      value={shippingCost || ''}
                      onChange={e => setShippingCost(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
              {selectedShipViaId && (
                <p className="text-[9px]">
                  {shipVia.find(sv => sv.id === selectedShipViaId)?.vendorId
                    ? <span className="text-green-600 font-bold">✓ Carrier bill will be auto-generated on save</span>
                    : <span className="text-orange-500">⚠ No vendor linked — bill will not be auto-created</span>
                  }
                </p>
              )}
            </div>
          )}

          {/* Memo */}
          {(selectedPo || directReceiptMode) && (
            <div className="bg-white border-2 border-gray-100 rounded shadow-lg p-5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Memo / Notes</label>
              <textarea
                value={memoText}
                onChange={e => setMemoText(e.target.value)}
                placeholder="Optional note for this receipt..."
                className="w-full border border-gray-200 rounded p-2 text-sm text-gray-700 resize-none h-16 outline-none focus:border-blue-400"
              />
            </div>
          )}

          {/* Prior Receipts History */}
          {selectedPo && priorReceipts.length > 0 && (
            <div className="bg-white border-2 border-amber-100 rounded shadow-lg overflow-hidden">
              <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-center gap-3">
                <span className="text-amber-800 font-black text-[11px] uppercase tracking-widest">Prior Receipts Against This PO</span>
                <span className="bg-amber-200 text-amber-900 text-[9px] font-black px-2 py-0.5 rounded-full">{priorReceipts.length}</span>
              </div>
              <table className="w-full text-[11px]">
                <thead className="bg-amber-50/50 border-b border-amber-100">
                  <tr>
                    <th className="p-3 text-left font-black uppercase text-amber-700 tracking-widest">Ref #</th>
                    <th className="p-3 text-left font-black uppercase text-amber-700 tracking-widest">Date</th>
                    <th className="p-3 text-left font-black uppercase text-amber-700 tracking-widest">Type</th>
                    <th className="p-3 text-right font-black uppercase text-amber-700 tracking-widest">Amount</th>
                    <th className="p-3 text-center font-black uppercase text-amber-700 tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-50">
                  {priorReceipts.map((r, i) => (
                    <tr key={i} className="hover:bg-amber-50/30">
                      <td className="p-3 font-mono font-bold text-gray-700">{r.refNo}</td>
                      <td className="p-3 text-gray-600">{r.date}</td>
                      <td className="p-3">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${r.type === 'RECEIVE_ITEM' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {r.type === 'RECEIVE_ITEM' ? 'Item Receipt' : 'Bill'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-black text-gray-800">
                        ${r.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          r.status === 'PAID' || r.status === 'CLOSED' ? 'bg-gray-100 text-gray-500' :
                          r.status === 'RECEIVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ReceiveInventoryForm;
