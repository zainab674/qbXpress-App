import React, { useState } from 'react';
import { Shortcut, ShortcutGroup } from '../types';

interface ShortcutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (shortcut: Shortcut, newGroupName?: string) => void;
    initialData?: Shortcut;
    existingGroups: ShortcutGroup[];
}

const ShortcutModal: React.FC<ShortcutModalProps> = ({ isOpen, onClose, onSave, initialData, existingGroups }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [url, setUrl] = useState(initialData?.url || '');
    const [groupId, setGroupId] = useState(initialData?.groupId || '');
    const [newGroupName, setNewGroupName] = useState('');
    const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!name || !url) {
            alert('Please fill in both Name and URL');
            return;
        }

        if (isCreatingNewGroup && !newGroupName) {
            alert('Please enter a name for the new group');
            return;
        }

        let formattedUrl = url;
        // Only force https if it looks like a domain (contains a dot) and doesn't already have a protocol
        if (url.includes('.') && !/^https?:\/\//i.test(url)) {
            formattedUrl = 'https://' + url;
        }

        onSave({
            id: initialData?.id || crypto.randomUUID(),
            name,
            url: formattedUrl,
            groupId: isCreatingNewGroup ? undefined : (groupId || undefined),
        }, isCreatingNewGroup ? newGroupName : undefined);

        // Reset state
        setName('');
        setUrl('');
        setGroupId('');
        setNewGroupName('');
        setIsCreatingNewGroup(false);
        onClose();
    };

    return (
        <div className="h-full w-full bg-[#1e1e1e] flex flex-col font-sans overflow-hidden">
            <div className="flex-1 flex flex-col text-white overflow-hidden shadow-2xl border border-gray-700 animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-5 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Add shortcut</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. WhatsApp"
                            className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-600"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">URL</label>
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="e.g. web.whatsapp.com"
                            className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-600"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-gray-400">Group (Optional)</label>
                            <button
                                onClick={() => setIsCreatingNewGroup(!isCreatingNewGroup)}
                                className="text-[11px] text-blue-400 hover:underline"
                            >
                                {isCreatingNewGroup ? 'Select existing' : 'Create new group'}
                            </button>
                        </div>

                        {isCreatingNewGroup ? (
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                placeholder="Enter new group name (e.g. Finances)"
                                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-600"
                            />
                        ) : (
                            <select
                                value={groupId}
                                onChange={(e) => setGroupId(e.target.value)}
                                className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                            >
                                <option value="">No Group</option>
                                {existingGroups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-[#1a1a1a] flex justify-end gap-3 border-t border-gray-800">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-full text-sm font-medium text-blue-400 hover:bg-blue-400/10 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-8 py-2 rounded-full text-sm font-medium bg-[#0052cc] hover:bg-[#0065ff] text-white transition-all shadow-lg active:scale-95"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShortcutModal;
