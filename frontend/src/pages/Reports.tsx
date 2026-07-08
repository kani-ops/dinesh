import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { 
  FileSpreadsheet, Printer, TrendingUp, 
  DollarSign, Clock, AlertCircle, BarChart2
} from 'lucide-react';

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'fees'>('attendance');
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [feeData, setFeeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      if (activeTab === 'attendance') {
        const data = await api.getAttendanceReport();
        setAttendanceData(data);
      } else {
        const data = await api.getFeeReport();
        setFeeData(data);
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab]);

  // CSV Export helper
  const exportToCSV = (data: any[], headers: string[], keys: string[], filename: string) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        keys.map(key => {
          let val = row[key];
          if (val === null || val === undefined) return '""';
          // Clean strings for commas/quotes
          let str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Tab selectors and action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 no-print">
        {/* Tabs */}
        <div className="flex bg-slate-950 p-1 border border-slate-850 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-primary text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ATTENDANCE REPORTS
          </button>
          <button
            onClick={() => setActiveTab('fees')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'fees'
                ? 'bg-primary text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            FEE REPORTS
          </button>
        </div>

        {/* Global Print button */}
        {!loading && !error && (
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 w-full sm:w-auto border border-slate-800 bg-slate-950 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs hover:text-slate-100 hover:bg-slate-850 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>PRINT / SAVE AS PDF</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px] no-print">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl no-print">
          {error}
        </div>
      ) : activeTab === 'attendance' && attendanceData ? (
        
        /* ATTENDANCE REPORTS VIEW */
        <div className="space-y-8 print-container">
          
          {/* Section 1: Member Attendance Ratio */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-850 pb-4 no-print">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-accent" />
                  <span>Member Attendance Logs</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Summary of attendance ratio per registered member</p>
              </div>
              <button
                onClick={() => exportToCSV(
                  attendanceData.membersPercentage, 
                  ['Member ID', 'Name', 'Phone', 'Status', 'Present Days', 'Absent Days', 'Total Days', 'Attendance %'],
                  ['member_id', 'name', 'phone', 'status', 'present_days', 'absent_days', 'total_days', 'attendance_percentage'],
                  'member-attendance-ratio'
                )}
                className="flex items-center gap-1.5 text-xs text-accent hover:underline font-bold"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export CSV/Excel</span>
              </button>
            </div>
            
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-bold uppercase">
                    <th className="py-3 px-4">Member ID</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Status</th>
                    <th className="py-3 px-4 text-center">Present</th>
                    <th className="py-3 px-4 text-center">Absent</th>
                    <th className="py-3 px-4 text-center">Total Classes</th>
                    <th className="py-3 px-4 text-right">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {attendanceData.membersPercentage.map((m: any) => (
                    <tr key={m.member_id} className="hover:bg-slate-950/20">
                      <td className="py-3 px-4 font-semibold text-slate-400">{m.member_id}</td>
                      <td className="py-3 px-4 font-bold text-slate-200">{m.name}</td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span className={`px-2 py-0.5 border text-[9px] font-bold rounded-full uppercase ${
                          m.status === 'Active' 
                            ? 'bg-accent/5 text-accent border-accent/15' 
                            : m.status === 'Expired' 
                              ? 'bg-red-500/5 text-red-400 border-red-500/15'
                              : 'bg-slate-850 text-slate-500 border-slate-800'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-accent font-semibold">{m.present_days}</td>
                      <td className="py-3 px-4 text-center text-orange-400 font-semibold">{m.absent_days}</td>
                      <td className="py-3 px-4 text-center">{m.total_days}</td>
                      <td className={`py-3 px-4 text-right font-black ${
                        m.attendance_percentage >= 75 ? 'text-accent' : 'text-orange-400'
                      }`}>{m.attendance_percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Section 2: Most Regular Members */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3 no-print">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-250 flex items-center gap-1.5">
                  <TrendingUp className="h-4.5 w-4.5 text-accent" />
                  <span>Most Regular Members</span>
                </h3>
                <button
                  onClick={() => exportToCSV(
                    attendanceData.regularMembers,
                    ['Member ID', 'Name', 'Attendance %'],
                    ['member_id', 'name', 'attendance_percentage'],
                    'most-regular-members'
                  )}
                  className="text-[10px] text-accent hover:underline font-bold flex items-center gap-1"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-950/30 text-slate-400 font-bold uppercase">
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Member ID</th>
                      <th className="py-2.5 px-3 text-right">Attendance Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-350">
                    {attendanceData.regularMembers.map((m: any) => (
                      <tr key={m.member_id} className="hover:bg-slate-950/10">
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{m.name}</td>
                        <td className="py-2.5 px-3 text-slate-400">{m.member_id}</td>
                        <td className="py-2.5 px-3 text-right text-accent font-bold">{m.attendance_percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Least Active Members */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3 no-print">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-250 flex items-center gap-1.5">
                  <AlertCircle className="h-4.5 w-4.5 text-orange-400" />
                  <span>Least Active Members</span>
                </h3>
                <button
                  onClick={() => exportToCSV(
                    attendanceData.leastActiveMembers,
                    ['Member ID', 'Name', 'Attendance %'],
                    ['member_id', 'name', 'attendance_percentage'],
                    'least-active-members'
                  )}
                  className="text-[10px] text-accent hover:underline font-bold flex items-center gap-1"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-950/30 text-slate-400 font-bold uppercase">
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Member ID</th>
                      <th className="py-2.5 px-3 text-right">Attendance Ratio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-350">
                    {attendanceData.leastActiveMembers.map((m: any) => (
                      <tr key={m.member_id} className="hover:bg-slate-950/10">
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{m.name}</td>
                        <td className="py-2.5 px-3 text-slate-400">{m.member_id}</td>
                        <td className="py-2.5 px-3 text-right text-orange-450 font-bold">{m.attendance_percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'fees' && feeData ? (
        
        /* FEE REPORTS VIEW */
        <div className="space-y-8 print-container">
          
          {/* Section 1: Collected This Month */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-accent" />
                  <span>Fee Collection Summary</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total revenue collected this month: <span className="text-accent font-bold">${feeData.collected.total.toFixed(2)}</span>
                </p>
              </div>
              <button
                onClick={() => exportToCSV(
                  feeData.collected.payments, 
                  ['Payment Date', 'Member ID', 'Name', 'Phone', 'Amount', 'Membership Type', 'Duration Start', 'Duration Expiry'],
                  ['payment_date', 'member_id', 'member_name', 'phone', 'amount', 'membership_type', 'membership_start', 'membership_expiry'],
                  'fees-collected-this-month'
                )}
                className="flex items-center gap-1.5 text-xs text-accent hover:underline font-bold no-print"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export CSV/Excel</span>
              </button>
            </div>
            
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-bold uppercase">
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4">Member ID</th>
                    <th className="py-3 px-4">Member Name</th>
                    <th className="py-3 px-4">Package</th>
                    <th className="py-3 px-4">Valid Period</th>
                    <th className="py-3 px-4 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {feeData.collected.payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-950/20">
                      <td className="py-3 px-4 font-semibold text-slate-400">{p.payment_date.split('T')[0]}</td>
                      <td className="py-3 px-4">{p.member_id}</td>
                      <td className="py-3 px-4 font-bold text-slate-200">{p.member_name}</td>
                      <td className="py-3 px-4">{p.membership_type}</td>
                      <td className="py-3 px-4 text-slate-450 text-[10px] font-medium">
                        {p.membership_start.split('T')[0]} to {p.membership_expiry.split('T')[0]}
                      </td>
                      <td className="py-3 px-4 text-right text-accent font-black">${parseFloat(p.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                  {feeData.collected.payments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">No payment entries found for this month.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Section 2: Expired memberships */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3 no-print">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-250 flex items-center gap-1.5">
                  <AlertCircle className="h-4.5 w-4.5 text-red-400" />
                  <span>Expired Memberships</span>
                </h3>
                <button
                  onClick={() => exportToCSV(
                    feeData.expiredMemberships,
                    ['Member ID', 'Name', 'Phone', 'Expiry Date'],
                    ['member_id', 'name', 'phone', 'membership_expiry'],
                    'expired-memberships'
                  )}
                  className="text-[10px] text-accent hover:underline font-bold flex items-center gap-1"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-950/30 text-slate-400 font-bold uppercase">
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Member ID</th>
                      <th className="py-2.5 px-3 text-right">Expired Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-350">
                    {feeData.expiredMemberships.map((m: any) => (
                      <tr key={m.member_id} className="hover:bg-slate-950/10">
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{m.name}</td>
                        <td className="py-2.5 px-3 text-slate-400">{m.member_id}</td>
                        <td className="py-2.5 px-3 text-right text-red-400 font-bold">{m.membership_expiry.split('T')[0]}</td>
                      </tr>
                    ))}
                    {feeData.expiredMemberships.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-slate-500">No expired memberships!</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Upcoming Renewals */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-850 pb-3 no-print">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-250 flex items-center gap-1.5">
                  <Clock className="h-4.5 w-4.5 text-yellow-450" />
                  <span>Upcoming Renewals (30 Days)</span>
                </h3>
                <button
                  onClick={() => exportToCSV(
                    feeData.upcomingRenewals,
                    ['Member ID', 'Name', 'Phone', 'Package', 'Expiry Date'],
                    ['member_id', 'name', 'phone', 'membership_type', 'membership_expiry'],
                    'upcoming-renewals'
                  )}
                  className="text-[10px] text-accent hover:underline font-bold flex items-center gap-1"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 bg-slate-950/30 text-slate-400 font-bold uppercase">
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Package</th>
                      <th className="py-2.5 px-3 text-right">Renewal Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-350">
                    {feeData.upcomingRenewals.map((m: any) => (
                      <tr key={m.member_id} className="hover:bg-slate-950/10">
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{m.name}</td>
                        <td className="py-2.5 px-3 text-slate-400">{m.membership_type}</td>
                        <td className="py-2.5 px-3 text-right text-orange-405 font-bold">{m.membership_expiry.split('T')[0]}</td>
                      </tr>
                    ))}
                    {feeData.upcomingRenewals.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-6 text-center text-slate-500">No renewals pending in the next 30 days.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
