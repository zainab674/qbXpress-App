import React from 'react';
import Sparkline from './Sparkline';

interface SummaryCardProps {
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    chartData: number[];
    isActive?: boolean;
    onClick?: () => void;
    color?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
    title,
    value,
    subtitle,
    icon,
    chartData,
    isActive,
    onClick,
    color = '#3b82f6'
}) => {
    return (
        <div
            onClick={onClick}
            className={`p-4 rounded-xl mb-3 cursor-pointer transition-all duration-200 border-2 ${isActive
                    ? 'bg-white border-blue-500 shadow-lg scale-[1.02]'
                    : 'bg-white border-transparent hover:border-gray-200 shadow-sm hover:shadow-md'
                }`}
        >
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        {icon}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
                </div>
            </div>

            <div className="flex items-end justify-between gap-4">
                <div>
                    <div className="text-xl font-bold text-gray-900">{value}</div>
                    <div className="text-xs text-gray-500">{subtitle}</div>
                </div>
                <div className="flex-1 max-w-[100px]">
                    <Sparkline data={chartData} color={color} />
                </div>
            </div>
        </div>
    );
};

export default SummaryCard;
