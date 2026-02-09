
import React from 'react';

const BankingView: React.FC = () => {
  return (
    <div className="p-6 h-full bg-white flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center space-x-2 text-gray-700">
          <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>
          <span>Check Register: First Financial Checking</span>
        </h2>
        <div className="flex space-x-2">
          <button className="bg-blue-600 text-white px-4 py-1 rounded text-sm font-bold shadow-sm">Write Checks</button>
          <button className="bg-green-600 text-white px-4 py-1 rounded text-sm font-bold shadow-sm">Make Deposits</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-gray-400">
        <table className="w-full text-[13px] border-collapse">
          <thead className="sticky top-0 bg-[#e8e8e8] border-b-2 border-gray-500 shadow-sm">
            <tr>
              <th className="px-2 py-2 border-r border-gray-400 text-left w-24">Date</th>
              <th className="px-2 py-2 border-r border-gray-400 text-left w-20">Number</th>
              <th className="px-2 py-2 border-r border-gray-400 text-left">Payee / Account</th>
              <th className="px-2 py-2 border-r border-gray-400 text-right w-32">Payment</th>
              <th className="px-2 py-2 border-r border-gray-400 text-center w-8">C</th>
              <th className="px-2 py-2 border-r border-gray-400 text-right w-32">Deposit</th>
              <th className="px-2 py-2 text-right w-40">Balance</th>
            </tr>
          </thead>
          <tbody>
            {[
              { date: '03/01/2017', num: 'DEP', payee: 'Initial Balance', account: 'Equity', payment: 0, deposit: 42000, balance: 42000 },
              { date: '03/05/2017', num: '1001', payee: 'OnTheSly', account: 'Janitorial Expense', payment: 250, deposit: 0, balance: 41750 },
              { date: '03/10/2017', num: 'DEP', payee: 'EnergeticEvents001', account: 'Sales Revenue', payment: 0, deposit: 4500, balance: 46250 },
            ].map((row, i) => (
              <React.Fragment key={i}>
                <tr className={`${i % 2 === 0 ? 'bg-white' : 'bg-[#f9f9f9]'} border-b border-gray-200`}>
                  <td className="px-2 py-1 border-r border-gray-300 font-bold">{row.date}</td>
                  <td className="px-2 py-1 border-r border-gray-300">{row.num}</td>
                  <td className="px-2 py-1 border-r border-gray-300 font-bold">{row.payee}</td>
                  <td className="px-2 py-1 border-r border-gray-300 text-right text-red-600">{row.payment > 0 ? row.payment.toFixed(2) : ''}</td>
                  <td className="px-2 py-1 border-r border-gray-300 text-center">✓</td>
                  <td className="px-2 py-1 border-r border-gray-300 text-right text-green-700">{row.deposit > 0 ? row.deposit.toFixed(2) : ''}</td>
                  <td className="px-2 py-1 text-right font-bold">{row.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr className={`${i % 2 === 0 ? 'bg-white' : 'bg-[#f9f9f9]'} border-b border-gray-300`}>
                  <td className="px-2 py-1 border-r border-gray-300"></td>
                  <td className="px-2 py-1 border-r border-gray-300"></td>
                  <td className="px-2 py-1 border-r border-gray-300 italic text-gray-500">{row.account}</td>
                  <td className="px-2 py-1 border-r border-gray-300"></td>
                  <td className="px-2 py-1 border-r border-gray-300"></td>
                  <td className="px-2 py-1 border-r border-gray-300"></td>
                  <td className="px-2 py-1"></td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 text-xs italic text-gray-600">
        Tip: Enter a transaction and press 'Record' to save it to your register.
      </div>
    </div>
  );
};

export default BankingView;
