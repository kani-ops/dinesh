import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getPhotoUrl } from '../utils/api';
import { 
  ArrowLeft, Phone, Mail, MapPin, Calendar, 
  CreditCard, Award, Clock, Plus, DollarSign,
  CheckCircle, XCircle, X
} from 'lucide-react';

export const MemberProfile: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [membershipType, setMembershipType] = useState('Monthly');
  const [membershipStart, setMembershipStart] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  const fetchProfile = async () => {
    if (!memberId) return;
    try {
      const profileData = await api.getMember(memberId);
      setData(profileData);
    } catch (err) {
      console.error('Error loading member profile:', err);
      setError('Failed to load member profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [memberId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex flex-col gap-4">
        <span>{error || 'Member not found'}</span>
        <button onClick={() => navigate('/members')} className="flex items-center gap-1 text-slate-350 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to Members
        </button>
      </div>
    );
  }

  const { member, stats, payments, attendance } = data;

  // Calculate Expiry Countdown
  const getCountdown = (expiryStr: string, status: string) => {
    if (status === 'Inactive') return { text: 'Membership Inactive', color: 'text-slate-500 bg-slate-900 border-slate-800' };
    
    const expiry = new Date(expiryStr);
    const today = new Date();
    // Zero out times for date-only comparison
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Expired by ${Math.abs(diffDays)} days`, color: 'text-red-400 bg-red-500/5 border-red-500/15' };
    } else if (diffDays === 0) {
      return { text: 'Expires Today', color: 'text-yellow-400 bg-yellow-500/5 border-yellow-500/15' };
    } else if (diffDays <= 7) {
      return { text: `${diffDays} days remaining (Renew Soon)`, color: 'text-orange-400 bg-orange-500/5 border-orange-500/15' };
    } else {
      return { text: `${diffDays} days remaining`, color: 'text-accent bg-accent/5 border-accent/15' };
    }
  };

  const countdownInfo = getCountdown(member.membership_expiry, member.status);

  // Status Badge visual
  const getStatusBadgeClass = (status: string) => {
    if (status === 'Active') return 'bg-accent/10 text-accent border-accent/20';
    if (status === 'Expired') return 'bg-red-500/10 text-red-400 border-red-500/20';
    return 'bg-slate-800 text-slate-400 border-slate-700/60';
  };

  const handleReactivate = async () => {
    const confirm = window.confirm('Reactivating this member will start their membership from today and set status to Active. Proceed?');
    if (!confirm) return;

    try {
      await api.reactivateMember(member.member_id);
      alert('Member reactivated successfully!');
      fetchProfile();
    } catch (err) {
      alert('Failed to reactivate member');
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !paymentDate || !membershipStart) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      await api.createPayment({
        member_id: member.member_id,
        payment_date: paymentDate,
        amount: parseFloat(amount),
        membership_type: membershipType,
        membership_start: membershipStart,
        remarks
      });
      setIsPaymentModalOpen(false);
      setAmount('');
      setRemarks('');
      alert('Payment recorded successfully! Membership updated.');
      fetchProfile();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-850 pb-5 no-print">
        <button 
          onClick={() => navigate('/members')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors font-medium text-sm cursor-pointer"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
          <span>BACK TO MEMBERS</span>
        </button>

        <div className="flex items-center gap-3">
          {member.status === 'Inactive' && (
            <button
              onClick={handleReactivate}
              className="px-4 py-2 border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 rounded-xl font-bold text-xs hover:bg-yellow-500/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              REACTIVATE MEMBER
            </button>
          )}

          <button
            onClick={() => setIsPaymentModalOpen(true)}
            className="flex items-center gap-1.5 bg-accent text-slate-950 font-bold px-4 py-2 rounded-xl text-xs hover:bg-accent-light active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-accent/15"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>RECORD PAYMENT</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Personal Profile Card */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary to-accent" />
            
            {/* Photo / Avatar */}
            {member.photo ? (
              <img 
                src={getPhotoUrl(member.photo) || ''} 
                alt={member.name}
                className="h-28 w-28 rounded-2xl object-cover border border-slate-800 mt-4 shadow-lg shadow-slate-950/50"
              />
            ) : (
              <div className="h-28 w-28 rounded-2xl bg-slate-800 border border-slate-750 flex items-center justify-center text-slate-400 text-3xl font-black uppercase mt-4 shadow-lg shadow-slate-950/50">
                {member.name.slice(0, 2)}
              </div>
            )}

            {/* Name & ID */}
            <h2 className="text-xl font-black text-slate-100 mt-4">{member.name}</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">{member.member_id}</p>

            {/* Status indicators */}
            <div className="flex items-center gap-2 mt-3">
              <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase border rounded-full ${getStatusBadgeClass(member.status)}`}>
                {member.status === 'Active' ? 'Paid' : member.status}
              </span>
              <span className="text-[10px] bg-slate-850 border border-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-medium">
                {member.membership_type}
              </span>
            </div>

            {/* Countdown card */}
            <div className={`w-full mt-6 p-3.5 border rounded-xl text-center text-xs font-semibold ${countdownInfo.color}`}>
              {countdownInfo.text}
            </div>

            {/* Detailed list */}
            <div className="w-full mt-6 space-y-3.5 border-t border-slate-800/80 pt-5 text-left text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-slate-500 shrink-0" />
                <span>{member.phone}</span>
              </div>
              {member.email && (
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                  <span className="truncate">{member.email}</span>
                </div>
              )}
              {member.dob && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
                  <span>DOB: {member.dob.split('T')[0]}</span>
                </div>
              )}
              {member.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{member.address}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Award className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Joined: {member.joining_date.split('T')[0]}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Attendance History & Statistics */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="text-center p-3 rounded-xl bg-slate-950/40 border border-slate-850/60">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Present Days</p>
              <p className="text-xl font-bold text-accent mt-1">{stats.presentDays} Days</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-slate-950/40 border border-slate-850/60">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Absent Days</p>
              <p className="text-xl font-bold text-orange-400 mt-1">{stats.absentDays} Days</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-slate-950/40 border border-slate-850/60">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Attendance %</p>
              <p className="text-xl font-bold text-slate-200 mt-1">{stats.attendancePercentage}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Attendance List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col max-h-[420px]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <span>Attendance Log</span>
              </h3>
              
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
                {attendance.length === 0 ? (
                  <p className="text-slate-500 text-xs py-8 text-center">No attendance logs available.</p>
                ) : (
                  attendance.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-850/60">
                      <div className="flex items-center gap-2 text-xs">
                        {log.status === 'Present' ? (
                          <CheckCircle className="h-4.5 w-4.5 text-accent shrink-0" />
                        ) : (
                          <XCircle className="h-4.5 w-4.5 text-red-400 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-350">{log.date.split('T')[0]}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-semibold">{log.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Payment History List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col max-h-[420px]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-slate-500" />
                <span>Payment Records</span>
              </h3>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {payments.length === 0 ? (
                  <p className="text-slate-500 text-xs py-8 text-center">No payment history available.</p>
                ) : (
                  payments.map((p: any) => (
                    <div key={p.id} className="p-3 rounded-xl bg-slate-950/50 border border-slate-850/60 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">{p.payment_date.split('T')[0]}</span>
                        <span className="text-accent font-bold text-sm">${parseFloat(p.amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                        <span>{p.membership_type}</span>
                        <span>{p.membership_start.split('T')[0]} to {p.membership_expiry.split('T')[0]}</span>
                      </div>
                      {p.remarks && (
                        <p className="text-[10px] text-slate-500 italic mt-1 border-t border-slate-850/40 pt-1">
                          Remarks: {p.remarks}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                <DollarSign className="h-4.5 w-4.5 text-accent" />
                <span>Record Member Payment</span>
              </h3>
              <button 
                onClick={() => setIsPaymentModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5.5 w-5.5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddPayment} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Amount Paid ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 50.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Membership Package *
                </label>
                <select
                  value={membershipType}
                  onChange={(e) => setMembershipType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-accent cursor-pointer"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="3 Months">3 Months</option>
                  <option value="6 Months">6 Months</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={membershipStart}
                    onChange={(e) => setMembershipStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Remarks / Notes
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Cash payment, gym hoodie promotion"
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-accent resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-850 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent text-slate-950 font-bold rounded-xl text-xs hover:bg-accent-light transition-all cursor-pointer shadow-lg shadow-accent/15"
                >
                  SAVE RECORD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
