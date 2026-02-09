
import React from 'react';

interface CompanyFileProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (id: string, name: string) => void;
    mode: 'OPEN' | 'PREVIOUS';
    companies: any[];
}

const CompanyFileDialog: React.FC<CompanyFileProps> = ({ isOpen, onClose, onSelect, mode, companies }) => {
    if (!isOpen) return null;

    return (
        <div className="h-full w-full bg-[#f0f0f0] flex flex-col font-sans overflow-hidden">
            <div className="flex-1 flex flex-col bg-white overflow-hidden shadow-2xl border border-gray-400">
                <div className="bg-[#003366] text-white px-2 py-1 flex justify-between items-center text-sm font-bold">
                    <span>{mode === 'OPEN' ? 'Open Company' : 'Open Previous Company'}</span>
                    <button onClick={onClose} className="hover:bg-red-600 px-1">✕</button>
                </div>

                <div className="p-4 space-y-4 text-[12px]">
                    <p className="font-bold">Select a company file to open:</p>

                    <div className="border border-gray-400 bg-white h-48 overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 border-b sticky top-0">
                                <tr>
                                    <th className="px-2 py-1 border-r">Company Name</th>
                                    <th className="px-2 py-1 border-r">Industry</th>
                                    <th className="px-2 py-1">Last Update</th>
                                </tr>
                            </thead>
                            <tbody>
                                {companies.map((company, i) => (
                                    <tr
                                        key={i}
                                        className="hover:bg-blue-100 cursor-pointer"
                                        onClick={() => onSelect(company._id, company.name)}
                                    >
                                        <td className="px-2 py-1 border-r">{company.name}</td>
                                        <td className="px-2 py-1 border-r">{company.industry}</td>
                                        <td className="px-2 py-1">{new Date(company.updatedAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                                {companies.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-2 py-8 text-center text-gray-400 italic">No companies found. Use 'New Company' to create one.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>


                </div>
            </div>
        </div>
    );
};

export default CompanyFileDialog;
