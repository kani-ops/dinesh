import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { UserX, AlertTriangle, Eye, RefreshCw, Phone } from 'lucide-react';

export const InactiveMembers: React.FC = () => {
  const navigate = useNavigate();
  const [inactiveMembers, setInactiveMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInactiveMembers = async () => {
    try {
      const data = await api.getInactiveMembers();
      setInactiveMembers(data);
    } catch (err) {
      console.error('Error fetching inactive members:', err);
      setError('Failed to load inactive members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInactiveMembers();
  }, []);

  const handleReactivate = async (memberId: string) => {
    const confirm = window.confirm(
      'Reactivating this member will start their membership package today and set status to Active. Proceed?'
    );
    if (!confirm) return;

    try {
      await api.reactivateMember(memberId);
      alert('Member reactivated successfully!');
      fetchInactiveMembers();
    } catch (err) {
      alert('Failed to reactivate member');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Alert Header info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-start gap-4 shadow-xl">
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
          <AlertTriangle className="h-6 w-6 shrink-0" />
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Inactive Members Directory
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Members automatically move to this page if they are **absent continuously for more than 14 days** OR if their **membership package has been expired for more than 14 days**. Reactivating a member will renew their membership package starting today.
          </p>
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
      ) : inactiveMembers.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/20 border border-slate-900 border-dashed rounded-2xl text-slate-500 flex flex-col items-center justify-center gap-3">
          <UserX className="h-8 w-8 text-slate-650" />
          <span>No inactive members detected. Everyone is keeping up!</span>
        </div>
      ) : (
        /* Inactive Member List Table */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/50 text-slate-400 text-xs font-semibold tracking-wider text-left uppercase">
                  <th className="py-4 px-6">Member Name</th>
                  <th className="py-4 px-6">Phone Number</th>
                  <th className="py-4 px-6">Last Active Date</th>
                  <th className="py-4 px-6 text-center">Days Absent</th>
                  <th className="py-4 px-6">Inactivity Reason</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {inactiveMembers.map((m) => (
                  <tr key={m.member_id} className="hover:bg-slate-950/20 text-slate-350 transition-colors text-sm">
                    {/* Name */}
                    <td className="py-4 px-6 font-semibold text-slate-200">
                      <div>
                        <p>{m.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">{m.member_id}</p>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-4 px-6 text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-600" />
                        <span>{m.phone}</span>
                      </span>
                    </td>

                    {/* Last Present */}
                    <td className="py-4 px-6 text-xs text-slate-400">
                      {m.last_present_date}
                    </td>

                    {/* Days Absent */}
                    <td className="py-4 px-6 text-center text-xs font-bold text-orange-400">
                      {m.daysSinceLastPresent === 999 ? 'Never' : `${m.daysSinceLastPresent} Days`}
                    </td>

                    {/* Inactivity Reason */}
                    <td className="py-4 px-6 text-xs">
                      <span className="px-2.5 py-0.5 rounded-full border border-red-500/10 bg-red-500/5 text-red-400/90 font-medium">
                        {m.reason}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => navigate(`/members/${m.member_id}`)}
                          className="flex items-center gap-1 bg-slate-800 text-slate-200 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-slate-700 active:scale-[0.98] transition-all cursor-pointer border border-slate-700"
                          title="View Profile"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">VIEW</span>
                        </button>
                        <button
                          onClick={() => handleReactivate(m.member_id)}
                          className="flex items-center gap-1 bg-accent text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-accent-light active:scale-[0.98] transition-all cursor-pointer"
                          title="Reactivate Member"
                        >
                          <RefreshCw className="h-3.5 w-3.5 stroke-[2.5]" />
                          <span className="hidden sm:inline">REACTIVATE</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
