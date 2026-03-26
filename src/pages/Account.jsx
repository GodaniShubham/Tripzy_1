import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  ArrowRight,
  BarChart3,
  CalendarRange,
  Compass,
  LogOut,
  Map,
  MapPin,
  Route,
  Share2,
  Sparkles,
  UserCircle2,
  Wallet,
} from 'lucide-react';

import AuthModal from '../components/AuthModal';
import { useAuth } from '../components/AuthProvider';
import { fetchUsageSummary } from '../lib/usageMetrics';
import { loadTripPlan } from '../lib/tripStorage';

const formatDateLabel = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });

const getTravelerLabel = (value = '1') => {
  const count = Number.parseInt(String(value), 10);
  return Number.isFinite(count) && count > 1 ? `${count} travelers` : '1 traveler';
};

const buildQuickActions = (navigate, hasTrip) => [
  {
    label: 'New Trip',
    note: 'Start a fresh planner flow',
    action: () => navigate('/trips'),
  },
  {
    label: 'Discover',
    note: 'Browse route ideas and moods',
    action: () => navigate('/discover'),
  },
  {
    label: hasTrip ? 'Open Overview' : 'Go Home',
    note: hasTrip ? 'Resume your latest itinerary' : 'Return to your main feed',
    action: () => navigate(hasTrip ? '/overview' : '/'),
  },
];

const buildActivitySections = (user) => [
  {
    key: 'plannerSearches',
    title: 'Planner Searches',
    empty: 'No saved planner searches yet.',
    icon: Route,
    items: user?.activities?.plannerSearches || [],
  },
  {
    key: 'generatedItineraries',
    title: 'Generated Itineraries',
    empty: 'No generated itinerary linked yet.',
    icon: Sparkles,
    items: user?.activities?.generatedItineraries || [],
  },
  {
    key: 'sharedItineraries',
    title: 'Shared Trips',
    empty: 'No shared itinerary yet.',
    icon: Share2,
    items: user?.activities?.sharedItineraries || [],
  },
];

export default function Account() {
  const navigate = useNavigate();
  const tripPlan = loadTripPlan();
  const { user, isAuthenticated, isAuthReady, signOut, syncTripToAccount } = useAuth();
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [analyticsError, setAnalyticsError] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const itinerary = tripPlan?.ai?.days || [];
  const totalStops = useMemo(
    () => itinerary.reduce((count, day) => count + (day.stops?.length || 0), 0),
    [itinerary]
  );

  const quickActions = useMemo(
    () => buildQuickActions(navigate, Boolean(tripPlan)),
    [navigate, tripPlan]
  );

  const activitySections = useMemo(() => buildActivitySections(user), [user]);

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      try {
        const summary = await fetchUsageSummary();
        if (!isMounted) return;
        setAnalyticsSummary(summary);
        setAnalyticsError('');
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to load analytics summary', error);
        setAnalyticsError('Analytics backend is not connected yet.');
      }
    };

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Layout pageTitle="Account">
      <div className="min-h-full bg-[#f0f2f5] px-4 pt-4 pb-28">
        <div className="rounded-[28px] bg-gradient-to-br from-[#1a1a2e] via-[#22345c] to-[#1e90a8] p-5 text-white shadow-[0_16px_40px_rgba(26,26,46,0.2)] mb-5 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-sm" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/65 mb-3">Travel Profile</p>
              <h1 className="text-[28px] font-black leading-[1.05]">
                {isAuthenticated ? user.name : 'Tripzy Explorer'}
              </h1>
              <p className="text-[13px] text-white/80 font-medium mt-3 max-w-[260px] leading-relaxed">
                {isAuthenticated
                  ? `${user.email} is now linked to your planner activity, generated itineraries, and shared trips.`
                  : 'Sign in once and we will attach your generated itineraries and shared trips to your account.'}
              </p>
            </div>
            <div className="w-14 h-14 rounded-[18px] bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <UserCircle2 className="w-8 h-8 text-white" strokeWidth={2.1} />
            </div>
          </div>
        </div>

        <section className="mb-5">
          <div className="bg-white rounded-[24px] border border-[#edf1f5] shadow-sm p-5">
            {isAuthenticated ? (
              <>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#94a3b8] mb-2">Signed In</p>
                    <h2 className="text-[20px] font-black text-[#1a1a2e] leading-tight">{user.name}</h2>
                    <p className="text-[12px] text-[#64748b] font-medium mt-2">{user.email}</p>
                  </div>
                  <button
                    onClick={async () => {
                      await signOut();
                    }}
                    className="h-[42px] px-4 rounded-[14px] bg-white border border-[#e2e8f0] text-[#ff7a18] text-[12px] font-black inline-flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={2.4} />
                    Sign out
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-[18px] bg-[#f8fafc] border border-[#e2e8f0] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8] mb-1">Searches</p>
                    <p className="text-[20px] font-black text-[#1a1a2e]">{user.activityCounts?.plannerSearches ?? 0}</p>
                  </div>
                  <div className="rounded-[18px] bg-[#f8fafc] border border-[#e2e8f0] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8] mb-1">Generated</p>
                    <p className="text-[20px] font-black text-[#1a1a2e]">{user.activityCounts?.generatedItineraries ?? 0}</p>
                  </div>
                  <div className="rounded-[18px] bg-[#f8fafc] border border-[#e2e8f0] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8] mb-1">Shared</p>
                    <p className="text-[20px] font-black text-[#1a1a2e]">{user.activityCounts?.sharedItineraries ?? 0}</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#94a3b8] mb-2">Account Access</p>
                    <h2 className="text-[20px] font-black text-[#1a1a2e] leading-tight">Sign in to save your trips</h2>
                    <p className="text-[12px] text-[#64748b] font-medium mt-2 leading-relaxed">
                      We will link your planner searches, generated itineraries, and shared routes to your account.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  disabled={!isAuthReady}
                  className="w-full h-[48px] rounded-[16px] bg-gradient-to-r from-[#ff7a18] to-[#ff9a3c] text-white text-[13px] font-black inline-flex items-center justify-center gap-2"
                >
                  Sign in or create account
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </>
            )}
          </div>
        </section>

        {tripPlan ? (
          <>
            <section className="mb-5">
              <div className="bg-white rounded-[24px] border border-[#edf1f5] shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#94a3b8] mb-2">Latest Trip</p>
                    <h2 className="text-[20px] font-black text-[#1a1a2e] leading-tight">
                      {tripPlan.origin.name} to {tripPlan.destination.name}
                    </h2>
                    <p className="text-[12px] text-[#64748b] font-medium mt-2">
                      {formatDateLabel(tripPlan.preferences.fromDate)} - {formatDateLabel(tripPlan.preferences.toDate)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#fff4ec] px-3 py-1 text-[10px] font-black text-[#ff7a18]">
                    AI ready
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-[18px] bg-[#f8fafc] border border-[#e2e8f0] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8] mb-1">Trip Length</p>
                    <p className="text-[20px] font-black text-[#1a1a2e]">{tripPlan.preferences.days} Days</p>
                  </div>
                  <div className="rounded-[18px] bg-[#f8fafc] border border-[#e2e8f0] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8] mb-1">Planner Mode</p>
                    <p className="text-[20px] font-black text-[#1a1a2e]">{tripPlan.journey.primaryMode}</p>
                  </div>
                  <div className="rounded-[18px] bg-[#f8fafc] border border-[#e2e8f0] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8] mb-1">Budget</p>
                    <p className="text-[20px] font-black text-[#1a1a2e]">{tripPlan.budgetEstimate.totalLabel}</p>
                  </div>
                  <div className="rounded-[18px] bg-[#f8fafc] border border-[#e2e8f0] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8] mb-1">Planned Stops</p>
                    <p className="text-[20px] font-black text-[#1a1a2e]">{totalStops}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/overview')}
                    className="flex-1 h-[46px] rounded-[16px] bg-gradient-to-r from-[#ff7a18] to-[#ff9a3c] text-white text-[13px] font-black inline-flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    Open Overview
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => navigate('/ai-planner')}
                    className="h-[46px] px-4 rounded-[16px] bg-white border border-[#e2e8f0] text-[#1e90a8] text-[13px] font-black inline-flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <Map className="w-4 h-4" strokeWidth={2.4} />
                    Map
                  </button>
                </div>
              </div>
            </section>

            <section className="mb-5">
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h2 className="text-[18px] font-black text-[#1a1a2e]">Preference Memory</h2>
                  <p className="text-[12px] text-[#64748b] font-medium mt-1">These are the last planning inputs used for your route.</p>
                </div>
                <Sparkles className="w-4 h-4 text-[#ff7a18]" strokeWidth={2.4} />
              </div>
              <div className="bg-white rounded-[24px] border border-[#edf1f5] shadow-sm p-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    tripPlan.preferences.budget,
                    tripPlan.preferences.travelMode,
                    tripPlan.preferences.travelStyle,
                    getTravelerLabel(tripPlan.preferences.travelers),
                    tripPlan.preferences.tripType,
                    tripPlan.preferences.pace,
                    ...((tripPlan.preferences.interests || []).slice(0, 4)),
                  ]
                    .filter(Boolean)
                    .map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full bg-[#f8fafc] border border-[#e2e8f0] px-3 py-1.5 text-[11px] font-bold text-[#334155]"
                      >
                        {chip}
                      </span>
                    ))}
                </div>
              </div>
            </section>
          </>
        ) : (
          <section className="mb-5">
            <div className="bg-white rounded-[24px] border border-[#edf1f5] shadow-sm p-6 text-center">
              <div className="w-14 h-14 rounded-[18px] bg-[#fff4ec] mx-auto flex items-center justify-center mb-4">
                <Compass className="w-7 h-7 text-[#ff7a18]" strokeWidth={2.2} />
              </div>
              <h2 className="text-[20px] font-black text-[#1a1a2e]">No saved trip yet</h2>
              <p className="text-[13px] text-[#64748b] font-medium mt-3 leading-relaxed max-w-[280px] mx-auto">
                Plan one route and this page will start showing your latest trip summary, preferences, and quick resume actions.
              </p>
              <button
                onClick={() => navigate('/trips')}
                className="mt-5 h-[46px] px-5 rounded-[16px] bg-gradient-to-r from-[#ff7a18] to-[#ff9a3c] text-white text-[13px] font-black inline-flex items-center gap-2 active:scale-95 transition-transform"
              >
                Plan your first trip
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
          </section>
        )}

        {isAuthenticated && (
          <section className="mb-5">
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <h2 className="text-[18px] font-black text-[#1a1a2e]">Your Trip Activity</h2>
                <p className="text-[12px] text-[#64748b] font-medium mt-1">Saved after sign in and share actions.</p>
              </div>
              <Sparkles className="w-4 h-4 text-[#ff7a18]" strokeWidth={2.4} />
            </div>

            <div className="flex flex-col gap-4">
              {activitySections.map((section) => {
                const Icon = section.icon;

                return (
                  <div key={section.key} className="bg-white rounded-[24px] border border-[#edf1f5] shadow-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-[14px] bg-[#fff4ec] flex items-center justify-center text-[#ff7a18]">
                        <Icon className="w-4 h-4" strokeWidth={2.4} />
                      </div>
                      <div>
                        <p className="text-[15px] font-black text-[#1a1a2e]">{section.title}</p>
                        <p className="text-[11px] text-[#94a3b8] font-bold">{section.items.length} saved</p>
                      </div>
                    </div>

                    {section.items.length ? (
                      <div className="flex flex-col gap-3">
                        {section.items.slice(0, 4).map((item) => (
                          <div key={`${section.key}-${item.tripKey}`} className="rounded-[18px] bg-[#f8fafc] border border-[#e2e8f0] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[14px] font-black text-[#1a1a2e] truncate">{item.routeLabel}</p>
                                <p className="text-[11px] text-[#64748b] font-medium mt-1">
                                  {item.days} days • {item.travelStyle || 'Flexible'} • {item.tripType || 'Trip'}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#ff7a18] border border-[#ffd7bf]">
                                {item.budget || 'Budget'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                              <span className="rounded-full bg-white border border-[#e2e8f0] px-3 py-1 text-[10px] font-black text-[#334155]">
                                {item.primaryMode || item.travelMode || 'Smart'}
                              </span>
                              <span className="rounded-full bg-white border border-[#e2e8f0] px-3 py-1 text-[10px] font-black text-[#334155]">
                                {item.totalStops || 0} stops
                              </span>
                              <span className="rounded-full bg-white border border-[#e2e8f0] px-3 py-1 text-[10px] font-black text-[#334155]">
                                {item.travelers || '1'} traveler
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] font-medium text-[#64748b]">{section.empty}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h2 className="text-[18px] font-black text-[#1a1a2e]">Usage Analytics</h2>
              <p className="text-[12px] text-[#64748b] font-medium mt-1">Live counts from your backend service.</p>
            </div>
            <BarChart3 className="w-4 h-4 text-[#ff7a18]" strokeWidth={2.4} />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white rounded-[20px] border border-[#edf1f5] shadow-sm p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8] mb-2">Visitors</p>
              <p className="text-[22px] font-black text-[#1a1a2e]">{analyticsSummary?.uniqueVisitors ?? '--'}</p>
            </div>
            <div className="bg-white rounded-[20px] border border-[#edf1f5] shadow-sm p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8] mb-2">Used Planner</p>
              <p className="text-[22px] font-black text-[#1a1a2e]">{analyticsSummary?.usersWhoUsedPlanner ?? '--'}</p>
            </div>
            <div className="bg-white rounded-[20px] border border-[#edf1f5] shadow-sm p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8] mb-2">Itineraries</p>
              <p className="text-[22px] font-black text-[#1a1a2e]">{analyticsSummary?.itinerariesGenerated ?? '--'}</p>
            </div>
          </div>
          {analyticsError && (
            <div className="bg-white rounded-[18px] border border-[#edf1f5] shadow-sm p-4 mb-5">
              <p className="text-[12px] font-medium text-[#64748b]">{analyticsError}</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h2 className="text-[18px] font-black text-[#1a1a2e]">Quick Actions</h2>
              <p className="text-[12px] text-[#64748b] font-medium mt-1">Fast jumps for your next move.</p>
            </div>
            <Route className="w-4 h-4 text-[#ff7a18]" strokeWidth={2.4} />
          </div>
          <div className="grid grid-cols-1 gap-3">
            {quickActions.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="bg-white rounded-[20px] border border-[#edf1f5] shadow-sm p-4 text-left active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-black text-[#1a1a2e]">{item.label}</p>
                    <p className="text-[12px] text-[#64748b] font-medium mt-1">{item.note}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#ff7a18] shrink-0" strokeWidth={2.7} />
                </div>
              </button>
            ))}
          </div>

          {tripPlan && (
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="bg-white rounded-[20px] border border-[#edf1f5] shadow-sm p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8] mb-2 flex items-center gap-1.5">
                  <CalendarRange className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.5} />
                  Date Window
                </p>
                <p className="text-[14px] font-black text-[#1a1a2e]">
                  {formatDateLabel(tripPlan.preferences.fromDate)} - {formatDateLabel(tripPlan.preferences.toDate)}
                </p>
              </div>
              <div className="bg-white rounded-[20px] border border-[#edf1f5] shadow-sm p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#94a3b8] mb-2 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.5} />
                  Route Snapshot
                </p>
                <p className="text-[14px] font-black text-[#1a1a2e] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#1e90a8]" strokeWidth={2.4} />
                  {tripPlan.origin.name} - {tripPlan.destination.name}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode="signin"
        title="Sign in to save your trip data"
        subtitle="Once you sign in, we will attach your planner searches, generated itineraries, and shared trips to this account."
        onSuccess={async () => {
          if (tripPlan) {
            try {
              await syncTripToAccount(tripPlan, ['planner_search', 'generated_itinerary']);
            } catch (error) {
              console.error('Failed to sync trip after auth', error);
            }
          }
        }}
      />
    </Layout>
  );
}
