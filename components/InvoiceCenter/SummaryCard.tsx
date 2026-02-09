import React from 'react';
import Sparkline from './Sparkline';

interface Props {
    title: string;
    value: string | number;
    subtitle: string;
    icon: React.ReactNode;
    chartData: number[];
    color: string;
    isActive?: boolean;
    onClick?: () => void;
}

const SummaryCard: React.FC<Props> = ({
    title,
    value,
    subtitle,
    icon,
    chartData,
    color,
    isActive,
    onClick
}) => {
    return (
        <div
            onClick={onClick}
            className={`p-5 rounded-2xl mb-4 cursor-pointer transition-all duration-300 border-2 ${isActive
                    ? 'bg-white border-blue-500 shadow-xl scale-[1.02]'
                    : 'bg-white border-transparent hover:border-gray-200 shadow-sm hover:shadow-lg'
                }`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-slate-50 text-blue-600 shadow-inner`}>
                        {icon}
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
                </div>
            </div>
            <div className="flex items-end justify-between gap-4">
                <div>
                    <div className="text-2xl font-black text-slate-900 tracking-tighter leading-none mb-1">{value}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</div>
                </div>
                <div className="flex-1 max-w-[120px] pb-1">
                    <Sparkline data={chartData} color={color} />
                </div>
            </div>
        </div>
    );
};

export default SummaryCard;
