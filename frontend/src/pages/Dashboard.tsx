import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { 
  Users, UserCheck, UserX, AlertCircle, 
  CalendarDays, Hourglass
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, BarChart, Bar, PieChart, Pie, Cell, Legend 
} from 'recharts';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
        setError('Failed to load dashboard statistics.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
        {error || 'Error rendering page'}
      </div>
    );
  }

  const { summary, charts } = stats;

  const cardData = [
    { title: 'Total Members', value: summary.totalMembers, icon: Users, color: 'border-blue-500/30 text-blue-400 bg-blue-500/5' },
    { title: 'Active Members', value: summary.activeMembers, icon: UserCheck, color: 'border-accent/30 text-accent bg-accent/5' },
    { title: 'Inactive Members', value: summary.inactiveMembers, icon: UserX, color: 'border-slate-700/60 text-slate-400 bg-slate-800/10' },
    { title: 'Present Today', value: summary.presentToday, icon: CalendarDays, color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' },
    { title: 'Absent Today', value: summary.absentToday, icon: CalendarDays, color: 'border-orange-500/30 text-orange-400 bg-orange-500/5' },
    { title: 'Fees Due Today', value: summary.feesDueToday, icon: Hourglass, color: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5' },
    { title: 'Expiring Soon (7d)', value: summary.feesExpiring7Days, icon: AlertCircle, color: 'border-orange-500/30 text-orange-400 bg-orange-500/5' },
    { title: 'Fees Overdue', value: summary.feesOverdue, icon: AlertCircle, color: 'border-red-500/30 text-red-400 bg-red-500/5' },
  ];

  const COLORS = ['#1E3A8A', '#10B981', '#F59E0B', '#EF4444'];

  const typeDistributionData = charts.typeDistribution.map((d: any) => ({
    name: d.membership_type,
    value: parseInt(d.count) || 0
  }));

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cardData.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx} 
              className={`p-4 border rounded-xl flex items-center justify-between transition-all duration-300 hover:translate-y-[-2px] ${card.color}`}
            >
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-slate-100">
                  {card.value}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Attendance chart */}
        <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Monthly Attendance rate
            </h3>
            <span className="text-xs text-slate-500">6-Month Trend</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.attendanceRate}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis stroke="#475569" fontSize={11} domain={[0, 100]} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRate)" name="Attendance %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Member distribution chart */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Membership types
          </h3>
          <div className="h-72 flex flex-col justify-center items-center">
            {typeDistributionData.length === 0 ? (
              <p className="text-slate-500 text-sm">No members registered yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistributionData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {typeDistributionData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    iconType="circle"
                    formatter={(value) => <span className="text-xs text-slate-400 capitalize">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* New Members growth chart */}
        <div className="lg:col-span-3 p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              New Member Registrations
            </h3>
            <span className="text-xs text-slate-500">6-Month Growth</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.newMembers}>
                <XAxis dataKey="month" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis stroke="#475569" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" fill="#1E3A8A" radius={[4, 4, 0, 0]} name="New Members" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
