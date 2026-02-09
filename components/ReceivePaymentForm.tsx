
import React, { useState } from 'react';
import { Customer, Transaction } from '../types';

interface Props {
  customers: Customer[];
  transactions: Transaction[];
  paymentMethods: string[];
  initialData?: { customerId?: string, invoiceId?: string };
  onSave: (tx: Transaction) => void;
  onClose: () => void;
}

const ReceivePaymentForm: React.FC<Props> = ({ customers, transactions, paymentMethods, initialData, onSave, onClose }) => {
  const [selectedCustId, setSelectedCustId] = useState(initialData?.customerId || '');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toLocaleDateString('en-US'));
  const [pmtMethod, setPmtMethod] = useState(paymentMethods[0] || 'Check');
  const [refNo, setRefNo] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>(initialData?.invoiceId ? [initialData.invoiceId] : []);
  const [selectedCreditIds, setSelectedCreditIds] = useState<string[]>([]);

  React.useEffect(() => {
    if (initialData?.invoiceId) {
      const inv = transactions.find(t => t.id === initialData.invoiceId);
      if (inv) {
        setAmount(inv.total);
      }
    }
  }, [initialData, transactions]);

  const openInvoices = transactions.filter(t => t.type === 'INVOICE' && t.entityId === selectedCustId && (t.status === 'OPEN' || t.status === 'UNPAID' || !t.status));
  const availableCredits = transactions.filter(t => t.type === 'CREDIT_MEMO' && t.entityId === selectedCustId && (t.status === 'OPEN' || !t.status));

  const handleSave = () => {
    if (!selectedCustId) return alert("Please select a customer.");

    const totalAppliedInvoices = openInvoices.filter(i => selectedInvoices.includes(i.id)).reduce((s, i) => s + i.total, 0);
    const totalAppliedCredits = availableCredits.filter(c => selectedCreditIds.includes(c.id)).reduce((s, c) => s + c.total, 0);

    if (amount <= 0 && totalAppliedCredits === 0) return alert("Please enter an amount or select credits.");

    const tx: Transaction = {
      id: Math.random().toString(),
      type: 'PAYMENT',
      refNo: refNo || 'PMT-' + Date.now().toString().slice(-4),
      date,
      entityId: selectedCustId,
      items: [],
      total: amount,
      status: 'CLEARED',
      paymentMethod: pmtMethod,
      appliedCreditIds: [...selectedInvoices, ...selectedCreditIds]
    };

    onSave(tx);
    onClose();
  };

  const toggleInvoice = (id: string, invAmt: number) => {
    const isCurrentlySelected = selectedInvoices.includes(id);
    const newInvoices = isCurrentlySelected
      ? selectedInvoices.filter(i => i !== id)
      : [...selectedInvoices, id];

    setSelectedInvoices(newInvoices);

    // Recalculate amount based on new selection
    const invTotal = transactions.filter(t => newInvoices.includes(t.id)).reduce((s, t) => s + t.total, 0);
    const credTotal = availableCredits.filter(c => selectedCreditIds.includes(c.id)).reduce((s, c) => s + c.total, 0);
    setAmount(Math.max(0, invTotal - credTotal));
  };

  const toggleCredit = (id: string) => {
    const isSelecting = !selectedCreditIds.includes(id);
    const newCredits = isSelecting
      ? [...selectedCreditIds, id]
      : selectedCreditIds.filter(c => c !== id);

    setSelectedCreditIds(newCredits);

    // Recalculate amount based on new selection
    const invTotal = transactions.filter(t => selectedInvoices.includes(t.id)).reduce((s, t) => s + t.total, 0);
    const credTotal = availableCredits.filter(c => newCredits.includes(c.id)).reduce((s, c) => s + c.total, 0);
    setAmount(Math.max(0, invTotal - credTotal));
  };

  const handleManualAmountChange = (newAmt: number) => {
    setAmount(newAmt);
    let remaining = newAmt + availableCredits.filter(c => selectedCreditIds.includes(c.id)).reduce((s, i) => s + i.total, 0);
    const sorted = [...openInvoices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const toSelect: string[] = [];

    for (const inv of sorted) {
      if (remaining >= inv.total) {
        toSelect.push(inv.id!);
        remaining -= inv.total;
      } else if (remaining > 0) {
        toSelect.push(inv.id!);
        remaining = 0;
      }
    }
    setSelectedInvoices(toSelect);
  };

  const totalAppliedCredits = availableCredits.filter(c => selectedCreditIds.includes(c.id)).reduce((s, c) => s + c.total, 0);
  const totalAppliedInvoices = openInvoices.filter(i => selectedInvoices.includes(i.id)).reduce((s, i) => s + i.total, 0);
  const unappliedAmount = (amount + totalAppliedCredits) - totalAppliedInvoices;

  return (
    <div className="bg-[#f0f0f0] h-full flex flex-col p-4 font-sans">
      <div className="bg-white border-2 border-gray-400 rounded shadow-2xl flex-1 flex flex-col overflow-hidden">
        <div className="bg-white p-4 border-b-2 border-gray-100 space-y-4">
          <div className="flex justify-between items-start">
            <h2 className="text-3xl font-serif italic text-[#003366] drop-shadow-sm">Receive Payments</h2>
            <div className="flex gap-2">
              <button onClick={handleSave} className="bg-[#0077c5] text-white px-6 py-1.5 text-xs font-bold rounded shadow-md hover:bg-[#005fa0] transition-colors">Save & Close</button>
              <button onClick={onClose} className="bg-white border border-gray-400 px-6 py-1.5 text-xs font-bold rounded hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-8 p-4 bg-gray-50 border rounded shadow-inner">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Received From</label>
              <select
                className="border-b-2 border-blue-200 p-1 text-sm bg-transparent outline-none focus:border-blue-500 font-bold"
                value={selectedCustId}
                onChange={e => { setSelectedCustId(e.target.value); setSelectedInvoices([]); setSelectedCreditIds([]); }}
              >
                <option value="">--Select Customer--</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Amount</label>
              <div className="flex items-center gap-1 border-b-2 border-blue-200 bg-blue-50/30 px-2">
                <span className="text-blue-900 font-bold">$</span>
                <input
                  type="number"
                  className="w-full p-1 text-sm bg-transparent outline-none font-mono font-bold text-right text-blue-900"
                  placeholder="0.00"
                  value={amount || ''}
                  onChange={e => handleManualAmountChange(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1 text-right">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</label>
              <input type="text" className="border-b border-gray-300 p-1 text-sm bg-transparent outline-none text-right" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-6 items-end px-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Pmt. Method</label>
              <select className="border p-1 text-xs outline-none bg-white rounded shadow-sm" value={pmtMethod} onChange={e => setPmtMethod(e.target.value)}>
                {paymentMethods.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Ref/Check No.</label>
              <input className="border p-1 text-xs w-48 outline-none bg-white rounded shadow-sm font-mono" value={refNo} onChange={e => setRefNo(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-[#f8f9fa] space-y-6">
          {availableCredits.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-tighter mb-2">Available Credits</p>
              <div className="border border-emerald-300 rounded overflow-hidden shadow-sm bg-white">
                <table className="w-full text-xs text-left">
                  <thead className="bg-emerald-50 border-b border-emerald-200 text-emerald-900 font-bold">
                    <tr>
                      <th className="px-3 py-2 border-r w-10 text-center">✓</th>
                      <th className="px-3 py-2 border-r">Date</th>
                      <th className="px-3 py-2 border-r">Memo No.</th>
                      <th className="px-3 py-2 text-right">Credit Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableCredits.map(credit => (
                      <tr key={credit.id} className={`border-b hover:bg-emerald-50/50 transition-colors ${selectedCreditIds.includes(credit.id) ? 'bg-emerald-50/30' : ''}`}>
                        <td className="px-3 py-2 border-r text-center">
                          <input type="checkbox" checked={selectedCreditIds.includes(credit.id)} onChange={() => toggleCredit(credit.id)} />
                        </td>
                        <td className="px-3 py-2 border-r">{credit.date}</td>
                        <td className="px-3 py-2 border-r">{credit.refNo}</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-700 font-bold">${credit.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] font-bold text-blue-800 uppercase tracking-tighter">Outstanding Invoices and Statement Charges</p>
              <div className="text-[10px] font-bold text-gray-500">Unapplied Amount: <span className="text-blue-900 font-black font-mono">${unappliedAmount.toFixed(2)}</span></div>
            </div>
            <div className="border border-gray-300 rounded overflow-hidden shadow-sm bg-white">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#e8e8e8] border-b border-gray-400 text-[#003366] font-bold">
                  <tr>
                    <th className="px-3 py-2 border-r w-10 text-center">✓</th>
                    <th className="px-3 py-2 border-r">Date</th>
                    <th className="px-3 py-2 border-r">Number</th>
                    <th className="px-3 py-2 border-r text-right">Original Amt.</th>
                    <th className="px-3 py-2 border-r text-right">Amt. Due</th>
                    <th className="px-3 py-2 text-right">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {openInvoices.map(inv => (
                    <tr key={inv.id} className={`border-b hover:bg-blue-50/50 transition-colors ${selectedInvoices.includes(inv.id) ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-3 py-2 border-r text-center">
                        <input type="checkbox" checked={selectedInvoices.includes(inv.id!)} onChange={() => toggleInvoice(inv.id!, inv.total)} />
                      </td>
                      <td className="px-3 py-2 border-r">{inv.date}</td>
                      <td className="px-3 py-2 border-r">{inv.refNo}</td>
                      <td className="px-3 py-2 border-r text-right font-mono text-gray-600">${inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 border-r text-right font-mono font-bold text-[#003366]">${inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-right">
                        {selectedInvoices.includes(inv.id) ? (
                          <span className="font-mono font-bold text-green-700">${inv.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        ) : (
                          <span className="text-gray-300">$0.00</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {openInvoices.length === 0 && (
                    <tr><td colSpan={6} className="p-20 text-center text-gray-400 italic font-serif">No outstanding invoices for this customer.</td></tr>
                  )}
                  {[1, 2].map(i => <tr key={i} className="h-8 border-b border-gray-50 opacity-10"><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td className="border-r"></td><td></td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceivePaymentForm;
