import React, { useState, useEffect } from 'react';
import { createReportSchedule, updateReportSchedule, deleteReportSchedule } from '../services/api';

interface ScheduleEntry {
    id?: string;
    name: string;
    cronExpression: string;
    recipientEmails: string;
    format: 'Excel' | 'PDF';
    isActive: boolean;
}

interface Props {
    reportType: string;
    params: any;
    existingSchedule?: any;
    onClose: () => void;
    onSaved: () => void;
}

const CRON_PRESETS = [
    { label: 'Daily at 8 AM', value: '0 8 * * *' },
    { label: 'Weekly – Monday 8 AM', value: '0 8 * * 1' },
    { label: 'Monthly – 1st at 8 AM', value: '0 8 1 * *' },
    { label: 'Custom', value: 'custom' },
];

const ScheduleReportDialog: React.FC<Props> = ({ reportType, params, existingSchedule, onClose, onSaved }) => {
    const [name, setName] = useState(existingSchedule?.name || `${reportType} Report`);
    const [preset, setPreset] = useState(existingSchedule?.cronExpression ? 'custom' : '0 8 * * 1');
    const [cronExpression, setCronExpression] = useState(existingSchedule?.cronExpression || '0 8 * * 1');
    const [emails, setEmails] = useState((existingSchedule?.recipientEmails || []).join(', '));
    const [format, setFormat] = useState<'Excel' | 'PDF'>(existingSchedule?.format || 'Excel');
    const [isActive, setIsActive] = useState(existingSchedule?.isActive !== false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handlePresetChange = (val: string) => {
        setPreset(val);
        if (val !== 'custom') setCronExpression(val);
    };

    const handleSave = async () => {
        if (!name.trim()) return setError('Name is required.');
        if (!cronExpression.trim()) return setError('Schedule frequency is required.');
        setSaving(true);
        setError('');
        try {
            const data = {
                name: name.trim(),
                reportType,
                params,
                cronExpression,
                recipientEmails: emails.split(',').map(e => e.trim()).filter(Boolean),
                format,
                isActive,
            };
            if (existingSchedule?.id) {
                await updateReportSchedule(existingSchedule.id, data);
            } else {
                await createReportSchedule(data);
            }
            onSaved();
            onClose();
        } catch (e: any) {
            setError(e.message || 'Failed to save schedule.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!existingSchedule?.id) return;
        if (!confirm('Delete this schedule?')) return;
        try {
            await deleteReportSchedule(existingSchedule.id);
            onSaved();
            onClose();
        } catch (e: any) {
            setError(e.message || 'Failed to delete schedule.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="font-bold text-lg text-[#003366]">Schedule Report</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Schedule Name</label>
                        <input className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                            value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Weekly P&L" />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Frequency</label>
                        <select className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                            value={preset} onChange={e => handlePresetChange(e.target.value)}>
                            {CRON_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                        {preset === 'custom' && (
                            <input className="w-full border rounded px-3 py-2 text-sm mt-2 focus:outline-none focus:border-orange-500 font-mono"
                                value={cronExpression} onChange={e => setCronExpression(e.target.value)}
                                placeholder="cron expression, e.g. 0 8 * * 1" />
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Format</label>
                        <div className="flex gap-4">
                            {(['Excel', 'PDF'] as const).map(f => (
                                <label key={f} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="radio" name="format" value={f} checked={format === f}
                                        onChange={() => setFormat(f)} />
                                    {f}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Email Recipients</label>
                        <input className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                            value={emails} onChange={e => setEmails(e.target.value)}
                            placeholder="email1@example.com, email2@example.com" />
                        <p className="text-xs text-gray-400 mt-1">Separate multiple emails with commas.</p>
                    </div>

                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                        Active
                    </label>
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <div className="flex justify-between pt-2">
                    {existingSchedule?.id && (
                        <button onClick={handleDelete} className="text-red-500 hover:text-red-700 text-sm font-semibold">
                            Delete Schedule
                        </button>
                    )}
                    <div className="flex gap-3 ml-auto">
                        <button onClick={onClose} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Cancel</button>
                        <button onClick={handleSave} disabled={saving}
                            className="px-4 py-2 bg-orange-500 text-white rounded text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
                            {saving ? 'Saving…' : 'Save Schedule'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleReportDialog;
