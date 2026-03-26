import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import AuthModal from '../components/AuthModal';
import { useAuth } from '../components/AuthProvider';
import WikipediaImage from '../components/WikipediaImage';
import {
  Camera,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  MessageSquareQuote,
  Navigation2,
  Share2,
  Star,
  Wallet,
  CloudSun,
  Route,
  X,
  Zap,
} from 'lucide-react';

import {
  buildTripFeedbackId,
  decodeTripPlanSharePayload,
  encodeTripPlanSharePayload,
  hasTripFeedback,
  loadTripPlan,
  saveTripFeedback,
  saveTripPlan,
} from '../lib/tripStorage';
import { submitTripFeedback } from '../lib/feedbackApi';
import { createTripShareLink, fetchSharedTripPlan } from '../lib/shareLinks';

const formatDateLabel = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

const getTravelerLabel = (value = '1') => {
  if (value === '3-5') return '4 travelers';
  if (value === '6+') return '6 travelers';
  if (value === '5+') return '5 travelers';

  const count = Number.parseInt(String(value), 10);
  return Number.isFinite(count) && count > 1 ? `${count} travelers` : '1 traveler';
};

const getTravelModeLabel = (value = 'Smart') =>
  value === 'Road' ? 'Road' : value === 'Train' ? 'Train' : value === 'Flight' ? 'Flight' : 'Smart';

const buildShareSummary = ({ origin, destination, preferences, budgetEstimate, journey, totalStops }) =>
  [
    `My Tripzy plan: ${origin.name} to ${destination.name}`,
    `${preferences.days} days`,
    `${totalStops} stops`,
    `${budgetEstimate.totalLabel} total (~${budgetEstimate.perPersonLabel} per person)`,
    `${journey.primaryMode} transfer`,
    `${preferences.travelStyle} style`,
    `${preferences.tripType} trip`,
  ].join(' | ');

const buildShareMessage = (summary, shareUrl) =>
  [
    summary,
    '',
    'Open plan:',
    shareUrl,
  ].join('\n');

const buildSharePreviewUrl = (shareUrl) => {
  try {
    const url = new URL(shareUrl);
    return `${url.origin}${url.pathname}`;
  } catch (error) {
    return shareUrl;
  }
};

const wrapCanvasText = (context, text, maxWidth) => {
  const words = String(text || '').split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      return;
    }

    currentLine = testLine;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const buildShareCardFile = async ({ destination, origin, preferences, budgetEstimate, journey, totalStops, shareUrl }) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not prepare share card.');
  }

  const gradient = context.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, '#0f6a7a');
  gradient.addColorStop(0.55, '#1e90a8');
  gradient.addColorStop(1, '#ff9a3c');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = 'rgba(255,255,255,0.08)';
  context.beginPath();
  context.arc(880, 220, 220, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(140, 1060, 260, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#ffffff';
  context.font = '700 38px Inter, sans-serif';
  context.fillText('TRIPZY', 90, 110);

  context.font = '900 96px Inter, sans-serif';
  context.fillText(destination.name, 90, 250);

  context.font = '600 36px Inter, sans-serif';
  context.fillStyle = 'rgba(255,255,255,0.92)';
  context.fillText(`${origin.name} to ${destination.name}`, 90, 310);

  const pills = [
    `${preferences.days} days`,
    `${totalStops} stops`,
    budgetEstimate.totalLabel,
    journey.primaryMode,
  ];

  let pillX = 90;
  pills.forEach((pill) => {
    context.font = '700 28px Inter, sans-serif';
    const width = context.measureText(pill).width + 56;
    context.fillStyle = 'rgba(255,255,255,0.16)';
    context.beginPath();
    context.roundRect(pillX, 360, width, 64, 32);
    context.fill();
    context.fillStyle = '#ffffff';
    context.fillText(pill, pillX + 28, 401);
    pillX += width + 18;
  });

  context.fillStyle = '#ffffff';
  context.beginPath();
  context.roundRect(70, 470, 940, 560, 40);
  context.fill();

  context.fillStyle = '#1e90a8';
  context.font = '800 28px Inter, sans-serif';
  context.fillText('AI GENERATED PLAN', 120, 560);

  context.fillStyle = '#1a1a2e';
  context.font = '800 56px Inter, sans-serif';
  context.fillText('Shareable Trip Card', 120, 630);

  context.fillStyle = '#4b5563';
  context.font = '500 32px Inter, sans-serif';
  wrapCanvasText(
    context,
    `${preferences.travelStyle} style, ${preferences.tripType} trip, ${getTravelerLabel(preferences.travelers).toLowerCase()}, ${budgetEstimate.budgetNote}.`,
    820
  ).slice(0, 3).forEach((line, index) => {
    context.fillText(line, 120, 700 + index * 46);
  });

  const shareLines = wrapCanvasText(context, shareUrl, 820).slice(0, 3);
  context.fillStyle = '#ff7a18';
  context.font = '800 26px Inter, sans-serif';
  context.fillText('Open plan', 120, 870);
  context.fillStyle = '#0f6a7a';
  context.font = '600 24px Inter, sans-serif';
  shareLines.forEach((line, index) => {
    context.fillText(line, 120, 920 + index * 34);
  });

  context.fillStyle = 'rgba(255,255,255,0.92)';
  context.font = '700 28px Inter, sans-serif';
  context.fillText('Plan your trip in 30 seconds', 90, 1200);
  context.font = '500 24px Inter, sans-serif';
  context.fillText('tripzy', 90, 1245);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('Could not export share card.');
  }

  const fileName = `tripzy-${destination.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'trip'}.png`;
  return new File([blob], fileName, { type: 'image/png' });
};

const reactionOptions = [
  'This would genuinely save me time',
  'I would be impressed but still verify it',
  'I would compare it with other apps first',
  'I would not trust it yet',
];

const frustrationScaleOptions = [
  { emoji: '😣', label: 'Very frustrated' },
  { emoji: '😕', label: 'Frustrated' },
  { emoji: '😐', label: 'Mixed' },
  { emoji: '🙂', label: 'Mostly okay' },
  { emoji: '😄', label: 'Happy' },
];

const planningProcessOptions = [
  'Google',
  'YouTube',
  'Instagram',
  'Travel apps',
  'Friends and family',
  'Other',
];

const shareIntentOptions = ['Yes', 'Maybe', 'No'];

export default function Overview() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { user, isAuthenticated, syncTripToAccount } = useAuth();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const shareId = params.shareId || searchParams.get('shareId') || '';
  const shareApi = searchParams.get('shareApi') || '';
  const sharedTripPlan = useMemo(
    () => decodeTripPlanSharePayload(searchParams.get('share') || ''),
    [searchParams]
  );
  const [remoteSharedTripPlan, setRemoteSharedTripPlan] = useState(null);
  const [isRemoteSharedTripLoading, setIsRemoteSharedTripLoading] = useState(Boolean(shareId));
  const tripPlan = remoteSharedTripPlan || sharedTripPlan || loadTripPlan();
  const tripFeedbackId = useMemo(() => buildTripFeedbackId(tripPlan), [tripPlan]);
  const [activeTab, setActiveTab] = useState(0);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingShareAction, setPendingShareAction] = useState('open');
  const [shareFeedback, setShareFeedback] = useState('');
  const [shortShareUrl, setShortShareUrl] = useState(shareId ? window.location.href : '');
  const [isPreparingShare, setIsPreparingShare] = useState(false);
  const [isFeedbackSubmitted, setIsFeedbackSubmitted] = useState(() => hasTripFeedback(tripFeedbackId));
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackAnswers, setFeedbackAnswers] = useState({
    frustrationMoment: '',
    planningProcess: '',
    planningProcessOther: '',
    reaction: '',
    shareMoment: '',
    pricingDecision: '',
  });
  const [feedbackError, setFeedbackError] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [leaveWarning, setLeaveWarning] = useState('');
  const hasExitGuardEntry = useRef(false);

  const itinerary = tripPlan?.ai?.days || [];
  const totalStops = useMemo(
    () => itinerary.reduce((count, day) => count + (day.stops?.length || 0), 0),
    [itinerary]
  );

  useEffect(() => {
    if (!shareId) {
      setIsRemoteSharedTripLoading(false);
      return undefined;
    }

    let isMounted = true;

    const loadSharedTrip = async () => {
      try {
        setIsRemoteSharedTripLoading(true);
        const fetchedTripPlan = await fetchSharedTripPlan(shareId, shareApi);
        if (!isMounted) return;
        setRemoteSharedTripPlan(fetchedTripPlan);
        saveTripPlan(fetchedTripPlan);
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to load remote shared trip', error);
      } finally {
        if (isMounted) {
          setIsRemoteSharedTripLoading(false);
        }
      }
    };

    loadSharedTrip();

    return () => {
      isMounted = false;
    };
  }, [shareApi, shareId]);

  useEffect(() => {
    if (!tripPlan) return;
    setIsFeedbackSubmitted(hasTripFeedback(tripFeedbackId));
  }, [tripFeedbackId, tripPlan]);

  useEffect(() => {
    if (!sharedTripPlan) return;
    saveTripPlan(sharedTripPlan);
  }, [sharedTripPlan]);

  useEffect(() => {
    if (!tripPlan) return undefined;

    const handleBeforeUnload = (event) => {
      if (isFeedbackSubmitted) return;
      event.preventDefault();
      event.returnValue = '';
    };

    const handlePopState = () => {
      if (isFeedbackSubmitted) {
        if (hasExitGuardEntry.current) {
          hasExitGuardEntry.current = false;
          navigate(-1);
        }
        return;
      }

      window.history.pushState(null, '', window.location.href);
      setIsFeedbackOpen(true);
      setLeaveWarning('Please submit your feedback before leaving this page.');
    };

    if (!isFeedbackSubmitted && !hasExitGuardEntry.current) {
      window.history.pushState(null, '', window.location.href);
      hasExitGuardEntry.current = true;
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isFeedbackSubmitted, navigate, tripPlan]);

  useEffect(() => {
    if (!tripPlan || isFeedbackSubmitted) {
      window.__tripzyOverviewFeedbackGate = undefined;
      return undefined;
    }

    window.__tripzyOverviewFeedbackGate = (message) => {
      setIsFeedbackOpen(true);
      setLeaveWarning(message || 'Please submit your feedback before leaving this page.');
      return true;
    };

    return () => {
      window.__tripzyOverviewFeedbackGate = undefined;
    };
  }, [isFeedbackSubmitted, tripPlan]);

  const openFeedbackGate = (message) => {
    setIsShareOpen(false);
    setIsFeedbackOpen(true);
    setLeaveWarning(message || 'Please submit your feedback before continuing.');
  };

  const updateFeedbackAnswer = (key, value) => {
    setFeedbackAnswers((current) => ({ ...current, [key]: value }));
    setFeedbackError('');
    setLeaveWarning('');
  };

  const syncCurrentTripToAccount = async (types) => {
    try {
      await syncTripToAccount(tripPlan, types);
    } catch (error) {
      console.error('Failed to sync trip activity', error);
    }
  };

  const ensureShortShareUrl = async () => {
    if (shortShareUrl) return shortShareUrl;

    try {
      setIsPreparingShare(true);
      const { shareUrl } = await createTripShareLink(tripPlan, window.location.origin);
      setShortShareUrl(shareUrl);
      return shareUrl;
    } catch (error) {
      console.error('Failed to create short share link', error);
      setShortShareUrl(fallbackShareUrl);
      return fallbackShareUrl;
    } finally {
      setIsPreparingShare(false);
    }
  };

  const openShareSheet = () => {
    setIsShareOpen(true);
    setShareFeedback('');
    ensureShortShareUrl();
  };

  const handleShareTrigger = async () => {
    if (!isAuthenticated) {
      setPendingShareAction('open');
      setIsAuthModalOpen(true);
      return;
    }

    await syncCurrentTripToAccount(['planner_search', 'generated_itinerary']);
    openShareSheet();
  };

  const handleFeedbackSubmit = async () => {
    if (isSubmittingFeedback) return;

    const resolvedPlanningProcess =
      feedbackAnswers.planningProcess === 'Other'
        ? feedbackAnswers.planningProcessOther.trim()
        : feedbackAnswers.planningProcess.trim();

    const hasAllAnswers =
      rating > 0 &&
      feedbackAnswers.frustrationMoment.trim() &&
      resolvedPlanningProcess &&
      feedbackAnswers.reaction.trim() &&
      feedbackAnswers.shareMoment.trim() &&
      feedbackAnswers.pricingDecision.trim();

    if (!hasAllAnswers) {
      setFeedbackError('Please answer all questions and give a star rating before continuing.');
      return;
    }

    const feedbackPayload = {
      rating,
      ...feedbackAnswers,
      planningProcess: resolvedPlanningProcess,
      tripOrigin: tripPlan?.origin?.name || '',
      tripDestination: tripPlan?.destination?.name || '',
      userName: user?.name || '',
      userEmail: user?.email || '',
    };

    try {
      setIsSubmittingFeedback(true);
      await submitTripFeedback(feedbackPayload);
    } catch (error) {
      console.error('Failed to submit feedback to backend', error);
    } finally {
      setIsSubmittingFeedback(false);
    }

    saveTripFeedback(tripFeedbackId, feedbackPayload);
    setIsFeedbackSubmitted(true);
    setIsFeedbackOpen(false);
    setFeedbackError('');
    setLeaveWarning('');
  };

  if (!tripPlan) {
    if (isRemoteSharedTripLoading) {
      return (
        <Layout hideHeader>
          <div className="min-h-full bg-[#f0f2f5] px-4 pt-12 pb-28">
            <div className="bg-white rounded-[24px] p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)] border border-[#edf1f5]">
              <h1 className="text-[22px] font-black text-[#1a1a2e]">Opening shared trip</h1>
              <p className="text-[13px] text-[#64748b] font-medium mt-3 leading-relaxed">
                We are loading the shared itinerary for you.
              </p>
            </div>
          </div>
        </Layout>
      );
    }

    return (
      <Layout hideHeader>
        <div className="min-h-full bg-[#f0f2f5] px-4 pt-12 pb-28">
          <div className="bg-white rounded-[24px] p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)] border border-[#edf1f5]">
            <h1 className="text-[22px] font-black text-[#1a1a2e]">No trip data found</h1>
            <p className="text-[13px] text-[#64748b] font-medium mt-3 leading-relaxed">
              Start from the planner flow again so we can generate the live route, weather, places, and itinerary.
            </p>
            <button
              onClick={() => navigate('/trips')}
              className="mt-5 w-full h-[48px] rounded-[16px] bg-gradient-to-r from-[#ff7a18] to-[#ff9a3c] text-white font-extrabold text-[14px]"
            >
              Back to planner
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const { origin, destination, route, journey: storedJourney, weather, budgetEstimate, places, ai, preferences } = tripPlan;
  const journey = storedJourney || {
    primaryMode: 'Road',
    totalDurationText: route.durationText,
    totalCostLabel: budgetEstimate.breakdown?.[0]?.value || budgetEstimate.totalLabel,
    summary: `${origin.name} to ${destination.name}`,
    dataSourceLabel: 'Estimated transport plan',
    legs: [],
  };
  const dailyWeather = weather.slice(0, Math.min(weather.length, 4));
  const preferenceChips = [
    `${formatDateLabel(preferences.fromDate)} - ${formatDateLabel(preferences.toDate)}`,
    preferences.budget,
    `${getTravelModeLabel(preferences.travelMode)} transfer`,
    preferences.travelStyle,
    getTravelerLabel(preferences.travelers),
    preferences.tripType,
    preferences.pace,
    ...((preferences.interests || []).slice(0, 3)),
  ].filter(Boolean);
  const shareSummary = buildShareSummary({ origin, destination, preferences, budgetEstimate, journey, totalStops });
  const fallbackShareUrl = (() => {
    const encodedSharePayload = encodeTripPlanSharePayload(tripPlan);
    const url = new URL(`${window.location.origin}/overview${location.search}`);
    if (!url.searchParams.get('share') && !url.searchParams.get('shareId')) {
      url.searchParams.set('share', encodedSharePayload);
    }
    return url.toString();
  })();
  const shareUrl = shortShareUrl || fallbackShareUrl;
  const shareMessage = buildShareMessage(shareSummary, shareUrl);
  const sharePreviewUrl = buildSharePreviewUrl(shareUrl);

  const copyShareText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareFeedback('Copied');
      return true;
    } catch (error) {
      console.error('Copy failed', error);
      setShareFeedback('Copy failed');
      return false;
    }
  };

  const handleWhatsappShare = async () => {
    await syncCurrentTripToAccount(['shared_itinerary']);
    const finalShareUrl = await ensureShortShareUrl();
    const text = encodeURIComponent(buildShareMessage(shareSummary, finalShareUrl));
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
    setShareFeedback('Opening WhatsApp');
  };

  const handleInstagramShare = async () => {
    await syncCurrentTripToAccount(['shared_itinerary']);
    const finalShareUrl = await ensureShortShareUrl();
    await copyShareText(buildShareMessage(shareSummary, finalShareUrl));
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    setShareFeedback('Caption copied for Instagram');
  };

  const handleShareCard = async () => {
    try {
      await syncCurrentTripToAccount(['shared_itinerary']);
      const finalShareUrl = await ensureShortShareUrl();
      const shareCardFile = await buildShareCardFile({
        destination,
        origin,
        preferences,
        budgetEstimate,
        journey,
        totalStops,
        shareUrl: finalShareUrl,
      });

      const message = buildShareMessage(shareSummary, finalShareUrl);
      if (navigator.share && navigator.canShare?.({ files: [shareCardFile] })) {
        await navigator.share({
          title: `${destination.name} trip plan`,
          text: shareSummary,
          files: [shareCardFile],
        });
        setShareFeedback('Image card shared');
        return;
      }

      const downloadUrl = URL.createObjectURL(shareCardFile);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = shareCardFile.name;
      link.click();
      URL.revokeObjectURL(downloadUrl);
      await copyShareText(message);
      setShareFeedback('Image downloaded and caption copied');
    } catch (error) {
      console.error('Failed to share card image', error);
      setShareFeedback('Could not prepare image card');
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;

    try {
      await syncCurrentTripToAccount(['shared_itinerary']);
      const finalShareUrl = await ensureShortShareUrl();
      await navigator.share({
        title: `${destination.name} trip plan`,
        text: shareSummary,
        url: finalShareUrl,
      });
      setShareFeedback('Shared');
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Native share failed', error);
      }
    }
  };

  const handleCopyShareText = async () => {
    await syncCurrentTripToAccount(['shared_itinerary']);
    await copyShareText(shareMessage);
  };

  return (
    <Layout hideHeader>
      <div className="flex flex-col min-h-full bg-[#f0f2f5] pb-[110px] relative">
        <div className="relative h-[300px] shrink-0 overflow-hidden rounded-b-3xl shadow-lg">
          <WikipediaImage
            place={destination.name}
            query={destination.formatted || `${destination.name} India`}
            alt={destination.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f6a7a]/75 via-black/30 to-black/85" />

          <div className="absolute inset-0 p-5 pt-12 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  if (!isFeedbackSubmitted) {
                    openFeedbackGate('Please submit your feedback before leaving this page.');
                    return;
                  }

                  if (hasExitGuardEntry.current) {
                    hasExitGuardEntry.current = false;
                    window.history.go(-2);
                    return;
                  }

                  navigate(-1);
                }}
                className="w-10 h-10 rounded-[14px] bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform"
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
              </button>
              <button
                onClick={handleShareTrigger}
                className="w-10 h-10 rounded-[14px] bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-transform"
              >
                <Share2 className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>

            <div className="mb-2">
              <p className="text-[11px] font-black text-white/80 uppercase tracking-widest mb-1">
                Live Trip Plan
              </p>
              <h1 className="text-[32px] font-black text-white leading-tight mb-3 drop-shadow-md">
                {destination.name}
              </h1>
              <div className="flex flex-wrap gap-2">
                <span className="bg-white/20 border border-white/30 backdrop-blur-md rounded-full px-3 py-1.5 text-[11px] font-bold text-white shadow-sm">
                  {preferences.days} Days
                </span>
                <span className="bg-white/20 border border-white/30 backdrop-blur-md rounded-full px-3 py-1.5 text-[11px] font-bold text-white shadow-sm">
                  {totalStops} Stops
                </span>
                <span className="bg-white/20 border border-white/30 backdrop-blur-md rounded-full px-3 py-1.5 text-[11px] font-bold text-white shadow-sm">
                  {budgetEstimate.totalLabel} total
                </span>
              </div>
              <p className="text-[12px] text-white/85 font-semibold mt-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" strokeWidth={2.5} />
                {origin.name} to {destination.name}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-4 -mt-4 relative z-10 pb-20">
          <div className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] mb-5 flex gap-3.5 items-start">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e90a8] to-[#0f6a7a] flex items-center justify-center shrink-0 shadow-inner">
              <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[10px] font-black text-[#1e90a8] uppercase tracking-wider mb-1">AI Generated Plan</p>
              <p className="text-[12px] text-[#4b5563] font-medium leading-relaxed">{ai.overview}</p>
            </div>
          </div>

          <div className="bg-white rounded-[20px] p-4 shadow-sm border border-[#edf1f5] mb-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8] mb-1">Trip inputs used</p>
                <p className="text-[14px] font-black text-[#1a1a2e] truncate">{origin.name} to {destination.name}</p>
              </div>
              <div className="shrink-0 rounded-full bg-[#fff4ec] px-3 py-1 text-[10px] font-black text-[#ff7a18]">
                AI guided
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {preferenceChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-[#f8fafc] border border-[#e2e8f0] px-3 py-1.5 text-[11px] font-bold text-[#334155]"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-white rounded-[18px] p-4 border border-[#edf1f5] shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8] mb-2 flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.5} />
                Route
              </p>
              <p className="text-[18px] font-black text-[#1a1a2e]">{route.distanceKm.toFixed(0)} km</p>
              <p className="text-[11px] font-semibold text-[#64748b] mt-1">{route.durationText} by road</p>
            </div>
            <div className="bg-white rounded-[18px] p-4 border border-[#edf1f5] shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8] mb-2 flex items-center gap-1.5">
                <CloudSun className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.5} />
                Forecast
              </p>
              <p className="text-[18px] font-black text-[#1a1a2e]">{weather[0] ? `${Math.round(weather[0].max)}°` : '--'}</p>
              <p className="text-[11px] font-semibold text-[#64748b] mt-1">{weather[0]?.summary || 'Forecast loading'}</p>
            </div>
            <div className="bg-white rounded-[18px] p-4 border border-[#edf1f5] shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8] mb-2 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.5} />
                Budget
              </p>
              <p className="text-[18px] font-black text-[#1a1a2e]">{budgetEstimate.totalLabel}</p>
              <p className="text-[11px] font-semibold text-[#64748b] mt-1">{budgetEstimate.budgetNote}</p>
            </div>
            <div className="bg-white rounded-[18px] p-4 border border-[#edf1f5] shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8] mb-2 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.5} />
                Journey
              </p>
              <p className="text-[18px] font-black text-[#1a1a2e]">{journey.primaryMode}</p>
              <p className="text-[11px] font-semibold text-[#64748b] mt-1">{journey.totalDurationText} total transfer</p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-3 mb-2 px-1">
            <button
              onClick={() => setActiveTab(0)}
              className={`shrink-0 px-5 py-2.5 rounded-full border-[1.5px] text-[13px] font-bold transition-all ${
                activeTab === 0
                  ? 'bg-gradient-to-r from-[#ff7a18] to-[#ff9a3c] border-transparent text-white shadow-[0_4px_12px_rgba(255,122,24,0.3)]'
                  : 'bg-white border-[#eaedf2] text-[#adb5bd]'
              }`}
            >
              Overview
            </button>
            {itinerary.map((day) => (
              <button
                key={day.day}
                onClick={() => setActiveTab(day.day)}
                className={`shrink-0 px-5 py-2.5 rounded-full border-[1.5px] text-[13px] font-bold transition-all ${
                  activeTab === day.day
                    ? 'bg-gradient-to-r from-[#ff7a18] to-[#ff9a3c] border-transparent text-white shadow-[0_4px_12px_rgba(255,122,24,0.3)]'
                    : 'bg-white border-[#eaedf2] text-[#adb5bd]'
                }`}
              >
                Day {day.day}
              </button>
            ))}
          </div>

          {activeTab === 0 && (
            <div className="animate-[fadeUp_0.4s_ease_both]">
              <button
                onClick={() => navigate(`/ai-planner${location.search}`)}
                className="w-full h-[52px] rounded-2xl bg-white border-[1.5px] border-[#eaedf2] shadow-sm flex items-center justify-center gap-2.5 text-[14px] font-bold text-[#1e90a8] active:bg-gray-50 transition-colors mb-5"
              >
                <MapIcon className="w-5 h-5" strokeWidth={2.2} />
                Open Live Route Map
              </button>

              <h3 className="text-[14px] font-black text-[#1a1a2e] mb-3 flex items-center gap-2 px-1">
                <span className="bg-[#fff4eb] p-1.5 rounded-lg text-[#ff7a18]">
                  <Route className="w-4 h-4" strokeWidth={2.4} />
                </span>
                How You Will Reach
              </h3>
              <div className="bg-white rounded-[20px] p-5 shadow-sm border border-[#edf1f5] mb-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8] mb-1">Transfer plan</p>
                    <p className="text-[15px] font-black text-[#1a1a2e] truncate">{journey.summary}</p>
                    {journey.dataSourceLabel && (
                      <p className="text-[11px] text-[#64748b] font-medium mt-1">{journey.dataSourceLabel}</p>
                    )}
                  </div>
                  <div className="shrink-0 rounded-full bg-[#fff4ec] px-3 py-1 text-[10px] font-black text-[#ff7a18]">
                    {journey.totalCostLabel}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {journey.legs.map((leg, index) => (
                    <div key={`${leg.title}-${index}`} className="rounded-[18px] bg-[#f8fafc] border border-[#e5edf5] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8] mb-1">Leg {index + 1}</p>
                          <p className="text-[14px] font-extrabold text-[#1a1a2e]">{leg.title}</p>
                          <p className="text-[11px] text-[#64748b] font-medium mt-1 leading-relaxed">
                            {leg.fromLabel} to {leg.toLabel}
                          </p>
                        </div>
                        <div className="shrink-0 rounded-full bg-white px-3 py-1 text-[10px] font-black text-[#1e90a8] border border-[#d9ebf1]">
                          {leg.mode}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3 text-[11px] font-bold text-[#64748b]">
                        <span>{leg.distanceKm} km</span>
                        <span>{leg.durationText}</span>
                        <span>{leg.costLabel}</span>
                      </div>
                      <p className="text-[11px] text-[#94a3b8] font-medium mt-2">{leg.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              {dailyWeather.length > 0 && (
                <>
                  <h3 className="text-[14px] font-black text-[#1a1a2e] mb-3 flex items-center gap-2 px-1">
                    <span className="bg-[#fff4eb] p-1.5 rounded-lg text-[#ff7a18]">
                      <CloudSun className="w-4 h-4" strokeWidth={2.4} />
                    </span>
                    Weather Outlook
                  </h3>
                  <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-4 mb-5">
                    {dailyWeather.map((entry) => (
                      <div key={entry.date} className="min-w-[130px] bg-white rounded-[18px] p-4 border border-[#edf1f5] shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8]">{formatDateLabel(entry.date)}</p>
                        <p className="text-[18px] font-black text-[#1a1a2e] mt-2">{Math.round(entry.max)}°</p>
                        <p className="text-[11px] font-semibold text-[#64748b] mt-1">{entry.summary}</p>
                        <p className="text-[10px] font-bold text-[#ff7a18] mt-2">Rain {entry.rainChance}%</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <h3 className="text-[14px] font-black text-[#1a1a2e] mb-3 flex items-center gap-2 px-1">
                <span className="bg-[#fff4eb] p-1.5 rounded-lg text-[#ff7a18]">
                  <MapPin className="w-4 h-4" strokeWidth={2.4} />
                </span>
                Top Nearby Highlights
              </h3>
              <div className="flex flex-col gap-3 mb-5">
                {places.slice(0, 6).map((place, index) => (
                  <div key={`${place.id}-${index}`} className="bg-white rounded-[18px] p-4 border border-[#edf1f5] shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8] mb-1">{place.categoryLabel}</p>
                        <h4 className="text-[15px] font-extrabold text-[#1a1a2e] truncate">{place.name}</h4>
                        <p className="text-[11px] text-[#64748b] font-medium mt-1 line-clamp-2">{place.address}</p>
                      </div>
                      <div className="shrink-0 rounded-full bg-[#fff4ec] px-3 py-1 text-[10px] font-black text-[#ff7a18]">
                        {(place.distanceMeters / 1000).toFixed(1)} km
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="text-[14px] font-black text-[#1a1a2e] mb-3 flex items-center gap-2 px-1">
                <span className="bg-[#fff4eb] p-1.5 rounded-lg text-[#ff7a18]">
                  <Wallet className="w-4 h-4" strokeWidth={2.4} />
                </span>
                Budget Breakdown
              </h3>
              <div className="bg-white rounded-[20px] p-5 shadow-sm border border-[#edf1f5] mb-5">
                <div className="flex flex-col gap-3">
                  {budgetEstimate.breakdown.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-3">
                      <p className="text-[12px] font-semibold text-[#64748b]">{item.label}</p>
                      <p className="text-[13px] font-black text-[#1a1a2e]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <h3 className="text-[14px] font-black text-[#1a1a2e] mb-3 flex items-center gap-2 px-1">
                <span className="bg-[#fff4eb] p-1.5 rounded-lg text-[#ff7a18]">
                  <Zap className="w-4 h-4" strokeWidth={2.4} />
                </span>
                Smart Tips
              </h3>
              <div className="flex flex-col gap-3">
                {ai.tips.map((tip, index) => (
                  <div key={index} className="bg-white rounded-xl p-3.5 border border-[#eaedf2] shadow-sm flex gap-3">
                    <Zap className="w-4 h-4 text-[#ff7a18] shrink-0 mt-0.5" strokeWidth={2.5} />
                    <p className="text-[12px] font-medium text-[#4b5563] leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab > 0 && itinerary[activeTab - 1] && (
            <div className="animate-[fadeUp_0.4s_ease_both]">
              <div className="bg-white rounded-[20px] p-5 shadow-sm border border-[#f0f2f5]">
                <p className="text-[11px] font-bold text-[#adb5bd] uppercase tracking-wider mb-1.5">
                  {formatDateLabel(itinerary[activeTab - 1].date)}
                </p>
                <h2 className="text-[18px] font-black text-[#1a1a2e] mb-1">
                  Day {itinerary[activeTab - 1].day}: {itinerary[activeTab - 1].theme}
                </h2>
                <p className="text-[12px] font-medium text-[#64748b] mb-3">{itinerary[activeTab - 1].summary}</p>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#fff4ec] px-3 py-1.5 text-[11px] font-bold text-[#ff7a18] mb-6">
                  <Calendar className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {itinerary[activeTab - 1].weatherNote}
                </div>

                <div className="relative border-l-[2.5px] border-[#f0f2f5] ml-3.5 pl-6 pb-2 flex flex-col gap-8">
                  {itinerary[activeTab - 1].stops.map((stop, index) => (
                    <div key={`${stop.name}-${index}`} className="relative">
                      <div className="absolute -left-[32px] top-1 w-4 h-4 rounded-full bg-white border-[3px] border-[#ff7a18] shadow-sm" />
                      <p className="text-[10px] font-bold text-[#ff7a18] uppercase tracking-wider mb-1">Stop #{index + 1}</p>
                      <h4 className="text-[15px] font-extrabold text-[#1a1a2e] mb-1.5 leading-tight">{stop.name}</h4>
                      <p className="text-[11px] font-medium text-[#64748b] leading-relaxed mb-2">{stop.reason}</p>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8b98a5]">
                        <Navigation2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                        {stop.duration} &middot; {stop.type}
                      </div>
                      {stop.address && (
                        <p className="text-[11px] text-[#94a3b8] font-medium mt-2">{stop.address}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {isShareOpen && (
          <div className="fixed inset-0 z-[120] bg-black/45 flex items-end justify-center">
            <div className="absolute inset-0" onClick={() => setIsShareOpen(false)} />
            <div className="relative w-full max-w-[420px] rounded-t-[28px] bg-white px-5 pt-5 pb-7 shadow-2xl">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <p className="text-[18px] font-black text-[#1a1a2e]">Share this plan</p>
                  <p className="text-[12px] text-[#64748b] font-medium mt-1 leading-relaxed">
                    Send your itinerary summary to WhatsApp, Instagram, or copy it.
                  </p>
                </div>
                <button
                  onClick={() => setIsShareOpen(false)}
                  className="w-10 h-10 rounded-[14px] bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center text-[#64748b]"
                >
                  <X className="w-5 h-5" strokeWidth={2.5} />
                </button>
              </div>

              <div className="rounded-[18px] bg-[#f8fafc] border border-[#e2e8f0] p-4 mb-4">
                <p className="text-[13px] font-bold text-[#1a1a2e] leading-relaxed">{shareSummary}</p>
                {user?.email && (
                  <p className="text-[11px] font-bold text-[#1e90a8] mt-2">Sharing as {user.email}</p>
                )}
                <div className="mt-3 rounded-[14px] border border-[#e2e8f0] bg-white px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8] mb-1">Link included automatically</p>
                  <p className="text-[11px] font-semibold text-[#64748b] break-all">{sharePreviewUrl}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleWhatsappShare}
                  disabled={isPreparingShare}
                  className="h-[52px] rounded-[16px] bg-[#25D366] text-white font-extrabold text-[13px] flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" strokeWidth={2.4} />
                  {isPreparingShare ? 'Preparing...' : 'WhatsApp'}
                </button>
                <button
                  onClick={handleInstagramShare}
                  className="h-[52px] rounded-[16px] bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white font-extrabold text-[13px] flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" strokeWidth={2.4} />
                  Instagram
                </button>
                <button
                  onClick={handleShareCard}
                  className="h-[52px] rounded-[16px] bg-white border border-[#e2e8f0] text-[#1e90a8] font-extrabold text-[13px] flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" strokeWidth={2.4} />
                  Share card
                </button>
                {navigator.share ? (
                  <button
                    onClick={handleNativeShare}
                    className="h-[52px] rounded-[16px] bg-white border border-[#e2e8f0] text-[#ff7a18] font-extrabold text-[13px] flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" strokeWidth={2.4} />
                    More
                  </button>
                ) : (
                  <button
                    onClick={handleCopyShareText}
                    className="h-[52px] rounded-[16px] bg-white border border-[#e2e8f0] text-[#ff7a18] font-extrabold text-[13px] flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" strokeWidth={2.4} />
                    Copy text
                  </button>
                )}
              </div>

              {shareFeedback && (
                <p className="text-[11px] font-bold text-[#64748b] mt-4 text-center">{shareFeedback}</p>
              )}
            </div>
          </div>
        )}

        {isFeedbackOpen && !isFeedbackSubmitted && (
          <div className="fixed inset-0 z-[140] bg-[#0b1120]/72 backdrop-blur-sm flex items-center justify-center px-4 py-6">
            <div className="w-full max-w-[420px] max-h-full overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl border border-[#edf1f5]">
              <div className="flex items-start gap-3 mb-5">
                <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-[#ff7a18] to-[#ff9a3c] text-white flex items-center justify-center shrink-0">
                  <MessageSquareQuote className="w-6 h-6" strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[20px] font-black text-[#1a1a2e]">Help us understand your planning behavior</p>
                  <p className="text-[12px] text-[#64748b] font-medium mt-1 leading-relaxed">
                    This feedback is required before leaving. Your answers help us improve Tripzy using real user psychology and decision patterns.
                  </p>
                </div>
              </div>

              <div className="rounded-[18px] bg-[#fff8f1] border border-[#ffe0c9] px-4 py-3.5 mb-5">
                <p className="text-[11px] font-black uppercase tracking-[1px] text-[#ff7a18] mb-2">Rate your first impression</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      onClick={() => {
                        setRating(value);
                        setFeedbackError('');
                      }}
                      className="w-10 h-10 rounded-full bg-white border border-[#ffd7bf] flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Star
                        className={`w-5 h-5 ${value <= rating ? 'text-[#ff9a3c] fill-[#ff9a3c]' : 'text-[#cbd5e1]'}`}
                        strokeWidth={2.2}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[13px] font-black text-[#1a1a2e] leading-relaxed">
                    1. At which step of planning your last trip did you feel the biggest pain point?
                  </p>
                  <p className="text-[11px] font-medium text-[#64748b] mt-2">
                    Describe the exact step in your own words.
                  </p>
                  <textarea
                    value={feedbackAnswers.frustrationMoment}
                    onChange={(event) => updateFeedbackAnswer('frustrationMoment', event.target.value)}
                    rows={4}
                    className="mt-3 w-full rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-[13px] font-medium text-[#1a1a2e] outline-none focus:border-[#ff7a18] resize-none"
                    placeholder="Example: searching destinations, comparing routes, finding stays, managing budget, or building the final itinerary..."
                  />
                </div>

                <div>
                  <p className="text-[13px] font-black text-[#1a1a2e] leading-relaxed">
                    2. How do you actually plan a trip today? Walk us through it step by step: apps, YouTube, Google, Instagram, or anything else.
                  </p>
                  <textarea
                    value={feedbackAnswers.planningProcess}
                    onChange={(event) => updateFeedbackAnswer('planningProcess', event.target.value)}
                    rows={4}
                    className="mt-3 w-full rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-[13px] font-medium text-[#1a1a2e] outline-none focus:border-[#ff7a18] resize-none"
                    placeholder="Type how you usually plan your trip..."
                  />
                </div>

                <div>
                  <p className="text-[13px] font-black text-[#1a1a2e] leading-relaxed">
                    3. If Tripzy gave you a real trip plan in 30 seconds, what would your honest reaction be?
                  </p>
                  <div className="flex flex-col gap-2 mt-2">
                    {reactionOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => updateFeedbackAnswer('reaction', option)}
                        className={`w-full rounded-[16px] border px-4 py-3 text-left text-[12px] font-bold transition-all ${
                          feedbackAnswers.reaction === option
                            ? 'border-[#ff7a18] bg-[#fff4ec] text-[#ff7a18]'
                            : 'border-[#e2e8f0] bg-white text-[#334155]'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[13px] font-black text-[#1a1a2e] leading-relaxed">
                    4. If an app created a complete trip plan for you in seconds, would you use it?
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {shareIntentOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => updateFeedbackAnswer('shareMoment', option)}
                        className={`rounded-[14px] border px-3 py-3 text-[12px] font-black transition-all ${
                          feedbackAnswers.shareMoment === option
                            ? 'border-[#ff7a18] bg-[#fff4ec] text-[#ff7a18]'
                            : 'border-[#e2e8f0] bg-white text-[#334155]'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[13px] font-black text-[#1a1a2e] leading-relaxed">
                    5. If this cost INR 99 to INR 199, would you pay for it or look for a free alternative? Why?
                  </p>
                  <textarea
                    value={feedbackAnswers.pricingDecision}
                    onChange={(event) => updateFeedbackAnswer('pricingDecision', event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-[16px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-[13px] font-medium text-[#1a1a2e] outline-none focus:border-[#ff7a18] resize-none"
                    placeholder="Be honest about what you would do..."
                  />
                </div>
              </div>

              {(feedbackError || leaveWarning) && (
                <div className="mt-4 rounded-[16px] border border-[#ffe0c9] bg-[#fff8f1] px-4 py-3">
                  <p className="text-[12px] font-bold text-[#ff7a18] text-center">{feedbackError || leaveWarning}</p>
                </div>
              )}

              <button
                onClick={handleFeedbackSubmit}
                disabled={isSubmittingFeedback}
                className="mt-5 w-full h-[52px] rounded-[18px] bg-gradient-to-r from-[#ff7a18] to-[#ff9a3c] text-white font-extrabold text-[14px] shadow-[0_8px_20px_rgba(255,122,24,0.28)] active:scale-[0.98] transition-transform disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmittingFeedback ? 'Submitting feedback...' : 'Submit feedback and continue'}
              </button>
            </div>
          </div>
        )}

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode="signin"
          title="Sign in to share this itinerary"
          subtitle="We will connect this trip to your account first, then open the share options."
          onSuccess={async () => {
            await syncCurrentTripToAccount(['planner_search', 'generated_itinerary']);
            if (pendingShareAction === 'open') {
              openShareSheet();
            }
          }}
        />
      </div>
    </Layout>
  );
}
