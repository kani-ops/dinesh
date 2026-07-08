import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Calendar, Check, X, Search, Clock } from 'lucide-react';

export const Attendance: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const data = await api.getAttendance(date);
      setMembers(data);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Failed to load attendance sheet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [date]);

  const handleToggleAttendance = async (memberId: string, status: 'Present' | 'Absent') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    
    // Optimistic UI update
    setMembers(prev => prev.map(m => {
      if (m.member_id === memberId) {
        return {
          ...m,
          attendance_status: status,
          attendance_time: time
        };
      }
      return m;
    }));

    try {
      await api.markAttendance({
        member_id: memberId,
        date: date,
        status: status,
        time: time
      });
    } catch (err) {
      alert('Failed to save attendance record');
      fetchAttendance(); // Revert back on error
    }
  };

  const handleClearAttendance = async (memberId: string) => {
    // Optimistic UI update
    setMembers(prev => prev.map(m => {
      if (m.member_id === memberId) {
        return {
          ...m,
          attendance_status: null,
          attendance_time: null
        };
      }
      return m;
    }));

    try {
      await api.deleteAttendance({
        member_id: memberId,
        date: date
      });
    } catch (err) {
      alert('Failed to clear attendance record');
      fetchAttendance();
    }
  };

  // Filter members by search input
  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.member_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      
      {/* Date selector and search bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 no-print">
        
        {/* Datepicker */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2 bg-slate-950 border border-slate-850 rounded-xl text-slate-400">
            <Calendar className="h-5 w-5 text-accent" />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Select Attendance Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-slate-200 text-sm font-semibold focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Quick search by Name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 pl-9 pr-4 text-slate-200 placeholder-slate-550 focus:outline-none focus:border-accent text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
          {error}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 border border-slate-900 border-dashed rounded-2xl text-slate-500">
          No members registered to mark.
        </div>
      ) : (
        /* Attendance List Table */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/50 text-slate-400 text-xs font-semibold tracking-wider text-left uppercase">
                  <th className="py-4 px-6">Member details</th>
                  <th className="py-4 px-6 hidden md:table-cell">Contact</th>
                  <th className="py-4 px-6 hidden sm:table-cell">Membership Status</th>
                  <th className="py-4 px-6 text-center">Mark Attendance</th>
                  <th className="py-4 px-6 text-right hidden sm:table-cell">Time logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMembers.map((m) => {
                  const isPresent = m.attendance_status === 'Present';
                  const isAbsent = m.attendance_status === 'Absent';
                  
                  return (
                    <tr key={m.member_id} className="hover:bg-slate-950/20 text-slate-300 transition-colors">
                      {/* Name and ID */}
                      <td className="py-3.5 px-6">
                        <p className="font-bold text-slate-200 text-sm">{m.name}</p>
                        <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">{m.member_id}</p>
                      </td>
                      
                      {/* Phone */}
                      <td className="py-3.5 px-6 hidden md:table-cell text-sm text-slate-450">
                        {m.phone}
                      </td>

                      {/* Membership status info */}
                      <td className="py-3.5 px-6 hidden sm:table-cell">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          m.membership_status === 'Active' 
                            ? 'bg-accent/10 text-accent border-accent/20' 
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {m.membership_status === 'Active' ? 'Active' : 'Expired'}
                        </span>
                      </td>

                      {/* Present / Absent Buttons */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center justify-center gap-2">
                          {/* Present Button */}
                          <button
                            onClick={() => handleToggleAttendance(m.member_id, 'Present')}
                            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                              isPresent
                                ? 'bg-accent text-slate-950 border-accent font-black shadow-lg shadow-accent/15'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                            <span>PRESENT</span>
                          </button>

                          {/* Absent Button */}
                          <button
                            onClick={() => handleToggleAttendance(m.member_id, 'Absent')}
                            className={`flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                              isAbsent
                                ? 'bg-red-500 text-white border-red-500 font-black shadow-lg shadow-red-500/15'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                            }`}
                          >
                            <X className="h-3.5 w-3.5 stroke-[3]" />
                            <span>ABSENT</span>
                          </button>

                          {/* Clear Button */}
                          {(isPresent || isAbsent) && (
                            <button
                              onClick={() => handleClearAttendance(m.member_id)}
                              className="text-[10px] text-slate-500 hover:text-slate-350 hover:underline px-1 cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Time logged */}
                      <td className="py-3.5 px-6 text-right hidden sm:table-cell text-xs font-medium text-slate-500">
                        {m.attendance_time ? (
                          <span className="flex items-center justify-end gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-600" />
                            <span>{m.attendance_time}</span>
                          </span>
                        ) : (
                          <span className="italic">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
