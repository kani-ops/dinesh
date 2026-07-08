const API_URL = '/api';

const getHeaders = (isMultipart = false) => {
  const token = localStorage.getItem('authToken');
  const headers: Record<string, string> = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
};

export const api = {
  // Auth
  login: async (credentials: any) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(credentials)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Login failed');
    }
    return res.json();
  },
  
  changePassword: async (data: any) => {
    const res = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Password update failed');
    }
    return res.json();
  },

  // Members
  getMembers: async (today?: string) => {
    const url = today ? `${API_URL}/members?today=${today}` : `${API_URL}/members`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch members');
    return res.json();
  },

  getInactiveMembers: async (today?: string) => {
    const url = today ? `${API_URL}/members/inactive?today=${today}` : `${API_URL}/members/inactive`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch inactive members');
    return res.json();
  },

  getMember: async (memberId: string, today?: string) => {
    const url = today ? `${API_URL}/members/${memberId}?today=${today}` : `${API_URL}/members/${memberId}`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch member details');
    return res.json();
  },

  createMember: async (formData: FormData) => {
    const res = await fetch(`${API_URL}/members`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create member');
    }
    return res.json();
  },

  updateMember: async (memberId: string, formData: FormData) => {
    const res = await fetch(`${API_URL}/members/${memberId}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update member');
    }
    return res.json();
  },

  deleteMember: async (memberId: string) => {
    const res = await fetch(`${API_URL}/members/${memberId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete member');
    return res.json();
  },

  reactivateMember: async (memberId: string, today?: string) => {
    const res = await fetch(`${API_URL}/members/${memberId}/reactivate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ today })
    });
    if (!res.ok) throw new Error('Failed to reactivate member');
    return res.json();
  },

  // Attendance
  getAttendance: async (date: string) => {
    const res = await fetch(`${API_URL}/attendance?date=${date}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch attendance');
    return res.json();
  },

  markAttendance: async (data: { member_id: string; date: string; status: 'Present' | 'Absent'; time: string }) => {
    const res = await fetch(`${API_URL}/attendance`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to mark attendance');
    return res.json();
  },

  deleteAttendance: async (data: { member_id: string; date: string }) => {
    const res = await fetch(`${API_URL}/attendance`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to clear attendance');
    return res.json();
  },

  // Payments
  getPayments: async () => {
    const res = await fetch(`${API_URL}/payments`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch payment records');
    return res.json();
  },

  createPayment: async (data: any) => {
    const res = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to record payment');
    }
    return res.json();
  },

  deletePayment: async (id: number) => {
    const res = await fetch(`${API_URL}/payments/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete payment');
    return res.json();
  },

  // Reports & Stats
  getDashboardStats: async (today?: string) => {
    const url = today ? `${API_URL}/reports/dashboard?today=${today}` : `${API_URL}/reports/dashboard`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch dashboard statistics');
    return res.json();
  },

  getAttendanceReport: async (today?: string) => {
    const url = today ? `${API_URL}/reports/attendance?today=${today}` : `${API_URL}/reports/attendance`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch attendance reports');
    return res.json();
  },

  getFeeReport: async (today?: string) => {
    const url = today ? `${API_URL}/reports/fees?today=${today}` : `${API_URL}/reports/fees`;
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch fee reports');
    return res.json();
  },

  // Backup & Restore
  exportBackup: async () => {
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/backup/export`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error('Failed to download backup');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `club-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  importBackup: async (backupJson: any) => {
    const res = await fetch(`${API_URL}/backup/restore`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ backupData: backupJson })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to restore database');
    }
    return res.json();
  }
};

export const getPhotoUrl = (filename: string | null) => {
  if (!filename) return null;
  return `/uploads/${filename}`;
};
