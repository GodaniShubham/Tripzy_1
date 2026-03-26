import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import WikipediaImage from '../components/WikipediaImage';
import { ArrowRight, Clock3, Compass, Flame, MapPin, Route, Sparkles, Star } from 'lucide-react';

const discoveryThemes = [
  {
    title: 'Culture Trails',
    subtitle: 'Forts, old cities, museums, and markets',
    destination: 'Jaipur',
    accent: 'from-[#fff6e8] to-[#fff0db]',
    badge: 'Heritage',
  },
  {
    title: 'Food First',
    subtitle: 'Street food routes and local eating zones',
    destination: 'Ahmedabad',
    accent: 'from-[#fff0f1] to-[#ffe7d8]',
    badge: 'Food',
  },
  {
    title: 'Wellness Escape',
    subtitle: 'Ashrams, ghats, riverside calm, and yoga',
    destination: 'Rishikesh',
    accent: 'from-[#ecfbf5] to-[#def7ed]',
    badge: 'Calm',
  },
];

const spotlightTrips = [
  {
    title: 'Ahmedabad City Icons',
    destination: 'Ahmedabad',
    summary: 'Sabarmati Riverfront, Sidi Saiyyed ni Jali, Manek Chowk, and old-city energy.',
    duration: '3D / 2N',
    rating: '4.8',
  },
  {
    title: 'Haridwar Spiritual Circuit',
    destination: 'Haridwar',
    summary: 'Har Ki Pauri, Mansa Devi, Ganga Aarti, and temple-side mornings.',
    duration: '2D / 1N',
    rating: '4.7',
  },
  {
    title: 'Agra Monument Route',
    destination: 'Agra',
    summary: 'Taj Mahal, Agra Fort, Mehtab Bagh, and a sunset-heavy final day.',
    duration: '3D / 2N',
    rating: '4.6',
  },
];

const routeIdeas = [
  { origin: 'Mumbai', destination: 'Ahmedabad', label: 'Food + heritage city break' },
  { origin: 'Ahmedabad', destination: 'Goa', label: 'Beach reset with a lighter pace' },
  { origin: 'New Delhi', destination: 'Haridwar', label: 'Quick spiritual weekend' },
  { origin: 'Bengaluru', destination: 'Jaipur', label: 'Culture-led long weekend' },
];

const seasonalPicks = [
  { title: 'Short Weekend', destination: 'Udaipur', note: 'Lakes, cafés, and compact sightseeing' },
  { title: 'Family Pick', destination: 'Amritsar', note: 'Golden Temple, museum stops, and easy pacing' },
  { title: 'Adventure Mood', destination: 'Leh Ladakh', note: 'Bigger landscapes and high-energy route planning' },
];

const openTripBuilder = (navigate, route) => {
  const searchParams = new URLSearchParams();
  if (route.origin) searchParams.set('origin', route.origin);
  if (route.destination) searchParams.set('destination', route.destination);
  navigate(`/trips?${searchParams.toString()}`);
};

export default function Discover() {
  const navigate = useNavigate();

  return (
    <Layout pageTitle="Discover">
      <div className="min-h-full bg-[#f0f2f5] px-4 pt-4 pb-28">
        <div className="rounded-[28px] bg-gradient-to-br from-[#0f6a7a] via-[#1e90a8] to-[#4db2c1] p-5 text-white shadow-[0_16px_40px_rgba(15,106,122,0.22)] mb-5 overflow-hidden relative">
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-sm" />
          <p className="text-[11px] font-black uppercase tracking-[0.26em] text-white/75 mb-3 relative z-10">Discover India</p>
          <h1 className="text-[30px] font-black leading-[1.05] relative z-10">Routes with a clear vibe</h1>
          <p className="text-[13px] text-white/85 font-medium mt-3 max-w-[280px] leading-relaxed relative z-10">
            Pick a mood, tap a route, and jump straight into the planner with a smarter starting point.
          </p>
          <button
            onClick={() => openTripBuilder(navigate, { destination: 'Jaipur' })}
            className="mt-5 h-[48px] px-5 rounded-[16px] bg-white text-[#0f6a7a] text-[13px] font-black inline-flex items-center gap-2 relative z-10 active:scale-95 transition-transform"
          >
            Start with a destination
            <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        <section className="mb-5">
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h2 className="text-[18px] font-black text-[#1a1a2e]">Pick a Discovery Mood</h2>
              <p className="text-[12px] text-[#64748b] font-medium mt-1">Fast starts for different kinds of travelers.</p>
            </div>
            <Sparkles className="w-4 h-4 text-[#ff7a18]" strokeWidth={2.4} />
          </div>
          <div className="grid grid-cols-1 gap-3">
            {discoveryThemes.map((item) => (
              <button
                key={item.title}
                onClick={() => openTripBuilder(navigate, { destination: item.destination })}
                className={`rounded-[22px] bg-gradient-to-br ${item.accent} border border-white px-4 py-4 text-left shadow-sm active:scale-[0.98] transition-transform`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#ff7a18] mb-3">
                      {item.badge}
                    </span>
                    <h3 className="text-[16px] font-black text-[#1a1a2e]">{item.title}</h3>
                    <p className="text-[12px] text-[#64748b] font-medium mt-1 leading-relaxed">{item.subtitle}</p>
                  </div>
                  <Compass className="w-5 h-5 text-[#1e90a8] shrink-0 mt-1" strokeWidth={2.3} />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h2 className="text-[18px] font-black text-[#1a1a2e]">Spotlight Trips</h2>
              <p className="text-[12px] text-[#64748b] font-medium mt-1">Presentation-ready route ideas with recognizable local stops.</p>
            </div>
            <Flame className="w-4 h-4 text-[#ff7a18]" strokeWidth={2.4} />
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {spotlightTrips.map((trip) => (
              <button
                key={trip.title}
                onClick={() => openTripBuilder(navigate, { destination: trip.destination })}
                className="min-w-[240px] w-[240px] rounded-[24px] overflow-hidden bg-white border border-[#edf1f5] shadow-sm text-left active:scale-[0.98] transition-transform"
              >
                <div className="relative h-[150px]">
                  <WikipediaImage
                    place={trip.destination}
                    query={`${trip.destination} India`}
                    alt={trip.destination}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                  <div className="absolute left-4 bottom-4 right-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/80 mb-1">{trip.duration}</p>
                    <h3 className="text-[18px] font-black text-white leading-tight">{trip.title}</h3>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[12px] font-medium text-[#64748b] leading-relaxed min-h-[54px]">{trip.summary}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1a1a2e]">
                      <Star className="w-3.5 h-3.5 text-[#ff7a18] fill-[#ff7a18]" strokeWidth={2.4} />
                      {trip.rating}
                    </div>
                    <span className="text-[11px] font-black text-[#ff7a18]">Open route</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h2 className="text-[18px] font-black text-[#1a1a2e]">Instant Route Ideas</h2>
              <p className="text-[12px] text-[#64748b] font-medium mt-1">Send both cities straight into the planner.</p>
            </div>
            <Route className="w-4 h-4 text-[#ff7a18]" strokeWidth={2.4} />
          </div>
          <div className="flex flex-col gap-3">
            {routeIdeas.map((item) => (
              <button
                key={`${item.origin}-${item.destination}`}
                onClick={() => openTripBuilder(navigate, item)}
                className="bg-white rounded-[20px] border border-[#edf1f5] shadow-sm px-4 py-4 text-left active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#94a3b8] mb-1">Route spark</p>
                    <h3 className="text-[15px] font-black text-[#1a1a2e]">{item.origin} to {item.destination}</h3>
                    <p className="text-[12px] text-[#64748b] font-medium mt-1">{item.label}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#ff7a18] shrink-0" strokeWidth={2.8} />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h2 className="text-[18px] font-black text-[#1a1a2e]">Quick Picks</h2>
              <p className="text-[12px] text-[#64748b] font-medium mt-1">Shortlist ideas for different trip lengths.</p>
            </div>
            <Clock3 className="w-4 h-4 text-[#ff7a18]" strokeWidth={2.4} />
          </div>
          <div className="grid grid-cols-1 gap-3">
            {seasonalPicks.map((item) => (
              <button
                key={item.title}
                onClick={() => openTripBuilder(navigate, { destination: item.destination })}
                className="bg-white rounded-[20px] border border-[#edf1f5] shadow-sm p-4 text-left active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#ff7a18] mb-2">{item.title}</p>
                    <div className="inline-flex items-center gap-1.5 text-[14px] font-black text-[#1a1a2e]">
                      <MapPin className="w-4 h-4 text-[#1e90a8]" strokeWidth={2.5} />
                      {item.destination}
                    </div>
                    <p className="text-[12px] text-[#64748b] font-medium mt-2 leading-relaxed">{item.note}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
