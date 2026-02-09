import React from 'react';

interface SparklineProps {
    data: number[];
    color: string;
}

const Sparkline: React.FC<SparklineProps> = ({ data, color }) => {
    const max = Math.max(...data, 1);
    const min = Math.min(...data);
    const range = max - min;
    const points = data.map((val, i) => ({
        x: (i / (data.length - 1)) * 100,
        y: 100 - ((val - min) / (range || 1)) * 100
    }));

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
        <div className="w-16 h-8 opacity-40">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <path
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
};

export default Sparkline;
