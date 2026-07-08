import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getPhotoUrl } from '../utils/api';
import { 
  Plus, Search, Filter, Phone, Mail, 
  Calendar, Edit2, Trash2, X, Upload
} from 'lucide-react';

export const Members: React.FC = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  
  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [membershipType, setMembershipType] = useState('Monthly');
  const [membershipStart, setMembershipStart] = useState(new Date().toISOString().split('T')[0]);
  const [membershipExpiry, setMembershipExpiry] = useState(''); // Only used in editing
  const [status, setStatus] = useState('Active'); // Only used in editing
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      const data = await api.getMembers();
      setMembers(data);
    } catch (err) {
      console.error('Error loading members:', err);
      setError('Failed to load members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const openAddModal = () => {
    setEditingMember(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setDob('');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setMembershipType('Monthly');
    setMembershipStart(new Date().toISOString().split('T')[0]);
    setStatus('Active');
    setPhotoFile(null);
    setPhotoPreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (member: any) => {
    setEditingMember(member);
    setName(member.name);
    setPhone(member.phone);
    setEmail(member.email || '');
    setAddress(member.address || '');
    setDob(member.dob ? member.dob.split('T')[0] : '');
    setJoiningDate(member.joining_date.split('T')[0]);
    setMembershipType(member.membership_type);
    setMembershipStart(member.membership_start.split('T')[0]);
    setMembershipExpiry(member.membership_expiry.split('T')[0]);
    setStatus(member.status);
    setPhotoFile(null);
    setPhotoPreview(getPhotoUrl(member.photo));
    setIsModalOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleDelete = async (memberId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this member? All attendance and payment history will be deleted.');
    if (!confirmDelete) return;

    try {
      await api.deleteMember(memberId);
      setMembers(members.filter(m => m.member_id !== memberId));
    } catch (err) {
      alert('Failed to delete member');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('phone', phone);
    formData.append('email', email);
    formData.append('address', address);
    formData.append('dob', dob);
    formData.append('joining_date', joiningDate);
    formData.append('membership_type', membershipType);
    formData.append('membership_start', membershipStart);

    if (photoFile) {
      formData.append('photo', photoFile);
    }

    try {
      if (editingMember) {
        // Edit mode needs expiry and status as fields
        formData.append('membership_expiry', membershipExpiry);
        formData.append('status', status);
        await api.updateMember(editingMember.member_id, formData);
      } else {
        await api.createMember(formData);
      }
      setIsModalOpen(false);
      fetchMembers();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  };

  // Status Badge Logic
  const getStatusBadge = (status: string, expiryDate: string) => {
    if (status === 'Inactive') {
      return { text: 'Inactive', classes: 'bg-slate-800/80 text-slate-400 border-slate-700/60' };
    }
    if (status === 'Expired') {
      return { text: 'Expired', classes: 'bg-red-500/10 text-red-400 border-red-500/20' };
    }
    
    // Active membership: check expiring soon (7 days or less)
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays <= 7) {
      return { text: `Expiring Soon (${diffDays}d)`, classes: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
    } else if (diffDays < 0) {
      return { text: 'Expired', classes: 'bg-red-500/10 text-red-400 border-red-500/20' };
    }
    
    return { text: 'Paid', classes: 'bg-accent/10 text-accent border-accent/20' };
  };

  // Client Side Filter Logic
  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm) ||
      m.member_id.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesType = typeFilter ? m.membership_type === typeFilter : true;
    
    let matchesStatus = true;
    if (statusFilter) {
      if (statusFilter === 'Expiring Soon') {
        const expiry = new Date(m.membership_expiry);
        const today = new Date();
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        matchesStatus = m.status === 'Active' && diffDays >= 0 && diffDays <= 7;
      } else {
        matchesStatus = m.status === statusFilter;
      }
    }

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Top action block */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between no-print">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search by Name, ID, or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent text-sm"
          />
        </div>

        {/* Filters and Add button */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Type Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900">All Membership Types</option>
              <option value="Monthly" className="bg-slate-900">Monthly</option>
              <option value="3 Months" className="bg-slate-900">3 Months</option>
              <option value="6 Months" className="bg-slate-900">6 Months</option>
              <option value="Yearly" className="bg-slate-900">Yearly</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900">All Statuses</option>
              <option value="Active" className="bg-slate-900">Active (Paid)</option>
              <option value="Expiring Soon" className="bg-slate-900">Expiring Soon (7 Days)</option>
              <option value="Expired" className="bg-slate-900">Expired</option>
              <option value="Inactive" className="bg-slate-900">Inactive</option>
            </select>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-accent text-slate-950 font-bold px-4 py-2 rounded-xl text-sm hover:bg-accent-light active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-accent/15"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>ADD MEMBER</span>
          </button>
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
          No members found matching the filters.
        </div>
      ) : (
        /* Member Card Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => {
            const badge = getStatusBadge(member.status, member.membership_expiry);
            return (
              <div 
                key={member.member_id}
                className="bg-slate-900 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all flex flex-col relative overflow-hidden group cursor-pointer"
                onClick={() => navigate(`/members/${member.member_id}`)}
              >
                {/* Background card accent on hover */}
                <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full blur-2xl pointer-events-none group-hover:bg-primary/10 transition-colors" />

                {/* Card Top Block */}
                <div className="flex items-start gap-4">
                  {/* Photo / Default Avatar */}
                  {member.photo ? (
                    <img 
                      src={getPhotoUrl(member.photo) || ''} 
                      alt={member.name}
                      className="h-16 w-16 rounded-xl object-cover border border-slate-800"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-slate-800 border border-slate-750 flex items-center justify-center text-slate-400 text-lg font-bold uppercase shrink-0">
                      {member.name.slice(0, 2)}
                    </div>
                  )}

                  {/* Name and ID */}
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-100 group-hover:text-accent transition-colors truncate text-base">
                      {member.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
                      {member.member_id}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase border rounded-full ${badge.classes}`}>
                        {badge.text}
                      </span>
                      <span className="text-[10px] bg-slate-850 border border-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-medium">
                        {member.membership_type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contacts Block */}
                <div className="mt-5 space-y-2 border-t border-slate-800/60 pt-4 flex-1 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    <span>{member.phone}</span>
                  </div>
                  {member.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-500" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>Expires: {member.membership_expiry.split('T')[0]}</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div 
                  className="mt-5 pt-3 border-t border-slate-800/40 flex items-center justify-end gap-2 no-print"
                  onClick={(e) => e.stopPropagation()} // Stop navigation trigger
                >
                  <button 
                    onClick={() => openEditModal(member)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer"
                    title="Edit Member"
                  >
                    <Edit2 className="h-4.5 w-4.5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(member.member_id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-850 transition-all cursor-pointer"
                    title="Delete Member"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                {editingMember ? 'Edit Member Profile' : 'Register New Member'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5.5 w-5.5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* Photo Upload Row */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/50 p-4 border border-slate-800/80 rounded-xl">
                {photoPreview ? (
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="h-16 w-16 rounded-xl object-cover border border-slate-800"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-center text-slate-500">
                    <Upload className="h-6 w-6" />
                  </div>
                )}
                <div className="text-center sm:text-left">
                  <p className="text-xs font-semibold text-slate-300">Member Profile Picture</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">JPG, PNG, GIF, WebP (Max 5MB)</p>
                  <label className="inline-block mt-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors border border-slate-700">
                    Choose Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoChange} 
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Grid Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@email.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                {/* DOB */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Date of Birth (Optional)
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Joining date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Joining Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Physical Address (Optional)
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, City, Zip"
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-accent resize-none"
                  />
                </div>

                {/* Membership Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Membership Type *
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

                {/* Membership Start */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Membership Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={membershipStart}
                    onChange={(e) => setMembershipStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-accent"
                  />
                </div>

                {/* Edit Only Fields */}
                {editingMember && (
                  <>
                    {/* Membership Expiry */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Membership Expiry Date
                      </label>
                      <input
                        type="date"
                        required
                        value={membershipExpiry}
                        onChange={(e) => setMembershipExpiry(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-accent"
                      />
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Member Account Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-slate-200 text-sm focus:outline-none focus:border-accent cursor-pointer"
                      >
                        <option value="Active">Active (Paid)</option>
                        <option value="Expired">Expired</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-850 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-accent text-slate-950 font-bold rounded-xl text-sm hover:bg-accent-light transition-all cursor-pointer shadow-lg shadow-accent/15"
                >
                  {editingMember ? 'SAVE CHANGES' : 'CREATE PROFILE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
