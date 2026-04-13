import React, { useState } from 'react';
import { Customer, Transaction, Account, EntityContact } from '../../types';

interface CustomerDetailViewProps {
    customerId: string;
    customers: Customer[];
    transactions: Transaction[];
    accounts: Account[];
    onOpenTransaction?: (id: string, type: string) => void;
    onClose?: () => void;
    onSaveCustomer?: (customer: Customer) => Promise<void>;
    onEditCustomer?: (customer: Customer) => void;
    refreshData?: () => Promise<void>;
}

type Tab = 'TRANSACTIONS' | 'CREDITS' | 'ESTIMATES' | 'CONTACTS' | 'DETAILS' | 'NOTES';

const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({
    customerId,
    customers,
    transactions,
    onOpenTransaction,
    onSaveCustomer,
    onEditCustomer,
    refreshData,
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('TRANSACTIONS');
    const [newNoteText, setNewNoteText] = useState('');
    const [savingNote, setSavingNote] = useState(false);

    // Contact editing state
    const [editingContact, setEditingContact] = useState<EntityContact | null>(null);
    const [showContactForm, setShowContactForm] = useState(false);
    const [contactForm, setContactForm] = useState<Partial<EntityContact>>({});

    const customer = customers.find(c => c.id === customerId);
    if (!customer) return <div className="p-8 text-gray-500">Customer not found.</div>;

    const customerTransactions = transactions
        .filter(t => t.entityId === customerId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const openInvoices = customerTransactions.filter(t => t.type === 'INVOICE' && t.status === 'OPEN');
    const overdueInvoices = customerTransactions.filter(t => t.type === 'INVOICE' && t.status === 'OVERDUE');
    const totalOpenBalance = openInvoices.reduce((sum, t) => sum + t.total, 0) + overdueInvoices.reduce((sum, t) => sum + t.total, 0);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const formatAddr = (addr: Customer['BillAddr']) => {
        if (!addr) return '';
        return [addr.Line1, addr.Line2, addr.City, addr.CountrySubDivisionCode, addr.PostalCode, addr.Country]
            .filter(Boolean).join(', ');
    };

    // ── Notes ─────────────────────────────────────────────────────────────────
    const handleSaveNote = async () => {
        if (!newNoteText.trim()) return;
        setSavingNote(true);
        try {
            const { addCustomerNote } = await import('../../services/api');
            await addCustomerNote(customer.id, newNoteText.trim());
            setNewNoteText('');
            if (refreshData) await refreshData();
        } catch (err: any) {
            alert(err.message || 'Failed to save note');
        } finally {
            setSavingNote(false);
        }
    };

    // ── Contacts ──────────────────────────────────────────────────────────────
    const openNewContact = () => {
        setEditingContact(null);
        setContactForm({ type: 'Secondary', firstName: '', lastName: '' });
        setShowContactForm(true);
    };

    const openEditContact = (contact: EntityContact) => {
        setEditingContact(contact);
        setContactForm({ ...contact });
        setShowContactForm(true);
    };

    const handleSaveContact = async () => {
        if (!contactForm.firstName && !contactForm.lastName) return;
        const contacts = customer.contacts ? [...customer.contacts] : [];
        if (editingContact) {
            const idx = contacts.findIndex(c => c.id === editingContact.id);
            if (idx >= 0) contacts[idx] = { ...editingContact, ...contactForm };
        } else {
            contacts.push({ id: crypto.randomUUID(), type: 'Secondary', ...contactForm } as EntityContact);
        }
        try {
            if (onSaveCustomer) await onSaveCustomer({ ...customer, contacts });
            else if (refreshData) await refreshData();
            setShowContactForm(false);
        } catch (err: any) {
            alert(err.message || 'Failed to save contact');
        }
    };

    const handleDeleteContact = async (id: string) => {
        const contacts = (customer.contacts || []).filter(c => c.id !== id);
        try {
            if (onSaveCustomer) await onSaveCustomer({ ...customer, contacts });
            else if (refreshData) await refreshData();
        } catch (err: any) {
            alert(err.message || 'Failed to delete contact');
        }
    };

    // ── Tab config ────────────────────────────────────────────────────────────
    const tabs: { id: Tab; label: string }[] = [
        { id: 'TRANSACTIONS', label: 'Transactions' },
        { id: 'CREDITS',      label: 'Credits' },
        { id: 'ESTIMATES',    label: 'Estimates' },
        { id: 'CONTACTS',     label: `Contacts (${(customer.contacts || []).length})` },
        { id: 'DETAILS',      label: 'Customer Details' },
        { id: 'NOTES',        label: `Notes (${(customer.notes || []).length})` },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-y-auto font-sans custom-scrollbar">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm sticky top-0 z-20">
                <div className="flex justify-between items-start">
                    <div className="flex gap-5 items-start">
                        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                            {customer.name.charAt(0)}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold text-gray-900">{customer.companyName || customer.name}</h1>
                                {!customer.isActive && (
                                    <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-xs font-bold rounded-full uppercase">Inactive</span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                                <span>📧 {customer.PrimaryEmailAddr?.Address || customer.email || 'No email'}</span>
                                <span>📞 {customer.PrimaryPhone?.FreeFormNumber || customer.phone || 'No phone'}</span>
                                <span>📍 {formatAddr(customer.BillAddr) || customer.address || 'No address'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-3">
                        <button
                            onClick={() => onEditCustomer?.(customer)}
                            className="bg-blue-600 text-white text-xs font-bold px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Edit Customer
                        </button>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Open Balance</p>
                        <p className={`text-4xl font-black ${totalOpenBalance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            ${totalOpenBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 px-8 py-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Open Invoices</p>
                    <p className="text-2xl font-bold text-gray-900">{openInvoices.length + overdueInvoices.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{customerTransactions.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Customer Balance</p>
                    <p className="text-2xl font-bold text-gray-900">${customer.balance.toLocaleString()}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Last Activity</p>
                    <p className="text-2xl font-bold text-gray-900">{customerTransactions[0]?.date || 'N/A'}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-8 pb-8 flex flex-col">
                <div className="flex gap-6 border-b border-gray-200 mb-6 bg-slate-50 sticky top-[120px] z-10 pt-4 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-4 text-sm font-bold transition-colors relative whitespace-nowrap ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {tab.label}
                            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">

                    {/* ── Transactions / Credits / Estimates ─────────────────── */}
                    {(['TRANSACTIONS', 'CREDITS', 'ESTIMATES'] as Tab[]).includes(activeTab) && (
                        <div className="w-full">
                            {activeTab !== 'TRANSACTIONS' && (
                                <div className="p-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                        {activeTab === 'CREDITS' ? 'Credit Memos' : 'Estimates'}
                                    </h4>
                                    <button
                                        onClick={() => onOpenTransaction?.('NEW', activeTab === 'CREDITS' ? 'CREDIT_MEMO' : 'ESTIMATE')}
                                        className="bg-blue-600 text-white text-[10px] font-black px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors uppercase tracking-tighter shadow-sm active:scale-95"
                                    >
                                        + New {activeTab === 'CREDITS' ? 'Credit Memo' : 'Estimate'}
                                    </button>
                                </div>
                            )}
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Type</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Number</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">Amount</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-center">Status</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {customerTransactions
                                        .filter(tx => {
                                            if (activeTab === 'CREDITS')    return tx.type === 'CREDIT_MEMO';
                                            if (activeTab === 'ESTIMATES')  return tx.type === 'ESTIMATE';
                                            return true;
                                        })
                                        .map(tx => (
                                            <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${
                                                        tx.type === 'INVOICE'     ? 'bg-blue-100 text-blue-700' :
                                                        tx.type === 'PAYMENT'     ? 'bg-green-100 text-green-700' :
                                                        tx.type === 'ESTIMATE'    ? 'bg-amber-100 text-amber-700' :
                                                        tx.type === 'CREDIT_MEMO' ? 'bg-pink-100 text-pink-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {tx.type.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{tx.date}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900">{tx.refNo}</td>
                                                <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                                                    ${tx.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${
                                                        tx.status === 'PAID'    ? 'bg-emerald-100 text-emerald-700' :
                                                        tx.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                                        'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {tx.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => onOpenTransaction?.(tx.id, tx.type)}
                                                        className="opacity-0 group-hover:opacity-100 px-3 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-all underline decoration-double underline-offset-4"
                                                    >
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    {customerTransactions.filter(tx => {
                                        if (activeTab === 'CREDITS')   return tx.type === 'CREDIT_MEMO';
                                        if (activeTab === 'ESTIMATES') return tx.type === 'ESTIMATE';
                                        return true;
                                    }).length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                                                No {activeTab.toLowerCase()} found for this customer.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── Contacts ──────────────────────────────────────────── */}
                    {activeTab === 'CONTACTS' && (
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contacts</h4>
                                <button
                                    onClick={openNewContact}
                                    className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    + Add Contact
                                </button>
                            </div>

                            {showContactForm && (
                                <div className="mb-6 p-5 border border-blue-200 rounded-xl bg-blue-50 space-y-3">
                                    <h5 className="text-sm font-bold text-blue-800">{editingContact ? 'Edit Contact' : 'New Contact'}</h5>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">First Name</label>
                                            <input
                                                type="text"
                                                value={contactForm.firstName || ''}
                                                onChange={e => setContactForm(f => ({ ...f, firstName: e.target.value }))}
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Last Name</label>
                                            <input
                                                type="text"
                                                value={contactForm.lastName || ''}
                                                onChange={e => setContactForm(f => ({ ...f, lastName: e.target.value }))}
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Job Title</label>
                                            <input
                                                type="text"
                                                value={contactForm.jobTitle || ''}
                                                onChange={e => setContactForm(f => ({ ...f, jobTitle: e.target.value }))}
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                                            <select
                                                value={contactForm.type || 'Secondary'}
                                                onChange={e => setContactForm(f => ({ ...f, type: e.target.value as EntityContact['type'] }))}
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-200"
                                            >
                                                <option>Primary</option>
                                                <option>Secondary</option>
                                                <option>Additional</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={contactForm.email || ''}
                                                onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Phone</label>
                                            <input
                                                type="text"
                                                value={contactForm.phone || ''}
                                                onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-200"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={handleSaveContact}
                                            className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => setShowContactForm(false)}
                                            className="bg-white border border-gray-200 text-gray-600 text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {(customer.contacts || []).length === 0 && !showContactForm ? (
                                <div className="py-12 text-center text-gray-400 italic text-sm">No contacts yet. Click "+ Add Contact" to add one.</div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {(customer.contacts || []).map((contact: EntityContact) => (
                                        <div key={contact.id} className="flex justify-between items-center py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                                                    {(contact.firstName || '?').charAt(0)}{(contact.lastName || '').charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{contact.firstName} {contact.lastName}</p>
                                                    {contact.jobTitle && <p className="text-xs text-gray-500">{contact.jobTitle}</p>}
                                                    <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                                                        {contact.email && <span>📧 {contact.email}</span>}
                                                        {contact.phone && <span>📞 {contact.phone}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    contact.type === 'Primary'    ? 'bg-blue-100 text-blue-700' :
                                                    contact.type === 'Secondary'  ? 'bg-gray-100 text-gray-600' :
                                                    'bg-purple-100 text-purple-700'
                                                }`}>{contact.type}</span>
                                                <button onClick={() => openEditContact(contact)} className="text-gray-400 hover:text-blue-600 text-xs font-bold px-2 py-1 rounded transition-colors">Edit</button>
                                                <button onClick={() => handleDeleteContact(contact.id)} className="text-gray-400 hover:text-red-600 text-xs font-bold px-2 py-1 rounded transition-colors">✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Customer Details ──────────────────────────────────── */}
                    {activeTab === 'DETAILS' && (
                        <div className="p-8 grid grid-cols-2 gap-10">
                            {/* Left column */}
                            <div className="space-y-6">
                                <section>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Contact Information</h4>
                                    <div className="space-y-2 text-sm">
                                        <Row label="Company"   value={customer.companyName} />
                                        <Row label="Email"     value={customer.PrimaryEmailAddr?.Address || customer.email} />
                                        <Row label="Phone"     value={customer.PrimaryPhone?.FreeFormNumber || customer.phone} />
                                        <Row label="Mobile"    value={customer.Mobile?.FreeFormNumber} />
                                        <Row label="Fax"       value={customer.Fax?.FreeFormNumber} />
                                        <Row label="Web"       value={customer.WebAddr?.URI} />
                                    </div>
                                </section>
                                <section>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Billing Address</h4>
                                    <div className="p-3 bg-slate-50 rounded-lg border border-gray-100 text-sm text-gray-700 min-h-[60px]">
                                        {formatAddr(customer.BillAddr) || customer.address || '—'}
                                    </div>
                                </section>
                                <section>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Shipping Address</h4>
                                    <div className="p-3 bg-slate-50 rounded-lg border border-gray-100 text-sm text-gray-700 min-h-[60px]">
                                        {formatAddr(customer.ShipAddr) || '—'}
                                    </div>
                                </section>
                            </div>

                            {/* Right column */}
                            <div className="space-y-6">
                                <section>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Payment Settings</h4>
                                    <div className="space-y-2 text-sm">
                                        <Row label="Terms"              value={customer.TermsRef?.name} />
                                        <Row label="Credit Limit"       value={customer.creditLimit != null ? `$${customer.creditLimit.toLocaleString()}` : undefined} />
                                        <Row label="Payment Method"     value={customer.PreferredPaymentMethodRef?.name || customer.preferredPaymentMethod} />
                                        <Row label="Delivery Method"    value={customer.deliveryMethod} />
                                        <Row label="Invoice Language"   value={customer.language} />
                                    </div>
                                </section>
                                <section>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Tax &amp; Pricing</h4>
                                    <div className="space-y-2 text-sm">
                                        <Row label="Tax Registration No."  value={customer.TaxRegistrationNumber} />
                                        <Row label="Price Level"           value={customer.priceLevelId} />
                                        <Row label="Customer Type"         value={customer.customerType} />
                                        <Row label="Currency"              value={customer.currencyId} />
                                    </div>
                                </section>
                                <section className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                                    <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Customer Stats</p>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-blue-800/70">Total Sales</span>
                                            <span className="font-bold text-blue-900">${customerTransactions.reduce((s, t) => s + (['INVOICE', 'SALES_RECEIPT'].includes(t.type) ? t.total : 0), 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-800/70">Open Balance</span>
                                            <span className="font-bold text-blue-900">${totalOpenBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-800/70">Loyalty Status</span>
                                            <span className="font-bold text-blue-900">{customerTransactions.length > 5 ? 'VIP' : 'Standard'}</span>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}

                    {/* ── Notes ─────────────────────────────────────────────── */}
                    {activeTab === 'NOTES' && (
                        <div className="p-8">
                            <textarea
                                className="w-full border p-4 rounded-xl text-sm min-h-[100px] outline-none focus:ring-2 ring-blue-100 border-gray-200 transition-all"
                                placeholder="Add a new customer note..."
                                value={newNoteText}
                                onChange={e => setNewNoteText(e.target.value)}
                            />
                            <button
                                onClick={handleSaveNote}
                                disabled={savingNote || !newNoteText.trim()}
                                className="mt-3 bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {savingNote ? 'Saving…' : 'Save Note'}
                            </button>
                            <div className="space-y-4 mt-8">
                                {(customer.notes || []).length === 0 && (
                                    <p className="text-gray-400 italic text-sm text-center py-4">No notes yet.</p>
                                )}
                                {(customer.notes || []).map((n: any) => (
                                    <div key={n.id} className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl">
                                        <p className="text-sm text-gray-800 italic">"{n.text}"</p>
                                        <div className="mt-2 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                            <span>By {n.author}</span>
                                            <span>{n.date}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Small helper to render a label/value row
const Row: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div className="flex justify-between py-1 border-b border-gray-50">
        <span className="text-gray-400">{label}</span>
        <span className="font-semibold text-gray-800">{value || '—'}</span>
    </div>
);

export default CustomerDetailView;
