
import React, { useMemo, useState } from 'react';
import { Transaction, Account, ViewState, HomePagePreferences } from '../types';
import { ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Tooltip } from 'recharts';

type TimePeriod = '30d' | '7d' | '1y';

interface Props {
  transactions: Transaction[];
  accounts: Account[];
  onOpenWindow: (type: ViewState, title: string, params?: any) => void;
  prefs: HomePagePreferences;
}

const PERIOD_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: '7d', label: 'Last Week' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '1y', label: 'Last Year' },
];

const PERIOD_LABELS: Record<TimePeriod, string> = {
  '7d': '7d',
  '30d': '30d',
  '1y': '1y',
};

const HomePage: React.FC<Props> = ({ transactions, accounts, onOpenWindow, prefs }) => {
  const [period, setPeriod] = useState<TimePeriod>('30d');

  // 1. Data Calculations
  const now = new Date();
  const toLocalDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const periodStart = useMemo(() => {
    const d = new Date();
    if (period === '7d') d.setDate(d.getDate() - 7);
    else if (period === '30d') d.setDate(d.getDate() - 30);
    else d.setFullYear(d.getFullYear() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [period]);

  const dashboardStats = useMemo(() => {
    const isYearly = period === '1y';
    const buckets: { [key: string]: { date: string; income: number; expense: number; net: number } } = {};

    if (isYearly) {
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        buckets[key] = { date: key, income: 0, expense: 0, net: 0 };
      }
    } else {
      const days = period === '7d' ? 6 : 29;
      for (let i = days; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = toLocalDateStr(d);
        buckets[key] = { date: key, income: 0, expense: 0, net: 0 };
      }
    }

    let totalCashIn = 0;
    let totalCashOut = 0;

    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (txDate >= periodStart && txDate <= now) {
        const key = isYearly
          ? `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`
          : toLocalDateStr(txDate);
        if (buckets[key]) {
          if (['INVOICE', 'SALES_RECEIPT', 'PAYMENT', 'DEPOSIT'].includes(tx.type)) {
            buckets[key].income += tx.total;
            totalCashIn += tx.total;
          } else if (['BILL', 'CHECK', 'VENDOR_CREDIT', 'EXPENSE', 'CC_CHARGE'].includes(tx.type)) {
            buckets[key].expense += tx.total;
            totalCashOut += tx.total;
          }
          buckets[key].net = buckets[key].income - buckets[key].expense;
        }
      }
    });

    const chart = Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));

    return {
      cashIn: { total: totalCashIn, chart: chart.map(d => ({ date: d.date, value: d.income })) },
      cashOut: { total: totalCashOut, chart: chart.map(d => ({ date: d.date, value: d.expense })) },
      netChange: { total: totalCashIn - totalCashOut, chart: chart.map(d => ({ date: d.date, value: d.net })) },
      chart
    };
  }, [transactions, period, periodStart]);

  const totalIncome = useMemo(() => {
    return transactions
      .filter(tx => ['INVOICE', 'SALES_RECEIPT', 'PAYMENT', 'DEPOSIT'].includes(tx.type) && new Date(tx.date) >= periodStart)
      .reduce((s, tx) => s + tx.total, 0);
  }, [transactions, periodStart]);

  const totalExpenses = useMemo(() => {
    return transactions
      .filter(tx => ['BILL', 'CHECK', 'VENDOR_CREDIT', 'EXPENSE', 'CC_CHARGE'].includes(tx.type) && new Date(tx.date) >= periodStart)
      .reduce((s, tx) => s + tx.total, 0);
  }, [transactions, periodStart]);

  const overallHealthData = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (overallHealthData / totalIncome) * 100 : 0;

  const upcomingObligations = useMemo(() => {
    const unpaidBills = transactions
      .filter(tx => tx.type === 'BILL' && tx.status !== 'PAID')
      .map(tx => ({
        name: tx.refNo ? `Bill #${tx.refNo}` : 'Unnamed Bill',
        value: tx.total,
        id: tx.id
      }));

    const total = unpaidBills.reduce((s, b) => s + b.value, 0);
    return { list: unpaidBills.slice(0, 3), total, fullList: unpaidBills };
  }, [transactions]);

  const bankAccounts = useMemo(() => {
    return accounts
      .filter(a => a.type === 'Bank' || a.type === 'Credit Card')
      .sort((a, b) => (b.balance || 0) - (a.balance || 0));
  }, [accounts]);

  const overdueInvoices = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== 'INVOICE' || t.status === 'PAID') return false;
      if (t.status === 'OVERDUE') return true;

      const dueStr = t.dueDate;
      let dueDate: Date;

      if (dueStr) {
        dueDate = new Date(dueStr);
      } else {
        dueDate = new Date(t.date);
        if (isNaN(dueDate.getTime())) return false;
        dueDate.setDate(dueDate.getDate() + 30);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);

      return dueDate < today;
    });
  }, [transactions]);

  const overallHealthHardcoded = [
    { value: 40 }, { value: 42 }, { value: 45 }, { value: 48 }, { value: 47 }, { value: 50 },
    { value: 55 }, { value: 60 }, { value: 58 }, { value: 65 }, { value: 70 }, { value: 75 },
    { value: 72 }, { value: 80 }, { value: 85 }, { value: 82 }, { value: 90 }, { value: 95 },
    { value: 92 }, { value: 100 }, { value: 105 }, { value: 110 }, { value: 108 }, { value: 115 }
  ];

  const cashInHardcoded = [
    { value: 5 }, { value: 40 }, { value: 10 }, { value: 60 }, { value: 15 }, { value: 80 },
    { value: 20 }, { value: 50 }, { value: 10 }, { value: 70 }, { value: 30 }, { value: 90 },
    { value: 40 }, { value: 20 }, { value: 60 }, { value: 15 }, { value: 85 }, { value: 30 },
    { value: 95 }, { value: 45 }, { value: 15 }, { value: 80 }, { value: 20 }, { value: 100 }
  ];

  const cashOutHardcoded = [
    { value: 30 }, { value: 35 }, { value: 40 }, { value: 38 }, { value: 32 }, { value: 30 },
    { value: 45 }, { value: 50 }, { value: 48 }, { value: 42 }, { value: 40 }, { value: 55 },
    { value: 60 }, { value: 58 }, { value: 52 }, { value: 50 }, { value: 65 }, { value: 70 },
    { value: 68 }, { value: 62 }, { value: 60 }, { value: 75 }, { value: 80 }, { value: 78 }
  ];

  const netChangeHardcoded = [
    { value: 50 }, { value: 52 }, { value: 55 }, { value: 53 }, { value: 50 }, { value: 48 },
    { value: 45 }, { value: 47 }, { value: 50 }, { value: 55 }, { value: 60 }, { value: 65 },
    { value: 62 }, { value: 58 }, { value: 55 }, { value: 58 }, { value: 62 }, { value: 65 },
    { value: 68 }, { value: 70 }, { value: 65 }, { value: 60 }, { value: 55 }, { value: 50 }
  ];

  const Card = ({ title, children, className = "" }: { title: string, children: React.ReactNode, className?: string }) => (
    <div className={`bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 ${className}`}>
      <h3 className="text-gray-500 font-medium text-sm mb-4">{title}</h3>
      {children}
    </div>
  );

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const showStatsRow = prefs.showOverallHealth || prefs.showCashIn || prefs.showCashOut || prefs.showNetChange || prefs.showTotalIncome || prefs.showTotalExpenses || prefs.showProfitMargin;

  return (
    <div className="p-8 bg-[#f8fafc] h-full overflow-y-auto font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-800">Your business looks healthy overall!</h1>
            <p className="text-slate-500 mt-1">Real-time performance overview</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={`px-4 py-2 font-bold text-xs rounded-lg transition-all ${
                    period === opt.value
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:bg-white hover:text-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button className="px-4 py-2 bg-white text-slate-800 font-bold text-xs rounded-lg shadow-sm">Overview</button>
              <button onClick={() => onOpenWindow('INSIGHTS', 'Insights')} className="px-4 py-2 text-slate-500 font-bold text-xs rounded-lg hover:bg-white hover:text-slate-800 transition-all">Trends</button>
            </div>
          </div>
        </header>

        {showStatsRow && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {prefs.showOverallHealth && (
              <Card title="Overall Profit">
                <div className="flex flex-col">
                  <span className={`text-2xl font-bold ${overallHealthData < 0 ? 'text-rose-500' : 'text-slate-800'}`}>
                    ${overallHealthData.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Total Net Income</span>
                  <div className="h-12 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={overallHealthHardcoded}>
                        <defs>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={overallHealthData < 0 ? "#f43f5e" : "#3b82f6"} stopOpacity={0.1} />
                            <stop offset="95%" stopColor={overallHealthData < 0 ? "#f43f5e" : "#3b82f6"} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="natural" dataKey="value" stroke={overallHealthData < 0 ? "#f43f5e" : "#3b82f6"} fillOpacity={1} fill="url(#colorProfit)" strokeWidth={2} dot={false} isAnimationActive={true} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            )}

            {prefs.showNetChange && (
              <Card title={`Net Profit (${PERIOD_LABELS[period]})`}>
                <div className="flex flex-col">
                  <span className={`text-2xl font-bold ${dashboardStats.netChange.total < 0 ? 'text-rose-500' : 'text-slate-800'}`}>
                    ${dashboardStats.netChange.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">{PERIOD_OPTIONS.find(o => o.value === period)?.label} Net profit</span>
                  <div className="h-12 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={netChangeHardcoded}>
                        <Area type="basis" dataKey="value" stroke="#8b5cf6" fillOpacity={0.1} fill="#8b5cf6" strokeWidth={2} dot={false} isAnimationActive={true} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            )}

            {prefs.showTotalIncome && (
              <Card title="Total Income">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-emerald-600">${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Gross Receipts</span>
                  <div className="h-12 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashInHardcoded}>
                        <Area type="step" dataKey="value" stroke="#10b981" fillOpacity={0.1} fill="#10b981" strokeWidth={2} dot={false} isAnimationActive={true} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            )}

            {prefs.showTotalExpenses && (
              <Card title="Total Expenses">
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-rose-500">${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">All Outflows</span>
                  <div className="h-12 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashOutHardcoded}>
                        <Area type="monotone" dataKey="value" stroke="#f59e0b" fillOpacity={0.1} fill="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={true} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            )}

            {prefs.showCashIn && (
              <Card title={`Cash In (${PERIOD_LABELS[period]})`}>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-slate-800">${dashboardStats.cashIn.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span className="text-xs text-slate-400 mt-1">{PERIOD_OPTIONS.find(o => o.value === period)?.label}</span>
                  <div className="h-12 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashInHardcoded}>
                        <Area type="step" dataKey="value" stroke="#10b981" fillOpacity={0.1} fill="#10b981" strokeWidth={2} dot={false} isAnimationActive={true} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            )}

            {prefs.showCashOut && (
              <Card title={`Cash Out (${PERIOD_LABELS[period]})`}>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-slate-800">${dashboardStats.cashOut.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span className="text-xs text-slate-400 mt-1">{PERIOD_OPTIONS.find(o => o.value === period)?.label}</span>
                  <div className="h-12 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashOutHardcoded}>
                        <Area type="monotone" dataKey="value" stroke="#f59e0b" fillOpacity={0.1} fill="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={true} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Card>
            )}

            {prefs.showProfitMargin && (
              <Card title="Profit Margin">
                <div className="flex flex-col">
                  <span className={`text-2xl font-bold ${profitMargin < 0 ? 'text-rose-500' : 'text-blue-600'}`}>
                    {profitMargin.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Efficiency</span>
                  <div className="h-12 mt-4 flex items-end">
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${profitMargin < 0 ? 'bg-rose-500' : 'bg-blue-600'}`}
                        style={{ width: `${Math.min(100, Math.max(0, profitMargin))}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-6">
            {prefs.showCashAlerts && (
              <Card title="Cash Alerts">
                <div className="flex items-center gap-4 group cursor-pointer" onClick={() => onOpenWindow('INVOICE_CENTER', 'Invoice Center')}>
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-800">{overdueInvoices.length} Overdue</div>
                    <div className="text-xs text-slate-400">Action items required</div>
                  </div>
                </div>
              </Card>
            )}

            {prefs.showFlowOverview && (
              <Card title="Flow Overview">
                <div className="space-y-4">
                  {bankAccounts.slice(0, 4).map(acc => (
                    <div key={acc.id} className="flex justify-between items-center group cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-1 rounded-xl transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-700">{acc.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{acc.type}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-bold ${acc.balance < 0 ? 'text-rose-500' : 'text-slate-800'}`}>
                          ${(acc.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-emerald-500 font-bold">Active</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-6 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" onClick={() => onOpenWindow('CHART_OF_ACCOUNTS', 'Chart of Accounts')}>
                  View All Accounts
                </button>
              </Card>
            )}
          </div>

          {prefs.showUpcomingObligations && (
            <Card title="Upcoming Obligations" className="col-span-1 md:col-span-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                <div className="flex flex-col justify-center">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={upcomingObligations.fullList.length > 0 ? upcomingObligations.fullList : [{ name: 'None', value: 1 }]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {upcomingObligations.fullList.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                          {upcomingObligations.fullList.length === 0 && <Cell fill="#f1f5f9" />}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center mt-4">
                    <div className="text-2xl font-bold text-slate-800">${upcomingObligations.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <div className="text-xs text-slate-400">Total upcoming obligations</div>
                  </div>
                </div>

                <div className="flex flex-col justify-center space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Top Obligations</h4>
                    <div className="space-y-4">
                      {upcomingObligations.list.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-semibold text-slate-700">{item.name}</span>
                              <span className="font-bold text-slate-800">${item.value.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  backgroundColor: COLORS[idx % COLORS.length],
                                  width: `${Math.min(100, (item.value / (upcomingObligations.total || 1)) * 100)}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {upcomingObligations.list.length === 0 && <div className="text-slate-400 italic text-sm">No upcoming obligations</div>}
                    </div>
                  </div>
                  <button className="w-full py-3 bg-slate-900 text-white rounded-2xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200" onClick={() => onOpenWindow('BILL_TRACKER', 'Bill Tracker')}>
                    Manage Bills
                  </button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
