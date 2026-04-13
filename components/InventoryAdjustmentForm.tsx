
import React, { useState, useEffect, useMemo } from 'react';
import { Item, Account, Transaction, Warehouse } from '../types';
import { fetchWarehouses } from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const REASON_CODES = [
  'Cycle Count',
  'Damaged',
  'Theft',
  'Shrinkage',
  'Obsolete',
  'Returned to Vendor',
  'Found',
  'Correction',
  'Other',
];

type AdjustmentType = 'Quantity and Total Value' | 'Quantity' | 'Total Value';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdjLine {
  newQoh?: number;
  newCost?: number;
  reasonCode?: string;
  lotNumber?: string;
}

interface Props {
  items: Item[];
  accounts: Account[];
  onSave: (adj: Transaction) => Promise<void>;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const InventoryAdjustmentForm: React.FC<Props> = ({ items, accounts, onSave, onClose }) => {
  const today = new Date().toISOString().slice(0, 10);

  const [adjustmentDate, setAdjustmentDate]   = useState(today);
  const [adjustmentAccount, setAdjustmentAccount] = useState('');
  const [adjustmentType, setAdjustmentType]   = useState<AdjustmentType>('Quantity');
  const [warehouseId, setWarehouseId]         = useState('ALL');
  const [memo, setMemo]                       = useState('');
  const [headerReason, setHeaderReason]       = useState('');
  const [lines, setLines]                     = useState<Record<string, AdjLine>>({});
  const [warehouses, setWarehouses]           = useState<Warehouse[]>([]);
  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  useEffect(() => {
    fetchWarehouses()
      .then((res: any) => {
        const list = Array.isArray(res) ? res : res?.warehouses ?? [];
        setWarehouses(list);
      })
      .catch(() => {});
  }, []);

  // Include both Inventory Part and Inventory Assembly items
  const inventoryItems = useMemo(
    () => items.filter(i => i.type === 'Inventory Part' || i.type === 'Inventory Assembly'),
    [items]
  );

  // Get QOH for a given item scoped to selected warehouse
  const getQoh = (item: Item): number => {
    if (warehouseId === 'ALL' || !item.warehouseQuantities?.length) return item.onHand ?? 0;
    return item.warehouseQuantities.find(w => w.warehouseId === warehouseId)?.onHand ?? item.onHand ?? 0;
  };

  const updateLine = (itemId: string, field: keyof AdjLine, value: any) =>
    setLines(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));

  const showQtyCol  = adjustmentType === 'Quantity' || adjustmentType === 'Quantity and Total Value';
  const showCostCol = adjustmentType === 'Total Value' || adjustmentType === 'Quantity and Total Value';
  const showLotCol  = inventoryItems.some(i => (i as any).trackLots);

  // Compute per-item value difference
  const valueDiffFor = (item: Item): number => {
    const line        = lines[item.id] ?? {};
    const curQoh      = getQoh(item);
    const curCost     = item.cost ?? 0;
    const newQoh      = showQtyCol  ? (line.newQoh  ?? curQoh)  : curQoh;
    const newCostVal  = showCostCol ? (line.newCost ?? curCost) : curCost;
    const qtyDiff     = newQoh - curQoh;

    if (adjustmentType === 'Quantity')              return qtyDiff * curCost;
    if (adjustmentType === 'Total Value')           return (newCostVal - curCost) * curQoh;
    /* Quantity and Total Value */                  return qtyDiff * newCostVal + (newCostVal - curCost) * curQoh;
  };

  const totalValueDiff = useMemo(
    () => inventoryItems.reduce((sum, item) => sum + valueDiffFor(item), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inventoryItems, lines, warehouseId, adjustmentType]
  );

  const handleRecord = async () => {
    setError(null);
    if (!adjustmentDate) { setError('Adjustment date is required.'); return; }
    if (!adjustmentAccount) { setError('Please select an adjustment account.'); return; }

    const adjItems = inventoryItems.flatMap(item => {
      const line       = lines[item.id] ?? {};
      const curQoh     = getQoh(item);
      const curCost    = item.cost ?? 0;
      const newQoh     = showQtyCol  ? (line.newQoh  ?? curQoh)  : curQoh;
      const newCostVal = showCostCol ? (line.newCost ?? curCost) : curCost;
      const qtyDiff    = newQoh - curQoh;
      const valDiff    = valueDiffFor(item);

      const hasChange =
        (showQtyCol  && qtyDiff !== 0) ||
        (showCostCol && newCostVal !== curCost);

      if (!hasChange) return [];

      const lineReason = line.reasonCode || headerReason || undefined;

      return [{
        id:          crypto.randomUUID(),
        itemId:      item.id,
        description: [lineReason, item.name].filter(Boolean).join(' – ') || 'Inventory Adjustment',
        quantity:    qtyDiff,
        rate:        newCostVal,
        amount:      valDiff,
        tax:         false,
        warehouseId: warehouseId === 'ALL' ? undefined : warehouseId,
        reasonCode:  lineReason,
        // store new cost so the backend can update average cost
        ...(showCostCol ? { newCost: newCostVal } : {}),
        ...(line.lotNumber ? { lotNumber: line.lotNumber } : {}),
      }];
    });

    if (adjItems.length === 0) { setError('No quantity or cost changes to record.'); return; }

    const adj: Transaction = {
      id:            crypto.randomUUID(),
      type:          'INVENTORY_ADJ',
      refNo:         'ADJ-' + Date.now().toString().slice(-4),
      date:          adjustmentDate,
      entityId:      'Internal',
      bankAccountId: adjustmentAccount,
      items:         adjItems as any,
      total:         adjItems.reduce((s, i: any) => s + (i.amount ?? 0), 0),
      status:        'CLEARED',
      memo:          memo || undefined,
      warehouseId:   warehouseId === 'ALL' ? undefined : warehouseId,
    };

    setSaving(true);
    try {
      await onSave(adj);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save inventory adjustment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const fmtVal = (v: number) =>
    (v === 0 ? '--' : (v > 0 ? '+' : '') + '$' + Math.abs(v).toFixed(2));

  return (
    <div className="bg-[#f0f0f0] h-full flex flex-col p-4">
      <div className="bg-white border border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">

        {/* ── Header bar ── */}
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-900 text-white flex items-center justify-center font-bold rounded text-xs">IA</div>
            <h2 className="text-base font-bold text-slate-800 uppercase tracking-tight">
              Adjust Quantity / Value on Hand
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRecord}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-1.5 text-xs font-bold rounded shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save & Close'}
            </button>
            <button
              onClick={onClose}
              disabled={saving}
              className="bg-white border border-gray-400 px-6 py-1.5 text-xs font-bold rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-300 rounded text-xs text-red-700 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-700 font-bold leading-none">✕</button>
          </div>
        )}

        {/* ── Form fields (2 rows × 3 cols) ── */}
        <div className="p-4 grid grid-cols-3 gap-x-6 gap-y-3 bg-[#f8fbff] border-b">

          {/* Row 1 */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Adjustment Type</label>
            <select
              className="border p-1.5 text-xs bg-white outline-none font-bold shadow-sm"
              value={adjustmentType}
              onChange={e => setAdjustmentType(e.target.value as AdjustmentType)}
            >
              <option>Quantity and Total Value</option>
              <option>Quantity</option>
              <option>Total Value</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Adjustment Date</label>
            <input
              type="date"
              className="border p-1.5 text-xs bg-white outline-none shadow-sm"
              value={adjustmentDate}
              onChange={e => setAdjustmentDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Adjustment Account</label>
            <select
              className="border p-1.5 text-xs bg-white outline-none font-bold shadow-sm"
              value={adjustmentAccount}
              onChange={e => setAdjustmentAccount(e.target.value)}
            >
              <option value="">-- Select Account --</option>
              {accounts
                .filter(a => a.type === 'Expense' || a.type === 'Cost of Goods Sold')
                .map(a => <option key={a.id} value={a.id}>{a.name}</option>)
              }
            </select>
          </div>

          {/* Row 2 */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Warehouse</label>
            <select
              className="border p-1.5 text-xs bg-white outline-none font-bold shadow-sm"
              value={warehouseId}
              onChange={e => { setWarehouseId(e.target.value); setLines({}); }}
            >
              <option value="ALL">All Warehouses</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Default Reason Code</label>
            <select
              className="border p-1.5 text-xs bg-white outline-none shadow-sm"
              value={headerReason}
              onChange={e => setHeaderReason(e.target.value)}
            >
              <option value="">-- No Default --</option>
              {REASON_CODES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Memo</label>
            <input
              type="text"
              className="border p-1.5 text-xs bg-white outline-none shadow-sm"
              placeholder="Optional memo..."
              value={memo}
              onChange={e => setMemo(e.target.value)}
            />
          </div>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-gray-100 border-b border-gray-300 sticky top-0 z-10">
              <tr>
                <th className="p-2 border-r border-gray-200 font-bold">Item</th>
                <th className="p-2 border-r border-gray-200 font-bold">Type</th>
                <th className="p-2 border-r border-gray-200 font-bold">Description</th>
                <th className="p-2 border-r border-gray-200 font-bold text-right">Cur. QOH</th>
                {showQtyCol && (
                  <th className="p-2 border-r border-gray-200 font-bold text-right bg-blue-50">New QOH</th>
                )}
                {showQtyCol && (
                  <th className="p-2 border-r border-gray-200 font-bold text-right">Qty Diff</th>
                )}
                <th className="p-2 border-r border-gray-200 font-bold text-right">Cur. Cost</th>
                {showCostCol && (
                  <th className="p-2 border-r border-gray-200 font-bold text-right bg-blue-50">New Cost</th>
                )}
                <th className="p-2 border-r border-gray-200 font-bold">Reason</th>
                {showLotCol && (
                  <th className="p-2 border-r border-gray-200 font-bold bg-purple-50">Lot #</th>
                )}
                <th className="p-2 font-bold text-right">Value Diff</th>
              </tr>
            </thead>
            <tbody>
              {inventoryItems.map(item => {
                const line       = lines[item.id] ?? {};
                const curQoh     = getQoh(item);
                const curCost    = item.cost ?? 0;
                const newQoh     = showQtyCol  ? (line.newQoh  ?? curQoh)  : curQoh;
                const newCostVal = showCostCol ? (line.newCost ?? curCost) : curCost;
                const qtyDiff    = newQoh - curQoh;
                const valDiff    = valueDiffFor(item);

                return (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                    <td className="p-2 border-r border-gray-100 font-bold text-blue-900 whitespace-nowrap">
                      {item.name}
                    </td>
                    <td className="p-2 border-r border-gray-100 text-gray-500 whitespace-nowrap">
                      {item.type === 'Inventory Assembly' ? 'Assembly' : 'Part'}
                    </td>
                    <td className="p-2 border-r border-gray-100 text-gray-500 italic truncate max-w-[120px]">
                      {item.description}
                    </td>
                    <td className="p-2 border-r border-gray-100 text-right font-mono text-gray-500">
                      {curQoh}
                    </td>

                    {showQtyCol && (
                      <td className="p-2 border-r border-gray-100 text-right bg-blue-50/40">
                        <input
                          type="number"
                          className="w-20 border border-blue-200 text-right p-1 bg-white outline-none focus:ring-1 ring-blue-400 font-bold"
                          value={newQoh}
                          onChange={e => updateLine(item.id, 'newQoh', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                    )}
                    {showQtyCol && (
                      <td className={`p-2 border-r border-gray-100 text-right font-mono font-bold ${
                        qtyDiff > 0 ? 'text-green-600' : qtyDiff < 0 ? 'text-red-600' : 'text-gray-300'
                      }`}>
                        {qtyDiff === 0 ? '--' : (qtyDiff > 0 ? '+' : '') + qtyDiff}
                      </td>
                    )}

                    <td className="p-2 border-r border-gray-100 text-right font-mono text-gray-500">
                      ${curCost.toFixed(4)}
                    </td>

                    {showCostCol && (
                      <td className="p-2 border-r border-gray-100 text-right bg-blue-50/40">
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          className="w-24 border border-blue-200 text-right p-1 bg-white outline-none focus:ring-1 ring-blue-400 font-bold"
                          value={newCostVal}
                          onChange={e => updateLine(item.id, 'newCost', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                    )}

                    <td className="p-2 border-r border-gray-100">
                      <select
                        className="border border-gray-200 p-1 text-[11px] bg-white outline-none w-32"
                        value={line.reasonCode ?? ''}
                        onChange={e => updateLine(item.id, 'reasonCode', e.target.value)}
                      >
                        <option value="">{headerReason ? `↑ ${headerReason}` : '-- None --'}</option>
                        {REASON_CODES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>

                    {showLotCol && (
                      <td className="p-2 border-r border-gray-100 bg-purple-50/30">
                        {(item as any).trackLots ? (
                          <input
                            type="text"
                            className="w-28 border border-purple-200 p-1 text-[11px] bg-white outline-none focus:ring-1 ring-purple-400 font-mono uppercase"
                            placeholder="LOT-001"
                            value={line.lotNumber ?? ''}
                            onChange={e => updateLine(item.id, 'lotNumber', e.target.value)}
                          />
                        ) : (
                          <span className="text-gray-300 text-[10px]">—</span>
                        )}
                      </td>
                    )}

                    <td className={`p-2 text-right font-mono font-bold ${
                      valDiff > 0 ? 'text-green-600' : valDiff < 0 ? 'text-red-600' : 'text-gray-300'
                    }`}>
                      {fmtVal(valDiff)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Footer totals ── */}
        <div className="p-3 border-t bg-gray-50 flex justify-between items-center text-xs">
          <span className="text-gray-500">
            {warehouseId !== 'ALL' && (
              <span className="font-semibold text-blue-700 mr-4">
                Warehouse: {warehouses.find(w => w.id === warehouseId)?.name ?? warehouseId}
              </span>
            )}
            {inventoryItems.length} items listed &nbsp;·&nbsp;{' '}
            {Object.values(lines).filter(l =>
              (l.newQoh !== undefined) || (l.newCost !== undefined)
            ).length} changed
          </span>
          <span className="font-bold text-gray-700">
            Total Value Change:{' '}
            <span className={`font-mono ml-1 ${
              totalValueDiff > 0 ? 'text-green-700' : totalValueDiff < 0 ? 'text-red-700' : 'text-gray-400'
            }`}>
              {totalValueDiff === 0 ? '--' : (totalValueDiff > 0 ? '+' : '') + '$' + Math.abs(totalValueDiff).toFixed(2)}
            </span>
          </span>
        </div>

      </div>
    </div>
  );
};

export default InventoryAdjustmentForm;
