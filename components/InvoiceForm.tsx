import React, { useState, useEffect, useRef } from 'react';
import { sendEmail } from '../services/api';
import { useData } from '../contexts/DataContext';
import { Customer, Item, Transaction, TransactionItem, QBClass, SalesRep, TimeEntry, Term, PriceLevel } from '../types';
import { generatePDF } from '../services/printService';

interface Props {
  customers: Customer[];
  items: Item[];
  classes: QBClass[];
  salesReps: SalesRep[];
  shipVia: string[];
  terms: Term[];
  transactions: Transaction[];
  timeEntries: TimeEntry[];
  initialData?: Transaction;
  mileageEntries?: any[];
  priceLevels: PriceLevel[];
  onSave: (tx: Transaction) => void;
  onClose: () => void;
}

const InvoiceForm: React.FC<Props> = ({ customers, items: availableItems, classes, salesReps, shipVia, terms, transactions, timeEntries, mileageEntries, priceLevels, onSave, onClose, initialData }) => {
  const { formLayouts, companyConfig } = useData();
  const currentLayout = formLayouts.find(l => l.formType === 'INVOICE');
  const isFieldVisible = (id: string, mode: 'screen' | 'print' = 'screen') => {
    const field = currentLayout?.fields.find(f => f.id === id);
    if (!field) return true;
    return mode === 'screen' ? field.showOnScreen : field.showOnPrint;
  };

  const [activeTab, setActiveTab] = useState('Main');
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialData?.entityId || customers[0]?.id || '');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [poNo, setPoNo] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(initialData?.classId || '');
  const [selectedSalesRepId, setSelectedSalesRepId] = useState(initialData?.salesRepId || '');
  const [selectedShipVia, setSelectedShipVia] = useState(initialData?.shipVia || '');
  const [date, setDate] = useState(new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }));

  const lastInvoice = transactions.filter(t => t.type === 'INVOICE').reduce((max, t) => Math.max(max, parseInt(t.refNo) || 0), 1000);
  const [invoiceNo, setInvoiceNo] = useState(initialData?.refNo || (lastInvoice + 1).toString());
  const [memo, setMemo] = useState(initialData?.vendorMessage || '');
  const [trackingNo, setTrackingNo] = useState(initialData?.trackingNo || '');
  const [shipDate, setShipDate] = useState(initialData?.shipDate || '');
  const [fob, setFob] = useState(initialData?.fob || '');
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  const [lineItems, setLineItems] = useState<Partial<TransactionItem>[]>(
    initialData?.items.map(i => ({ ...i, id: i.id || crypto.randomUUID() })) ||
    [{ id: crypto.randomUUID(), description: '', quantity: 0, rate: 0, amount: 0, tax: true, classId: '' }]
  );

  const [showBillableModal, setShowBillableModal] = useState(false);
  const [selectedBillableIds, setSelectedBillableIds] = useState<string[]>([]);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressData, setProgressData] = useState<{ type: 'TOTAL' | 'PERCENT' | 'ITEMIZED', percent?: number }>({ type: 'TOTAL' });
  const [isPrinting, setIsPrinting] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const subtotal = lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  const customer = customers.find(c => c.id === selectedCustomerId);
  const taxItem = availableItems.find(i => i.id === customer?.taxItemId);
  const taxRate = (taxItem?.taxRate || 8) / 100;
  const taxAmount = lineItems.filter(i => i.tax).reduce((acc, item) => acc + (item.amount || 0) * taxRate, 0);
  const [deposit, setDeposit] = useState(0);
  const total = subtotal + taxAmount - deposit;

  const openEstimates = transactions.filter(t => t.type === 'ESTIMATE' && t.entityId === selectedCustomerId && t.status === 'OPEN');

  useEffect(() => {
    if (selectedCustomerId && openEstimates.length > 0 && !initialData) {
      setShowEstimateModal(true);
    }
  }, [selectedCustomerId]);

  const handleSelectEstimate = (est: Transaction) => {
    setSelectedEstimateId(est.id);
    setShowEstimateModal(false);
    setShowProgressModal(true);
  };

  const finalizeEstimateToInvoice = () => {
    const est = transactions.find(t => t.id === selectedEstimateId);
    if (!est) return;
    let newItems = [];
    if (progressData.type === 'TOTAL') {
      newItems = est.items.map(i => ({ ...i, id: crypto.randomUUID() }));
    } else if (progressData.type === 'PERCENT') {
      const p = (progressData.percent || 100) / 100;
      newItems = est.items.map(i => ({
        ...i,
        id: crypto.randomUUID(),
        quantity: i.quantity * p,
        amount: i.amount * p,
        description: `${i.description} (${(p * 100).toFixed(0)}% of original)`
      }));
    } else {
      newItems = est.items.slice(0, 1).map(i => ({ ...i, id: crypto.randomUUID() }));
    }
    setLineItems([...lineItems.filter(li => li.description || li.rate), ...newItems]);
    setShowProgressModal(false);
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

  const handleItemSelect = (id: string, itemId: string) => {
    const item = availableItems.find(i => i.id === itemId);
    const customer = customers.find(c => c.id === selectedCustomerId);
    const priceLevel = priceLevels.find(pl => pl.id === customer?.priceLevelId);
    if (item) {
      let rate = item.salesPrice || 0;
      if (priceLevel) {
        if (priceLevel.type === 'Fixed %') {
          rate = rate * (1 + (priceLevel.percentage || 0) / 100);
        } else if (priceLevel.type === 'Formula' && priceLevel.formulaConfig) {
          const base = priceLevel.formulaConfig.baseOn === 'Cost' ? (item.cost || 0) : rate;
          const factor = priceLevel.formulaConfig.adjustmentType === 'Increase' ? 1 : -1;
          rate = base * (1 + (factor * priceLevel.formulaConfig.adjustmentAmount / 100));
        } else if (priceLevel.type === 'Per Item' && priceLevel.perItemPrices) {
          rate = priceLevel.perItemPrices[item.id] || rate;
        }
      }
      updateLineItem(id, { description: item.description || item.name, rate: rate, tax: item.taxCode === 'Tax' });
    }
  };

  const handleSave = (stayOpen = false) => {
    if (!selectedCustomerId) { alert("Please select a customer."); return; }
    const validItems = lineItems.filter(i => (i.amount || 0) !== 0 || i.description);
    if (validItems.length === 0) { alert("Please add at least one line item."); return; }

    onSave({
      id: initialData?.id || crypto.randomUUID(),
      type: 'INVOICE',
      refNo: invoiceNo,
      date: date,
      entityId: selectedCustomerId,
      total: total,
      status: 'OPEN',
      classId: selectedClassId || undefined,
      salesRepId: selectedSalesRepId || undefined,
      shipVia: selectedShipVia || undefined,
      vendorMessage: memo,
      trackingNo: trackingNo,
      shipDate: shipDate,
      fob: fob,
      terms: terms.find(t => t.id === selectedTermId)?.name,
      dueDate: (() => {
        const term = terms.find(t => t.id === selectedTermId);
        const d = new Date(date);
        if (!isNaN(d.getTime()) && term) {
          d.setDate(d.getDate() + (term.stdDueDays || 0));
          return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        }
        return date;
      })(),
      items: validItems.map(i => ({
        id: i.id || crypto.randomUUID(),
        itemId: i.itemId,
        description: i.description || '',
        quantity: i.quantity || 0,
        rate: i.rate || 0,
        amount: i.amount || 0,
        tax: !!i.tax,
        customerId: i.customerId,
        isBillable: i.isBillable,
        classId: i.classId
      }))
    } as any);

    if (!stayOpen) onClose();
    else {
      setLineItems([{ id: crypto.randomUUID(), description: '', quantity: 0, rate: 0, amount: 0, tax: true }]);
      setInvoiceNo((parseInt(invoiceNo) + 1).toString());
    }
  };

  const allBillable = [
    ...transactions.filter(t => t.entityId && t.status !== 'PAID' && t.items.some(i => i.customerId === selectedCustomerId && i.isBillable))
      .flatMap(t => t.items.filter(i => i.customerId === selectedCustomerId && i.isBillable).map(i => ({ ...i, sourceRef: t.refNo, sourceType: t.type, date: t.date }))),
    ...timeEntries.filter(te => te.customerId === selectedCustomerId && te.isBillable && te.status === 'PENDING')
      .map(te => ({ id: te.id, description: te.description || `Hours: ${te.hours}`, quantity: te.hours, rate: availableItems.find(i => i.id === te.itemId)?.salesPrice || 0, amount: te.hours * (availableItems.find(i => i.id === te.itemId)?.salesPrice || 0), tax: false, date: te.date, sourceType: 'TIME' })),
    ...(mileageEntries || []).filter(me => me.customerId === selectedCustomerId && me.isBillable && me.status === 'PENDING')
      .map(me => ({ id: me.id, description: `Mileage: ${me.totalMiles} miles`, quantity: me.totalMiles, rate: 0.58, amount: me.totalMiles * 0.58, tax: false, date: me.date, sourceType: 'MILEAGE' }))
  ];

  useEffect(() => {
    if (selectedCustomerId && allBillable.length > 0 && !initialData) {
      setShowBillableModal(true);
    }
  }, [selectedCustomerId]);

  const handleAddBillable = () => {
    const itemsToAdd = allBillable.filter(b => selectedBillableIds.includes(b.id));
    const newItems = itemsToAdd.map(i => ({
      id: crypto.randomUUID(),
      description: i.description,
      quantity: i.quantity,
      rate: i.rate,
      amount: i.amount,
      tax: i.tax,
      classId: (i as any).classId || ''
    }));
    setLineItems([...lineItems.filter(li => li.description || li.rate), ...newItems]);
    setShowBillableModal(false);
    setSelectedBillableIds([]);
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    const success = await generatePDF('invoice-printable', {
      fileName: `Invoice_${invoiceNo}.pdf`,
      companyName: companyConfig.businessName
    });
    setIsPrinting(false);
    if (!success) alert('Failed to generate PDF');
  };

  const handleEmail = async () => {
    const customer = customers.find(c => c.id === selectedCustomerId);
    const email = prompt("Enter recipient email:", customer?.email || '');
    if (!email) return;
    setIsEmailing(true);
    try {
      const success = await generatePDF('invoice-printable', {
        fileName: `Invoice_${invoiceNo}.pdf`,
        companyName: companyConfig.businessName
      });
      if (success) {
        alert("Email sent successfully! (Simulated)");
      } else {
        alert("Failed to generate PDF for email.");
      }
    } catch (err) {
      alert("Failed to send email");
    } finally {
      setIsEmailing(false);
    }
  };

  return (
    <div className="bg-[#f0f0f0] h-full flex flex-col font-sans">
      <div className="bg-white border-b border-gray-300">
        <div className="flex bg-gray-100 text-[10px] font-bold px-2 pt-1">
          {['Main', 'Send/Ship'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 border-t border-l border-r rounded-t-sm mr-0.5 transition-colors ${activeTab === tab ? 'bg-white border-gray-300' : 'bg-gray-200 border-transparent hover:bg-gray-50'}`}>{tab}</button>
          ))}
        </div>
        <div className="p-2 flex gap-4 bg-white border-t border-gray-300 overflow-x-auto shadow-sm">
          {activeTab === 'Main' && (
            <>
              <button onClick={() => { setLineItems([]); handleAddItem(); }} className="flex flex-col items-center group"><div className="w-8 h-8 bg-gray-50 border rounded flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors">✚</div><span className="text-[9px] font-bold mt-1">New</span></button>
              <button onClick={() => handleSave(false)} className="flex flex-col items-center group"><div className="w-8 h-8 bg-gray-50 border rounded flex items-center justify-center text-blue-700 hover:bg-blue-100 transition-colors">💾</div><span className="text-[9px] font-bold mt-1">Save</span></button>
              <div className="w-px bg-gray-300 mx-2 self-stretch"></div>
              {allBillable.length > 0 && <button onClick={() => setShowBillableModal(true)} className="flex flex-col items-center group animate-pulse"><div className="w-8 h-8 bg-yellow-50 border-2 border-yellow-400 rounded flex items-center justify-center text-yellow-700 hover:bg-yellow-100 transition-colors font-bold text-xs">!</div><span className="text-[9px] font-bold mt-1 text-yellow-800">Billables</span></button>}
              <button onClick={handlePrint} className="flex flex-col items-center group"><div className="w-8 h-8 bg-gray-50 border rounded flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors">{isPrinting ? '⏳' : '🖨️'}</div><span className="text-[9px] font-bold mt-1">Print</span></button>
              <button onClick={handleEmail} className="flex flex-col items-center group"><div className="w-8 h-8 bg-gray-50 border rounded flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors">{isEmailing ? '⏳' : '📧'}</div><span className="text-[9px] font-bold mt-1">Email</span></button>
            </>
          )}

          {activeTab === 'Send/Ship' && (
            <div className="flex gap-6 items-center flex-1">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Ship Via</label>
                <select className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white outline-none focus:border-blue-500" value={selectedShipVia} onChange={e => setSelectedShipVia(e.target.value)}>
                  <option value="">--Select--</option>
                  {shipVia.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Ship Date</label>
                <input type="text" className="border border-gray-300 rounded px-1 py-0.5 text-xs w-24 outline-none focus:border-blue-500" placeholder="MM/DD/YYYY" value={shipDate} onChange={e => setShipDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Tracking #</label>
                <input type="text" className="border border-gray-300 rounded px-1 py-0.5 text-xs w-40 outline-none focus:border-blue-500" value={trackingNo} onChange={e => setTrackingNo(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">FOB</label>
                <input type="text" className="border border-gray-300 rounded px-1 py-0.5 text-xs w-20 outline-none focus:border-blue-500" value={fob} onChange={e => setFob(e.target.value)} />
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-white border border-gray-300 m-2 rounded shadow-xl" id="invoice-printable">
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-serif italic text-[#003366] drop-shadow-sm">Invoice</h1>
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-500 uppercase italic">Customer:Job</label>
              <select className="border-b-2 border-blue-200 bg-blue-50/30 px-2 py-1 text-sm font-bold w-80 outline-none focus:border-blue-500" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                <option value="">Select a Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-right">
            {isFieldVisible('date') && (
              <>
                <div className="text-[10px] font-bold text-gray-400 uppercase self-center">Date</div>
                <input type="text" className="border-b border-gray-300 px-2 py-1 text-xs text-right outline-none focus:border-blue-500" value={date} onChange={e => setDate(e.target.value)} />
              </>
            )}
            {isFieldVisible('refNo') && (
              <>
                <div className="text-[10px] font-bold text-gray-400 uppercase self-center">Invoice #</div>
                <input type="text" className="border-b border-gray-300 px-2 py-1 text-xs text-right outline-none focus:border-blue-500 font-mono" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
              </>
            )}
          </div>
        </div>

        <div className="border border-gray-300 rounded overflow-hidden bg-gray-50">
          <table className="w-full text-[11px]">
            <thead className="bg-[#e8e8e8] border-b border-gray-400 text-[#003366] font-bold">
              <tr>
                {isFieldVisible('quantity') && <th className="px-3 py-2 text-left w-20 border-r">Qty</th>}
                {isFieldVisible('item') && <th className="px-3 py-2 text-left w-48 border-r">Item</th>}
                {isFieldVisible('description') && <th className="px-3 py-2 text-left border-r">Description</th>}
                {isFieldVisible('itemRate') && <th className="px-3 py-2 text-right w-24 border-r">Rate</th>}
                {isFieldVisible('amount') && <th className="px-3 py-2 text-right w-24 border-r">Amount</th>}
                <th className="px-3 py-2 text-center w-8"></th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {lineItems.map(item => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-blue-50/50 group">
                  {isFieldVisible('quantity') && <td className="p-0 border-r"><input type="number" className="w-full px-3 py-2 bg-transparent outline-none text-right" value={item.quantity || ''} onChange={e => updateLineItem(item.id!, { quantity: parseFloat(e.target.value) || 0 })} /></td>}
                  {isFieldVisible('item') && <td className="p-0 border-r"><select className="w-full px-3 py-2 bg-transparent outline-none appearance-none" onChange={e => handleItemSelect(item.id!, e.target.value)}><option value="">Select Item...</option>{availableItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></td>}
                  {isFieldVisible('description') && <td className="p-0 border-r"><input className="w-full px-3 py-2 bg-transparent outline-none italic text-gray-600" value={item.description || ''} onChange={e => updateLineItem(item.id!, { description: e.target.value })} /></td>}
                  {isFieldVisible('itemRate') && <td className="p-0 border-r"><input type="number" className="w-full px-3 py-2 bg-transparent outline-none text-right" value={item.rate || ''} onChange={e => updateLineItem(item.id!, { rate: parseFloat(e.target.value) || 0 })} /></td>}
                  {isFieldVisible('amount') && <td className="px-3 py-2 border-r text-right font-bold text-blue-900">{(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                  <td className="px-1 py-2 text-center"><button onClick={() => handleRemoveItem(item.id!)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button></td>
                </tr>
              ))}
              <tr className="bg-gray-50/50"><td colSpan={6} className="px-3 py-1"><button onClick={handleAddItem} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-tighter cursor-pointer">+ Add Line</button></td></tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex justify-between items-start">
          <div className="w-1/2 space-y-4">
            <div><label className="text-[10px] font-bold text-gray-500 uppercase italic block mb-1">Memo</label><textarea className="w-full max-w-md border border-gray-300 rounded p-2 text-xs bg-gray-50 outline-none h-16 resize-none focus:ring-1 ring-blue-500" placeholder="Internal memo..." value={memo} onChange={e => setMemo(e.target.value)} /></div>
          </div>
          <div className="w-80 space-y-2">
            <div className="flex justify-between text-xs text-gray-600"><span>Subtotal</span><span className="font-bold">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between text-xs text-gray-600"><span>Tax ({(taxRate * 100).toFixed(1)}%)</span><span className="font-bold">${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between border-t-2 pt-2 border-[#003366] mt-4"><span className="text-2xl font-black text-[#003366] uppercase tracking-tighter">Total</span><span className="text-2xl font-black text-[#003366]">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3 border-t pt-6">
          <button onClick={() => handleSave(true)} className="px-8 py-2 bg-white border border-gray-400 rounded-sm text-xs font-bold hover:bg-gray-50 shadow-sm active:translate-y-px transition-all">Save & New</button>
          <button onClick={() => handleSave(false)} className="px-8 py-2 bg-[#0077c5] text-white rounded-sm text-xs font-bold hover:bg-[#005fa0] shadow-md active:translate-y-px transition-all">Save & Close</button>
        </div>
      </div>

      {showBillableModal && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#003366] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-[#003366] p-3 flex justify-between items-center text-white">
              <h3 className="font-bold uppercase tracking-widest text-xs">Choose Billable Time and Expenses</h3>
              <button onClick={() => setShowBillableModal(false)} className="hover:text-red-400">✕</button>
            </div>
            <div className="p-6">
              <p className="text-sm font-bold text-blue-900 mb-4 italic">Select the items you want to include in this invoice:</p>
              <div className="border border-gray-300 rounded h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 border-b font-bold h-8 sticky top-0">
                    <tr><th className="px-4 text-center w-8"></th><th className="px-4 text-left">Date</th><th className="px-4 text-left">Type</th><th className="px-4 text-left">Description</th><th className="px-4 text-right">Amount</th></tr>
                  </thead>
                  <tbody>
                    {allBillable.map(b => (
                      <tr key={b.id} className="border-b h-10 hover:bg-blue-50">
                        <td className="px-4 text-center"><input type="checkbox" checked={selectedBillableIds.includes(b.id)} onChange={e => e.target.checked ? setSelectedBillableIds([...selectedBillableIds, b.id]) : setSelectedBillableIds(selectedBillableIds.filter(id => id !== b.id))} /></td>
                        <td className="px-4">{b.date}</td>
                        <td className="px-4 font-bold">{b.sourceType}</td>
                        <td className="px-4 truncate max-w-[200px]">{b.description}</td>
                        <td className="px-4 text-right font-mono font-bold">${b.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowBillableModal(false)} className="px-6 py-2 border border-gray-400 text-xs font-bold rounded hover:bg-gray-50">Cancel</button>
                <button onClick={handleAddBillable} className="px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 disabled:opacity-50" disabled={selectedBillableIds.length === 0}>Add Selected Items</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEstimateModal && (
        <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#003366] w-full max-w-lg shadow-2xl">
            <div className="bg-[#003366] p-3 flex justify-between items-center text-white">
              <h3 className="font-bold uppercase tracking-widest text-xs">Available Estimates</h3>
              <button onClick={() => setShowEstimateModal(false)} className="hover:text-red-400">✕</button>
            </div>
            <div className="p-6">
              <p className="text-sm font-bold text-blue-900 mb-4 italic">There are open estimates for this customer. Do you want to create the invoice from an estimate?</p>
              <div className="space-y-2">
                {openEstimates.map(est => (
                  <button key={est.id} onClick={() => handleSelectEstimate(est)} className="w-full p-4 border rounded hover:bg-blue-50 flex justify-between items-center transition-colors">
                    <div className="text-left">
                      <div className="font-bold text-blue-900">Estimate #{est.refNo}</div>
                      <div className="text-[10px] text-gray-500">{est.date}</div>
                    </div>
                    <div className="text-lg font-black text-blue-900">${est.total.toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showProgressModal && (
        <div className="fixed inset-0 bg-black/50 z-[1100] flex items-center justify-center p-4">
          <div className="bg-white border-4 border-[#003366] w-full max-w-md shadow-2xl">
            <div className="bg-[#003366] p-3 text-white font-bold uppercase tracking-widest text-xs">Create Progress Invoice</div>
            <div className="p-6 space-y-4 text-sm">
              <label className="flex items-center gap-3"><input type="radio" name="progress" checked={progressData.type === 'TOTAL'} onChange={() => setProgressData({ type: 'TOTAL' })} /> Create invoice for the entire estimate</label>
              <label className="flex items-center gap-3">
                <input type="radio" name="progress" checked={progressData.type === 'PERCENT'} onChange={() => setProgressData({ type: 'PERCENT', percent: 50 })} />
                Create invoice for a percentage
                {progressData.type === 'PERCENT' && <input type="number" className="w-16 border rounded mx-2 px-1" value={progressData.percent} onChange={e => setProgressData({ ...progressData, percent: parseInt(e.target.value) })} />} %
              </label>
              <button onClick={finalizeEstimateToInvoice} className="w-full bg-blue-600 text-white font-bold py-2 mt-4 hover:bg-blue-700">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceForm;
