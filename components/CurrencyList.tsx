
import React, { useState } from 'react';
import { Currency, ExchangeRate } from '../types';

interface Props {
    currencies: Currency[];
    exchangeRates: ExchangeRate[];
    onUpdateRates: (rates: ExchangeRate[]) => void;
    onUpdateCurrencies?: (curr: Currency) => void;
    onClose: () => void;
}

const CurrencyList: React.FC<Props> = ({ currencies, exchangeRates, onUpdateRates, onUpdateCurrencies, onClose }) => {
    const [selectedCurrencyId, setSelectedCurrencyId] = useState<string | null>(null);
    const [editRate, setEditRate] = useState<string>('');
    const [showNewForm, setShowNewForm] = useState(false);
    const [newCurr, setNewCurr] = useState({ name: '', code: '', symbol: '', initialRate: '' });

    const selectedCurrency = currencies.find(c => c.id === selectedCurrencyId);
    const currentRate = exchangeRates.find(r => r.currencyId === selectedCurrencyId);

    const handleAddCurrency = () => {
        if (!newCurr.name || !newCurr.code || !onUpdateCurrencies) return;
        const newId = crypto.randomUUID();

        onUpdateCurrencies({
            id: newId,
            name: newCurr.name,
            code: newCurr.code,
            symbol: newCurr.symbol,
            isHome: false
        });

        const rate = parseFloat(newCurr.initialRate);
        if (!isNaN(rate)) {
            const updatedRates = [...exchangeRates];
            updatedRates.push({
                currencyId: newId,
                rate: rate,
                asOfDate: new Date().toISOString().split('T')[0]
            });
            onUpdateRates(updatedRates);
        }

        setNewCurr({ name: '', code: '', symbol: '', initialRate: '' });
        setShowNewForm(false);
    };

    const handleUpdateRate = () => {
        if (!selectedCurrencyId) return;
        const newRate = parseFloat(editRate);
        if (isNaN(newRate)) return;

        const updatedRates = exchangeRates.filter(r => r.currencyId !== selectedCurrencyId);
        updatedRates.push({
            currencyId: selectedCurrencyId,
            rate: newRate,
            asOfDate: new Date().toISOString().split('T')[0]
        });

        onUpdateRates(updatedRates);
        alert(`Exchange rate for ${selectedCurrency?.code} updated to ${newRate}`);
        setEditRate('');
    };

    return (
        <div className="bg-[#f0f0f0] h-full flex flex-col font-sans select-none relative">
            <div className="bg-[#003366] text-white p-2 flex justify-between items-center shadow-md">
                <h2 className="text-sm font-bold flex items-center gap-2">💱 Currency List & Exchange Rates</h2>
                <button onClick={onClose} className="hover:bg-red-600 px-2 rounded transition-colors font-bold">✕</button>
            </div>

            <div className="p-1 bg-white border-b border-gray-300 flex gap-2">
                <button
                    onClick={() => setShowNewForm(true)}
                    className="px-3 py-1 hover:bg-gray-100 text-[11px] font-bold border border-transparent hover:border-gray-300 rounded"
                >
                    New
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* List View */}
                <div className="flex-1 overflow-auto bg-white border-r">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-gray-100 border-b sticky top-0">
                            <tr>
                                <th className="p-2 border-r font-bold">Currency Name</th>
                                <th className="p-2 border-r font-bold">Code</th>
                                <th className="p-2 border-r font-bold">Symbol</th>
                                <th className="p-2 font-bold text-right">Rate (1 FX = X USD)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currencies.map(c => {
                                const rate = exchangeRates.find(r => r.currencyId === c.id);
                                return (
                                    <tr
                                        key={c.id}
                                        onClick={() => setSelectedCurrencyId(c.id)}
                                        className={`border-b cursor-pointer transition-colors ${selectedCurrencyId === c.id ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}
                                    >
                                        <td className="p-2 border-r">{c.name} {c.isHome && <span className="text-[9px] font-bold ml-2">(Home)</span>}</td>
                                        <td className="p-2 border-r font-mono">{c.code}</td>
                                        <td className="p-2 border-r text-center">{c.symbol}</td>
                                        <td className="p-2 text-right font-mono">{c.isHome ? '1.0000' : (rate?.rate.toFixed(4) || '---')}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Action Panel */}
                <div className="w-64 bg-gray-50 p-4 space-y-6">
                    <div className="bg-white p-4 border rounded shadow-sm">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Update Exchange Rate</h3>
                        {selectedCurrency && !selectedCurrency.isHome ? (
                            <div className="space-y-4">
                                <div className="text-sm font-bold text-blue-900">{selectedCurrency.code} - {selectedCurrency.name}</div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">New Rate</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            step="0.0001"
                                            placeholder={currentRate?.rate.toString() || '0.0000'}
                                            value={editRate}
                                            onChange={e => setEditRate(e.target.value)}
                                            className="border p-2 text-sm w-full font-mono outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                        <span className="text-xs font-bold font-mono">USD</span>
                                    </div>
                                </div>
                                <button
                                    onClick={handleUpdateRate}
                                    className="w-full bg-blue-600 text-white p-2 rounded text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-md"
                                >
                                    Download Latest Rate
                                </button>
                                <div className="text-[9px] text-gray-400 italic">As of: {currentRate?.asOfDate || 'Never'}</div>
                            </div>
                        ) : (
                            <div className="text-xs text-gray-500 italic py-8 text-center">Select a foreign currency to update its rate.</div>
                        )}
                    </div>


                </div>
            </div>
            {showNewForm && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[2001]">
                    <div className="bg-[#f0f0f0] border-4 border-[#003366] w-96 shadow-2xl">
                        <div className="bg-[#003366] p-2 flex justify-between items-center">
                            <h3 className="text-white font-bold text-xs uppercase tracking-widest text-[10px]">Add New Currency</h3>
                            <button onClick={() => setShowNewForm(false)} className="text-white hover:text-red-400 text-sm font-bold">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Currency Name</label>
                                <input
                                    autoFocus
                                    className="border border-gray-400 p-1.5 text-sm outline-none focus:border-blue-600 bg-white"
                                    placeholder="e.g. Euro"
                                    value={newCurr.name}
                                    onChange={e => setNewCurr({ ...newCurr, name: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">ISO Code</label>
                                <input
                                    className="border border-gray-400 p-1.5 text-sm outline-none focus:border-blue-600 bg-white font-mono"
                                    placeholder="EUR"
                                    maxLength={3}
                                    value={newCurr.code}
                                    onChange={e => setNewCurr({ ...newCurr, code: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Symbol</label>
                                <input
                                    className="border border-gray-400 p-1.5 text-sm outline-none focus:border-blue-600 bg-white"
                                    placeholder="€"
                                    value={newCurr.symbol}
                                    onChange={e => setNewCurr({ ...newCurr, symbol: e.target.value })}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-gray-500 uppercase">Initial Exchange Rate (1 FX = X USD)</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    className="border border-gray-400 p-1.5 text-sm outline-none focus:border-blue-600 bg-white font-mono"
                                    placeholder="1.0000"
                                    value={newCurr.initialRate}
                                    onChange={e => setNewCurr({ ...newCurr, initialRate: e.target.value })}
                                />
                            </div>
                            <div className="mt-8 flex justify-end gap-3 pt-4">
                                <button
                                    onClick={() => setShowNewForm(false)}
                                    className="px-6 py-1.5 border border-gray-400 text-xs font-bold hover:bg-gray-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddCurrency}
                                    className="px-8 py-1.5 bg-[#003366] text-white text-xs font-bold hover:bg-blue-900 transition-colors shadow-lg active:scale-95"
                                >
                                    Add Currency
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CurrencyList;
