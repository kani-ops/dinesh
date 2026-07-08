import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { 
  LayoutDashboard, Users, CalendarRange, CreditCard, 
  AlertTriangle, FileSpreadsheet, LogOut, Menu, X, 
  Bell, Database, Upload, RefreshCw
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { logout, username } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [alerts, setAlerts] = useState<any>({ expiringSoon: [], expired: [], absent14Days: [] });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState('');

  // Fetch alerts for notification badge
  const fetchAlerts = async () => {
    try {
      const stats = await api.getDashboardStats();
      setAlerts(stats.alerts);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Poll alerts every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const totalAlerts = alerts.expiringSoon.length + alerts.expired.length + alerts.absent14Days.length;

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Members', path: '/members', icon: Users },
    { name: 'Attendance', path: '/attendance', icon: CalendarRange },
    { name: 'Inactive Members', path: '/inactive', icon: AlertTriangle, badge: alerts.absent14Days.length },
    { name: 'Payments & Fees', path: '/payments', icon: CreditCard },
    { name: 'Reports & Export', path: '/reports', icon: FileSpreadsheet },
  ];

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      await api.exportBackup();
    } catch (error) {
      alert('Backup failed to download');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      'WARNING: Restoring the database will overwrite all current members, attendance records, and payments. Are you sure you want to proceed?'
    );
    if (!confirmRestore) return;

    setIsRestoring(true);
    setRestoreMessage('Reading backup file...');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setRestoreMessage('Restoring database on server...');
        await api.importBackup(json);
        alert('Database restored successfully!');
        window.location.reload(); // Reload to refresh all state
      } catch (err: any) {
        alert('Restore failed: ' + (err.message || 'Invalid backup JSON file'));
      } finally {
        setIsRestoring(false);
        setRestoreMessage('');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-slate-900 border-r border-slate-800 shrink-0">
        {/* Logo / Title */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-900">
          <span className="text-xl font-bold tracking-wider text-slate-100 flex items-center gap-2">
            <span className="h-8 w-8 rounded bg-accent flex items-center justify-center text-slate-950 font-black">C</span>
            CLUB<span className="text-accent font-black">FIT</span>
          </span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${isActive ? 'text-accent' : 'text-slate-400 group-hover:text-slate-100'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    isActive ? 'bg-accent text-slate-950' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}

          <div className="pt-6 border-t border-slate-800/60 mt-6 space-y-1">
            <div className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              System Admin
            </div>

            {/* Backup Button */}
            <button
              onClick={handleBackup}
              disabled={isBackingUp}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 transition-all cursor-pointer disabled:opacity-50"
            >
              <Database className="h-5 w-5" />
              <span>{isBackingUp ? 'Exporting...' : 'Backup Database'}</span>
            </button>

            {/* Restore Button */}
            <label
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 transition-all cursor-pointer disabled:opacity-50"
            >
              <Upload className="h-5 w-5" />
              <span>{isRestoring ? 'Restoring...' : 'Restore Database'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleRestore}
                disabled={isRestoring}
                className="hidden"
              />
            </label>
          </div>
        </nav>

        {/* User Info / Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-semibold uppercase">
              {username ? username.slice(0, 2) : 'AD'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate capitalize">{username || 'Admin'}</p>
              <p className="text-xs text-slate-500 truncate">Manager</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          
          <aside className="relative flex flex-col w-64 bg-slate-900 h-full border-r border-slate-800 animate-slide-in">
            <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900">
              <span className="text-xl font-bold tracking-wider text-slate-100 flex items-center gap-2">
                <span className="h-8 w-8 rounded bg-accent flex items-center justify-center text-slate-950 font-black">C</span>
                CLUB<span className="text-accent font-black">FIT</span>
              </span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-white shadow-lg'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${isActive ? 'text-accent' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && item.badge > 0 ? (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-500/20 text-red-400">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}

              <div className="pt-6 border-t border-slate-800/60 mt-6 space-y-1">
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleBackup(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <Database className="h-5 w-5" />
                  <span>Backup Database</span>
                </button>
                <label
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <Upload className="h-5 w-5" />
                  <span>Restore Database</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestore}
                    className="hidden"
                  />
                </label>
              </div>
            </nav>

            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-semibold uppercase">
                  {username ? username.slice(0, 2) : 'AD'}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200 capitalize">{username || 'Admin'}</p>
                  <p className="text-xs text-slate-500">Manager</p>
                </div>
              </div>
              <button onClick={logout} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 no-print">
          {/* Menu button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Page Title (dynamic based on route) */}
          <h1 className="text-lg font-bold tracking-wide text-slate-100 hidden md:block uppercase">
            {menuItems.find(item => item.path === location.pathname)?.name || 'Admin Panel'}
          </h1>

          {/* Right Header items */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Database Restore Overlay status indicator */}
            {isRestoring && (
              <div className="flex items-center gap-2 text-xs text-accent">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>{restoreMessage}</span>
              </div>
            )}

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors relative cursor-pointer"
              >
                <Bell className="h-5.5 w-5.5" />
                {totalAlerts > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center border border-slate-900">
                    {totalAlerts}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                  <div className="absolute right-0 mt-2.5 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 py-2 divide-y divide-slate-800/80 animate-fade-in-down">
                    <div className="px-4 py-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-200">Alerts & Notifications</span>
                      {totalAlerts > 0 && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">
                          {totalAlerts} Pending
                        </span>
                      )}
                    </div>
                    
                    <div className="max-h-72 overflow-y-auto py-1 divide-y divide-slate-800/40">
                      {totalAlerts === 0 ? (
                        <div className="px-4 py-6 text-center text-slate-500 text-sm">
                          No pending system alerts. All good!
                        </div>
                      ) : (
                        <>
                          {/* Expired memberships */}
                          {alerts.expired.map((alert: any) => (
                            <div key={alert.member_id} className="px-4 py-2.5 text-xs hover:bg-slate-800/40 transition-colors">
                              <div className="flex items-center gap-1.5 text-red-400 font-semibold mb-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                <span>Membership Expired</span>
                              </div>
                              <p className="text-slate-300 font-medium">{alert.name} ({alert.member_id})</p>
                              <p className="text-slate-500">Expired on: {alert.membership_expiry}</p>
                            </div>
                          ))}

                          {/* Expiring soon */}
                          {alerts.expiringSoon.map((alert: any) => (
                            <div key={alert.member_id} className="px-4 py-2.5 text-xs hover:bg-slate-800/40 transition-colors">
                              <div className="flex items-center gap-1.5 text-orange-400 font-semibold mb-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                                <span>Expiring Soon</span>
                              </div>
                              <p className="text-slate-300 font-medium">{alert.name} ({alert.member_id})</p>
                              <p className="text-slate-500">Expires: {alert.membership_expiry}</p>
                            </div>
                          ))}

                          {/* Inactive attendance */}
                          {alerts.absent14Days.map((alert: any) => (
                            <div key={alert.member_id} className="px-4 py-2.5 text-xs hover:bg-slate-800/40 transition-colors">
                              <div className="flex items-center gap-1.5 text-yellow-500 font-semibold mb-0.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                                <span>Absent &gt; 14 Days</span>
                              </div>
                              <p className="text-slate-300 font-medium">{alert.name} ({alert.member_id})</p>
                              <p className="text-slate-500">Last Present: {alert.last_present_date || 'Never'}</p>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                    <div className="px-4 py-2 text-center">
                      <button 
                        onClick={() => { setIsNotificationsOpen(false); navigate('/inactive'); }}
                        className="text-xs text-accent hover:underline font-medium"
                      >
                        Manage Inactive Members
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Avatar block */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white uppercase">
                {username ? username.slice(0, 2) : 'AD'}
              </div>
              <span className="text-sm font-medium text-slate-300 capitalize hidden sm:block">
                {username}
              </span>
            </div>
          </div>
        </header>

        {/* Content Page wrapper */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
