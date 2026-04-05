import React, { useState, useEffect, useRef } from 'react';
import { sendEmail, fetchAvailableLots } from '../services/api';
import { useData } from '../contexts/DataContext';
import { Customer, Item, Transaction, TransactionItem, QBClass, SalesRep, TimeEntry, Term, PriceLevel, RecurringTemplate } from '../types';
import RecurringInvoiceDialog from './RecurringInvoiceDialog';
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
  const { formLayouts, companyConfig, handleSaveRecurringTemplate } = useData();
  const currentLayout = formLayouts.find(l => l.formType === 'INVOICE');
  const isFieldVisible = (id: string, mode: 'screen' | 'print' = 'screen') => {
    const field = currentLayout?.fields.find(f => f.id === id);
    if (!field) return true;
    return mode === 'screen' ? field.showOnScreen : field.showOnPrint;
  };

  const [activeTab, setActiveTab] = useState('Main');
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialData?.entityId || customers[0]?.id || '');
  const [selectedTermId, setSelectedTermId] = useState(initialData?.terms ? (terms.find(t => t.name === initialData.terms)?.id || '') : '');
  const [poNo, setPoNo] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(initialData?.classId || '');
  const [selectedSalesRepId, setSelectedSalesRepId] = useState(initialData?.salesRepId || '');
  const [selectedShipVia, setSelectedShipVia] = useState(initialData?.shipVia || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [exchangeRate, setExchangeRate] = useState(initialData?.exchangeRate || 1);

  const lastInvoice = transactions.filter(t => t.type === 'INVOICE').reduce((max, t) => Math.max(max, parseInt(t.refNo) || 0), 1000);
  const [invoiceNo, setInvoiceNo] = useState(initialData?.refNo || (lastInvoice + 1).toString());
  const [memo, setMemo] = useState(initialData?.vendorMessage || initialData?.memo || '');
  const [internalNotes, setInternalNotes] = useState(initialData?.internalNotes || '');
  const [trackingNo, setTrackingNo] = useState(initialData?.trackingNo || '');
  const [shipDate, setShipDate] = useState(initialData?.shipDate || '');
  const [fob, setFob] = useState(initialData?.fob || '');
  const [selectedTaxItemId, setSelectedTaxItemId] = useState(initialData?.taxItemId || '');
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  const [lineItems, setLineItems] = useState<Partial<TransactionItem>[]>(
    initialData?.items?.map(i => ({ ...i, id: i.id || crypto.randomUUID() })) ||
    [{ id: crypto.randomUUID(), description: '', quantity: 0, rate: 0, amount: 0, tax: true, classId: '', lotNumber: '' }]
  );

  const [availableLotsMap, setAvailableLotsMap] = useState<Record<string, any[]>>({});

  const [showBillableModal, setShowBillableModal] = useState(false);
  const [selectedBillableIds, setSelectedBillableIds] = useState<string[]>([]);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressData, setProgressData] = useState<{ type: 'TOTAL' | 'PERCENT' | 'ITEMIZED', percent?: number }>({ type: 'TOTAL' });
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [billAddr, setBillAddr] = useState<string>(initialData?.BillAddr?.Line1 || '');
  const [shipAddr, setShipAddr] = useState<string>(initialData?.ShipAddr?.Line1 || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [cc, setCc] = useState(initialData?.cc || '');
  const [bcc, setBcc] = useState(initialData?.bcc || '');
  const [paymentOptions, setPaymentOptions] = useState<string[]>(initialData?.paymentOptions || []);
  const [memoOnStatement, setMemoOnStatement] = useState(initialData?.memoOnStatement || '');
  const [attachments, setAttachments] = useState<any[]>(initialData?.attachments || []);
  const [deposit, setDeposit] = useState(initialData?.deposit || 0);
  const [discountAmount, setDiscountAmount] = useState(initialData?.discountAmount || 0);
  const [discountPercentage, setDiscountPercentage] = useState(initialData?.discountPercentage || 0);
  const [isDiscountPercentage, setIsDiscountPercentage] = useState(initialData?.isDiscountPercentage || false);
  const [lateFee, setLateFee] = useState(initialData?.lateFee || 0);
  const [tip, setTip] = useState(initialData?.tip || 0);
  const [shippingDetails, setShippingDetails] = useState(initialData?.shippingDetails || {
    shipmentCost: 0,
    innerPackDimensions: { length: 0, width: 0, height: 0, unit: 'in' },
    outerBoxDimensions: { length: 0, width: 0, height: 0, unit: 'in' },
    masterCartonDimensions: { length: 0, width: 0, height: 0, unit: 'in' }
  });
  const invoiceRef = useRef<HTMLDivElement>(null);

  const subtotal = lineItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  const customer = customers.find(c => c.id === selectedCustomerId);
  const taxItem = availableItems.find(i => i.id === selectedTaxItemId);
  const taxRate = (taxItem?.taxRate || taxItem?.taxRateValue || 0) / 100;
  const taxAmount = lineItems.filter(i => i.tax).reduce((acc, item) => acc + (item.amount || 0) * taxRate, 0);

  const discountVal = isDiscountPercentage ? (subtotal * (discountPercentage / 100)) : discountAmount;
  const total = subtotal + taxAmount + lateFee + tip - discountVal - deposit;
  const balanceDue = (customer?.balance || 0) + total;

  const getDueDate = () => {
    const term = terms.find(t => t.id === selectedTermId);
    const d = new Date(date);
    if (!isNaN(d.getTime()) && term) {
      d.setDate(d.getDate() + (term.stdDueDays || 0));
      return d.toISOString().split('T')[0];
    }
    return date;
  };

  const openEstimates = transactions.filter(t => t.type === 'ESTIMATE' && t.entityId === selectedCustomerId && t.status === 'OPEN');

  useEffect(() => {
    if (selectedCustomerId && openEstimates.length > 0 && !initialData) {
      setShowEstimateModal(true);
    }
    if (!initialData && customer) {
      setSelectedTaxItemId(customer.taxItemId || '');
      setEmail(customer.email || customer.PrimaryEmailAddr?.Address || '');
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
    if (est.BillAddr) setBillAddr(est.BillAddr.Line1 || '');
    if (est.ShipAddr) setShipAddr(est.ShipAddr.Line1 || '');
    setShowProgressModal(false);
  };

  const handleAddItem = () => {
    setLineItems([...lineItems, { id: crypto.randomUUID(), description: '', quantity: 0, rate: 0, amount: 0, tax: true, classId: '', lotNumber: '' }]);
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

  const fetchAndSuggestLot = async (id: string, itemId: string) => {
    try {
      const lots = await fetchAvailableLots(itemId);
      setAvailableLotsMap(prev => ({ ...prev, [itemId]: lots }));
      if (lots && lots.length > 0) {
        // Suggested earliest lot (FIFO)
        updateLineItem(id, { lotNumber: lots[0].lotNumber });
      }
    } catch (err) {
      console.error('Error fetching lots:', err);
    }
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
      if (item.type === 'Inventory Part' || item.type === 'Inventory Assembly') {
        fetchAndSuggestLot(id, itemId);
      }
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
      subtotal: subtotal,
      taxAmount: taxAmount,
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
      dueDate: getDueDate(),
      taxItemId: selectedTaxItemId,
      email,
      cc,
      bcc,
      paymentOptions,
      memoOnStatement,
      attachments,
      deposit,
      discountAmount,
      discountPercentage,
      isDiscountPercentage,
      lateFee,
      tip,
      internalNotes,
      exchangeRate,
      shippingDetails,
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
        classId: i.classId,
        lotNumber: i.lotNumber
      })),
      BillAddr: { Line1: billAddr },
      ShipAddr: { Line1: shipAddr }
    } as any);

    if (!stayOpen) onClose();
    else {
      setLineItems([{ id: crypto.randomUUID(), description: '', quantity: 0, rate: 0, amount: 0, tax: true, lotNumber: '' }]);
      setInvoiceNo((parseInt(invoiceNo) + 1).toString());
    }
  };

  const handleSaveRecurring = async (template: RecurringTemplate) => {
    try {
      await handleSaveRecurringTemplate(template);
      alert("Recurring template saved successfully!");
      setShowRecurringModal(false);
    } catch (err) {
      alert("Failed to save recurring template");
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
        <div className="flex bg-gray-100 text-sm font-bold px-2 pt-1">
          {['Main', 'Send/Ship', 'Shipping & Packaging'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2.5 border-t border-l border-r rounded-t-sm mr-0.5 transition-colors ${activeTab === tab ? 'bg-white border-gray-400 text-[#003366]' : 'bg-gray-200 border-transparent hover:bg-gray-50 text-gray-500'}`}>{tab}</button>
          ))}
        </div>
        <div className="p-2 flex gap-4 bg-white border-t border-gray-300 overflow-x-auto shadow-sm">
          {activeTab === 'Main' && (
            <>
              <button onClick={() => { setLineItems([]); handleAddItem(); }} className="flex flex-col items-center group"><div className="w-10 h-10 bg-gray-50 border-2 border-gray-200 rounded flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors text-xl">✚</div><span className="text-xs font-bold mt-1">New</span></button>
              <button onClick={() => handleSave(false)} className="flex flex-col items-center group"><div className="w-10 h-10 bg-gray-50 border-2 border-gray-200 rounded flex items-center justify-center text-blue-700 hover:bg-blue-100 transition-colors text-xl">💾</div><span className="text-xs font-bold mt-1">Save</span></button>
              <button onClick={() => setShowRecurringModal(true)} className="flex flex-col items-center group"><div className="w-10 h-10 bg-gray-50 border-2 border-gray-200 rounded flex items-center justify-center text-purple-700 hover:bg-purple-100 transition-colors text-xl">🔄</div><span className="text-xs font-bold mt-1 text-center leading-tight">Memo/<br />Recurring</span></button>
              <div className="w-px bg-gray-300 mx-2 self-stretch"></div>
              {allBillable.length > 0 && <button onClick={() => setShowBillableModal(true)} className="flex flex-col items-center group animate-pulse"><div className="w-10 h-10 bg-yellow-50 border-2 border-yellow-400 rounded flex items-center justify-center text-yellow-700 hover:bg-yellow-100 transition-colors font-bold text-lg">!</div><span className="text-xs font-bold mt-1 text-yellow-800">Billables</span></button>}
              <button onClick={handlePrint} className="flex flex-col items-center group"><div className="w-10 h-10 bg-gray-50 border-2 border-gray-200 rounded flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors text-xl">{isPrinting ? '⏳' : '🖨️'}</div><span className="text-xs font-bold mt-1">Print</span></button>
              <button onClick={handleEmail} className="flex flex-col items-center group"><div className="w-10 h-10 bg-gray-50 border-2 border-gray-200 rounded flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors text-xl">{isEmailing ? '⏳' : '📧'}</div><span className="text-xs font-bold mt-1">Email</span></button>
            </>
          )}

          {activeTab === 'Send/Ship' && (
            <div className="flex gap-8 items-center flex-1">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase">Ship Via</label>
                <select className="border-2 border-gray-300 rounded px-2 py-1 text-sm bg-white outline-none focus:border-blue-500 font-bold" value={selectedShipVia} onChange={e => setSelectedShipVia(e.target.value)}>
                  <option value="">--Select--</option>
                  {shipVia.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase">Ship Date</label>
                <input type="text" className="border-2 border-gray-300 rounded px-2 py-1 text-sm w-32 outline-none focus:border-blue-500 font-bold" placeholder="MM/DD/YYYY" value={shipDate} onChange={e => setShipDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase">Tracking #</label>
                <input type="text" className="border-2 border-gray-300 rounded px-2 py-1 text-sm w-48 outline-none focus:border-blue-500 font-bold" value={trackingNo} onChange={e => setTrackingNo(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-600 uppercase">FOB</label>
                <input type="text" className="border-2 border-gray-300 rounded px-2 py-1 text-sm w-24 outline-none focus:border-blue-500 font-bold" value={fob} onChange={e => setFob(e.target.value)} />
              </div>
            </div>
          )}

          {activeTab === 'Shipping & Packaging' && (
            <div className="flex gap-8 items-center flex-1 animate-in slide-in-from-left-2">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-gray-400 uppercase">Shipment Cost</label>
                <div className="relative">
                  <span className="absolute left-2 top-0.5 text-gray-400 text-xs">$</span>
                  <input
                    type="number"
                    className="border border-gray-300 rounded pl-5 pr-1 py-0.5 text-xs w-24 outline-none focus:border-blue-500 font-bold"
                    value={shippingDetails.shipmentCost || ''}
                    onChange={e => setShippingDetails({ ...shippingDetails, shipmentCost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="h-8 w-px bg-gray-200"></div>

              {[
                { label: 'Inner Pack', key: 'innerPackDimensions' },
                { label: 'Outer Box', key: 'outerBoxDimensions' },
                { label: 'Master Carton', key: 'masterCartonDimensions' }
              ].map(level => (
                <div key={level.key} className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase">{level.label} (LxWxH)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="L"
                      className="border border-gray-300 rounded px-1 py-0.5 text-xs w-10 outline-none focus:border-blue-500"
                      value={(shippingDetails as any)[level.key]?.length || ''}
                      onChange={e => setShippingDetails({
                        ...shippingDetails,
                        [level.key]: { ...(shippingDetails as any)[level.key], length: parseFloat(e.target.value) || 0 }
                      })}
                    />
                    <span className="text-[10px] text-gray-400">x</span>
                    <input
                      type="number"
                      placeholder="W"
                      className="border border-gray-300 rounded px-1 py-0.5 text-xs w-10 outline-none focus:border-blue-500"
                      value={(shippingDetails as any)[level.key]?.width || ''}
                      onChange={e => setShippingDetails({
                        ...shippingDetails,
                        [level.key]: { ...(shippingDetails as any)[level.key], width: parseFloat(e.target.value) || 0 }
                      })}
                    />
                    <span className="text-[10px] text-gray-400">x</span>
                    <input
                      type="number"
                      placeholder="H"
                      className="border border-gray-300 rounded px-1 py-0.5 text-xs w-10 outline-none focus:border-blue-500"
                      value={(shippingDetails as any)[level.key]?.height || ''}
                      onChange={e => setShippingDetails({
                        ...shippingDetails,
                        [level.key]: { ...(shippingDetails as any)[level.key], height: parseFloat(e.target.value) || 0 }
                      })}
                    />
                    <span className="text-[10px] text-blue-600 font-bold ml-1">in</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-white border border-gray-300 m-2 rounded shadow-xl" id="invoice-printable">
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-serif italic text-[#003366] drop-shadow-sm pb-2">Invoice</h1>
            <div className="flex flex-col pt-2">
              <label className="text-xs font-bold text-gray-600 uppercase italic mb-1">Customer:Job</label>
              <select className="border-b-2 border-blue-300 bg-blue-50/50 px-3 py-2 text-base font-bold w-96 outline-none focus:border-blue-600 shadow-sm" value={selectedCustomerId} onChange={e => {
                const custId = e.target.value;
                setSelectedCustomerId(custId);
                const customer = customers.find(c => c.id === custId);
                if (customer) {
                  const addr = customer.address || '';
                  setBillAddr(addr);
                  setShipAddr(addr);
                  setEmail(customer.email || customer.PrimaryEmailAddr?.Address || '');
                }
              }}>
                <option value="">Select a Customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex gap-4 items-end">
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-gray-600 uppercase">Customer email</label>
                <input type="text" className="border-b-2 border-gray-300 px-1 py-1 text-sm w-64 outline-none focus:border-blue-500 font-bold" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="flex flex-col">
                <label className="text-[11px] font-bold text-gray-600 uppercase">Cc/Bcc</label>
                <div className="flex gap-2">
                  <input type="text" className="border-b-2 border-gray-300 px-1 py-1 text-xs w-32 outline-none focus:border-blue-500" placeholder="Cc" value={cc} onChange={e => setCc(e.target.value)} />
                  <input type="text" className="border-b-2 border-gray-300 px-1 py-1 text-xs w-32 outline-none focus:border-blue-500" placeholder="Bcc" value={bcc} onChange={e => setBcc(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold text-gray-600 uppercase mb-1">Balance due</div>
            <div className="text-4xl font-black text-blue-900 drop-shadow-sm">PRs{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
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
            {isFieldVisible('date') && (
              <>
                <div className="text-xs font-bold text-gray-600 uppercase self-center">Date</div>
                <input type="text" className="border-b-2 border-gray-300 px-2 py-1.5 text-sm text-right outline-none focus:border-blue-600 font-bold" value={date} onChange={e => setDate(e.target.value)} />
              </>
            )}
            {isFieldVisible('refNo') && (
              <>
                <div className="text-xs font-bold text-gray-600 uppercase self-center">Invoice #</div>
                <input type="text" className="border-b-2 border-gray-300 px-2 py-1.5 text-sm text-right outline-none focus:border-blue-600 font-mono font-bold" value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} />
              </>
            )}
            <div className="text-xs font-bold text-gray-600 uppercase self-center">Terms</div>
            <select
              className="border-b-2 border-gray-300 px-2 py-1.5 text-sm text-right outline-none focus:border-blue-600 bg-transparent font-bold cursor-pointer"
              value={selectedTermId}
              onChange={e => setSelectedTermId(e.target.value)}
            >
              <option value="">--Select--</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="text-xs font-bold text-gray-600 uppercase self-center">Due Date</div>
            <div className="px-2 py-1.5 text-sm text-right text-red-600 font-black border-b-2 border-dashed border-red-200 bg-red-50/30">{getDueDate()}</div>
            <div className="text-xs font-bold text-gray-600 uppercase self-center">Exch. Rate</div>
            <input type="number" step="0.0001" className="border-b-2 border-gray-300 px-2 py-1.5 text-sm text-right outline-none focus:border-blue-600 font-bold" value={exchangeRate} onChange={e => setExchangeRate(parseFloat(e.target.value) || 1)} />
          </div>
        </div>

        <div className="border-2 border-gray-400 rounded-lg overflow-hidden bg-gray-50 shadow-md">
          <table className="w-full text-sm">
            <thead className="bg-[#003366] border-b-2 border-gray-900 text-white font-bold">
              <tr>
                {isFieldVisible('quantity') && <th className="px-4 py-3 text-left w-24 border-r border-gray-600">Qty</th>}
                {isFieldVisible('item') && <th className="px-4 py-3 text-left w-64 border-r border-gray-600">Item</th>}
                {isFieldVisible('description') && <th className="px-4 py-3 text-left border-r border-gray-600">Description</th>}
                <th className="px-4 py-3 text-left w-32 border-r border-gray-600">Lot Number</th>
                {isFieldVisible('itemRate') && <th className="px-4 py-3 text-right w-32 border-r border-gray-600">Rate</th>}
                <th className="px-4 py-3 text-center w-16 border-r border-gray-600">Tax</th>
                {isFieldVisible('amount') && <th className="px-4 py-3 text-right w-32 border-r border-gray-600">Amount</th>}
                <th className="px-4 py-3 text-center w-10"></th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {lineItems.map(item => (
                <tr key={item.id} className="border-b-2 border-gray-200 hover:bg-blue-50/80 group transition-colors">
                  {isFieldVisible('quantity') && <td className="p-0 border-r-2 border-gray-200"><input type="number" className="w-full px-4 py-3 bg-transparent outline-none text-right font-bold text-sm" value={item.quantity || ''} onChange={e => updateLineItem(item.id!, { quantity: parseFloat(e.target.value) || 0 })} /></td>}
                  {isFieldVisible('item') && <td className="p-0 border-r-2 border-gray-200"><select className="w-full px-4 py-3 bg-transparent outline-none appearance-none font-bold text-sm" value={item.itemId} onChange={e => { updateLineItem(item.id!, { itemId: e.target.value }); handleItemSelect(item.id!, e.target.value); }}><option value="">Select Item...</option>{availableItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></td>}
                  {isFieldVisible('description') && <td className="p-0 border-r-2 border-gray-200"><input className="w-full px-4 py-3 bg-transparent outline-none italic text-gray-700 font-medium text-sm" value={item.description || ''} onChange={e => updateLineItem(item.id!, { description: e.target.value })} /></td>}
                  <td className="p-0 border-r-2 border-gray-200">
                    <select
                      className="w-full px-4 py-3 bg-transparent outline-none font-bold text-xs"
                      value={item.lotNumber || ''}
                      onChange={e => updateLineItem(item.id!, { lotNumber: e.target.value })}
                    >
                      <option value="">--Select Lot--</option>
                      {availableLotsMap[item.itemId!]?.map(lot => (
                        <option key={lot.lotNumber} value={lot.lotNumber}>
                          {lot.lotNumber} ({lot.quantityRemaining} left)
                        </option>
                      ))}
                    </select>
                  </td>
                  {isFieldVisible('itemRate') && <td className="p-0 border-r-2 border-gray-200"><input type="number" className="w-full px-4 py-3 bg-transparent outline-none text-right font-bold text-sm" value={item.rate || ''} onChange={e => updateLineItem(item.id!, { rate: parseFloat(e.target.value) || 0 })} /></td>}
                  <td className="p-0 border-r-2 border-gray-200 text-center">
                    <input
                      type="checkbox"
                      className="w-5 h-5 mt-1 cursor-pointer accent-blue-600"
                      checked={!!item.tax}
                      onChange={e => updateLineItem(item.id!, { tax: e.target.checked })}
                    />
                  </td>
                  {isFieldVisible('amount') && <td className="px-4 py-3 border-r-2 border-gray-200 text-right font-black text-blue-900 text-sm">{(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>}
                  <td className="px-1 py-3 text-center"><button onClick={() => handleRemoveItem(item.id!)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-base">✕</button></td>
                </tr>
              ))}
              <tr className="bg-gray-100/50 hover:bg-gray-100 transition-colors"><td colSpan={7} className="px-4 py-2"><button onClick={handleAddItem} className="text-xs font-black text-blue-700 hover:text-blue-900 uppercase tracking-wide cursor-pointer flex items-center gap-2"><span className="text-lg">+</span> Add Line Item</button></td></tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex justify-between items-start">
          <div className="w-1/2 space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase italic">Customer payment options</label>
              <div className="flex gap-4 text-xs">
                {['Credit Card', 'Bank Transfer', 'Online Payment'].map(opt => (
                  <label key={opt} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={paymentOptions.includes(opt)}
                      onChange={e => e.target.checked ? setPaymentOptions([...paymentOptions, opt]) : setPaymentOptions(paymentOptions.filter(o => o !== opt))}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
            <div><label className="text-[10px] font-bold text-gray-500 uppercase italic block mb-1">Note to customer</label><textarea className="w-full max-w-md border border-gray-300 rounded p-2 text-xs bg-gray-50 outline-none h-16 resize-none focus:ring-1 ring-blue-500" placeholder="Thank you for your business." value={memo} onChange={e => setMemo(e.target.value)} /></div>
            <div><label className="text-[10px] font-bold text-yellow-600 uppercase italic block mb-1">Internal Notes (Hidden from customer)</label><textarea className="w-full max-w-md border border-yellow-300 rounded p-2 text-xs bg-yellow-50 outline-none h-16 resize-none focus:ring-1 ring-yellow-500 font-medium" placeholder="Keep private..." value={internalNotes} onChange={e => setInternalNotes(e.target.value)} /></div>
            <div><label className="text-[10px] font-bold text-gray-500 uppercase italic block mb-1">Memo on statement (hidden)</label><textarea className="w-full max-w-md border border-gray-300 rounded p-2 text-xs bg-gray-50 outline-none h-12 resize-none focus:ring-1 ring-blue-500" placeholder="Statement memo..." value={memoOnStatement} onChange={e => setMemoOnStatement(e.target.value)} /></div>
            <div className="flex flex-col gap-2 pt-4">
              <label className="text-xs font-bold text-gray-600 uppercase italic">Attachments</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                <span className="text-sm text-gray-500 font-bold">📎 Drop files here or click to attach (Max 20MB)</span>
                {attachments.length > 0 && (
                  <div className="mt-3 text-left space-y-1">
                    {attachments.map((a, i) => <div key={i} className="text-xs text-blue-700 font-bold bg-blue-100 px-2 py-1 rounded inline-block mr-2">📎 {a.name}</div>)}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="w-96 space-y-4 bg-gray-50 p-6 rounded-lg border-2 border-gray-100 shadow-sm">
            <div className="flex justify-between text-sm text-gray-700"><span>Subtotal</span><span className="font-black text-lg">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between items-center gap-4 text-sm text-gray-700 border-t pt-2">
              <div className="flex items-center gap-2">
                <span className="font-bold">Tax</span>
                <select
                  className="border-2 border-gray-300 rounded px-2 py-1 bg-white outline-none focus:border-blue-500 text-xs font-bold"
                  value={selectedTaxItemId}
                  onChange={e => setSelectedTaxItemId(e.target.value)}
                >
                  <option value="">--None--</option>
                  {availableItems.filter(i => i.type === 'Sales Tax Item' || i.type === 'Sales Tax Group').map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({(i.taxRate || i.taxRateValue || 0)}%)</option>
                  ))}
                </select>
              </div>
              <span className="font-black text-lg text-red-700">${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-center gap-4 text-sm text-gray-700 border-t pt-2">
              <div className="flex items-center gap-2">
                <span className="font-bold">Discount</span>
                <div className="flex border rounded overflow-hidden">
                  <button onClick={() => setIsDiscountPercentage(false)} className={`px-2 py-0.5 text-[10px] font-bold ${!isDiscountPercentage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>$</button>
                  <button onClick={() => setIsDiscountPercentage(true)} className={`px-2 py-0.5 text-[10px] font-bold ${isDiscountPercentage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>%</button>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-2 top-1 text-gray-400 text-xs">{isDiscountPercentage ? '%' : '$'}</span>
                <input
                  type="number"
                  className="w-32 border-2 border-gray-300 rounded pl-5 pr-2 py-1 text-right text-sm font-black focus:border-blue-500 outline-none"
                  value={isDiscountPercentage ? discountPercentage : discountAmount}
                  onChange={e => isDiscountPercentage ? setDiscountPercentage(parseFloat(e.target.value) || 0) : setDiscountAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="flex justify-between text-sm text-gray-700 items-center border-t pt-2">
              <span className="font-bold">Late Fee</span>
              <div className="relative">
                <span className="absolute left-2 top-1 text-gray-400">$</span>
                <input type="number" className="w-32 border-2 border-gray-300 rounded pl-5 pr-2 py-1 text-right text-sm font-black focus:border-blue-500 outline-none" value={lateFee} onChange={e => setLateFee(parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            <div className="flex justify-between text-sm text-gray-700 items-center border-t pt-2">
              <span className="font-bold">Tip</span>
              <div className="relative">
                <span className="absolute left-2 top-1 text-gray-400">$</span>
                <input type="number" className="w-32 border-2 border-gray-300 rounded pl-5 pr-2 py-1 text-right text-sm font-black focus:border-blue-500 outline-none" value={tip} onChange={e => setTip(parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            <div className="flex justify-between text-sm text-gray-700 items-center border-t pt-2">
              <span className="font-bold">Deposit</span>
              <div className="relative">
                <span className="absolute left-2 top-1 text-gray-400">$</span>
                <input type="number" className="w-32 border-2 border-gray-300 rounded pl-5 pr-2 py-1 text-right text-sm font-black focus:border-blue-500 outline-none" value={deposit} onChange={e => setDeposit(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
            <div className="flex justify-between border-t-4 pt-4 border-[#003366] mt-6"><span className="text-3xl font-black text-[#003366] uppercase tracking-tighter">Total</span><span className="text-3xl font-black text-[#003366]">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            <div className="text-right mt-3">
              <button className="text-xs text-blue-700 hover:underline font-black uppercase tracking-tight">Edit all totals</button>
            </div>
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

      {showRecurringModal && (
        <RecurringInvoiceDialog
          entities={customers}
          entityType="Customer"
          baseTransaction={{
            type: 'INVOICE',
            refNo: invoiceNo,
            date: date,
            entityId: selectedCustomerId,
            subtotal: subtotal,
            taxAmount: taxAmount,
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
            dueDate: getDueDate(),
            taxItemId: selectedTaxItemId,
            discountAmount,
            discountPercentage,
            isDiscountPercentage,
            lateFee,
            tip,
            internalNotes,
            exchangeRate,
            attachments,
            items: lineItems.filter(i => (i.amount || 0) !== 0 || i.description).map(i => ({
              id: i.id || crypto.randomUUID(),
              itemId: i.itemId,
              description: i.description || '',
              quantity: i.quantity || 0,
              rate: i.rate || 0,
              amount: i.amount || 0,
              tax: !!i.tax,
              classId: i.classId
            }))
          } as any}
          onSave={handleSaveRecurring}
          onClose={() => setShowRecurringModal(false)}
        />
      )}
    </div>
  );
};

export default InvoiceForm;
