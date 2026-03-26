import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Bot,
  Database,
  Download,
  Eye,
  EyeOff,
  LogOut,
  Maximize2,
  Menu,
  MessageSquareQuote,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Route,
  Share2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import {
  buildAdminWebSocketUrl,
  downloadAdminExport,
  fetchAdminMe,
  fetchAdminPanelData,
  signInAdmin,
  signOutAdmin,
} from '../lib/adminApi';

const ADMIN_SIDEBAR_STORAGE_KEY = 'tripzy_admin_sidebar_collapsed';

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '--';

const formatCurrency = (value) => `INR ${Number(value || 0).toFixed(2)}`;

const Card = ({ title, subtitle, action, children }) => (
  <section className="min-w-0 rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)] sm:p-5">
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h2 className="text-[20px] font-black tracking-[-0.02em] text-slate-950">{title}</h2>
        {subtitle ? <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
    {children}
  </section>
);

const SmallButton = ({ onClick, children, dark = false, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-[12px] font-black transition-all ${
      dark ? 'bg-slate-900 text-white hover:bg-slate-800' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
    } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
  >
    {children}
  </button>
);

const Stat = ({ label, value, meta, icon: Icon, tone }) => {
  const toneMap = {
    teal: 'bg-teal-600',
    cyan: 'bg-cyan-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500',
    violet: 'bg-violet-600',
    rose: 'bg-rose-500',
    slate: 'bg-slate-900',
  };

  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-3 text-[24px] font-black leading-none text-slate-950">{value}</p>
          {meta ? <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-500">{meta}</p> : null}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-[14px] text-white ${toneMap[tone] || toneMap.slate}`}>
          <Icon className="h-4.5 w-4.5" strokeWidth={2.3} />
        </div>
      </div>
    </div>
  );
};

const CompactStat = ({ label, value, meta, icon: Icon, tone }) => {
  const toneMap = {
    teal: 'bg-teal-600',
    cyan: 'bg-cyan-600',
    emerald: 'bg-emerald-600',
    amber: 'bg-amber-500',
    violet: 'bg-violet-600',
    rose: 'bg-rose-500',
    slate: 'bg-slate-900',
  };

  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{label}</p>
          <p className="mt-2.5 text-[20px] font-black leading-none text-slate-950 sm:text-[24px] break-words">{value}</p>
          {meta ? <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-500">{meta}</p> : null}
        </div>
        <div className={`flex h-8.5 w-8.5 items-center justify-center rounded-[14px] text-white ${toneMap[tone] || toneMap.slate}`}>
          <Icon className="h-4 w-4" strokeWidth={2.3} />
        </div>
      </div>
    </div>
  );
};

const Empty = ({ text }) => (
  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-[13px] font-semibold text-slate-500">
    {text}
  </div>
);

const InfoPair = ({ label, value }) => (
  <div className="rounded-[16px] border border-slate-200 bg-slate-50/80 px-3 py-2.5">
    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
    <p className="mt-1 text-[13px] font-bold text-slate-900 break-words">{value}</p>
  </div>
);

const getProviderStatusMeta = (provider) => {
  const hasRealSuccess = Boolean(provider?.lastSuccessAt) || Number(provider?.successesToday || 0) > 0;

  if (provider?.status === 'active' && hasRealSuccess) {
    return {
      label: 'Active',
      className: 'bg-emerald-100 text-emerald-700',
    };
  }

  if (provider?.status === 'disabled') {
    return {
      label: 'Disabled',
      className: 'bg-rose-100 text-rose-700',
    };
  }

  if (provider?.status === 'exhausted') {
    return {
      label: 'Exhausted',
      className: 'bg-amber-100 text-amber-700',
    };
  }

  if (provider?.status === 'cooldown') {
    return {
      label: 'Cooldown',
      className: 'bg-cyan-100 text-cyan-700',
    };
  }

  return {
    label: 'Deactive',
    className: 'bg-slate-200 text-slate-700',
  };
};

const NavItem = ({ active, compact = false, icon: Icon, label, description, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full rounded-[18px] border text-left transition-all ${compact ? 'px-2.5 py-2.5' : 'px-3.5 py-3'} ${
      active
        ? 'border-slate-900 bg-slate-900 text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)]'
        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
    }`}
  >
    <div className={`flex ${compact ? 'items-center justify-center' : 'items-center'} gap-3`}>
      <div
        className={`mt-0.5 flex shrink-0 items-center justify-center ${compact ? 'h-9 w-9 rounded-[16px]' : 'h-10 w-10 rounded-2xl'} ${
          active ? 'bg-white/12 text-white' : 'bg-slate-100 text-slate-600'
        }`}
      >
        <Icon className={`${compact ? 'h-4 w-4' : 'h-4.5 w-4.5'}`} strokeWidth={2.2} />
      </div>
      <div className={`min-w-0 ${compact ? 'hidden' : 'block'}`}>
        <p className={`text-[12px] font-black ${active ? 'text-white' : 'text-slate-900'}`}>{label}</p>
      </div>
    </div>
  </button>
);

export default function AdminPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const [counterSection, setCounterSection] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [panelData, setPanelData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [animatedEarlyUsers, setAnimatedEarlyUsers] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(ADMIN_SIDEBAR_STORAGE_KEY) === 'true';
  });
  const [isCounterFullscreen, setIsCounterFullscreen] = useState(false);
  const [counterAnimationDurationMs, setCounterAnimationDurationMs] = useState(1200);
  const liveCounterResetTimer = useRef(0);

  const overview = panelData?.overview;
  const users = panelData?.users || [];
  const itineraries = panelData?.itineraries || [];
  const aiProviders = panelData?.aiProviders || [];
  const shares = panelData?.shares || [];
  const feedback = panelData?.feedback || [];
  const aiUsage = panelData?.aiUsage;
  const launchEstimate = panelData?.launchEstimate;
  const activePage = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);
    return parts[1] || 'overview';
  }, [location.pathname]);

  const adminPages = [
    { id: 'overview', label: 'Overview', icon: BarChart3, description: 'Launch metrics, cost forecast, and operational summary.' },
    { id: 'live-counter', label: 'Live Counter', icon: ShieldCheck, description: 'Full-screen first 500 lifetime membership counter.' },
    { id: 'users', label: 'Users', icon: Users, description: 'Registered accounts, early access, and user activity.' },
    { id: 'itineraries', label: 'Itineraries', icon: Route, description: 'Saved trip runs with provider, token, and fallback data.' },
    { id: 'feedback', label: 'Feedback', icon: MessageSquareQuote, description: 'User answers, ratings, and planning pain points.' },
    { id: 'ai', label: 'AI Control', icon: Bot, description: 'Provider rotation, premium guardrails, and spend tracking.' },
    { id: 'data', label: 'Data Flow', icon: Database, description: 'Storage paths, export flow, and file-backed system design.' },
  ];

  const currentPage = adminPages.find((page) => page.id === activePage) || adminPages[0];

  const topStats = useMemo(
    () =>
      overview
        ? [
            { label: 'Visitors', value: overview.uniqueVisitors, meta: 'Unique tracked visits', icon: BarChart3, tone: 'teal' },
            { label: 'Planner Users', value: overview.usersWhoUsedPlanner, meta: 'Users who opened planning', icon: Users, tone: 'cyan' },
            { label: 'Itineraries', value: overview.itinerariesGenerated, meta: 'Trips generated', icon: Route, tone: 'amber' },
            { label: 'Shared Trips', value: overview.totalShares, meta: 'Saved share links', icon: Share2, tone: 'violet' },
            { label: 'Feedback', value: overview.totalFeedbackEntries, meta: 'User feedback entries', icon: MessageSquareQuote, tone: 'rose' },
            { label: 'Early Users', value: `${overview.earlyUsersClaimed}/${overview.earlyUserLimit}`, meta: `${overview.earlyUsersRemaining} slots left`, icon: ShieldCheck, tone: 'emerald' },
          ]
        : [],
    [overview]
  );

  useEffect(() => {
    const target = Number(overview?.earlyUsersClaimed || 0);
    const durationMs = counterAnimationDurationMs;
    const startValue = animatedEarlyUsers;
    const delta = target - startValue;

    if (!delta) return undefined;

    const startedAt = performance.now();
    let frameId = 0;

    const tick = (now) => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      setAnimatedEarlyUsers(Math.round(startValue + delta * eased));
      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [counterAnimationDurationMs, overview?.earlyUsersClaimed]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ADMIN_SIDEBAR_STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsCounterFullscreen(Boolean(document.fullscreenElement && counterSection && document.fullscreenElement === counterSection));
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, [counterSection]);

  useEffect(
    () => () => {
      window.clearTimeout(liveCounterResetTimer.current);
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const currentAdmin = await fetchAdminMe();
        if (!mounted) return;
        if (!currentAdmin) {
          setIsLoading(false);
          return;
        }
        setAdmin(currentAdmin);
        const data = await fetchAdminPanelData();
        if (!mounted) return;
        setPanelData(data);
      } catch (loadError) {
        if (!mounted) return;
        console.error('Failed to bootstrap admin panel', loadError);
        setError(loadError.message || 'Could not load admin panel.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!admin) return undefined;

    const intervalId = window.setInterval(async () => {
      try {
        const data = await fetchAdminPanelData();
        setPanelData(data);
      } catch (loadError) {
        console.error('Failed to live refresh admin panel', loadError);
      }
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [admin]);

  useEffect(() => {
    if (!admin) return undefined;

    const socketUrl = buildAdminWebSocketUrl();
    if (!socketUrl) return undefined;

    let reconnectTimer = 0;
    let socket;
    let closedManually = false;

    const connect = () => {
      socket = new WebSocket(socketUrl);

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data || '{}');
          if (!payload.overview) return;

          if (payload.type === 'admin_counter_preview') {
            setCounterAnimationDurationMs(5200);
            setPanelData((current) =>
              current
                ? {
                    ...current,
                    overview: payload.overview,
                  }
                : {
                    overview: payload.overview,
                    users: [],
                    itineraries: [],
                    aiProviders: [],
                    shares: [],
                    feedback: [],
                    aiUsage: null,
                    launchEstimate: null,
                  }
            );

            window.clearTimeout(liveCounterResetTimer.current);
            liveCounterResetTimer.current = window.setTimeout(async () => {
              try {
                setCounterAnimationDurationMs(1200);
                const data = await fetchAdminPanelData();
                setPanelData(data);
              } catch (loadError) {
                console.error('Failed to reset live counter preview', loadError);
              }
            }, 6000);
            return;
          }

          if (payload.type !== 'admin_overview') return;

          setCounterAnimationDurationMs(1200);

          setPanelData((current) =>
            current
              ? {
                  ...current,
                  overview: payload.overview,
                }
              : {
                  overview: payload.overview,
                  users: [],
                  itineraries: [],
                  aiProviders: [],
                  shares: [],
                  feedback: [],
                  aiUsage: null,
                  launchEstimate: null,
                }
          );
        } catch (socketError) {
          console.error('Failed to parse admin live update', socketError);
        }
      };

      socket.onclose = () => {
        if (closedManually) return;
        reconnectTimer = window.setTimeout(connect, 2500);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      closedManually = true;
      window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [admin]);

  const refreshPanel = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await fetchAdminPanelData();
      setPanelData(data);
    } catch (loadError) {
      console.error('Failed to refresh admin panel', loadError);
      setError(loadError.message || 'Could not refresh admin data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError('Username and password are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const nextAdmin = await signInAdmin(credentials);
      setAdmin(nextAdmin);
      const data = await fetchAdminPanelData();
      setPanelData(data);
    } catch (submitError) {
      console.error('Failed to sign in admin', submitError);
      setError(submitError.message || 'Could not sign in.');
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  const handleExport = async (resource, format) => {
    try {
      setError('');
      await downloadAdminExport({ resource, format });
    } catch (downloadError) {
      console.error('Failed to export admin data', downloadError);
      setError(downloadError.message || 'Could not download export.');
    }
  };

  const handleSignOut = async () => {
    await signOutAdmin();
    setAdmin(null);
    setPanelData(null);
    setError('');
  };

  const goToPage = (pageId) => {
    navigate(pageId === 'overview' ? '/admin' : `/admin/${pageId}`);
  };

  const toggleCounterFullscreen = async () => {
    if (!counterSection) return;

    try {
      if (document.fullscreenElement === counterSection) {
        await document.exitFullscreen();
        return;
      }

      await counterSection.requestFullscreen();
    } catch (error) {
      console.error('Failed to toggle counter fullscreen', error);
      setError('Could not open fullscreen mode for the live counter.');
    }
  };

  if (isLoading && !admin && !panelData) {
    return (
      <div className="min-h-screen bg-[#f6f8fb] px-6 py-10">
        <div className="mx-auto flex min-h-[80vh] max-w-[1280px] items-center justify-center">
          <div className="rounded-[30px] border border-white/70 bg-white/90 px-8 py-7 shadow-[0_30px_70px_rgba(15,23,42,0.14)]">
            <p className="text-[20px] font-black text-slate-950">Loading admin workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-[#f6f8fb] px-5 py-8 sm:px-6">
        <div className="mx-auto max-w-[1240px]">
          <div className="grid min-h-[calc(100vh-64px)] items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_420px]">
            <div className="rounded-[30px] border border-slate-200 bg-slate-900 p-7 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:p-10">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-300">Admin Access</p>
              <h1 className="mt-6 max-w-[740px] text-[40px] font-black leading-[0.92] tracking-[-0.04em] sm:text-[62px]">
                Professional control for launch operations
              </h1>
              <p className="mt-5 max-w-[620px] text-[15px] font-medium leading-8 text-slate-300">
                Review signups, trips, AI usage, exports, and early-user allocation from one responsive workspace.
              </p>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
              <p className="text-[12px] font-black uppercase tracking-[0.16em] text-slate-400">Sign In</p>
              <h2 className="mt-4 text-[34px] font-black leading-none tracking-[-0.03em] text-slate-950">Admin workspace</h2>
              <p className="mt-3 text-[14px] font-medium leading-7 text-slate-500">
                Use the backend admin credentials configured in environment variables.
              </p>

              <div className="mt-7 space-y-4">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3.5">
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Username</label>
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(event) => setCredentials((current) => ({ ...current, username: event.target.value }))}
                    placeholder="Enter admin username"
                    className="w-full bg-transparent text-[16px] font-bold text-slate-950 outline-none"
                  />
                </div>
                <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3.5">
                  <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">Password</label>
                  <div className="flex items-center gap-3">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={credentials.password}
                      onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Enter admin password"
                      className="w-full bg-transparent text-[16px] font-bold text-slate-950 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-[12px] font-black text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={2.4} /> : <Eye className="h-4 w-4" strokeWidth={2.4} />}
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>

              {error ? (
                <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-[12px] font-bold text-amber-700">{error}</p>
                </div>
              ) : null}

              <button
                onClick={handleSignIn}
                disabled={isSubmitting}
                className="mt-6 h-[56px] w-full rounded-[20px] bg-slate-950 text-[15px] font-black text-white shadow-[0_16px_32px_rgba(15,23,42,0.22)] transition-all hover:bg-slate-800 disabled:opacity-70"
              >
                {isSubmitting ? 'Signing in...' : 'Open admin workspace'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6f8fb] px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5">
      <div className="mx-auto max-w-[1440px] overflow-x-hidden">
        <div className={`grid items-start gap-5 ${isSidebarCollapsed ? 'md:grid-cols-[88px_minmax(0,1fr)]' : 'md:grid-cols-[272px_minmax(0,1fr)]'}`}>
          {isSidebarOpen ? (
            <button
              type="button"
              aria-label="Close sidebar overlay"
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-30 bg-slate-950/28 md:hidden"
            />
          ) : null}

          <aside className={`fixed inset-y-3 left-3 z-40 flex w-[296px] flex-col overflow-y-auto rounded-[24px] border border-slate-200 bg-white text-slate-900 shadow-[0_16px_44px_rgba(15,23,42,0.08)] transition-transform duration-300 sm:left-4 sm:inset-y-4 md:relative md:inset-auto md:left-auto md:top-auto md:z-auto md:w-auto md:max-h-none md:self-start md:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-[120%]'
          }`}>
            <div className={`flex-1 p-3.5 pt-3.5 sm:p-4 ${isSidebarCollapsed ? 'md:px-2.5 md:pt-3.5' : ''}`}>
              <div className="mb-4 flex items-center justify-between md:hidden">
                <p className="text-[12px] font-black uppercase tracking-[0.16em] text-slate-500">Admin Menu</p>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
                  aria-label="Close admin sidebar"
                >
                  <X className="h-4.5 w-4.5" strokeWidth={2.4} />
                </button>
              </div>

              <div className="space-y-2">
                {adminPages.map((page) => (
                  <NavItem
                    key={page.id}
                    active={activePage === page.id}
                    compact={isSidebarCollapsed}
                    icon={page.icon}
                    label={page.label}
                    description={page.description}
                    onClick={() => goToPage(page.id)}
                  />
                ))}
              </div>

              <div className={`mt-4 grid gap-2.5 sm:grid-cols-2 md:grid-cols-1 ${isSidebarCollapsed ? 'md:hidden' : ''}`}>
                <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Signed in</p>
                  <p className="mt-2 text-[16px] font-black text-slate-950">{admin.username}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">Backend-protected admin session</p>
                </div>
                <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Early access</p>
                  <p className="mt-2 text-[20px] font-black text-slate-950">{overview?.earlyUsersClaimed || 0}/{overview?.earlyUserLimit || 500}</p>
                  <p className="mt-1 text-[11px] font-medium text-slate-500">{overview?.earlyUsersRemaining || 0} slots remaining</p>
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <header className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_16px_42px_rgba(15,23,42,0.05)] sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsSidebarOpen(true)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden"
                      aria-label="Open admin sidebar"
                    >
                      <Menu className="h-5 w-5" strokeWidth={2.3} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSidebarCollapsed((current) => !current)}
                      className="hidden md:inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-slate-700 shadow-sm"
                      aria-label={isSidebarCollapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}
                    >
                      {isSidebarCollapsed ? (
                        <PanelLeftOpen className="h-5 w-5" strokeWidth={2.3} />
                      ) : (
                        <PanelLeftClose className="h-5 w-5" strokeWidth={2.3} />
                      )}
                    </button>
                    <div className="hidden sm:block h-6 w-px bg-slate-200" />
                    <p className="hidden sm:block text-[11px] font-bold text-slate-500">
                      Clean, responsive launch operations dashboard
                    </p>
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Control Center</p>
                  <h2 className="mt-3 text-[28px] font-black leading-[0.95] tracking-[-0.04em] text-slate-950 sm:text-[38px]">
                    {currentPage.label}
                  </h2>
                  <p className="mt-2 max-w-[860px] text-[13px] font-medium leading-6 text-slate-500 sm:text-[14px]">
                    {currentPage.description}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <SmallButton onClick={refreshPanel} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} strokeWidth={2.3} />
                    Refresh
                  </SmallButton>
                  <SmallButton onClick={handleSignOut} dark>
                    <LogOut className="h-4 w-4" strokeWidth={2.3} />
                    Sign out
                  </SmallButton>
                </div>
              </div>

              <div className="mt-4 grid gap-2.5 md:grid-cols-3">
                <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Itineraries today</p>
                  <p className="mt-2 text-[20px] font-black text-slate-950">{overview?.itinerariesGenerated || 0}</p>
                </div>
                <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">AI spend today</p>
                  <p className="mt-2 text-[20px] font-black text-slate-950">{formatCurrency(overview?.estimatedAiSpendInrToday || 0)}</p>
                </div>
                <div className="rounded-[16px] border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Fallback trips</p>
                  <p className="mt-2 text-[20px] font-black text-slate-950">{overview?.fallbackItineraries || 0}</p>
                </div>
              </div>
            </header>

            {error ? (
              <div className="mt-5 rounded-[22px] border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-[13px] font-bold text-amber-700">{error}</p>
              </div>
            ) : null}

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 space-y-6">
            {activePage === 'overview' && (
              <>
                <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.05),transparent_42%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
                      First 500 Early Access
                    </div>
                    <p className="mt-5 text-[14px] font-medium text-slate-500">
                      Lifetime-free allocation tracker for your launch campaign.
                    </p>
                    <div className="mt-6 flex items-end justify-center gap-3">
                      <span className="bg-gradient-to-b from-slate-950 to-slate-700 bg-clip-text text-[68px] font-black leading-none tracking-[-0.06em] text-transparent sm:text-[92px]">
                        {animatedEarlyUsers}
                      </span>
                      <span className="pb-3 text-[28px] font-black text-slate-300 sm:text-[36px]">
                        / {overview?.earlyUserLimit || 500}
                      </span>
                    </div>
                    <div className="mt-6 h-4 w-full max-w-[680px] overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#0f766e_45%,#10b981_100%)] transition-[width] duration-700"
                        style={{
                          width: `${Math.max(
                            2,
                            Math.min(
                              100,
                              ((Number(overview?.earlyUsersClaimed || 0) || 0) / (Number(overview?.earlyUserLimit || 500) || 500)) * 100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="mt-5 grid w-full max-w-[760px] gap-4 sm:grid-cols-3">
                      <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Claimed</p>
                        <p className="mt-2 text-[28px] font-black text-slate-950">{overview?.earlyUsersClaimed || 0}</p>
                      </div>
                      <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Remaining</p>
                        <p className="mt-2 text-[28px] font-black text-slate-950">{overview?.earlyUsersRemaining || 0}</p>
                      </div>
                      <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Progress</p>
                        <p className="mt-2 text-[28px] font-black text-slate-950">
                          {Math.round(((Number(overview?.earlyUsersClaimed || 0) || 0) / (Number(overview?.earlyUserLimit || 500) || 500)) * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {topStats.map((item) => (
                    <Stat key={item.label} {...item} />
                  ))}
                </section>

                <Card title="Launch Forecast" subtitle="Quick cost and launch-day planning metrics.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[26px] border border-slate-300 bg-slate-950 p-6 text-white shadow-[0_20px_50px_rgba(15,23,42,0.22)]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Launch Users</p>
                          <p className="mt-4 text-[38px] font-black leading-none text-white sm:text-[44px]">{launchEstimate?.tripCount || 500}</p>
                          <p className="mt-3 text-[13px] font-semibold leading-6 text-slate-300">Projected launch-day target</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/18 text-cyan-300">
                          <Users className="h-5 w-5" strokeWidth={2.3} />
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Trip Cost</p>
                          <p className="mt-4 text-[32px] font-black leading-none text-slate-950 sm:text-[38px] break-words">{formatCurrency(launchEstimate?.averageTripCostInr || 0)}</p>
                          <p className="mt-3 text-[13px] font-semibold leading-6 text-slate-500">Average estimated cost per trip</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                          <Activity className="h-5 w-5" strokeWidth={2.3} />
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Total Cost</p>
                          <p className="mt-4 text-[32px] font-black leading-none text-slate-950 sm:text-[38px] break-words">{formatCurrency(launchEstimate?.totalCostInr || 0)}</p>
                          <p className="mt-3 text-[13px] font-semibold leading-6 text-slate-500">Projected total AI spend</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                          <BarChart3 className="h-5 w-5" strokeWidth={2.3} />
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Premium Trips</p>
                          <p className="mt-4 text-[32px] font-black leading-none text-slate-950 sm:text-[38px]">{launchEstimate?.premiumTrips || 0}</p>
                          <p className="mt-3 text-[13px] font-semibold leading-6 text-slate-500">Estimated premium fallback share</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                          <ShieldCheck className="h-5 w-5" strokeWidth={2.3} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {activePage === 'live-counter' && (
              <section
                ref={setCounterSection}
                className={`overflow-hidden rounded-[34px] border border-slate-200 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.10),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-8 shadow-[0_22px_60px_rgba(15,23,42,0.08)] sm:px-10 sm:py-12 ${isCounterFullscreen ? 'min-h-screen rounded-none border-0 px-6 py-8 sm:px-10 sm:py-12' : ''}`}
              >
                <div className="flex min-h-[68vh] flex-col items-center justify-center text-center">
                  <div className="flex w-full max-w-[980px] flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                      Live Lifetime Membership Counter
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <SmallButton onClick={toggleCounterFullscreen} dark>
                        {isCounterFullscreen ? <Minimize2 className="h-4 w-4" strokeWidth={2.3} /> : <Maximize2 className="h-4 w-4" strokeWidth={2.3} />}
                        {isCounterFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                      </SmallButton>
                    </div>
                  </div>
                  <h2 className="mt-6 max-w-[920px] text-[30px] font-black leading-[0.95] tracking-[-0.05em] text-slate-950 sm:text-[48px]">
                    First 500 lifetime members claimed live
                  </h2>
                  <p className="mt-4 max-w-[760px] text-[14px] font-medium leading-7 text-slate-500 sm:text-[16px]">
                    Use this focused view to monitor and present the real-time progress of the first 500 lifetime-free memberships.
                  </p>

                  <div className="mt-10 grid grid-cols-[minmax(110px,auto)_auto] items-end justify-center gap-x-3 overflow-visible sm:grid-cols-[minmax(160px,auto)_auto]">
                    <span className="block min-w-[110px] text-right bg-gradient-to-b from-slate-950 to-slate-700 bg-clip-text pb-2 pr-1 text-[84px] font-black leading-[0.92] tracking-[-0.08em] text-transparent sm:min-w-[160px] sm:text-[132px]">
                      {animatedEarlyUsers}
                    </span>
                    <span className="block pb-3 text-[34px] font-black text-slate-300 sm:pb-5 sm:text-[48px]">
                      / {overview?.earlyUserLimit || 500}
                    </span>
                  </div>

                  <div className="mt-8 h-5 w-full max-w-[860px] overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#0f172a_0%,#0f766e_45%,#10b981_100%)] transition-[width] duration-700"
                      style={{
                        width: `${Math.max(
                          2,
                          Math.min(
                            100,
                            ((Number(overview?.earlyUsersClaimed || 0) || 0) / (Number(overview?.earlyUserLimit || 500) || 500)) * 100
                          )
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="mt-8 grid w-full max-w-[980px] gap-4 md:grid-cols-3">
                    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Claimed</p>
                      <p className="mt-3 text-[40px] font-black leading-none text-slate-950">{overview?.earlyUsersClaimed || 0}</p>
                      <p className="mt-3 text-[13px] font-semibold text-slate-500">Users who secured lifetime access</p>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Remaining</p>
                      <p className="mt-3 text-[40px] font-black leading-none text-slate-950">{overview?.earlyUsersRemaining || 0}</p>
                      <p className="mt-3 text-[13px] font-semibold text-slate-500">Spots left before the cap closes</p>
                    </div>
                    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Progress</p>
                      <p className="mt-3 text-[40px] font-black leading-none text-slate-950">
                        {Math.round(((Number(overview?.earlyUsersClaimed || 0) || 0) / (Number(overview?.earlyUserLimit || 500) || 500)) * 100)}%
                      </p>
                      <p className="mt-3 text-[13px] font-semibold text-slate-500">Current completion of the launch counter</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activePage === 'users' && (
              <Card
              title="All Users"
              subtitle="Registered users with activity counts and early-access status."
              action={
                <div className="flex flex-wrap gap-2">
                  <SmallButton onClick={() => handleExport('users', 'csv')} dark>
                    <Download className="h-4 w-4" strokeWidth={2.3} />
                    Users CSV
                  </SmallButton>
                  <SmallButton onClick={() => handleExport('users', 'json')}>
                    <Download className="h-4 w-4" strokeWidth={2.3} />
                    Users JSON
                  </SmallButton>
                </div>
              }
            >
              <div className="space-y-4 md:hidden">
                {users.length ? (
                  users.map((user) => (
                    <div key={user.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[15px] font-black text-slate-950">{user.name}</p>
                          <p className="mt-1 text-[12px] font-semibold text-slate-500 break-all">{user.email}</p>
                          {user.mobileNumber ? <p className="mt-1 text-[12px] font-semibold text-slate-400">{user.mobileNumber}</p> : null}
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${user.flags?.isEarlyUser ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                          {user.flags?.isEarlyUser ? `#${user.flags?.earlyUserNumber}` : 'Standard'}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <InfoPair label="Joined" value={formatDateTime(user.createdAt)} />
                        <InfoPair label="Last login" value={formatDateTime(user.lastLoginAt)} />
                        <InfoPair label="Mobile" value={user.mobileNumber || '--'} />
                        <InfoPair label="Searches" value={user.activityCounts?.plannerSearches ?? 0} />
                        <InfoPair label="Generated" value={user.activityCounts?.generatedItineraries ?? 0} />
                        <InfoPair label="Shared" value={user.activityCounts?.sharedItineraries ?? 0} />
                        <InfoPair label="Lifetime free" value={user.flags?.isEarlyUser ? 'Yes' : 'No'} />
                      </div>
                    </div>
                  ))
                ) : (
                  <Empty text="No signed-up users yet." />
                )}
              </div>

              <div className="hidden max-w-full overflow-x-auto md:block">
                {users.length ? (
                  <table className="w-full min-w-[860px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-[0.14em] text-slate-400">
                        <th className="pb-3 font-black">User</th>
                        <th className="pb-3 font-black">Email</th>
                        <th className="pb-3 font-black">Mobile</th>
                        <th className="pb-3 font-black">Early Access</th>
                        <th className="pb-3 font-black">Searches</th>
                        <th className="pb-3 font-black">Generated</th>
                        <th className="pb-3 font-black">Shared</th>
                        <th className="pb-3 font-black">Last Login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-slate-100 align-top last:border-b-0">
                          <td className="py-4 pr-4">
                            <p className="text-[14px] font-black text-slate-950">{user.name}</p>
                            <p className="mt-1 text-[11px] font-semibold text-slate-400">Joined {formatDateTime(user.createdAt)}</p>
                          </td>
                          <td className="py-4 pr-4 text-[13px] font-semibold text-slate-600">{user.email}</td>
                          <td className="py-4 pr-4 text-[13px] font-semibold text-slate-600">{user.mobileNumber || '--'}</td>
                          <td className="py-4 pr-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black ${user.flags?.isEarlyUser ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                              {user.flags?.isEarlyUser ? `Yes #${user.flags?.earlyUserNumber}` : 'No'}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-[13px] font-black text-slate-950">{user.activityCounts?.plannerSearches ?? 0}</td>
                          <td className="py-4 pr-4 text-[13px] font-black text-slate-950">{user.activityCounts?.generatedItineraries ?? 0}</td>
                          <td className="py-4 pr-4 text-[13px] font-black text-slate-950">{user.activityCounts?.sharedItineraries ?? 0}</td>
                          <td className="py-4 text-[13px] font-semibold text-slate-600">{formatDateTime(user.lastLoginAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <Empty text="No signed-up users yet." />
                )}
              </div>
              </Card>
            )}

            {activePage === 'itineraries' && (
              <Card
              title="Generated Itineraries"
              subtitle="Trip records with provider, tokens, spend, and fallback state."
              action={
                <div className="flex flex-wrap gap-2">
                  <SmallButton onClick={() => handleExport('itineraries', 'csv')} dark>
                    <Download className="h-4 w-4" strokeWidth={2.3} />
                    Itineraries CSV
                  </SmallButton>
                  <SmallButton onClick={() => handleExport('itineraries', 'json')}>
                    <Download className="h-4 w-4" strokeWidth={2.3} />
                    Itineraries JSON
                  </SmallButton>
                </div>
              }
            >
              <div className="space-y-4 md:hidden">
                {itineraries.length ? (
                  itineraries.map((item) => (
                    <div key={item.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[15px] font-black text-slate-950">{item.routeLabel}</p>
                          <p className="mt-1 text-[12px] font-semibold text-slate-500">{formatDateTime(item.createdAt)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${item.wasFallbackUsed ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {item.wasFallbackUsed ? 'Fallback' : 'AI'}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <InfoPair label="User" value={item.userName || 'Guest'} />
                        <InfoPair label="User ID" value={item.userId || '--'} />
                        <InfoPair label="Provider" value={item.providerName || '--'} />
                        <InfoPair label="Provider slot" value={item.providerSlot || item.source || '--'} />
                        <InfoPair label="Travel mode" value={`${item.travelMode || '--'} / ${item.primaryMode || '--'}`} />
                        <InfoPair label="Tokens" value={item.estimatedTotalTokens || 0} />
                        <InfoPair label="Cost" value={item.estimatedCostInr ? `INR ${Number(item.estimatedCostInr).toFixed(3)}` : '--'} />
                        <InfoPair label="Duration" value={item.generationTimeMs ? `${Math.round(item.generationTimeMs)} ms` : '--'} />
                      </div>
                    </div>
                  ))
                ) : (
                  <Empty text="No itinerary logs recorded yet." />
                )}
              </div>

              <div className="hidden max-w-full overflow-x-auto md:block">
                {itineraries.length ? (
                  <table className="w-full min-w-[1080px] xl:min-w-[1160px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-[0.14em] text-slate-400">
                        <th className="pb-3 font-black">Created</th>
                        <th className="pb-3 font-black">User</th>
                        <th className="pb-3 font-black">User ID</th>
                        <th className="pb-3 font-black">Route</th>
                        <th className="pb-3 font-black">Mode</th>
                        <th className="pb-3 font-black">Provider</th>
                        <th className="pb-3 font-black">Tokens</th>
                        <th className="pb-3 font-black">Cost</th>
                        <th className="pb-3 font-black">Duration</th>
                        <th className="pb-3 font-black">Fallback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itineraries.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100 align-top last:border-b-0">
                          <td className="py-4 pr-4 text-[13px] font-semibold text-slate-600">{formatDateTime(item.createdAt)}</td>
                          <td className="py-4 pr-4">
                            <p className="text-[14px] font-black text-slate-950">{item.userName || 'Guest'}</p>
                            <p className="mt-1 text-[11px] font-semibold text-slate-400">{item.userEmail || 'Anonymous'}</p>
                          </td>
                          <td className="py-4 pr-4 text-[12px] font-black text-slate-950">{item.userId || '--'}</td>
                          <td className="py-4 pr-4 text-[13px] font-semibold text-slate-600">{item.routeLabel}</td>
                          <td className="py-4 pr-4 text-[13px] font-semibold text-slate-600">{item.travelMode} / {item.primaryMode}</td>
                          <td className="py-4 pr-4">
                            <p className="text-[13px] font-semibold text-slate-600">{item.providerName || '--'}</p>
                            <p className="mt-1 text-[11px] font-semibold text-slate-400">{item.providerSlot || item.source || '--'}</p>
                          </td>
                          <td className="py-4 pr-4 text-[13px] font-black text-slate-950">{item.estimatedTotalTokens || 0}</td>
                          <td className="py-4 pr-4 text-[13px] font-semibold text-slate-600">{item.estimatedCostInr ? `INR ${Number(item.estimatedCostInr).toFixed(3)}` : '--'}</td>
                          <td className="py-4 pr-4 text-[13px] font-semibold text-slate-600">{item.generationTimeMs ? `${Math.round(item.generationTimeMs)} ms` : '--'}</td>
                          <td className="py-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black ${item.wasFallbackUsed ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {item.wasFallbackUsed ? 'Fallback' : 'AI'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <Empty text="No itinerary logs recorded yet." />
                )}
              </div>
              </Card>
            )}

            {activePage === 'feedback' && (
              <Card
                title="User Feedback"
                subtitle="Submitted answers, ratings, and planning pain points from the trip feedback form."
              >
                <div className="mb-5 grid gap-4 md:grid-cols-3">
                  <CompactStat label="Entries" value={overview?.totalFeedbackEntries || 0} meta="Stored feedback submissions" icon={MessageSquareQuote} tone="rose" />
                  <CompactStat label="Average Rating" value={overview?.averageFeedbackRating || 0} meta="Average user rating across feedback" icon={BarChart3} tone="violet" />
                  <CompactStat label="Latest Response" value={feedback[0]?.submittedAt ? formatDateTime(feedback[0].submittedAt) : '--'} meta="Most recent feedback received" icon={Activity} tone="emerald" />
                </div>

                <div className="space-y-4 md:hidden">
                  {feedback.length ? (
                    feedback.map((entry) => (
                      <div key={entry.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[14px] font-black text-slate-950">{entry.userName || 'Guest'}</p>
                            <p className="mt-1 text-[11px] font-semibold text-slate-500 break-all">{entry.userEmail || 'Anonymous'}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-black text-rose-700">
                            {entry.rating || 0}/5
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3">
                          <InfoPair label="Trip" value={[entry.tripOrigin, entry.tripDestination].filter(Boolean).join(' to ') || '--'} />
                          <InfoPair label="Pain Point" value={entry.frustrationMoment || '--'} />
                          <InfoPair label="Planning Process" value={entry.planningProcess || '--'} />
                          <InfoPair label="Reaction" value={entry.reaction || '--'} />
                          <InfoPair label="Share Moment" value={entry.shareMoment || '--'} />
                          <InfoPair label="Pricing Decision" value={entry.pricingDecision || '--'} />
                          <InfoPair label="Submitted" value={formatDateTime(entry.submittedAt)} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <Empty text="No feedback has been submitted yet." />
                  )}
                </div>

                <div className="hidden max-w-full overflow-x-auto md:block">
                  {feedback.length ? (
                    <table className="w-full min-w-[1220px] xl:min-w-[1280px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-[0.14em] text-slate-400">
                          <th className="pb-3 font-black">Submitted</th>
                          <th className="pb-3 font-black">User</th>
                          <th className="pb-3 font-black">Trip</th>
                          <th className="pb-3 font-black">Rating</th>
                          <th className="pb-3 font-black">Pain Point</th>
                          <th className="pb-3 font-black">Planning Process</th>
                          <th className="pb-3 font-black">Reaction</th>
                          <th className="pb-3 font-black">Share</th>
                          <th className="pb-3 font-black">Pricing Decision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {feedback.map((entry) => (
                          <tr key={entry.id} className="border-b border-slate-100 align-top last:border-b-0">
                            <td className="py-4 pr-4 text-[12px] font-semibold text-slate-600">{formatDateTime(entry.submittedAt)}</td>
                            <td className="py-4 pr-4">
                              <p className="text-[13px] font-black text-slate-950">{entry.userName || 'Guest'}</p>
                              <p className="mt-1 text-[10px] font-semibold text-slate-400 break-all">{entry.userEmail || 'Anonymous'}</p>
                            </td>
                            <td className="py-4 pr-4 text-[12px] font-semibold text-slate-600">{[entry.tripOrigin, entry.tripDestination].filter(Boolean).join(' to ') || '--'}</td>
                            <td className="py-4 pr-4 text-[12px] font-black text-slate-950">{entry.rating || 0}/5</td>
                            <td className="max-w-[220px] py-4 pr-4 text-[12px] font-semibold text-slate-600">{entry.frustrationMoment || '--'}</td>
                            <td className="max-w-[240px] py-4 pr-4 text-[12px] font-semibold text-slate-600">{entry.planningProcess || '--'}</td>
                            <td className="max-w-[220px] py-4 pr-4 text-[12px] font-semibold text-slate-600">{entry.reaction || '--'}</td>
                            <td className="py-4 pr-4 text-[12px] font-semibold text-slate-600">{entry.shareMoment || '--'}</td>
                            <td className="max-w-[260px] py-4 text-[12px] font-semibold text-slate-600">{entry.pricingDecision || '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <Empty text="No feedback has been submitted yet." />
                  )}
                </div>
              </Card>
            )}

            {activePage === 'ai' && (
              <Card title="AI Provider Pool" subtitle="Rotation state and daily provider usage.">
                <div className="mb-5 grid gap-4 md:grid-cols-3">
                  <Stat label="AI Spend Today" value={formatCurrency(aiUsage?.today?.totalCostInr || 0)} meta="Tracked from backend completions" icon={BarChart3} tone="emerald" />
                  <Stat label="Daily Budget" value={aiUsage?.dailyBudgetInr ? formatCurrency(aiUsage.dailyBudgetInr) : 'Not set'} meta="Overall daily AI spend guard" icon={ShieldCheck} tone="amber" />
                  <Stat label="Premium Guard" value={aiUsage?.premiumDailyBudgetInr ? formatCurrency(aiUsage.premiumDailyBudgetInr) : 'Not set'} meta="Premium fallback daily guard" icon={Activity} tone="violet" />
                </div>

                <div className="space-y-4 md:hidden">
                  {aiProviders.length ? (
                    aiProviders.map((provider) => {
                      const providerStatus = getProviderStatusMeta(provider);

                      return (
                      <div key={provider.slot} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[15px] font-black text-slate-950">{provider.slot}</p>
                            <p className="mt-1 text-[12px] font-semibold text-slate-500">{provider.tier} / {provider.model}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black ${providerStatus.className}`}>
                            {providerStatus.label}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <InfoPair label="Failures" value={provider.failures || 0} />
                          <InfoPair label="Requests today" value={provider.requestsToday || 0} />
                          <InfoPair label="Successes today" value={provider.successesToday || 0} />
                          <InfoPair label="Cost today" value={provider.estimatedCostInrToday ? `INR ${Number(provider.estimatedCostInrToday).toFixed(3)}` : '--'} />
                          <InfoPair label="Cooldown until" value={formatDateTime(provider.cooldownUntil)} />
                          <InfoPair label="Last success" value={formatDateTime(provider.lastSuccessAt)} />
                          <InfoPair label="Last error" value={provider.lastError || '--'} />
                        </div>
                      </div>
                    )})
                  ) : (
                    <Empty text="No backend AI providers are configured yet." />
                  )}
                </div>

                <div className="hidden max-w-full overflow-x-auto md:block">
                  {aiProviders.length ? (
                    <table className="w-full min-w-[980px] xl:min-w-[1040px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-[0.14em] text-slate-400">
                          <th className="pb-3 font-black">Slot</th>
                          <th className="pb-3 font-black">Tier</th>
                          <th className="pb-3 font-black">Model</th>
                          <th className="pb-3 font-black">Status</th>
                          <th className="pb-3 font-black">Failures</th>
                          <th className="pb-3 font-black">Requests Today</th>
                          <th className="pb-3 font-black">Successes Today</th>
                          <th className="pb-3 font-black">Cost Today</th>
                          <th className="pb-3 font-black">Cooldown Until</th>
                          <th className="pb-3 font-black">Last Success</th>
                          <th className="pb-3 font-black">Last Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiProviders.map((provider) => {
                          const providerStatus = getProviderStatusMeta(provider);

                          return (
                          <tr key={provider.slot} className="border-b border-slate-100 align-top last:border-b-0">
                            <td className="py-4 pr-4 text-[13px] font-black text-slate-950">{provider.slot}</td>
                            <td className="py-4 pr-4 text-[13px] font-semibold text-slate-600">{provider.tier}</td>
                            <td className="py-4 pr-4 text-[13px] font-semibold text-slate-600">{provider.model}</td>
                            <td className="py-4 pr-4">
                              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black ${providerStatus.className}`}>
                                {providerStatus.label}
                              </span>
                            </td>
                            <td className="py-4 pr-4 text-[13px] font-black text-slate-950">{provider.failures || 0}</td>
                            <td className="py-4 pr-4 text-[13px] font-black text-slate-950">{provider.requestsToday || 0}</td>
                            <td className="py-4 pr-4 text-[13px] font-black text-slate-950">{provider.successesToday || 0}</td>
                            <td className="py-4 pr-4 text-[13px] font-semibold text-slate-600">{provider.estimatedCostInrToday ? `INR ${Number(provider.estimatedCostInrToday).toFixed(3)}` : '--'}</td>
                            <td className="py-4 pr-4 text-[13px] font-semibold text-slate-600">{formatDateTime(provider.cooldownUntil)}</td>
                            <td className="py-4 pr-4 text-[13px] font-semibold text-slate-600">{formatDateTime(provider.lastSuccessAt)}</td>
                            <td className="max-w-[240px] py-4 text-[13px] font-semibold text-slate-600">{provider.lastError || '--'}</td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  ) : (
                    <Empty text="No backend AI providers are configured yet." />
                  )}
                </div>
              </Card>
            )}

            {activePage === 'data' && (
              <Card title="Data Flow" subtitle="Where the first 500 users, itinerary logs, and AI state are saved and how they appear in admin.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Stat label="First 500 Logic" value={`${overview?.earlyUsersClaimed || 0}/${overview?.earlyUserLimit || 500}`} meta="Allocated in signup and shown on the Users page" icon={ShieldCheck} tone="violet" />
                  <Stat label="Saved Itineraries" value={overview?.totalItineraryLogs || 0} meta="Visible on the Itineraries page with user and provider info" icon={Route} tone="amber" />
                  <Stat label="AI State" value={aiProviders.length || 0} meta="Visible on the AI Control page with cooldown and cost details" icon={Activity} tone="emerald" />
                  <Stat label="Exports" value="Users + Trips" meta="Download from Users or Itineraries pages as CSV or JSON" icon={Download} tone="cyan" />
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    {
                      title: 'User data store',
                      text: 'The first 500 lifetime-free users are tracked in server file storage and exposed on the Users page through the early-access badge and counters.',
                      path: 'server/data/users.json',
                    },
                    {
                      title: 'Itinerary log store',
                      text: 'Every generated itinerary is saved with user ID, provider, token estimate, fallback state, and timing, then shown on the Itineraries page.',
                      path: 'server/data/itineraries.json',
                    },
                    {
                      title: 'AI provider store',
                      text: 'Provider cooldowns, failures, daily usage, and spend tracking are kept in file storage and shown on the AI Control page.',
                      path: 'server/data/ai-provider-state.json',
                    },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                      <p className="text-[15px] font-black text-slate-950">{item.title}</p>
                      <p className="mt-2 text-[13px] font-medium leading-6 text-slate-500">{item.text}</p>
                      <p className="mt-3 rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-700 shadow-sm">{item.path}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
              </div>

              <aside className="min-w-0 space-y-6">
                <Card title="Operational Snapshot" subtitle="Fast launch-day health check.">
                  <div className="space-y-3">
                    {[
                      { label: 'AI spend today', value: formatCurrency(overview?.estimatedAiSpendInrToday || 0) },
                      { label: 'Premium calls today', value: overview?.premiumCallsToday || 0 },
                      { label: 'Early users remaining', value: overview?.earlyUsersRemaining || 0 },
                      { label: 'Fallback trips', value: overview?.fallbackItineraries || 0 },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3">
                        <p className="text-[12px] font-bold text-slate-500">{item.label}</p>
                        <p className="text-[14px] font-black text-slate-950">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Shared Itineraries" subtitle="Recent share links stored by the backend.">
                  <div className="space-y-3">
                    {shares.length ? (
                      shares.map((share) => (
                        <div key={share.shareId} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[16px] font-black text-slate-950">{share.origin} to {share.destination}</p>
                              <p className="mt-2 text-[12px] font-semibold leading-6 text-slate-500">
                                {share.days} days / {share.travelStyle} / {share.tripType}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-black text-amber-700 shadow-sm">
                              {share.budget}
                            </span>
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <code className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-bold text-white">{share.shareId}</code>
                            <p className="text-[11px] font-semibold text-slate-400">{formatDateTime(share.createdAt)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <Empty text="No shares created yet." />
                    )}
                  </div>
                </Card>

                <Card title="Recent Feedback" subtitle="Latest submitted feedback answers.">
                  <div className="space-y-3">
                    {feedback.length ? (
                      feedback.slice(0, 3).map((entry) => (
                        <div key={entry.id} className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[15px] font-black text-slate-950">{entry.userName || 'Guest'}</p>
                              <p className="mt-1 text-[12px] font-semibold text-slate-500">{entry.tripDestination || 'Trip feedback'}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-rose-100 px-3 py-1 text-[11px] font-black text-rose-700">
                              {entry.rating || 0}/5
                            </span>
                          </div>
                          <p className="mt-3 text-[12px] font-semibold leading-6 text-slate-600">{entry.frustrationMoment || entry.planningProcess || 'No feedback text available.'}</p>
                          <p className="mt-3 text-[11px] font-semibold text-slate-400">{formatDateTime(entry.submittedAt)}</p>
                        </div>
                      ))
                    ) : (
                      <Empty text="No feedback has been submitted yet." />
                    )}
                  </div>
                </Card>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
