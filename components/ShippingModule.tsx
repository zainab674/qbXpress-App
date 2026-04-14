import React, { useState, useMemo } from 'react';
import { Transaction, Vendor, Customer, ShipViaEntry, ViewState } from '../types';
import { buildInboundShipments, buildOutboundShipments, getShippingBillSource } from '../services/shippingService';

interface Props {
  transactions: Transaction[];
  vendors: Vendor[];
  customers: Customer[];
  shipVia: ShipViaEntry[];
  onOpenWindow: (type: ViewState, title: string, params?: any) => void;
  onClose: () => void;
}

const ShippingModule: React.FC<Props> = ({
  transactions,
  vendors,
  customers,
  shipVia,
  onOpenWindow,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('inbound');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // ── Derived data ─────────────────────────────────────────────────────────
  const inboundBills = useMemo(() => {
    let bills = buildInboundShipments(transactions);
    if (dateFrom) bills = bills.filter(b => b.date >= dateFrom);
    if (dateTo) bills = bills.filter(b => b.date <= dateTo);
    return bills;
  }, [transactions, dateFrom, dateTo]);

  const outboundInvoices = useMemo(() => {
    let inv = buildOutboundShipments(transactions);
    if (dateFrom) inv = inv.filter(i => i.date >= dateFrom);
    if (dateTo) inv = inv.filter(i => i.date <= dateTo);
    return inv;
  }, [transactions, dateFrom, dateTo]);

  const totalPaid = inboundBills.reduce((s, b) => s + (b.total || 0), 0);
  const totalCharged = outboundInvoices.reduce((s, i) => s + (i.shippingCost || 0), 0);
  const totalOutboundCarrierCost = outboundInvoices.reduce((s, i) => s + (i.outboundCarrierCost || 0), 0);
  const totalShippingPaid = totalPaid + totalOutboundCarrierCost;
  const netCost = totalShippingPaid - totalCharged;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const vendorName = (id?: string) => vendors.find(v => v.id === id)?.name || id || '--';
  const customerName = (id?: string) => customers.find(c => c.id === id)?.name || id || '--';
  const fmt = (n: number) => '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2 });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      OPEN: 'bg-blue-100 text-blue-800',
      PAID: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${map[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="bg-[#f0f0f0] h-full flex flex-col font-sans">
      {/* Title bar */}
      <div className="bg-gradient-to-r from-[#003366] to-[#0055aa] text-white px-5 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-lg">🚚</span>
          <span className="font-bold text-sm uppercase tracking-widest">Shipping Manager</span>
        </div>
        <button onClick={onClose} className="hover:bg-red-500 rounded px-2 py-0.5 text-sm transition-colors">✕</button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 p-4 bg-white border-b border-gray-200">
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-1">Inbound Carrier Bills</p>
          <p className="text-xl font-black text-red-700">{fmt(totalPaid)}</p>
          <p className="text-[9px] text-red-400 mt-0.5">{inboundBills.length} bill{inboundBills.length !== 1 ? 's' : ''} (purchasing)</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-orange-600 mb-1">Outbound Carrier Cost</p>
          <p className="text-xl font-black text-orange-700">{fmt(totalOutboundCarrierCost)}</p>
          <p className="text-[9px] text-orange-400 mt-0.5">What you pay to deliver to customers</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-green-600 mb-1">Charged to Customers</p>
          <p className="text-xl font-black text-green-700">{fmt(totalCharged)}</p>
          <p className="text-[9px] text-green-400 mt-0.5">{outboundInvoices.length} invoice{outboundInvoices.length !== 1 ? 's' : ''}</p>
        </div>
        <div className={`${netCost > 0 ? 'bg-rose-50 border-rose-100' : 'bg-blue-50 border-blue-100'} border rounded-lg p-3 text-center`}>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Net Shipping Cost</p>
          <p className={`text-xl font-black ${netCost > 0 ? 'text-rose-700' : 'text-blue-700'}`}>{fmt(netCost)}</p>
          <p className="text-[9px] text-gray-400 mt-0.5">All paid − Charged</p>
        </div>
      </div>

      {/* Date filters + Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 pt-2 pb-0 flex items-end justify-between">
        <div className="flex gap-1">
          {(['inbound', 'outbound'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 text-xs font-black uppercase tracking-widest border-t border-l border-r rounded-t-sm transition-colors ${
                activeTab === tab
                  ? 'bg-white border-gray-400 text-[#003366]'
                  : 'bg-gray-100 border-transparent text-gray-400 hover:bg-gray-50'
              }`}
            >
              {tab === 'inbound' ? '📦 Inbound (What We Pay)' : '📬 Outbound (What We Charge)'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 pb-2">
          <label className="text-[10px] font-bold uppercase text-gray-500">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded px-2 py-0.5 text-xs outline-none focus:border-blue-400"
          />
          <label className="text-[10px] font-bold uppercase text-gray-500">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="border border-gray-300 rounded px-2 py-0.5 text-xs outline-none focus:border-blue-400"
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-[10px] text-blue-600 hover:underline font-bold">Clear</button>
          )}
        </div>
      </div>

      {/* Table content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'inbound' ? (
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 bg-[#e8e8e8] border-b-2 border-gray-400 z-10">
              <tr className="h-7">
                <th className="px-3 border-r border-gray-300 font-bold uppercase">Date</th>
                <th className="px-3 border-r border-gray-300 font-bold uppercase">Carrier / Vendor</th>
                <th className="px-3 border-r border-gray-300 font-bold uppercase">Ship Via</th>
                <th className="px-3 border-r border-gray-300 font-bold uppercase">Bill #</th>
                <th className="px-3 border-r border-gray-300 font-bold uppercase">Source Document</th>
                <th className="px-3 border-r border-gray-300 font-bold uppercase">Status</th>
                <th className="px-3 font-bold uppercase text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inboundBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-gray-400 italic">
                    No inbound shipping bills found.
                    {!inboundBills.length && <p className="text-[10px] mt-2">Enter a shipping cost on a PO or Receipt with a carrier that has a Vendor linked in Ship Via List.</p>}
                  </td>
                </tr>
              ) : (
                inboundBills.map(bill => {
                  const source = getShippingBillSource(bill, transactions);
                  const sv = shipVia.find(s => s.vendorId === bill.entityId);
                  return (
                    <tr key={bill.id} className="h-7 border-b border-gray-100 hover:bg-blue-50 cursor-default">
                      <td className="px-3">{bill.date}</td>
                      <td className="px-3 font-bold">{vendorName(bill.entityId)}</td>
                      <td className="px-3">{sv?.name || bill.shipVia || '--'}</td>
                      <td className="px-3">
                        <button
                          className="text-blue-600 hover:underline font-bold"
                          onClick={() => onOpenWindow('BILL', `Bill ${bill.refNo}`, { transactionId: bill.id })}
                        >
                          {bill.refNo}
                        </button>
                      </td>
                      <td className="px-3">
                        {source ? (
                          <button
                            className="text-blue-600 hover:underline"
                            onClick={() => onOpenWindow(
                              source.type === 'PURCHASE_ORDER' ? 'PURCHASE_ORDER' : 'RECEIVE_INVENTORY',
                              `${source.type} ${source.refNo}`,
                              { transactionId: source.id }
                            )}
                          >
                            {source.type.replace(/_/g, ' ')} #{source.refNo}
                          </button>
                        ) : '--'}
                      </td>
                      <td className="px-3">{statusBadge(bill.status)}</td>
                      <td className="px-3 text-right font-black">{fmt(bill.total)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {inboundBills.length > 0 && (
              <tfoot className="sticky bottom-0 bg-[#e8e8e8] border-t-2 border-gray-400">
                <tr className="h-7">
                  <td colSpan={6} className="px-3 font-black uppercase text-right text-[11px]">Total Paid to Carriers</td>
                  <td className="px-3 font-black text-right text-red-700">{fmt(totalPaid)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        ) : (
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 bg-[#e8e8e8] border-b-2 border-gray-400 z-10">
              <tr className="h-7">
                <th className="px-3 border-r border-gray-300 font-bold uppercase">Date</th>
                <th className="px-3 border-r border-gray-300 font-bold uppercase">Customer</th>
                <th className="px-3 border-r border-gray-300 font-bold uppercase">Ship Via</th>
                <th className="px-3 border-r border-gray-300 font-bold uppercase">Invoice / SO #</th>
                <th className="px-3 border-r border-gray-300 font-bold uppercase">Linked SO</th>
                <th className="px-3 border-r border-gray-300 font-bold uppercase">Status</th>
                <th className="px-3 border-r border-gray-300 font-bold uppercase text-right">Carrier Cost</th>
                <th className="px-3 border-r border-gray-300 font-bold uppercase text-right">Charged</th>
                <th className="px-3 font-bold uppercase text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {outboundInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-gray-400 italic">
                    No outbound shipping charges found.
                    <p className="text-[10px] mt-2">Enter a Shipping Charge on an Invoice or Sales Order.</p>
                  </td>
                </tr>
              ) : (
                outboundInvoices.map(tx => {
                  const linkedSO = tx.salesOrderId
                    ? transactions.find(t => t.id === tx.salesOrderId)
                    : tx.linkedDocumentIds
                        ?.map(id => transactions.find(t => t.id === id))
                        .find(t => t?.type === 'SALES_ORDER');
                  const carrierCost = tx.outboundCarrierCost || 0;
                  const charged = tx.shippingCost || 0;
                  const margin = charged - carrierCost;
                  return (
                    <tr key={tx.id} className="h-7 border-b border-gray-100 hover:bg-green-50 cursor-default">
                      <td className="px-3">{tx.date}</td>
                      <td className="px-3 font-bold">{customerName(tx.entityId)}</td>
                      <td className="px-3">{tx.shipVia || '--'}</td>
                      <td className="px-3">
                        <button
                          className="text-blue-600 hover:underline font-bold"
                          onClick={() => onOpenWindow(
                            tx.type === 'INVOICE' ? 'INVOICE' : 'SALES_ORDER',
                            `${tx.type} ${tx.refNo}`,
                            { transactionId: tx.id }
                          )}
                        >
                          {tx.type.replace(/_/g, ' ')} #{tx.refNo}
                        </button>
                      </td>
                      <td className="px-3">
                        {linkedSO ? (
                          <button
                            className="text-blue-600 hover:underline"
                            onClick={() => onOpenWindow('SALES_ORDER', `SO ${linkedSO.refNo}`, { transactionId: linkedSO.id })}
                          >
                            SO #{linkedSO.refNo}
                          </button>
                        ) : '--'}
                      </td>
                      <td className="px-3">{statusBadge(tx.status)}</td>
                      <td className="px-3 text-right text-orange-700 font-bold">{carrierCost > 0 ? fmt(carrierCost) : '--'}</td>
                      <td className="px-3 text-right font-black text-green-700">{fmt(charged)}</td>
                      <td className={`px-3 text-right font-black ${margin >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                        {carrierCost > 0 ? (margin >= 0 ? '+' : '') + fmt(margin) : '--'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {outboundInvoices.length > 0 && (
              <tfoot className="sticky bottom-0 bg-[#e8e8e8] border-t-2 border-gray-400">
                <tr className="h-7">
                  <td colSpan={6} className="px-3 font-black uppercase text-right text-[11px]">Totals</td>
                  <td className="px-3 font-black text-right text-orange-700">{fmt(totalOutboundCarrierCost)}</td>
                  <td className="px-3 font-black text-right text-green-700">{fmt(totalCharged)}</td>
                  <td className={`px-3 font-black text-right ${totalCharged >= totalOutboundCarrierCost ? 'text-blue-700' : 'text-red-600'}`}>
                    {totalOutboundCarrierCost > 0 ? (totalCharged >= totalOutboundCarrierCost ? '+' : '') + fmt(totalCharged - totalOutboundCarrierCost) : '--'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
};

export default ShippingModule;
