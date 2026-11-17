import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Crown,
  ShieldCheck,
  ShieldAlert,
  Users,
  Building2,
  BarChart3,
  Sliders,
  Sparkles,
  Search,
  Filter,
  UserPlus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  ArrowUpRight,
  TrendingUp,
  Activity,
  Layers,
  Check,
  X,
  Clock,
  ExternalLink,
  ChevronRight,
  Share2,
  Trash2,
  Eye,
  Settings,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../services/api';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedCounter from '../components/ui/AnimatedCounter';
import StatusIndicator from '../components/ui/StatusIndicator';
import { AdminMultiBusinessView } from '../components/dashboard/views/AdminMultiBusinessView';

export function SuperAdminPage() {
  const navigate = useNavigate();
  const { tab: urlTab } = useParams();
  const { user, logout, isSuperAdmin } = useAuth();
  const { showToast } = useToast();
  const { isDark } = useTheme();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'admins' | 'businesses' | 'analytics' | 'controls'

  useEffect(() => {
    if (urlTab === 'users') {
      navigate('/superadmin', { replace: true });
    } else if (urlTab && ['overview', 'businesses', 'admins', 'analytics', 'controls'].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab, navigate]);

  // Data states
  const [stats, setStats] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [controls, setControls] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [availableBusinesses, setAvailableBusinesses] = useState([]);

  // Filter & Search states
  const [adminSearch, setAdminSearch] = useState('');
  const [adminStatusFilter, setAdminStatusFilter] = useState('all');
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState('30d');

  const handleAnalyticsTimeframeChange = async (tf) => {
    setAnalyticsTimeframe(tf);
    try {
      const data = await api.superadmin.getAnalytics(tf);
      if (data) setAnalytics(data);
    } catch (err) {
      console.warn('Failed to switch analytics timeframe:', err);
    }
  };

  // Loading & Modal states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalRole, setCreateModalRole] = useState('admin'); // 'admin' | 'super_admin' | 'creator'
  const [selectedAdminDetail, setSelectedAdminDetail] = useState(null);

  // New User / Admin Form
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newOrgWorkspace, setNewOrgWorkspace] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Load initial data
  const loadDashboardData = useCallback(async (quiet = false) => {
    if (!quiet) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [statsRes, adminsRes, usersRes, analyticsRes, controlsRes, businessesRes, logsRes] = await Promise.allSettled([
        api.superadmin.getStats(),
        api.superadmin.getAdmins(),
        api.superadmin.getUsers({ limit: 150 }),
        api.superadmin.getAnalytics('30d'),
        api.superadmin.getControls(),
        api.auth.getAvailableBusinesses(),
        api.superadmin.getAuditLogs({ limit: 40 })
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (adminsRes.status === 'fulfilled') setAdmins(adminsRes.value || []);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value || []);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value);
      if (controlsRes.status === 'fulfilled') setControls(controlsRes.value);
      if (businessesRes.status === 'fulfilled') {
        const bList = businessesRes.value || [];
        setAvailableBusinesses(bList);
        if (bList.length > 0 && !newOrgWorkspace) {
          setNewOrgWorkspace(bList[0].name || '');
        }
      }
      if (logsRes.status === 'fulfilled') setAuditLogs(logsRes.value || []);
    } catch (err) {
      console.error('Failed to load SuperAdmin dashboard data:', err);
      showToast('Error syncing SuperAdmin console with database.', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [newOrgWorkspace, showToast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handlers for Admin / User modifications
  const handleToggleStatus = async (targetId, currentStatus, targetName) => {
    const newStatus = !currentStatus;
    try {
      await api.superadmin.updateStatus(targetId, newStatus);
      showToast(`${targetName} has been ${newStatus ? 'activated' : 'deactivated'}.`, 'success');
      loadDashboardData(true);
    } catch (err) {
      showToast(err.message || 'Failed to update account status.', 'error');
    }
  };

  const handleChangeRole = async (targetId, newRole, targetName) => {
    try {
      await api.superadmin.updateRole(targetId, newRole);
      showToast(`${targetName} role updated to ${newRole.toUpperCase()}.`, 'success');
      loadDashboardData(true);
    } catch (err) {
      showToast(err.message || 'Failed to update user role.', 'error');
    }
  };

  const handleDeleteUser = async (targetId, targetEmail) => {
    if (!window.confirm(`Are you sure you want to permanently remove account: ${targetEmail}? This cannot be undone.`)) {
      return;
    }
    try {
      await api.superadmin.deleteUser(targetId);
      showToast(`Account ${targetEmail} removed permanently.`, 'success');
      loadDashboardData(true);
    } catch (err) {
      showToast(err.message || 'Failed to delete account.', 'error');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!newFullName || !newEmail || !newPassword) {
      showToast('Please provide name, email, and password.', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const trimmedWorkspace = (newOrgWorkspace || '').trim();
      const matched = availableBusinesses.find(
        (b) => String(b.name).toLowerCase() === trimmedWorkspace.toLowerCase() || String(b.id) === trimmedWorkspace
      );

      await api.superadmin.createUser({
        full_name: newFullName,
        email: newEmail,
        password: newPassword,
        role: createModalRole,
        organization_id: matched ? Number(matched.id) : null,
        organization_name: trimmedWorkspace,
        business_name: trimmedWorkspace,
        is_active: true
      });
      showToast(`Successfully provisioned ${createModalRole === 'super_admin' ? 'superadmin' : 'admin'}: ${newEmail}`, 'success');
      setShowCreateModal(false);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      loadDashboardData(true);
    } catch (err) {
      showToast(err.message || 'Failed to provision account.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateControls = async (updatedFields) => {
    try {
      const nextControls = { ...controls, ...updatedFields };
      setControls(nextControls);
      await api.superadmin.updateControls(nextControls);
      showToast('Platform master controls updated.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save system controls.', 'error');
    }
  };

  // Filtered lists
  const filteredAdmins = admins.filter((a) => {
    const matchSearch =
      adminSearch === '' ||
      a.full_name?.toLowerCase().includes(adminSearch.toLowerCase()) ||
      a.email?.toLowerCase().includes(adminSearch.toLowerCase());
    const matchStatus =
      adminStatusFilter === 'all' ||
      (adminStatusFilter === 'active' && a.is_active) ||
      (adminStatusFilter === 'inactive' && !a.is_active);
    return matchSearch && matchStatus;
  });



  return (
    <div className="min-h-screen bg-bg text-text font-sans selection:bg-primary/10 selection:text-primary pb-16 transition-colors duration-200">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-primary/10 blur-[140px]" />
        <div className="absolute top-[25%] -right-[15%] w-[45vw] h-[45vw] rounded-full bg-accent/10 blur-[150px]" />
        <div className="absolute -bottom-[10%] left-[25%] w-[40vw] h-[40vw] rounded-full bg-highlight/10 blur-[140px]" />
      </div>

      {/* ── TOP EXECUTIVE BAR ── */}
      <header className="relative z-20 border-b border-border bg-surface/95 backdrop-blur-2xl sticky top-0 px-4 sm:px-8 py-3.5 flex items-center justify-between transition-colors duration-200 text-text">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent text-primary-on shadow-md shadow-primary/25 ring-2 ring-border shrink-0">
            <Crown className="w-5 h-5 text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-text text-base">Social AI Master Console</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary-soft text-primary border border-border">
                SuperAdmin
              </span>
            </div>
            <p className="text-[11px] text-text-secondary hidden sm:block">
              Platform Governance, Admin Oversight & User Analytics
            </p>
          </div>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2.5">
          <ThemeToggle />

          <button
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-[#EEF0FB] text-text-secondary hover:text-text border border-border dark:bg-surface-raised dark:border-border dark:text-text dark:hover:bg-slate-700 transition"
            title="Refresh All Records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary dark:text-accent' : ''}`} />
            <span className="hidden sm:inline">Sync Data</span>
          </button>

          <button
            onClick={() => {
              setCreateModalRole('admin');
              setShowCreateModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-on hover:brightness-110 active:scale-95 shadow-md shadow-primary/25 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden md:inline">Create Admin / User</span>
            <span className="md:hidden">Add</span>
          </button>

          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-[#EEF0FB] text-primary border border-border dark:bg-surface-raised dark:border-border dark:text-accent dark:hover:bg-slate-700 transition"
          >
            <span className="hidden md:inline">Standard Dashboard</span>
            <span className="md:hidden">Dashboard</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={logout}
            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 dark:bg-red-950/40 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-900/40 transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── NAVIGATION TABS ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-surface rounded-2xl border border-border shadow-xs overflow-x-auto scrollbar-none transition-colors duration-200">
          {[
            { id: 'overview', icon: TrendingUp, label: 'Overview & KPI Stats' },
            { id: 'businesses', icon: Building2, label: `Multi-Tenant Businesses (${availableBusinesses.length || stats?.total_organizations || 0})` },
            { id: 'admins', icon: ShieldCheck, label: `Admin Management (${admins.length})` },
            { id: 'analytics', icon: BarChart3, label: 'Admin & Platform Analytics' },
            { id: 'controls', icon: Sliders, label: 'System Controls & Audit' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'text-white'
                    : 'text-text-secondary hover:text-text hover:bg-surface-selected'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="superadmin-active-tab"
                    className="absolute inset-0 bg-primary rounded-xl shadow-md shadow-primary/25"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 mt-6">
        {isLoading && !stats ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full border-4 border-warning/30 border-t-amber-400 animate-spin" />
            <p className="text-sm font-semibold text-warning/80">Loading SuperAdmin telemetry...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.165, 0.84, 0.44, 1] }}
            >
            {/* ══════════════════════════════════════════════
                TAB 1: OVERVIEW & PLATFORM TELEMETRY
            ══════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Master Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* SuperAdmin & Admin Counts */}
                  <div className="bg-white dark:bg-surface p-5 rounded-2xl border border-border shadow-sm relative overflow-hidden transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-primary">
                        Administrators
                      </span>
                      <div className="p-2 rounded-xl bg-primary/10 dark:bg-surface-raised text-primary">
                        <Crown className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-text dark:text-white">
                        <AnimatedCounter value={(stats?.total_admins || 0) + (stats?.total_superadmins || 0)} />
                      </span>
                      <span className="text-xs text-text-secondary dark:text-text-secondary font-medium">
                        ({stats?.total_superadmins || 0} Super, {stats?.total_admins || 0} Admin)
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary dark:text-text-secondary mt-2">
                      Active: <span className="text-emerald-700 dark:text-emerald-400 font-bold">{stats?.active_admins || 0}</span> • Inactive: <span className="text-rose-700 dark:text-rose-400 font-bold">{stats?.inactive_admins || 0}</span>
                    </p>
                  </div>

                  {/* Regular Users / Creators */}
                  <div className="bg-white dark:bg-surface p-5 rounded-2xl border border-border shadow-sm relative overflow-hidden transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-primary">
                        Creators & Users
                      </span>
                      <div className="p-2 rounded-xl bg-primary/10 dark:bg-surface-raised text-primary">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-text dark:text-white">
                        <AnimatedCounter value={stats?.total_users || 0} />
                      </span>
                      <span className="text-xs text-text-secondary dark:text-text-secondary font-medium">
                        +{stats?.new_users_last_30_days || 0} in 30d
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary dark:text-text-secondary mt-2">
                      Active: <span className="text-emerald-700 dark:text-emerald-400 font-bold">{stats?.active_users || 0}</span> • Inactive: <span className="text-rose-700 dark:text-rose-400 font-bold">{stats?.inactive_users || 0}</span>
                    </p>
                  </div>

                  {/* Organizations / Businesses */}
                  <div
                    onClick={() => setActiveTab('businesses')}
                    className="bg-white dark:bg-surface p-5 rounded-2xl border border-border shadow-sm relative overflow-hidden transition-all cursor-pointer hover:border-border dark:hover:border-warning/30 group"
                    title="Click to view all businesses and brand profiles"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-primary group-hover:underline">
                        Business Profiles →
                      </span>
                      <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-on transition-colors">
                        <Building2 className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-text dark:text-white">
                        <AnimatedCounter value={stats?.total_organizations || 0} />
                      </span>
                      <span className="text-xs text-text-secondary dark:text-text-secondary font-medium">Multi-tenant Brands</span>
                    </div>
                    <p className="text-[11px] text-text-secondary dark:text-text-secondary mt-2">
                      Connected Channels: <span className="text-text dark:text-white font-bold">{stats?.total_social_accounts || 0}</span>
                    </p>
                  </div>

                  {/* Total AI Generations */}
                  <div className="bg-white dark:bg-surface p-5 rounded-2xl border border-border shadow-sm relative overflow-hidden transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-primary">
                        AI Generations
                      </span>
                      <div className="p-2 rounded-xl bg-primary/10 dark:bg-surface-raised text-primary">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-text dark:text-white">
                        <AnimatedCounter value={stats?.total_generation_jobs || 0} />
                      </span>
                      <span className="text-xs text-text-secondary dark:text-text-secondary font-medium">Gemini 2.5 Engine</span>
                    </div>
                    <p className="text-[11px] text-text-secondary dark:text-text-secondary mt-2">
                      Total Posts Authored: <span className="text-text dark:text-white font-bold">{stats?.total_posts || 0}</span>
                    </p>
                  </div>
                </div>

                {/* Content Pipeline Status Cards */}
                <div className="bg-white dark:bg-surface rounded-2xl border border-border dark:border-border p-6 shadow-sm transition-colors">
                  <h3 className="text-sm font-bold text-text dark:text-white mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary dark:text-accent" />
                    <span>Global Content Pipeline Breakdown</span>
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                    <div className="p-3.5 rounded-xl bg-surface dark:bg-surface-raised border border-border dark:border-border">
                      <span className="text-[11px] text-text-secondary dark:text-text-secondary font-semibold block mb-1">Published</span>
                      <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">{stats?.total_published_posts || 0}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface dark:bg-surface-raised border border-border dark:border-border">
                      <span className="text-[11px] text-text-secondary dark:text-text-secondary font-semibold block mb-1">Scheduled</span>
                      <span className="text-xl font-black text-primary dark:text-accent">{stats?.total_scheduled_posts || 0}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface dark:bg-surface-raised border border-border dark:border-border">
                      <span className="text-[11px] text-text-secondary dark:text-text-secondary font-semibold block mb-1">Pending Approval</span>
                      <span className="text-xl font-black text-warning dark:text-accent">{stats?.total_pending_posts || 0}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface dark:bg-surface-raised border border-border dark:border-border">
                      <span className="text-[11px] text-text-secondary dark:text-text-secondary font-semibold block mb-1">Drafts</span>
                      <span className="text-xl font-black text-text-secondary dark:text-text">{stats?.total_draft_posts || 0}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface dark:bg-surface-raised border border-border dark:border-border">
                      <span className="text-[11px] text-text-secondary dark:text-text-secondary font-semibold block mb-1">Failed</span>
                      <span className="text-xl font-black text-rose-700 dark:text-rose-400">{stats?.total_failed_posts || 0}</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-surface dark:bg-surface-raised border border-border dark:border-border">
                      <span className="text-[11px] text-text-secondary dark:text-text-secondary font-semibold block mb-1">Total Posts</span>
                      <span className="text-xl font-black text-text dark:text-white">{stats?.total_posts || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Shortcuts to Management */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-primary/10 dark:bg-surface-raised border border-border flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-text dark:text-white text-sm">Multi-Tenant Businesses</h4>
                      <p className="text-xs text-text-secondary dark:text-white/85 mt-1">
                        Retail outlets, store addresses, brand profiles, and MySQL tenant routing.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('businesses')}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-on hover:brightness-110 transition whitespace-nowrap shadow-xs ml-2"
                    >
                      Manage Outlets →
                    </button>
                  </div>

                  <div className="p-5 rounded-2xl bg-warning/10 dark:bg-warning/15 border border-warning/30 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-text dark:text-white text-sm">Administrators</h4>
                      <p className="text-xs text-text-secondary dark:text-white/85 mt-1">
                        View platform admins, assign to stores, and manage permissions.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('admins')}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-warning text-text hover:brightness-110 transition whitespace-nowrap ml-2"
                    >
                      Manage Admins →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                TAB 2: MULTI-TENANT BUSINESS & BRAND MANAGEMENT
            ══════════════════════════════════════════════ */}
            {activeTab === 'businesses' && (
              <AdminMultiBusinessView isSuperAdmin={true} />
            )}

            {/* ══════════════════════════════════════════════
                TAB 3: ADMIN MANAGEMENT
            ══════════════════════════════════════════════ */}
            {activeTab === 'admins' && (
              <div className="space-y-4">
                {/* Search & Filter Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-surface border border-border dark:border-border shadow-xs transition-colors">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-text-muted dark:text-text-secondary absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Search admins by name, email, plan..."
                      value={adminSearch}
                      onChange={(e) => setAdminSearch(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2 rounded-xl text-xs bg-surface border border-border text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-focus-ring/30 focus:border-focus-ring"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={adminStatusFilter}
                      onChange={(e) => setAdminStatusFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl text-xs bg-surface border border-border text-text-secondary font-medium focus:outline-none focus:ring-2 focus:ring-focus-ring/30"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active Only</option>
                      <option value="inactive">Inactive Only</option>
                    </select>

                    <button
                      onClick={() => {
                        setCreateModalRole('admin');
                        setShowCreateModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-on hover:brightness-110 active:scale-95 shadow-md shadow-primary/20 transition whitespace-nowrap ml-auto"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Administrator</span>
                    </button>
                  </div>
                </div>

                {/* Admins Table with Subscription & Post Telemetry */}
                <div className="overflow-x-auto rounded-2xl border border-border dark:border-border bg-white dark:bg-surface shadow-xs transition-colors">
                  <table className="w-full text-left text-xs min-w-[720px]">
                    <thead className="bg-surface text-primary dark:bg-surface-raised dark:text-text font-bold border-b border-border dark:border-border">
                      <tr>
                        <th className="py-3 px-4">Administrator</th>
                        <th className="py-3 px-4">Subscription Plan</th>
                        <th className="py-3 px-4 text-center">Posts Generated</th>
                        <th className="py-3 px-4 text-center">Brand Setup</th>
                        <th className="py-3 px-4">Workspace</th>
                        <th className="py-3 px-4 text-center">Account Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F7F8FC] dark:divide-slate-800">
                      {filteredAdmins.map((adm) => {
                        const isTargetSuper = adm.role === 'super_admin';
                        const planName = adm.subscription_plan || (isTargetSuper ? 'SuperAdmin Master' : 'Starter Tier');
                        const planPrice = adm.subscription_price || (isTargetSuper ? 'Enterprise Unlimited' : '$29/mo');
                        const planStatus = adm.subscription_status || 'active';
                        const workspaceName = adm.organization_name || adm.assigned_businesses?.[0]?.name || 'Autonomous Studio';

                        return (
                          <tr key={adm.id} className="hover:bg-[#FFFFFF] dark:hover:bg-surface/50 transition">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-xs ${
                                  isTargetSuper
                                    ? 'bg-primary text-primary-on ring-2 ring-border'
                                    : 'bg-surface text-primary border border-border'
                                }`}>
                                  {adm.full_name ? adm.full_name[0] : adm.email[0]}
                                </div>
                                <div>
                                  <div className="font-bold text-text flex items-center gap-1.5">
                                    <span>{adm.full_name || 'Administrator'}</span>
                                    {adm.id === user?.id && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary-soft text-primary font-bold border border-border">
                                        You
                                      </span>
                                    )}
                                    {isTargetSuper && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary text-primary-on font-black tracking-wider uppercase">
                                        Super
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-text-secondary dark:text-text-secondary">{adm.email}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1.5 font-bold text-primary dark:text-accent">
                                  <CreditCard className="w-3.5 h-3.5 text-primary dark:text-accent" />
                                  <span>{planName}</span>
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-text-secondary dark:text-text-secondary font-semibold">{planPrice}</span>
                                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                    planStatus === 'active'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                                      : 'bg-warning/10 text-warning border border-warning/30 dark:bg-warning/20 dark:text-accent dark:border-warning/30'
                                  }`}>
                                    {planStatus}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span className="font-black text-sm text-text dark:text-white">
                                  {adm.total_posts_created || 0}
                                </span>
                                <span className="text-[10px] text-text-secondary dark:text-text-secondary">creatives</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {adm.has_brand_profile ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  <span>Configured</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-warning/10 text-warning border border-warning/30 dark:bg-warning/15 dark:text-accent dark:border-warning/30">
                                  <Clock className="w-3 h-3 text-warning dark:text-accent" />
                                  <span>Pending Setup</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] font-semibold text-primary dark:bg-surface-raised dark:border-border dark:text-accent inline-block max-w-[140px] truncate">
                                {workspaceName}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleToggleStatus(adm.id, adm.is_active, adm.full_name || adm.email)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition ${
                                  adm.is_active
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30'
                                }`}
                              >
                                {adm.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                <span>{adm.is_active ? 'Active' : 'Disabled'}</span>
                              </button>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedAdminDetail(adm)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/10/60 border border-border dark:bg-warning/20 dark:text-accent dark:border-warning/30 transition"
                                  title="View Full Admin Telemetry"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Details</span>
                                </button>

                                <select
                                  value={adm.role}
                                  onChange={(e) => handleChangeRole(adm.id, e.target.value, adm.full_name || adm.email)}
                                  className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-surface border border-border text-text-secondary dark:bg-surface dark:border-border dark:text-text focus:outline-none"
                                >
                                  <option value="super_admin">SuperAdmin</option>
                                  <option value="admin">Admin</option>
                                  <option value="creator">Creator</option>
                                </select>

                                {adm.id !== user?.id && (
                                  <button
                                    onClick={() => handleDeleteUser(adm.id, adm.email)}
                                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-400 transition"
                                    title="Delete Administrator"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {filteredAdmins.length === 0 && (
                    <div className="py-12 text-center text-text-secondary dark:text-text-secondary text-xs">
                      No administrators matching criteria.
                    </div>
                  )}
                </div>
              </div>
            )}



            {/* ══════════════════════════════════════════════
                TAB 4: ADMIN & USER COMPARATIVE ANALYTICS
            ══════════════════════════════════════════════ */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                {/* Admin vs User Activity Ratio Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-white dark:bg-surface border border-border dark:border-border shadow-sm transition-colors">
                    <span className="text-xs font-bold text-primary dark:text-accent block mb-2">
                      Content Production Comparison
                    </span>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-info">Regular Users Output</span>
                          <span className="text-text font-bold">{analytics?.user_summary?.posts_created_by_users || 0} posts</span>
                        </div>
                        <div className="w-full h-2 bg-surface-selected rounded-full overflow-hidden">
                          <div
                            className="h-full bg-info rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                ((analytics?.user_summary?.posts_created_by_users || 0) /
                                  Math.max(
                                    1,
                                    (analytics?.user_summary?.posts_created_by_users || 0) +
                                      (analytics?.admin_summary?.posts_created_by_admins || 0)
                                  )) *
                                  100
                              )}%`
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-warning dark:text-accent">Admin Staff Output</span>
                          <span className="text-text dark:text-white font-bold">{analytics?.admin_summary?.posts_created_by_admins || 0} posts</span>
                        </div>
                        <div className="w-full h-2 bg-surface-selected dark:bg-surface-raised rounded-full overflow-hidden">
                          <div
                            className="h-full bg-warning rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                ((analytics?.admin_summary?.posts_created_by_admins || 0) /
                                  Math.max(
                                    1,
                                    (analytics?.user_summary?.posts_created_by_users || 0) +
                                      (analytics?.admin_summary?.posts_created_by_admins || 0)
                                  )) *
                                  100
                              )}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Generation Consumption */}
                  {(() => {
                    const userGenerations = analytics?.user_summary?.generations_by_users || 0;
                    const adminGenerations = analytics?.admin_summary?.generations_by_admins || 0;
                    const totalGenerations = Math.max(1, userGenerations + adminGenerations);
                    const userGenPct = Math.min(100, Math.round((userGenerations / totalGenerations) * 100));
                    const adminGenPct = Math.min(100, Math.round((adminGenerations / totalGenerations) * 100));

                    return (
                      <div className="p-5 rounded-2xl bg-white dark:bg-surface border border-border dark:border-border shadow-sm transition-colors">
                        <span className="text-xs font-bold text-primary dark:text-accent block mb-2">
                          AI Generation Consumption
                        </span>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-purple-600 dark:text-purple-300">User / Creator Generations</span>
                              <span className="text-text dark:text-white font-bold">{userGenerations}</span>
                            </div>
                            <div className="w-full h-2 bg-surface-selected dark:bg-surface-raised rounded-full overflow-hidden">
                              <div
                                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                style={{ width: `${userGenPct}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-warning dark:text-accent">Admin Test Generations</span>
                              <span className="text-text dark:text-white font-bold">{adminGenerations}</span>
                            </div>
                            <div className="w-full h-2 bg-surface-selected dark:bg-surface-raised rounded-full overflow-hidden">
                              <div
                                className="h-full bg-warning rounded-full transition-all duration-500"
                                style={{ width: `${adminGenPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="p-5 rounded-2xl bg-white dark:bg-surface border border-border dark:border-border shadow-sm flex flex-col justify-between transition-colors">
                    <div>
                      <span className="text-xs font-bold text-primary dark:text-accent block mb-1">
                        Ratio User-to-Admin Output
                      </span>
                      <span className="text-3xl font-black text-primary dark:text-accent">
                        {analytics?.ratio_user_to_admin_posts || 0}x
                      </span>
                      <p className="text-xs text-text-secondary dark:text-text-secondary mt-2">
                        For every 1 post generated by an Administrator, Creators produce {analytics?.ratio_user_to_admin_posts || 0} posts autonomously.
                      </p>
                    </div>
                    <div className="pt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Platform Health: Highly Active Creator Base</span>
                    </div>
                  </div>
                </div>

                {/* Top Creators & Top Admins Leaderboards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Creators */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-surface border border-border dark:border-border shadow-sm transition-colors">
                    <h4 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-info" />
                      <span>Top 5 Active Creators (by Content Output)</span>
                    </h4>
                    <div className="divide-y divide-border">
                      {analytics?.top_active_creators && analytics.top_active_creators.length > 0 ? (
                        analytics.top_active_creators.map((c, idx) => (
                          <div key={c.user_id} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 font-bold text-text-secondary">#{idx + 1}</span>
                              <div>
                                <span className="font-bold text-text">{c.name}</span>
                                <span className="block text-[11px] text-text-secondary">{c.email}</span>
                              </div>
                            </div>
                            <span className="font-black text-info">{c.posts} Posts</span>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-xs text-text-secondary dark:text-text-secondary">No creator posts recorded yet.</div>
                      )}
                    </div>
                  </div>

                  {/* Top Admins */}
                  <div className="p-5 rounded-2xl bg-white dark:bg-surface border border-border dark:border-border shadow-sm transition-colors">
                    <h4 className="text-sm font-bold text-text dark:text-white mb-3 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary dark:text-accent" />
                      <span>Top Administrators (by Store Oversight)</span>
                    </h4>
                    <div className="divide-y divide-[#F7F8FC] dark:divide-slate-800">
                      {analytics?.top_managing_admins && analytics.top_managing_admins.length > 0 ? (
                        analytics.top_managing_admins.map((adm, idx) => (
                          <div key={adm.admin_id} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 font-bold text-text-secondary dark:text-text-muted">#{idx + 1}</span>
                              <div>
                                <span className="font-bold text-text dark:text-white">{adm.name}</span>
                                <span className="block text-[11px] text-text-secondary dark:text-text-secondary">{adm.email}</span>
                              </div>
                            </div>
                            <span className="font-black text-primary dark:text-accent">
                              {adm.assigned_organizations} Organizations
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-xs text-text-secondary dark:text-text-secondary">No admins assigned.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Connected Social Media Channels (Strictly YouTube, Facebook, and Instagram) */}
                <div className="p-6 rounded-2xl bg-white dark:bg-surface border border-border dark:border-border shadow-sm transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-text dark:text-white flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-primary dark:text-accent" />
                        <span>Connected Social Media Channels</span>
                      </h4>
                      <p className="text-xs text-text-secondary dark:text-text-secondary mt-1">
                        Enterprise multi-network distribution across YouTube, Facebook, and Instagram
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="inline-flex rounded-lg bg-surface-selected dark:bg-surface-raised p-0.5 text-[11px] font-semibold">
                        {['7d', '30d', '90d'].map((tf) => (
                          <button
                            key={tf}
                            type="button"
                            onClick={() => handleAnalyticsTimeframeChange(tf)}
                            className={`px-2 py-0.5 rounded-md uppercase transition-all ${
                              analyticsTimeframe === tf
                                ? 'bg-white dark:bg-surface-raised text-primary dark:text-accent font-bold shadow-xs'
                                : 'text-text-muted hover:text-text dark:hover:text-white'
                            }`}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-surface dark:bg-surface-raised text-primary dark:text-accent border border-border dark:border-border">
                        3 Core Channels
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const rawDist = analytics?.platform_distribution || {};
                    const platformDist = {
                      youtube: rawDist.youtube || 0,
                      facebook: rawDist.facebook || 0,
                      instagram: rawDist.instagram || 0
                    };
                    const totalAllowedAccounts = platformDist.youtube + platformDist.facebook + platformDist.instagram;

                    const platforms = [
                      {
                        key: 'youtube',
                        name: 'YouTube',
                        tag: 'YT',
                        color: 'text-red-600',
                        badgeBg: 'bg-red-600',
                        barBg: 'bg-red-600',
                        border: 'border-red-200 dark:border-red-900/40',
                        count: platformDist.youtube,
                        desc: 'Video shorts, tutorials & channel broadcasts'
                      },
                      {
                        key: 'facebook',
                        name: 'Facebook',
                        tag: 'FB',
                        color: 'text-[#1877F2]',
                        badgeBg: 'bg-[#1877F2]',
                        barBg: 'bg-[#1877F2]',
                        border: 'border-blue-200 dark:border-blue-900/40',
                        count: platformDist.facebook,
                        desc: 'Brand pages, photo galleries & store footfall'
                      },
                      {
                        key: 'instagram',
                        name: 'Instagram',
                        tag: 'IG',
                        color: 'text-[#E1306C]',
                        badgeBg: 'bg-[#E1306C]',
                        barBg: 'bg-[#E1306C]',
                        border: 'border-pink-200 dark:border-pink-900/40',
                        count: platformDist.instagram,
                        desc: 'Visual carousels, reels & lifestyle aesthetics'
                      }
                    ];

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {platforms.map((p) => {
                          const pct = totalAllowedAccounts > 0 ? Math.round((p.count / totalAllowedAccounts) * 100) : 0;
                          return (
                            <div
                              key={p.key}
                              className={`p-4 rounded-xl bg-surface dark:bg-surface-raised border ${p.border} transition-all`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black text-white ${p.badgeBg}`}>
                                  {p.tag}
                                </span>
                                <span className="text-[11px] font-bold text-text-muted dark:text-text-secondary">
                                  {pct}% Share
                                </span>
                              </div>
                              <div className="text-xl font-black text-text dark:text-white mb-0.5">
                                {p.count} <span className="text-xs font-semibold text-text-muted font-normal">Accounts</span>
                              </div>
                              <div className="text-xs font-bold text-text dark:text-white">{p.name}</div>
                              <p className="text-[11px] text-text-secondary dark:text-text-secondary mt-0.5 mb-2">{p.desc}</p>
                              <div className="w-full h-1.5 bg-slate-200 dark:bg-surface-raised rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${p.barBg} rounded-full transition-all duration-500`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════
                TAB 5: SYSTEM CONTROLS & PLATFORM AUDIT
            ══════════════════════════════════════════════ */}
            {activeTab === 'controls' && (
              <div className="space-y-6">
                {/* Master Governance Toggles */}
                <div className="p-6 rounded-2xl bg-white dark:bg-surface border border-border dark:border-border shadow-sm transition-colors">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-text dark:text-white flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-primary dark:text-accent" />
                        <span>Platform-Wide Master Governance Controls</span>
                      </h3>
                      <p className="text-xs text-text-secondary dark:text-text-secondary mt-1">
                        Executive switches affecting all Admins, Creators, and background worker loops.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Maintenance Mode */}
                    <div className="p-4 rounded-xl bg-surface dark:bg-surface-raised border border-border dark:border-border flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-text dark:text-white block">Platform Maintenance Mode</span>
                        <span className="text-[11px] text-text-secondary dark:text-text-secondary">Suspend non-admin logins for system updates</span>
                      </div>
                      <button
                        onClick={() => handleUpdateControls({ maintenance_mode: !controls?.maintenance_mode })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          controls?.maintenance_mode ? 'bg-rose-500' : 'bg-slate-300 dark:bg-surface-raised'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                            controls?.maintenance_mode ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Open Registration */}
                    <div className="p-4 rounded-xl bg-surface dark:bg-surface-raised border border-border dark:border-border flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-text dark:text-white block">Open User Self-Registration</span>
                        <span className="text-[11px] text-text-secondary dark:text-text-secondary">Allow creators to register without admin invites</span>
                      </div>
                      <button
                        onClick={() => handleUpdateControls({ open_registration: !controls?.open_registration })}
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          controls?.open_registration ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-surface-raised'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                            controls?.open_registration ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Autonomous Scheduler Engine */}
                    <div className="p-4 rounded-xl bg-surface dark:bg-surface-raised border border-border dark:border-border flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-text dark:text-white block">Autonomous AI Scheduler Engine</span>
                        <span className="text-[11px] text-text-secondary dark:text-text-secondary">Background AI content generation & batch synthesis</span>
                      </div>
                      <button
                        onClick={() =>
                          handleUpdateControls({
                            autonomous_scheduler_active: !controls?.autonomous_scheduler_active
                          })
                        }
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          controls?.autonomous_scheduler_active ? 'bg-primary' : 'bg-surface-selected'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                            controls?.autonomous_scheduler_active ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Publishing Worker Loop */}
                    <div className="p-4 rounded-xl bg-surface dark:bg-surface-raised border border-border dark:border-border flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-text dark:text-white block">Social Media Dispatch Worker</span>
                        <span className="text-[11px] text-text-secondary dark:text-text-secondary">Auto-publish approved posts to connected networks</span>
                      </div>
                      <button
                        onClick={() =>
                          handleUpdateControls({
                            publishing_worker_active: !controls?.publishing_worker_active
                          })
                        }
                        className={`w-12 h-6 rounded-full transition-colors relative ${
                          controls?.publishing_worker_active ? 'bg-primary' : 'bg-surface-selected'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                            controls?.publishing_worker_active ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Audit Logs Trail */}
                <div className="p-6 rounded-2xl bg-white dark:bg-surface border border-border dark:border-border shadow-sm transition-colors">
                  <h3 className="text-sm font-bold text-text dark:text-white mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary dark:text-accent" />
                    <span>Real-Time Audit Log Trail</span>
                  </h3>

                  <div className="overflow-x-auto rounded-xl border border-border dark:border-border bg-surface dark:bg-surface/60">
                    <table className="w-full text-left text-xs min-w-[650px]">
                      <thead className="bg-surface text-primary dark:bg-surface-raised dark:text-text font-bold border-b border-border dark:border-border">
                        <tr>
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3">Actor Email</th>
                          <th className="py-2.5 px-3">Role</th>
                          <th className="py-2.5 px-3">Action</th>
                          <th className="py-2.5 px-3">Entity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F7F8FC] dark:divide-slate-800 font-mono text-[11px]">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-white dark:hover:bg-white/[0.02]">
                            <td className="py-2.5 px-3 text-text-secondary dark:text-text-secondary">
                              {log.created_at ? new Date(log.created_at).toLocaleString() : 'Recent'}
                            </td>
                            <td className="py-2.5 px-3 text-text dark:text-white font-semibold">
                              {log.user_email || 'System'}
                            </td>
                            <td className="py-2.5 px-3 text-primary dark:text-accent font-bold">
                              {log.user_role || 'system'}
                            </td>
                            <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold">{log.action}</td>
                            <td className="py-2.5 px-3 text-text-secondary dark:text-text">
                              {log.entity_type} #{log.entity_id || '0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {auditLogs.length === 0 && (
                      <div className="py-8 text-center text-xs text-text-secondary dark:text-text-muted">
                        No audit events recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* ── CREATE ADMIN / USER MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary/70 backdrop-blur-sm">
          <div className="bg-surface border border-border text-text rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative transition-colors">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-xl text-text-muted hover:text-text hover:bg-surface-selected transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-accent" />
              <h3 className="text-lg font-black text-text">Provision Account</h3>
            </div>
            <p className="text-xs text-text-secondary dark:text-text-secondary mb-6">
              Create an administrator or superadmin with direct business assignment.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text dark:text-text mb-1">Account Role</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface dark:bg-surface rounded-xl border border-border dark:border-border">
                  <button
                    type="button"
                    onClick={() => setCreateModalRole('admin')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition ${
                      createModalRole === 'admin'
                        ? 'bg-primary text-primary-on shadow-xs'
                        : 'text-text-secondary hover:text-text'
                    }`}
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateModalRole('super_admin')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition ${
                      createModalRole === 'super_admin'
                        ? 'bg-primary text-primary-on shadow-xs'
                        : 'text-text-secondary hover:text-text'
                    }`}
                  >
                    SuperAdmin
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Elena Rostova"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface border border-border text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-focus-ring/30 focus:border-focus-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="admin@brand.com"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface border border-border text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-focus-ring/30 focus:border-focus-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface border border-border text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-focus-ring/30 focus:border-focus-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">Assign Business Workspace</label>
                <input
                  type="text"
                  required
                  value={newOrgWorkspace}
                  onChange={(e) => setNewOrgWorkspace(e.target.value)}
                  placeholder="e.g. Acme_Corp or Retail_Workspace"
                  list="workspace-suggestions"
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-surface border border-border text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-focus-ring/30 focus:border-focus-ring"
                />
                <datalist id="workspace-suggestions">
                  {availableBusinesses.map((b) => (
                    <option key={b.id} value={b.name} />
                  ))}
                </datalist>
                <p className="text-[10px] text-text-secondary mt-1">
                  Enter custom organization workspace name or select from available tenants.
                </p>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-3 rounded-xl text-xs font-bold bg-primary text-primary-on hover:brightness-110 active:scale-95 transition shadow-lg shadow-primary/20 disabled:opacity-60"
              >
                {isCreating ? 'Provisioning...' : `Create ${createModalRole === 'super_admin' ? 'superadmin' : 'admin'} account`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── ADMIN DETAILS TELEMETRY MODAL ── */}
      {selectedAdminDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-surface rounded-3xl border border-border dark:border-border shadow-2xl max-w-2xl w-full p-6 sm:p-8 relative overflow-hidden max-h-[90vh] overflow-y-auto transition-colors">
            {/* Top Close Button */}
            <button
              onClick={() => setSelectedAdminDetail(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-surface text-text-secondary hover:bg-surface-selected hover:text-text border border-border dark:bg-surface-raised dark:text-text dark:border-border transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-accent text-primary-on flex items-center justify-center font-black text-xl uppercase shadow-md shadow-primary/25 ring-2 ring-border">
                {selectedAdminDetail.full_name ? selectedAdminDetail.full_name[0] : selectedAdminDetail.email[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-text dark:text-white">
                    {selectedAdminDetail.full_name || 'Administrator'}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    selectedAdminDetail.role === 'super_admin'
                      ? 'bg-primary text-primary-on border border-border'
                      : 'bg-primary-soft text-primary border border-border'
                  }`}>
                    {selectedAdminDetail.role === 'super_admin' ? 'SuperAdmin' : 'Admin'}
                  </span>
                </div>
                <p className="text-xs text-text-secondary dark:text-text-secondary mt-0.5">{selectedAdminDetail.email}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-text-secondary dark:text-text-secondary">
                  <span>ID: <strong className="text-text dark:text-white font-mono">#{selectedAdminDetail.id}</strong></span>
                  <span>•</span>
                  <span>Workspace: <strong className="text-primary dark:text-accent">{selectedAdminDetail.organization_name || selectedAdminDetail.assigned_businesses?.[0]?.name || 'Autonomous Studio'}</strong></span>
                </div>
              </div>
            </div>

            {/* 4 Telemetry Quick Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
              {/* Card 1: Subscription */}
              <div className="p-4 rounded-2xl bg-surface dark:bg-surface-raised border border-border dark:border-border shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-text-secondary dark:text-text-secondary uppercase tracking-wider">
                    Subscription Tier
                  </span>
                  <CreditCard className="w-4 h-4 text-primary dark:text-accent" />
                </div>
                <div className="text-base font-extrabold text-primary dark:text-accent">
                  {selectedAdminDetail.subscription_plan || (selectedAdminDetail.role === 'super_admin' ? 'SuperAdmin Master' : 'Starter Tier')}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold text-text dark:text-white">
                    {selectedAdminDetail.subscription_price || (selectedAdminDetail.role === 'super_admin' ? 'Enterprise Unlimited' : '$29/mo')}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                    {selectedAdminDetail.subscription_status || 'active'}
                  </span>
                </div>
              </div>

              {/* Card 2: AI Posts Generated */}
              <div className="p-4 rounded-2xl bg-surface dark:bg-surface-raised border border-border dark:border-border shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-text-secondary dark:text-text-secondary uppercase tracking-wider">
                    AI Posts Generated
                  </span>
                  <Sparkles className="w-4 h-4 text-primary dark:text-accent" />
                </div>
                <div className="text-2xl font-black text-text dark:text-white">
                  {selectedAdminDetail.total_posts_created || 0}
                </div>
                <div className="text-[11px] text-text-secondary dark:text-text-secondary mt-0.5">
                  Generated across connected social channels
                </div>
              </div>

              {/* Card 3: Brand Details */}
              <div className="p-4 rounded-2xl bg-surface dark:bg-surface-raised border border-border dark:border-border shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-text-secondary dark:text-text-secondary uppercase tracking-wider">
                    Brand Setup
                  </span>
                  <Building2 className="w-4 h-4 text-primary dark:text-accent" />
                </div>
                <div>
                  {selectedAdminDetail.has_brand_profile ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Brand Profile Configured
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-warning dark:text-accent">
                      <Clock className="w-4 h-4 text-warning dark:text-accent" />
                      Brand Setup Pending
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-text-secondary dark:text-text-secondary mt-1">
                  {selectedAdminDetail.has_brand_profile
                    ? 'Brand identity, voice & platforms established'
                    : 'Awaiting brand parameters gathering'}
                </div>
              </div>

              {/* Card 4: Account Status */}
              <div className="p-4 rounded-2xl bg-surface dark:bg-surface-raised border border-border dark:border-border shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-text-secondary dark:text-text-secondary uppercase tracking-wider">
                    Governance Status
                  </span>
                  <ShieldCheck className="w-4 h-4 text-primary dark:text-accent" />
                </div>
                <div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                    selectedAdminDetail.is_active ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                  }`}>
                    {selectedAdminDetail.is_active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {selectedAdminDetail.is_active ? 'Active Administrator' : 'Account Disabled'}
                  </span>
                </div>
                <div className="text-[11px] text-text-secondary dark:text-text-secondary mt-1">
                  Approvals Reviewed: <strong className="text-text dark:text-white">{selectedAdminDetail.total_approvals_reviewed || 0}</strong>
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-border dark:border-border">
              <button
                onClick={() => {
                  handleToggleStatus(selectedAdminDetail.id, selectedAdminDetail.is_active, selectedAdminDetail.full_name || selectedAdminDetail.email);
                  setSelectedAdminDetail(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  selectedAdminDetail.is_active
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-400'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-400'
                }`}
              >
                {selectedAdminDetail.is_active ? 'Disable Admin Account' : 'Activate Admin Account'}
              </button>

              <button
                onClick={() => setSelectedAdminDetail(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-primary-on bg-primary hover:brightness-110 shadow-md shadow-primary/20 transition"
              >
                Close Telemetry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SuperAdminPage;
