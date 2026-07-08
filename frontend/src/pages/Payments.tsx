import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { 
  CreditCard, Search, Plus, Trash2, X, DollarSign, 
  User
} from 'lucide-react';

export const Payments: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [membershipType, setMembershipType] = useState('Monthly');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [membershipStart, setMembershipStart] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  const loadData = async () => {
    try {
      const paymentData = await api.getPayments();
      setPayments(paymentData);
      
      const memberData = await api.getMembers();
      // Dropdown should show active & expired members, not inactive (unless they want to reactivate via payment!)
      setMembers(memberData);
    } catch (err) {
      console.error('Error loading payments registry:', err);
      setError('Failed to load transaction data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openRecordModal = () => {
    setSelectedMemberId('');
    setAmount('');
    setMembershipType('Monthly');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setMembershipStart(new Date().toISOString().split('T')[0]);
    setRemarks('');
    setIsModalOpen(true);
  };

  const handleDeletePayment = async (id: number) => {
    const confirm = window.confirm('Are you sure you want to delete this payment record? Note: This will not change the member\'s current expiry date on their profile automatically.');
    if (!confirm) return;

    try {
      await api.deletePayment(id);
      setPayments(payments.filter(p => p.id !== id));
    } catch (err) {
      alert('Failed to delete payment record');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !amount || !paymentDate || !membershipStart) {
      alert('Please fill in all required fields.');
      return;
    }

    try {
      await api.createPayment({
        member_id: selectedMemberId,
        payment_date: paymentDate,
        amount: parseFloat(amount),
        membership_type: membershipType,
        membership_start: membershipStart,
        remarks
      });
      setIsModalOpen(false);
      alert('Payment recorded and membership updated successfully!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    }
  };

  // Client-side search filter
  const filteredPayments = payments.filter(p => 
    p.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.member_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.remarks && p.remarks.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* Top search & Add registry controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 no-print">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search by name, ID, remarks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 pl-9 pr-4 text-slate-200 placeholder-slate-550 focus:outline-none focus:border-accent text-sm"
          />
        </div>

        {/* Add Payment Button */}
        <button
          onClick={openRecordModal}
          className="flex items-center justify-center gap-1.5 w-full sm:w-auto bg-accent text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs hover:bg-accent-light active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-accent/15"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>RECORD PAYMENT</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
          {error}
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/20 border border-slate-900 border-dashed rounded-2xl text-slate-500 flex flex-col items-center justify-center gap-2">
          <CreditCard className="h-8 w-8 text-slate-650" />
          <span>No payment history found.</span>
        </div>
      ) : (
        /* Payment History Table */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-900/50 text-slate-400 text-xs font-semibold tracking-wider text-left uppercase">
                  <th className="py-4 px-6">Payment Date</th>
                  <th className="py-4 px-6">Member info</th>
                  <th className="py-4 px-6">Package</th>
                  <th className="py-4 px-6">Start & Expiry Dates</th>
                  <th className="py-4 px-6 text-right">Amount Paid</th>
                  <th className="py-4 px-6 text-right no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-350 text-sm">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-950/20 transition-colors">
                    {/* Payment Date */}
                    <td className="py-4 px-6 font-semibold text-slate-400">
                      {p.payment_date.split('T')[0]}
                    </td>

                    {/* Member details */}
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-200">{p.member_name}</p>
                      <p className="text-[10px] text-slate-550 font-bold tracking-wider uppercase mt-0.5">{p.member_id}</p>
                    </td>

                    {/* Package */}
                    <td className="py-4 px-6 font-medium">
                      {p.membership_type}
                    </td>

                    {/* Expiry period */}
                    <td className="py-4 px-6 text-xs text-slate-450">
                      <span>{p.membership_start.split('T')[0]}</span>
                      <span className="text-slate-600 px-1.5">to</span>
                      <span className="font-semibold text-slate-350">{p.membership_expiry.split('T')[0]}</span>
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-6 text-right text-accent font-black">
                      ${parseFloat(p.amount).toFixed(2)}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right no-print">
                      <button
                        onClick={() => handleDeletePayment(p.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                <DollarSign className="h-4.5 w-4.5 text-accent" />
                <span>Record cash Payment</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5.5 w-5.5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
              
              {/* Member Selector */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Select Member *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 pointer-events-none">
                    <User className="h-4 w-4" />
                  </span>
                  <select
                    required
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-9 pr-4 text-slate-200 text-sm focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="">-- Choose Member --</option>
                    {members.map(m => (
                      <option key={m.member_id} value={m.member_id}>
                        {m.name} ({m.member_id}) - {m.status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Amount */}
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

              {/* Package */}
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

              {/* Dates */}
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

              {/* Remarks */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Remarks / Notes
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Cash payment, new member promotion"
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-accent resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-850 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent text-slate-950 font-bold rounded-xl text-xs hover:bg-accent-light transition-all cursor-pointer shadow-lg shadow-accent/15"
                >
                  RECORD TRANSACTION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
