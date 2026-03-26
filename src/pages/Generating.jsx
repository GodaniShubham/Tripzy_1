import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Check, Compass, MapPin, RefreshCw, Sparkles } from 'lucide-react';

import { syncTripToAccount } from '../lib/authApi';
import { buildTripPlanOnBackend, isPlannerApiConfigured, logGeneratedItinerary } from '../lib/plannerApi';
import { trackItineraryGenerated, trackPlannerUse } from '../lib/usageMetrics';
import { buildTripPlan } from '../lib/tripPlanner';
import { clearTripPlan, saveTripPlan } from '../lib/tripStorage';

const createSteps = () => [
  { id: 's1', text: 'Locking in your route', detail: 'Finding the best origin and destination match', done: false, active: false },
  { id: 's2', text: 'Finding nearby highlights', detail: 'Pulling real places around your destination', done: false, active: false },
  { id: 's3', text: 'Checking weather and budget', detail: 'Estimating trip cost and forecasting the days ahead', done: false, active: false },
  { id: 's4', text: 'Writing your AI itinerary', detail: 'Turning facts into a clean day-wise plan', done: false, active: false },
];

const stageToStepIndex = {
  origin: 0,
  destination: 0,
  route: 0,
  places: 1,
  weather: 2,
  budget: 2,
  ai: 3,
};

const TARGET_READY_SECONDS = 30;

export default function Generating() {
  const location = useLocation();
  const navigate = useNavigate();
  const request = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);

    return {
      originText: searchParams.get('origin') || 'Current location',
      destinationText: searchParams.get('destination') || 'Unknown',
      fromDate: searchParams.get('from') || new Date().toISOString().slice(0, 10),
      toDate: searchParams.get('to') || new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      days: Number(searchParams.get('days') || '3'),
      budget: searchParams.get('budget') || 'Medium',
      travelMode: searchParams.get('travelMode') || 'Smart',
      travelStyle: searchParams.get('style') || 'Relaxed',
      interests: (searchParams.get('interests') || '').split(',').filter(Boolean),
      travelers: searchParams.get('travelers') || '1',
      tripType: searchParams.get('tripType') || 'Relaxed',
      pace: searchParams.get('pace') || 'Moderate',
    };
  }, [location.search]);

  const [steps, setSteps] = useState(createSteps);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(true);
  const [timeLeft, setTimeLeft] = useState(TARGET_READY_SECONDS);

  useEffect(() => {
    if (!isGenerating) return undefined;

    const timer = setInterval(() => {
      setTimeLeft((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isGenerating]);

  useEffect(() => {
    let isMounted = true;

    const updateSteps = (stage) => {
      const activeIndex = stageToStepIndex[stage] ?? 0;
      setSteps((currentSteps) =>
        currentSteps.map((step, index) => ({
          ...step,
          done: index < activeIndex,
          active: index === activeIndex,
        }))
      );
    };

    const run = async () => {
      try {
        clearTripPlan();
        setError('');
        setIsGenerating(true);
        setTimeLeft(TARGET_READY_SECONDS);
        updateSteps('origin');
        trackPlannerUse();

        const tripPlan = isPlannerApiConfigured()
          ? await buildTripPlanOnBackend(request).catch(async (backendError) => {
              console.error('Backend planner build failed, falling back to local planner', backendError);
              return buildTripPlan(request, updateSteps);
            })
          : await buildTripPlan(request, updateSteps);
        if (!isMounted) return;

        setIsGenerating(false);
        setSteps((currentSteps) => currentSteps.map((step) => ({ ...step, done: true, active: false })));
        saveTripPlan(tripPlan);
        logGeneratedItinerary({
          tripPlan,
          generation: tripPlan.generation || {},
          source: 'frontend_local_builder',
        }).catch((logError) => {
          console.error('Failed to log generated itinerary', logError);
        });
        syncTripToAccount(tripPlan, ['planner_search', 'generated_itinerary']).catch((syncError) => {
          console.error('Failed to sync trip to account', syncError);
        });
        trackItineraryGenerated();
        setTimeout(() => {
          navigate(`/overview${location.search}`, { replace: true });
        }, 700);
      } catch (generationError) {
        if (!isMounted) return;
        console.error('Trip generation failed', generationError);
        setIsGenerating(false);
        setError(generationError.message || 'Could not build the itinerary.');
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [location.search, navigate, request]);

  const retry = () => {
    setSteps(createSteps());
    setError('');
    setIsGenerating(true);
    navigate(0);
  };

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center font-inter text-gray-900 overflow-hidden">
      <div className="w-full max-w-md bg-gradient-to-br from-[#0f6a7a] via-[#1e90a8] to-[#2ba8c8] min-h-[100dvh] relative overflow-hidden flex flex-col shadow-2xl">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-[100px] -left-20 w-[280px] h-[280px] rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full bg-white/5 pointer-events-none" />

        <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10 w-full">
          <div className="w-[100px] h-[100px] rounded-full bg-white/15 border-2 border-white/25 flex items-center justify-center mb-7 relative animate-[pulse-ring_2s_ease-in-out_infinite,fadeUp_0.5s_ease_both]">
            <div className="absolute -inset-3 rounded-full border-2 border-white/15 animate-[pulse-ring_2s_0.3s_ease-in-out_infinite]" />
            <div className={isGenerating ? 'animate-[spin_3s_linear_infinite]' : ''}>
              {error ? <AlertCircle className="w-11 h-11 text-white" strokeWidth={2} /> : <Compass className="w-11 h-11 text-white" strokeWidth={2} />}
            </div>
          </div>

          <h1 className="text-2xl font-black text-white text-center leading-tight mb-3">
            {error ? 'Generation paused' : 'Creating your real trip'}
          </h1>

        <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-2 mb-8 text-[13px] font-bold text-white/95 shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-white/85" />
            {request.originText} to {request.destinationText}
          </div>

          <div className="w-full max-w-[320px] mb-5">
            <div className="flex items-center justify-between text-[11px] font-bold text-white/80 mb-2">
              <span>Target ready time</span>
              <span>{timeLeft}s</span>
            </div>
            <div className="h-2 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#ffd79a] via-[#fff1d5] to-white transition-all duration-1000"
                style={{ width: `${Math.max(8, (timeLeft / TARGET_READY_SECONDS) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-white/70 font-medium mt-2">
              Fast mode will still return a usable itinerary if the AI takes too long.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full max-w-[320px]">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-start gap-3.5 p-3 rounded-xl border transition-all duration-500 ${
                  step.done
                    ? 'bg-white/20 border-white/35'
                    : step.active
                      ? 'bg-white/18 border-white/30'
                      : 'bg-white/10 border-white/15 opacity-45'
                }`}
              >
                <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 text-[15px] transition-colors ${
                  step.done ? 'bg-white text-[#0f6a7a]' : step.active ? 'bg-white/25 text-white' : 'bg-white/20 text-white/70'
                }`}>
                  {step.done ? <Check className="w-4 h-4" strokeWidth={3.5} /> : step.active ? <Sparkles className="w-4 h-4" strokeWidth={2.5} /> : step.id.slice(-1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-white">{step.text}</p>
                  <p className="text-[11px] text-white/70 font-medium mt-1 leading-relaxed">{step.detail}</p>
                </div>
                {!step.done && step.active && (
                  <RefreshCw className="w-4 h-4 text-white/75 animate-spin shrink-0 mt-0.5" strokeWidth={2.5} />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="w-full max-w-[320px] mt-6 bg-white/15 border border-white/25 rounded-2xl p-4 text-white">
              <p className="text-[13px] font-bold">We could not finish the plan.</p>
              <p className="text-[12px] text-white/75 mt-2 leading-relaxed">{error}</p>
              <button
                onClick={retry}
                className="mt-4 w-full h-[46px] rounded-[14px] bg-white text-[#0f6a7a] font-extrabold text-[13px] active:scale-[0.98] transition-transform"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.06); opacity: 0.8; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
