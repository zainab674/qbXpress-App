
import React, { useState, useMemo } from 'react';
import { Transaction, Vendor, Account, VendorCreditCategory } from '../types';

interface Props {
  transactions: Transaction[];
  vendors: Vendor[];
  accounts: Account[];
  vendorCreditCategories: VendorCreditCategory[];
  onSavePayment: (payments: Transaction[]) => Promise<void>;
  onClose: () => void;
  initialBillId?: string;
}

const PayBillsForm: React.FC<Props> = ({ transactions, vendors, accounts, vendorCreditCategories, onSavePayment, onClose, initialBillId }) => {
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [payFromAccountId, setPayFromAccountId] = useState(accounts.find(a => a.type === 'Bank')?.id || '');
  const [paymentDate, setPaymentDate] = useState(new Date().toLocaleDateString('en-US'));
  const [showCredits, setShowCredits] = useState(false);
  const [appliedCredits, setAppliedCredits] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Check' | 'Credit Card'>('Check');
  const [filterVendorId, setFilterVendorId] = useState('ALL');
  const [isSaving, setIsSaving] = useState(false);

  // Multi-select handling for initial bill
  React.useEffect(() => {
    if (initialBillId && !selectedTxIds.includes(initialBillId)) {
      setSelectedTxIds(prev => [...prev, initialBillId]);
    }
  }, [initialBillId]);

  const openBills = useMemo(() => {
    let filtered = transactions.filter(t => {
      const type = t.type?.toUpperCase();
      const status = t.status?.toUpperCase();

      return (
        (type === 'BILL' && status !== 'PAID') ||
        (type === 'RECEIVE_ITEM' && status === 'RECEIVED')
      );
    });

    if (filterVendorId !== 'ALL') {
      filtered = filtered.filter(f =>
        String(f.entityId).trim() === String(filterVendorId).trim() ||
        selectedTxIds.includes(f.id)
      );
    }
    return filtered;
  }, [transactions, filterVendorId, selectedTxIds]);

  const activeVendorId = selectedTxIds.length > 0 ? transactions.find(b => b.id === selectedTxIds[0])?.entityId : null;
  const vendorCredits = transactions.filter(t => t.type === 'VENDOR_CREDIT' && t.entityId === activeVendorId && t.status === 'OPEN');

  const handleToggle = (id: string) => {
    setSelectedTxIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const billTotal = transactions
    .filter(b => selectedTxIds.includes(b.id))
    .reduce((sum, b) => sum + b.total, 0);

  const creditsTotal = vendorCredits
    .filter(c => appliedCredits.includes(c.id))
    .reduce((sum, c) => sum + c.total, 0);

  const netToPay = Math.max(0, billTotal - creditsTotal);

  const handlePaySelected = async () => {
    if (selectedTxIds.length === 0 || isSaving) return;
    setIsSaving(true);

    try {
      // Group selected bills by vendor
      const selectedBills = transactions.filter(b => selectedTxIds.includes(b.id));
      const vendorsToPay: string[] = Array.from(new Set(selectedBills.map(b => b.entityId as string)));

      const payments: Transaction[] = vendorsToPay.map((vId: string) => {
        const vendorBills = selectedBills.filter(b => b.entityId === vId);
        const vendorCreditsForThisVendor = transactions.filter(t => t.type === 'VENDOR_CREDIT' && t.entityId === vId && t.status === 'OPEN');
        const appliedVendorCredits = vendorCreditsForThisVendor.filter(c => appliedCredits.includes(c.id));

        const vBillTotal = vendorBills.reduce((s, b) => s + b.total, 0);
        const vCreditsTotal = appliedVendorCredits.reduce((s, c) => s + c.total, 0);
        const vNetTotal = Math.max(0, vBillTotal - vCreditsTotal);

        return {
          id: Math.random().toString(),
          type: 'BILL_PAYMENT',
          refNo: 'BP-' + Date.now().toString().slice(-4),
          date: paymentDate,
          entityId: vId,
          items: [],
          total: vNetTotal,
          status: 'PAID',
          bankAccountId: payFromAccountId,
          paymentMethod: paymentMethod,
          appliedCreditIds: [...vendorBills.map(b => b.id), ...appliedVendorCredits.map(c => c.id)]
        };
      });

      await onSavePayment(payments);
      onClose();
    } catch (error: any) {
      console.error("Payment failed:", error);
      alert(error.message || "Failed to save payment. Please check your connection or try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#f0f0f0] h-full flex flex-col p-4 relative font-sans">
      {showCredits && (
        <div className="absolute inset-0 bg-black/40 z-[100] flex items-center justify-center p-8 backdrop-blur-sm">
          <div className="bg-white w-[90%] h-[90%] rounded-sm shadow-2xl border-2 border-[#003366] flex flex-col overflow-hidden animate-in">
            <div className="bg-[#003366] p-4 text-white font-bold text-sm flex justify-between items-center text-white">
              <span className="uppercase tracking-widest text-lg">Apply Credits</span>
              <button onClick={() => setShowCredits(false)} className="hover:bg-red-600 px-3 py-1 rounded-sm transition-colors font-serif text-white text-xl">X</button>
            </div>
            <div className="p-6 bg-blue-50 border-b flex justify-between text-base font-black text-blue-900 uppercase tracking-tighter">
              <span>Vendor: {vendors.find(v => v.id === activeVendorId)?.name}</span>
              <span>Available: ${vendorCredits.reduce((s, c) => s + c.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="p-6 flex-1 overflow-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-[#e8e8e8] border-b-2 border-gray-300 text-[#003366] sticky top-0">
                  <tr>
                    <th className="p-4 border-r w-12 text-center">✓</th>
                    <th className="p-4 border-r">Date</th>
                    <th className="p-4 border-r">Ref Num</th>
                    <th className="p-4 border-r">Category</th>
                    <th className="p-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vendorCredits.map(c => (
                    <tr key={c.id} className={`hover:bg-green-50 transition-colors ${appliedCredits.includes(c.id) ? 'bg-green-50/50' : ''}`}>
                      <td className="p-4 border-r text-center">
                        <input
                          type="checkbox"
                          className="w-5 h-5 cursor-pointer"
                          checked={appliedCredits.includes(c.id)}
                          onChange={() => setAppliedCredits(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                        />
                      </td>
                      <td className="p-4 border-r">{c.date}</td>
                      <td className="p-4 border-r font-mono text-gray-600 font-bold">{c.refNo}</td>
                      <td className="p-4 border-r font-bold text-[#003366]">
                        {(() => {
                          const itemWithCat = c.items?.find(item => item.creditCategoryId);
                          if (!itemWithCat || !itemWithCat.creditCategoryId) return '---';
                          const category = (vendorCreditCategories || []).find(cat => cat.id === itemWithCat.creditCategoryId);
                          return category ? category.name : '---';
                        })()}
                      </td>
                      <td className="p-4 text-right font-black text-blue-900 text-lg">${c.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-gray-100 border-t flex justify-end gap-3 shadow-inner">
              <button onClick={() => setShowCredits(false)} className="bg-[#0077c5] text-white px-12 py-3 text-sm font-black rounded-sm shadow-md hover:brightness-110 active:translate-y-px transition-all uppercase tracking-widest">Done</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-2 border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">
        <div className="p-4 bg-gray-100 border-b flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-6">
            <h2 className="text-3xl font-serif italic text-[#003366] drop-shadow-sm">Pay Bills</h2>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest italic">Filter by Vendor</label>
              <select
                className="border-b-2 border-blue-200 bg-transparent text-sm font-bold w-64 outline-none focus:border-blue-500"
                value={filterVendorId}
                onChange={e => setFilterVendorId(e.target.value)}
              >
                <option value="ALL">All Vendors</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePaySelected}
              disabled={selectedTxIds.length === 0 || isSaving}
              className="bg-[#0077c5] text-white px-8 py-2 text-xs font-black rounded shadow-md hover:bg-[#005fa0] disabled:bg-gray-400 disabled:shadow-none transition-all uppercase tracking-tighter"
            >
              {isSaving ? 'Paying...' : 'Pay Selected Bills'}
            </button>
            <button onClick={onClose} disabled={isSaving} className="bg-white border border-gray-400 px-8 py-2 text-xs font-black rounded hover:bg-gray-50 transition-all uppercase tracking-tighter shadow-sm">Done</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#f8fbff] custom-scrollbar">
          <table className="w-full text-[11px] text-left border-collapse">
            <thead className="bg-[#e8e8e8] border-b-2 border-gray-400 sticky top-0 z-10 text-[#003366] font-black uppercase shadow-sm">
              <tr>
                <th className="p-3 border-r w-12 text-center text-[13px]">
                  <input
                    type="checkbox"
                    className="w-4 h-4 cursor-pointer"
                    checked={openBills.length > 0 && openBills.every(b => selectedTxIds.includes(b.id))}
                    onChange={() => {
                      const allSelected = openBills.every(b => selectedTxIds.includes(b.id));
                      if (allSelected) {
                        setSelectedTxIds(prev => prev.filter(id => !openBills.map(b => b.id).includes(id)));
                      } else {
                        const newIds = openBills.map(b => b.id).filter(id => !selectedTxIds.includes(id));
                        setSelectedTxIds(prev => [...prev, ...newIds]);
                      }
                    }}
                  />
                </th>
                <th className="p-3 border-r w-32 border-gray-300">Due Date</th>
                <th className="p-3 border-r border-gray-300">Vendor</th>
                <th className="p-3 border-r text-right border-gray-300">Amt. Due</th>
                <th className="p-3 text-right">Amt. To Pay</th>
              </tr>
            </thead>
            <tbody>
              {openBills.map(bill => {
                const vendor = vendors.find(v => v.id === bill.entityId);
                const isSelected = selectedTxIds.includes(bill.id);
                return (
                  <tr key={bill.id} className={`border-b h-10 hover:bg-blue-50/50 transition-colors ${isSelected ? 'bg-blue-100/40 shadow-inner' : 'bg-white'}`}>
                    <td className="p-2 border-r text-center"><input type="checkbox" className="w-4 h-4 cursor-pointer" checked={isSelected} onChange={() => handleToggle(bill.id)} /></td>
                    <td className={`p-2 border-r font-bold ${new Date(bill.dueDate!) < new Date() ? 'text-red-600' : 'text-gray-600'}`}>{bill.dueDate}</td>
                    <td className="p-2 border-r font-black text-gray-800 uppercase tracking-tighter">{vendor?.name}</td>
                    <td className="p-2 border-r text-right font-mono text-gray-600">${bill.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="p-2 text-right font-black text-blue-900 font-mono">
                      {isSelected ? (
                        <input className="border-b-2 border-blue-600 w-28 text-right bg-blue-50/50 px-2 outline-none font-bold text-blue-900" defaultValue={bill.total.toFixed(2)} />
                      ) : (
                        <span className="text-gray-300">$0.00</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {openBills.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                      <span className="text-6xl">📝</span>
                      <p className="text-xl font-serif italic text-[#003366]">No open bills matching current filter.</p>
                      <button
                        onClick={() => setFilterVendorId('ALL')}
                        className="text-blue-600 font-black text-[10px] uppercase hover:underline mt-2"
                      >
                        Clear Filter
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {[1, 2, 3, 4, 5].map(i => <tr key={i} className="h-10 border-b border-gray-100 opacity-20"><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td></td></tr>)}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-gray-100 border-t-2 border-gray-300 grid grid-cols-2 gap-12 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setShowCredits(true)}
                disabled={!activeVendorId}
                className="bg-white border-b-2 border-gray-400 px-6 py-2 text-[11px] font-black rounded-sm shadow-sm hover:bg-yellow-50 hover:border-yellow-400 transition-all uppercase flex items-center gap-3 active:translate-y-px"
              >
                <span className="text-lg">🏷️</span> Set Credits
                {vendorCredits.length > 0 && <span className="bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[9px] shadow-sm animate-pulse">{vendorCredits.length}</span>}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6 bg-white p-4 border rounded shadow-inner">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Payment Date</label>
                <input className="border-b-2 border-blue-200 p-1 text-xs bg-blue-50/20 font-bold outline-none focus:border-blue-500" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Payment Method</label>
                <select
                  className="border-b-2 border-blue-200 p-1 text-xs bg-blue-50/20 font-bold outline-none focus:border-blue-500 font-bold"
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                >
                  <option>Check</option>
                  <option>Credit Card</option>
                </select>
              </div>
              <div className="flex flex-col gap-1 col-span-2 mt-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Payment Account</label>
                <select className="border-b-2 border-blue-200 p-1 text-sm bg-blue-50/20 font-bold outline-none focus:border-blue-500 font-bold" value={payFromAccountId} onChange={e => setPayFromAccountId(e.target.value)}>
                  {accounts.filter(a => a.type === (paymentMethod === 'Check' ? 'Bank' : 'Credit Card')).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col justify-end bg-[#003366]/5 p-6 rounded border-2 border-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none transform rotate-12 scale-150">
              <span className="text-6xl">💸</span>
            </div>
            {creditsTotal > 0 && (
              <div className="text-xs font-black text-red-600 bg-red-50 inline-block ml-auto mb-2 px-2 py-1 border border-red-100 rounded-sm">
                CREDITS APPLIED: -${creditsTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            )}
            <div className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">Total Payment Selected</div>
            <div className="text-5xl font-black text-[#003366] font-mono leading-none flex justify-end items-baseline text-[#003366]">
              <span className="text-2xl mr-1 opacity-50">$</span>
              {netToPay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayBillsForm;
