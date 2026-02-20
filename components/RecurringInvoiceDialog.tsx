import React, { useState } from 'react';
import { Customer, RecurringTemplate, Transaction } from '../types';

interface Props {
    entities: { id: string; name: string }[];
    entityType: 'Customer' | 'Vendor';
    initialTemplate?: RecurringTemplate;
    baseTransaction: Transaction;
    onSave: (template: RecurringTemplate) => void;
    onClose: () => void;
}

const RecurringInvoiceDialog: React.FC<Props> = ({ entities, entityType, initialTemplate, baseTransaction, onSave, onClose }) => {
    const [templateName, setTemplateName] = useState(initialTemplate?.templateName || '');
    const [type, setType] = useState<'Scheduled' | 'Reminder' | 'Unscheduled'>(initialTemplate?.type || 'Scheduled');
    const [createDaysInAdvance, setCreateDaysInAdvance] = useState(initialTemplate?.createDaysInAdvance || 0);
    const [selectedEntityId, setSelectedEntityId] = useState(initialTemplate?.entityId || baseTransaction.entityId || '');
    const [autoSendEmail, setAutoSendEmail] = useState(initialTemplate?.autoSendEmail || false);
    const [includeUnbilledCharges, setIncludeUnbilledCharges] = useState(initialTemplate?.includeUnbilledCharges || false);
    const [markAsPrintLater, setMarkAsPrintLater] = useState(initialTemplate?.markAsPrintLater || false);
    const [interval, setInterval] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>(initialTemplate?.interval || 'Monthly');
    const [every, setEvery] = useState(initialTemplate?.every || 1);
    const [repeatsOn, setRepeatsOn] = useState<number | string>(initialTemplate?.repeatsOn || 1);
    const [startDate, setStartDate] = useState(initialTemplate?.startDate || new Date().toISOString().split('T')[0]);
    const [endType, setEndType] = useState<'Never' | 'After' | 'OnDate'>(initialTemplate?.endType || 'Never');
    const [endAfterOccurrences, setEndAfterOccurrences] = useState(initialTemplate?.endAfterOccurrences || 1);
    const [endDate, setEndDate] = useState(initialTemplate?.endDate || '');

    const handleSave = () => {
        if (!templateName) {
            alert('Please enter a template name.');
            return;
        }
        if (!selectedEntityId) {
            alert(`Please select a ${entityType.toLowerCase()}.`);
            return;
        }

        const template: RecurringTemplate = {
            id: initialTemplate?.id || crypto.randomUUID(),
            templateName,
            type,
            entityId: selectedEntityId,
            createDaysInAdvance,
            autoSendEmail,
            includeUnbilledCharges,
            markAsPrintLater,
            interval,
            every,
            repeatsOn,
            startDate,
            endType,
            endAfterOccurrences: endType === 'After' ? endAfterOccurrences : undefined,
            endDate: endType === 'OnDate' ? endDate : undefined,
            transactionData: {
                ...baseTransaction,
                entityId: selectedEntityId,
                id: undefined, // Clear ID so it's fresh when generated
            },
        };

        onSave(template);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4">
            <div className="bg-white border-4 border-[#003366] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="bg-[#003366] p-2 flex justify-between items-center text-white">
                    <h3 className="font-bold uppercase tracking-widest text-xs">Memorize Transaction</h3>
                    <button onClick={onClose} className="hover:text-red-400">✕</button>
                </div>

                <div className="p-4 overflow-y-auto space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Template Name</label>
                            <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                                value={templateName}
                                onChange={e => setTemplateName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Type</label>
                            <select
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 bg-white"
                                value={type}
                                onChange={e => setType(e.target.value as any)}
                            >
                                <option value="Scheduled">Scheduled</option>
                                <option value="Reminder">Reminder</option>
                                <option value="Unscheduled">Unscheduled</option>
                            </select>
                        </div>
                    </div>

                    {/* Customer and Advance Data */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">{entityType}</label>
                            <select
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500 bg-white"
                                value={selectedEntityId}
                                onChange={e => setSelectedEntityId(e.target.value)}
                            >
                                <option value="">Select {entityType}</option>
                                {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Create number of days in advance</label>
                            <input
                                type="number"
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                                value={createDaysInAdvance}
                                onChange={e => setCreateDaysInAdvance(parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>

                    {/* Template Options */}
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Template Options</label>
                        <div className="flex gap-6 text-[11px]">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={autoSendEmail} onChange={e => setAutoSendEmail(e.target.checked)} />
                                Automatically send emails
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={includeUnbilledCharges} onChange={e => setIncludeUnbilledCharges(e.target.checked)} />
                                Include unbilled charges
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={markAsPrintLater} onChange={e => setMarkAsPrintLater(e.target.checked)} />
                                Mark as print later
                            </label>
                        </div>
                    </div>

                    {/* Recurrence Schedule */}
                    <div className="border-t pt-4">
                        <h4 className="text-[10px] font-bold text-[#003366] mb-3 border-b-2 border-blue-100 pb-1">RECURRENCE SCHEDULE</h4>

                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Interval</label>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span>Repeats every</span>
                                        <input
                                            type="number"
                                            className="w-12 border border-gray-300 rounded px-1 py-0.5"
                                            value={every}
                                            onChange={e => setEvery(parseInt(e.target.value) || 1)}
                                        />
                                        <select
                                            className="border border-gray-300 rounded px-1 py-0.5 bg-white"
                                            value={interval}
                                            onChange={e => setInterval(e.target.value as any)}
                                        >
                                            <option value="Daily">Days</option>
                                            <option value="Weekly">Weeks</option>
                                            <option value="Monthly">Months</option>
                                            <option value="Yearly">Years</option>
                                        </select>
                                    </div>
                                    <div className="text-[10px] text-gray-500 italic mt-1">
                                        Repeats on {repeatsOn === 'day' ? 'the same day' : interval === 'Monthly' ? `${repeatsOn} day` : 'selected day'} of every {every} {interval.toLowerCase()}.
                                    </div>
                                </div>

                                {interval === 'Monthly' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">On</label>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span>Day</span>
                                            <input
                                                type="number"
                                                min="1" max="31"
                                                className="w-12 border border-gray-300 rounded px-1 py-0.5"
                                                value={typeof repeatsOn === 'number' ? repeatsOn : 1}
                                                onChange={e => setRepeatsOn(parseInt(e.target.value) || 1)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 border-l pl-8">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Start Date</label>
                                    <input
                                        type="date"
                                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                    />
                                    <div className="text-[9px] text-blue-700 font-bold mt-1">
                                        {new Date(startDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">End</label>
                                    <div className="space-y-2 text-xs">
                                        <label className="flex items-center gap-2">
                                            <input type="radio" name="endType" checked={endType === 'Never'} onChange={() => setEndType('Never')} />
                                            Never
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input type="radio" name="endType" checked={endType === 'After'} onChange={() => setEndType('After')} />
                                            After
                                            <input
                                                type="number"
                                                className="w-12 border border-gray-300 rounded px-1 py-0.5 mx-1"
                                                value={endAfterOccurrences}
                                                onChange={e => setEndAfterOccurrences(parseInt(e.target.value) || 1)}
                                                disabled={endType !== 'After'}
                                            />
                                            occurrences
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input type="radio" name="endType" checked={endType === 'OnDate'} onChange={() => setEndType('OnDate')} />
                                            On
                                            <input
                                                type="date"
                                                className="flex-1 border border-gray-300 rounded px-1 py-0.5 mx-1"
                                                value={endDate}
                                                onChange={e => setEndDate(e.target.value)}
                                                disabled={endType !== 'OnDate'}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t p-4 flex justify-end gap-3 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-400 text-xs font-bold rounded hover:bg-gray-100 transition-colors shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-8 py-2 bg-[#0077c5] text-white text-xs font-bold rounded hover:bg-[#005fa0] transition-colors shadow-md active:translate-y-px"
                    >
                        Save Template
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecurringInvoiceDialog;
