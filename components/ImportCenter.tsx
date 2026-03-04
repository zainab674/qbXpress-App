import React from 'react';
import { importCustomers, importVendors, importEmployees, importTransactions, importItems } from '../services/api';

interface ImportCardProps {
    title: string;
    description: string;
    icon: string;
    color: string;
    onImport: (file: File) => Promise<any>;
    refreshData?: () => Promise<void>;
}

const ImportCard: React.FC<ImportCardProps> = ({ title, description, icon, color, onImport, refreshData }) => {
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            await onImport(file);
            alert(`${title} imported successfully!`);
            if (refreshData) await refreshData();
        } catch (err: any) {
            alert(err.message || `Failed to import ${title.toLowerCase()}`);
        } finally {
            e.target.value = ''; // Reset input
        }
    };

    return (
        <label className="group relative bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col items-center text-center">
            <div className={`w-20 h-20 rounded-2xl ${color} flex items-center justify-center text-white text-3xl mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {icon}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed max-w-[200px]">
                {description}
            </p>
            <div className="mt-8 px-6 py-2.5 bg-slate-50 text-slate-600 text-sm font-bold rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
                Choose File
            </div>
            <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />

            {/* Subtle background decoration */}
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${color} opacity-[0.03] rounded-full blur-2xl group-hover:opacity-[0.08] transition-opacity`}></div>
        </label>
    );
};

interface Props {
    refreshData?: () => Promise<void>;
}

const ImportCenter: React.FC<Props> = ({ refreshData }) => {
    const importOptions = [
        {
            title: 'Import Customers',
            description: 'Bring your customer list from CSV or Excel files into qbXpress.',
            icon: '👥',
            color: 'bg-blue-600',
            onImport: importCustomers
        },
        {
            title: 'Import Vendors',
            description: 'Import your supplier and vendor contact information quickly.',
            icon: '🏪',
            color: 'bg-emerald-600',
            onImport: importVendors
        },
        {
            title: 'Import Employees',
            description: 'Upload your employee directory and payroll basic information.',
            icon: '👷',
            color: 'bg-teal-600',
            onImport: importEmployees
        },
        {
            title: 'Import Transactions',
            description: 'Import Invoices, Bills, POs, and SOs from a single multi-type file.',
            icon: '💰',
            color: 'bg-indigo-600',
            onImport: importTransactions
        },
        {
            title: 'Import Inventory',
            description: 'Bring your products and services list into qbXpress.',
            icon: '📦',
            color: 'bg-amber-600',
            onImport: importItems
        }
    ];

    return (
        <div className="h-full bg-[#f8fafc] overflow-y-auto p-12 font-sans">
            <div className="max-w-5xl mx-auto text-center mb-16">
                <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full uppercase tracking-wider mb-4">
                    Data Migration
                </span>
                <h1 className="text-4xl font-bold text-slate-900 mb-4">Import Your Data</h1>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                    Select a category below to upload your existing records. We support .csv, .xlsx, and .xls file formats.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                {importOptions.map((option, index) => (
                    <ImportCard
                        key={index}
                        {...option}
                        refreshData={refreshData}
                    />
                ))}
            </div>

            <div className="mt-16 max-w-3xl mx-auto bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex items-start gap-6">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h4 className="text-slate-800 font-bold mb-2">Before you import</h4>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        Make sure your files have a header row and follow the standard format.
                        Required fields usually include <strong>Name</strong> for Customers/Vendors and <strong>Full Name</strong> and <strong>SSN</strong> for Employees.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ImportCenter;
