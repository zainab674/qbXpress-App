import React from 'react';

interface Props {
    data: number[];
    color: string;
}

const Sparkline: React.FC<Props> = ({ data, color }) => {
    if (!data || data.length === 0) return null;

    const width = 100;
    const height = 30;
    const padding = 2;

    const max = Math.max(...data, 1);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
        const y = height - ((val - min) / range) * (height - padding * 2) - padding;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} className="overflow-visible">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
            <path
                d={`M ${padding},${height} ${points} L ${width - padding},${height} Z`}
                fill={color}
                fillOpacity="0.1"
            />
        </svg>
    );
};

export default Sparkline;
