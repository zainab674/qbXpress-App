
import React, { useState } from 'react';
import { Vendor, Transaction, Account } from '../../types';

interface VendorDetailViewProps {
    vendorId: string;
    vendors: Vendor[];
    transactions: Transaction[];
    accounts: Account[];
    onOpenTransaction?: (id: string, type: string) => void;
    onEditVendor?: (vendor: Vendor) => void;
    onMergeVendor?: (sourceId: string, targetId: string) => void;
    onClose?: () => void;
}

type Tab = 'TRANSACTIONS' | 'CREDITS' | 'NOTES' | 'DETAILS';

const VendorDetailView: React.FC<VendorDetailViewProps> = ({
    vendorId, vendors, transactions, accounts,
    onOpenTransaction, onEditVendor, onMergeVendor
}) => {
    const [activeTab, setActiveTab] = useState<Tab>('TRANSACTIONS');
    const [showMergeDialog, setShowMergeDialog] = useState(false);
    const [mergeTargetId, setMergeTargetId] = useState('');
    const [newNoteText, setNewNoteText] = useState('');
    const [localNotes, setLocalNotes] = useState<any[]>([]);
    const [savingNote, setSavingNote] = useState(false);

    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor) return <div className="p-8 text-gray-500">Vendor not found.</div>;

    const vendorTransactions = transactions
        .filter(t => t.entityId === vendorId || (t as any).vendorId === vendorId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const openBills = vendorTransactions.filter(t => t.type === 'BILL' && t.status === 'OPEN');
    const vendorCredits = vendorTransactions.filter(t => t.type === 'VENDOR_CREDIT');
    const totalOpenBalance = openBills.reduce((sum, t) => sum + t.total, 0);
    const notes = [...(vendor.notes || []), ...localNotes];

    const handleAddNote = async () => {
        if (!newNoteText.trim() || savingNote) return;
        const text = newNoteText.trim();
        const optimisticNote = { id: Date.now().toString(), text, date: new Date().toISOString(), author: 'Admin' };
        setLocalNotes(prev => [...prev, optimisticNote]);
        setNewNoteText('');
        setSavingNote(true);
        try {
            const { addVendorNote } = await import('../../services/api');
            await addVendorNote(vendorId, text, 'Admin');
        } catch {
            // optimistic note stays visible; will sync on next full refresh
        } finally {
            setSavingNote(false);
        }
    };

    const handleMerge = () => {
        if (!mergeTargetId) return;
        if (!window.confirm(`This will merge "${vendor.name}" INTO the selected vendor. All transactions will be reassigned and "${vendor.name}" will be deleted. This cannot be undone.\n\nContinue?`)) return;
        onMergeVendor?.(vendorId, mergeTargetId);
        setShowMergeDialog(false);
    };

    const tabs: { key: Tab; label: string }[] = [
        { key: 'TRANSACTIONS', label: 'Transactions' },
        { key: 'CREDITS', label: 'Credits' },
        { key: 'NOTES', label: `Notes${notes.length > 0 ? ` (${notes.length})` : ''}` },
        { key: 'DETAILS', label: 'Vendor Details' },
    ];

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-y-auto font-sans custom-scrollbar">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm sticky top-0 z-20">
                <div className="flex justify-between items-start">
                    <div className="flex gap-5 items-start">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl font-bold ${vendor.isActive === false ? 'bg-gray-400' : 'bg-blue-600'}`}>
                            {vendor.name.charAt(0)}
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold text-gray-900">{vendor.companyName || vendor.name}</h1>
                                {vendor.isActive === false && (
                                    <span className="px-2 py-0.5 text-xs font-bold bg-gray-100 text-gray-500 rounded-full uppercase">Inactive</span>
                                )}
                                {vendor.eligibleFor1099 && (
                                    <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 rounded-full">1099</span>
                                )}
                            </div>
                            <div className="flex gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                                <span>📧 {vendor.email || 'No email'}</span>
                                <span>📞 {vendor.phone || 'No phone'}</span>
                                <span>📍 {vendor.address || vendor.BillAddr?.Line1 || 'No address'}</span>
                                {vendor.vendorType && <span>🏷️ {vendor.vendorType}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Balance Owed</p>
                            <p className={`text-4xl font-black ${totalOpenBalance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                ${totalOpenBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {onEditVendor && (
                                <button
                                    onClick={() => onEditVendor(vendor)}
                                    className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    ✏️ Edit
                                </button>
                            )}
                            {onMergeVendor && (
                                <button
                                    onClick={() => setShowMergeDialog(true)}
                                    className="px-4 py-1.5 text-xs font-bold bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Merge Into...
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Merge Dialog */}
            {showMergeDialog && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 w-[95vw] h-[95vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Merge Vendor</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Select which vendor to merge <strong>{vendor.name}</strong> into. All transactions will move to the target vendor and <strong>{vendor.name}</strong> will be deleted.
                        </p>
                        <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Merge Into:</label>
                        <select
                            className="w-full border border-gray-200 rounded-lg p-2 text-sm mb-6 outline-none focus:border-blue-500"
                            value={mergeTargetId}
                            onChange={e => setMergeTargetId(e.target.value)}
                        >
                            <option value="">— Select Vendor —</option>
                            {vendors.filter(v => v.id !== vendorId).map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowMergeDialog(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">Cancel</button>
                            <button
                                onClick={handleMerge}
                                disabled={!mergeTargetId}
                                className="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Merge & Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-6 px-8 py-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Open Bills</p>
                    <p className="text-2xl font-bold text-gray-900">{openBills.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{vendorTransactions.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Total Balance</p>
                    <p className="text-2xl font-bold text-gray-900">${(vendor.balance || 0).toLocaleString()}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Last Activity</p>
                    <p className="text-2xl font-bold text-gray-900">{vendorTransactions[0]?.date || 'N/A'}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-8 pb-8 flex flex-col">
                <div className="flex gap-6 border-b border-gray-200 mb-6 bg-slate-50 sticky top-[120px] z-10 pt-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`pb-4 text-sm font-bold transition-colors relative ${activeTab === tab.key ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {tab.label}
                            {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full" />}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    {/* TRANSACTIONS TAB */}
                    {activeTab === 'TRANSACTIONS' && (
                        <div className="w-full">
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
                                    {vendorTransactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter ${tx.type === 'BILL' ? 'bg-orange-100 text-orange-700' : tx.type === 'PURCHASE_ORDER' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                                    {tx.type?.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{tx.date}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{tx.refNo}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                                                ${tx.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${tx.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
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
                                    {vendorTransactions.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">No transactions found for this vendor.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* CREDITS TAB */}
                    {activeTab === 'CREDITS' && (
                        <div className="w-full flex flex-col">
                            <div className="p-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Vendor Credits</h4>
                                <button
                                    onClick={() => onOpenTransaction?.('NEW_CREDIT', 'VENDOR_CREDIT')}
                                    className="bg-blue-600 text-white text-[10px] font-black px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors uppercase tracking-tighter shadow-sm active:scale-95"
                                >
                                    + New Credit
                                </button>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Date</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Number</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">Amount</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-center">Status</th>
                                        <th className="px-6 py-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {vendorCredits.map(tx => (
                                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 text-sm text-gray-600">{tx.date}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{tx.refNo}</td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                                                ${tx.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold ${tx.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => onOpenTransaction?.(tx.id, tx.type)}
                                                    className="opacity-0 group-hover:opacity-100 px-3 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-all underline decoration-double underline-offset-4"
                                                >
                                                    View Record
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {vendorCredits.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No credits found for this vendor.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* NOTES TAB */}
                    {activeTab === 'NOTES' && (
                        <div className="p-8">
                            <div className="mb-6 flex gap-3">
                                <textarea
                                    className="flex-1 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 resize-none"
                                    rows={3}
                                    placeholder="Add a note..."
                                    value={newNoteText}
                                    onChange={e => setNewNoteText(e.target.value)}
                                />
                                <button
                                    onClick={handleAddNote}
                                    disabled={!newNoteText.trim() || savingNote}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-40 self-end"
                                >
                                    {savingNote ? 'Saving...' : 'Add Note'}
                                </button>
                            </div>
                            {notes.length === 0 ? (
                                <p className="text-center text-gray-400 italic py-8">No notes yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {[...notes].reverse().map((note: any) => (
                                        <div key={note.id} className={`p-4 rounded-xl border ${note.isPinned ? 'border-yellow-200 bg-yellow-50' : 'border-gray-100 bg-slate-50'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-bold text-gray-500">{note.author || 'Admin'}</span>
                                                <span className="text-xs text-gray-400">{new Date(note.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* DETAILS TAB */}
                    {activeTab === 'DETAILS' && (
                        <div className="p-8 grid grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Contact Information</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-400">First Name</p>
                                            <p className="font-bold text-gray-900">{vendor.GivenName || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Last Name</p>
                                            <p className="font-bold text-gray-900">{vendor.FamilyName || '—'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-gray-400">Email Address</p>
                                            <p className="font-bold text-gray-900">{vendor.email || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Phone</p>
                                            <p className="font-bold text-gray-900">{vendor.phone || vendor.PrimaryPhone?.FreeFormNumber || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Website</p>
                                            <p className="font-bold text-gray-900">{vendor.WebAddr?.URI || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Vendor Type</p>
                                            <p className="font-bold text-gray-900">{vendor.vendorType || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Status</p>
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${vendor.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                {vendor.isActive !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Addresses</h4>
                                    <div className="grid grid-cols-2 gap-6 text-sm">
                                        <div>
                                            <p className="text-gray-400 mb-1">Billing Address</p>
                                            <div className="p-3 bg-slate-50 rounded-lg border border-gray-100 font-medium text-gray-700 whitespace-pre-wrap min-h-[80px]">
                                                {vendor.BillAddr?.Line1
                                                    ? `${vendor.BillAddr.Line1}${vendor.BillAddr.Line2 ? '\n' + vendor.BillAddr.Line2 : ''}\n${vendor.BillAddr.City}, ${vendor.BillAddr.CountrySubDivisionCode} ${vendor.BillAddr.PostalCode}`.trim()
                                                    : vendor.address || 'No billing address'}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 mb-1">Shipping Address</p>
                                            <div className="p-3 bg-slate-50 rounded-lg border border-gray-100 font-medium text-gray-700 whitespace-pre-wrap min-h-[80px]">
                                                {vendor.ShipAddr?.Line1
                                                    ? `${vendor.ShipAddr.Line1}\n${vendor.ShipAddr.City}, ${vendor.ShipAddr.CountrySubDivisionCode} ${vendor.ShipAddr.PostalCode}`
                                                    : 'Same as billing'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Financial Settings</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-gray-400">Payment Terms</p>
                                            <p className="font-bold text-gray-900">{vendor.TermsRef?.name || 'Due on Receipt'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Preferred Payment</p>
                                            <p className="font-bold text-gray-900">{vendor.PreferredPaymentMethodRef?.name || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Vendor ID / Account No.</p>
                                            <p className="font-bold text-gray-900">{vendor.vendorAccountNo || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Credit Limit</p>
                                            <p className="font-bold text-gray-900">
                                                {vendor.CreditLimit ? `$${vendor.CreditLimit.toLocaleString()}` : '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Tax ID</p>
                                            <p className="font-bold text-gray-900">{vendor.TaxIdentifier || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">1099 Eligible</p>
                                            <p className="font-bold text-gray-900">
                                                {vendor.eligibleFor1099 || vendor.Vendor1099
                                                    ? <span className="text-purple-700">Yes</span>
                                                    : 'No'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Opening Balance</p>
                                            <p className="font-bold text-gray-900">
                                                {vendor.openingBalance ? `$${vendor.openingBalance.toLocaleString()}` : '—'}
                                                {vendor.openingBalanceDate && <span className="text-gray-400 ml-1 text-xs">({vendor.openingBalanceDate})</span>}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400">Billing Rate</p>
                                            <p className="font-bold text-gray-900">
                                                {vendor.billingRate ? `$${vendor.billingRate}/hr` : '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Pre-fill Accounts */}
                                {vendor.preFillAccounts && vendor.preFillAccounts.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Pre-fill Accounts</h4>
                                        <div className="space-y-1">
                                            {vendor.preFillAccounts.map((accId: string, i: number) => {
                                                const acc = accounts.find(a => a.id === accId);
                                                return (
                                                    <div key={i} className="text-sm text-gray-700 p-2 bg-slate-50 rounded-lg border border-gray-100">
                                                        {acc?.name || accId}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VendorDetailView;
