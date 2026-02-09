import React from 'react';
import Sparkline from './Sparkline';

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
        <div
            onClick={onClick}
            className={`p-4 rounded-xl cursor-pointer transition-all duration-300 border-2 ${isActive
                    ? 'bg-white border-blue-600 shadow-lg scale-105 z-10'
                    : 'bg-slate-50 border-transparent hover:bg-slate-100 opacity-70 hover:opacity-100 hover:translate-x-1'
                }`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</span>
                <Sparkline data={data} color={color} />
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-slate-900">{value}</span>
                <span className="text-xs font-bold text-slate-400">({count})</span>
            </div>
        </div>
    );
};

export default SummaryCard;
