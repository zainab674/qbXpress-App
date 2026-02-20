
import React from 'react';

interface SummaryCardProps {
    title: string;
    value: string;
    count: number;
    data: number[];
    color: string;
    isActive: boolean;
    onClick: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, count, data, color, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`w-full p-4 rounded-3xl transition-all duration-500 text-left border-2 group
                ${isActive
                    ? 'bg-white border-blue-600 shadow-2xl shadow-blue-100 scale-[1.02]'
                    : 'bg-slate-50 border-transparent hover:border-slate-200 hover:bg-white hover:shadow-xl'}`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 transition-colors
                        ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                        {title}
                    </p>
                    <h3 className={`text-2xl font-black italic tracking-tighter transition-colors
                        ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>
                        {value}
                    </h3>
                </div>
                <div className={`px-2 py-1 rounded-full text-[10px] font-black transition-all
                    ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {count}
                </div>
            </div>

            <div className="flex items-end gap-1 h-8">
                {data.map((v, i) => (
                    <div
                        key={i}
                        className="flex-1 rounded-sm transition-all duration-700 delay-[i*50ms]"
                        style={{
                            height: `${(v / Math.max(...data)) * 100}%`,
                            backgroundColor: isActive ? color : '#cbd5e1',
                            opacity: isActive ? 1 : 0.5 + (i / data.length) * 0.5
                        }}
                    />
                ))}
            </div>
        </button>
    );
};

export default SummaryCard;
