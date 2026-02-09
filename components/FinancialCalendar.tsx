
import React, { useState } from 'react';
import { Transaction } from '../types';

interface Props {
    transactions: Transaction[];
    companyName: string;
}

const FinancialCalendar: React.FC<Props> = ({ transactions, companyName }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const calendarDays = [];
    for (let i = 0; i < startDay; i++) {
        calendarDays.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
        calendarDays.push(i);
    }

    const getTransactionsForDay = (day: number) => {
        return transactions.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
        });
    };

    return (
        <div className="flex flex-col h-full bg-white select-none">
            <div className="p-4 bg-gray-100 border-b border-gray-300 flex justify-between items-center shadow-sm">
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-[#003366]">{monthNames[month]} {year}</h2>
                    <span className="text-xs text-gray-500 uppercase font-semibold">{companyName} - Financial Calendar</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="px-4 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-bold shadow-sm">Prev</button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-bold shadow-sm">Today</button>
                    <button onClick={nextMonth} className="px-4 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-bold shadow-sm">Next</button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-7 border-l border-t border-gray-200">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                    <div key={day} className="bg-gray-50 p-2 text-center text-xs font-bold text-gray-600 border-r border-b border-gray-200 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
                {calendarDays.map((day, idx) => (
                    <div key={idx} className={`min-h-[120px] p-2 border-r border-b border-gray-200 transition-colors ${day ? 'bg-white hover:bg-blue-50/30' : 'bg-gray-50'}`}>
                        {day && (
                            <>
                                <div className="text-right text-sm font-bold text-gray-500 mb-1">{day}</div>
                                <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                    {getTransactionsForDay(day).map(t => (
                                        <div key={t.id} className="text-[10px] p-1 rounded bg-blue-100 text-blue-900 border border-blue-200 truncate cursor-default shadow-sm" title={`${t.type}: $${t.total}`}>
                                            <span className="font-bold mr-1">{t.type}</span>
                                            ${t.total.toLocaleString()}
                                        </div>
                                    ))}
                                    {day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear() && (
                                        <div className="text-[9px] text-red-600 font-bold uppercase mt-1 italic">★ Today</div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FinancialCalendar;
