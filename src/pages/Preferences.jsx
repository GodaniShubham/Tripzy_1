import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { ChevronLeft, Calendar, DollarSign, Compass, Heart, Users, Zap, ArrowRight, Eye, Route } from 'lucide-react';

const DAY_MS = 86400000;
const travelStyleOptions = [
  { id: 'Adventure', label: 'Adventure' },
  { id: 'Relaxed', label: 'Relaxed' },
  { id: 'Cultural', label: 'Cultural' },
  { id: 'Food', label: 'Foodie' },
  { id: 'Walker', label: 'Walker' },
  { id: 'Cyclist', label: 'Cyclist' },
  { id: 'Rider', label: 'Rider' },
  { id: 'Backpacker', label: 'Backpacker' },
  { id: 'Family', label: 'Family' },
  { id: 'Photographer', label: 'Photographer' },
];

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const addDaysToInputDate = (value, days) => {
  const date = parseDateInput(value);
  date.setDate(date.getDate() + days);
  return formatDateInput(date);
};

const calculateTripDays = (fromDate, toDate) =>
  Math.max(1, Math.floor((parseDateInput(toDate) - parseDateInput(fromDate)) / DAY_MS) + 1);

const clampTravelerCount = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return '1';
  return String(Math.min(parsed, 20));
};

const getTravelerSummary = (value = '1') => {
  const count = Number.parseInt(String(value), 10) || 1;
  return count === 1 ? '1 traveler' : `${count} travelers`;
};

export default function Preferences() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const destination = searchParams.get('destination') || 'Unknown';
  const origin = searchParams.get('origin') || '';
  const todayInput = formatDateInput(new Date());
  const defaultFromDate = addDaysToInputDate(todayInput, 3);
  const defaultToDate = addDaysToInputDate(defaultFromDate, 3);

  const [dateFrom, setDateFrom] = useState(
    defaultFromDate
  );
  const [dateTo, setDateTo] = useState(
    defaultToDate
  );

  const [budget, setBudget] = useState('Medium');
  const [travelMode, setTravelMode] = useState('Smart');
  const [travelStyle, setTravelStyle] = useState('Relaxed');
  
  // Multiple interests
  const [interests, setInterests] = useState([]);
  
  const [travelers, setTravelers] = useState('1');
  const [tripType, setTripType] = useState('Relaxed');
  const [pace, setPace] = useState('Moderate');
  const journeySummary = origin ? `${origin} -> ${destination}` : destination;
  const selectedPreferenceChips = [
    `${dateFrom} to ${dateTo}`,
    `${budget} budget`,
    `${travelMode} mode`,
    `${travelStyle} travel style`,
    getTravelerSummary(travelers),
    `${tripType} trip type`,
    `${pace} pace`,
    ...(interests.length ? interests.map((interest) => `${interest} interest`) : ['General interests']),
  ];

  const toggleInterest = (interest) => {
    setInterests(prev => 
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleFromDateChange = (value) => {
    setDateFrom(value);
    if (parseDateInput(value) > parseDateInput(dateTo)) {
      setDateTo(value);
    }
  };

  const handleToDateChange = (value) => {
    if (parseDateInput(value) < parseDateInput(dateFrom)) {
      setDateTo(dateFrom);
      return;
    }
    setDateTo(value);
  };

  const handleTravelerChange = (value) => {
    setTravelers(clampTravelerCount(value));
  };

  const handleContinue = () => {
    // Navigate to AI Planner with full params
    const days = calculateTripDays(dateFrom, dateTo);
    const urlParams = new URLSearchParams({
      destination,
      ...(origin ? { origin } : {}),
      from: dateFrom,
      to: dateTo,
      days,
      budget,
      travelMode,
      style: travelStyle,
      interests: interests.join(','),
      travelers,
      tripType,
      pace
    }).toString();

    navigate(`/generating?${urlParams}`);
  };

  return (
    <Layout hideHeader>
      <div className="flex flex-col min-h-full bg-[#f0f2f5] relative">
        
        {/* HEADER */}
        <div className="shrink-0 bg-white border-b border-[#f0f2f5] shadow-[0_2px_10px_rgba(0,0,0,0.04)] sticky top-0 z-50">
          <div className="flex items-center gap-3 py-3.5 px-4">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-[#f5f6f8] flex items-center justify-center shrink-0">
              <ChevronLeft className="w-5 h-5 text-[#1a1a2e]" strokeWidth={2.5} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-extrabold text-[#1a1a2e] whitespace-nowrap overflow-hidden text-ellipsis">Trip Preferences</p>
              <p className="text-[11px] text-[#adb5bd] font-medium mt-0.5">Step 2 of 5 &middot; {destination}</p>
            </div>
          </div>
          <div className="h-[3px] bg-[#f0f2f5]">
            <div className="h-full w-[40%] bg-gradient-to-r from-[#ff7a18] to-[#ff9a3c] rounded-sm" />
          </div>
        </div>

        {/* SCROLLABLE */}
        <div className="flex-1 px-4 pt-4 pb-24">
          
          <div className="mb-5">
            <h2 className="text-[21px] font-black text-[#1a1a2e] mb-1">Customize your journey</h2>
            <p className="text-xs text-[#adb5bd] font-medium">Every selection below will directly shape the itinerary</p>
          </div>

          <div className="bg-white rounded-[18px] p-4 mb-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] overflow-hidden border border-[#edf0f5]">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-[0.8px]">Selected for itinerary</p>
                <p className="text-[12px] font-medium text-[#6c757d] mt-1">AI will use all of these together while generating the plan.</p>
              </div>
              <div className="shrink-0 rounded-[14px] bg-[#fff4eb] px-3 py-2 text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.7px] text-[#ff7a18]">Live</p>
                <p className="text-[12px] font-extrabold text-[#1a1a2e]">Active</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedPreferenceChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full bg-[#f8fafc] border border-[#e2e8f0] px-3 py-1.5 text-[11px] font-bold text-[#334155]"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[18px] p-4 mb-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] overflow-hidden border border-[#edf0f5]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-[0.8px] mb-2">Journey context for AI</p>
                <p className="text-[15px] font-black text-[#1a1a2e] leading-[1.3] break-words">{journeySummary}</p>
                <p className="text-[11px] text-[#6c757d] font-medium mt-2 leading-[1.5]">
                  We use your starting city, destination, dates, budget, transfer mode, and pace to build a more practical itinerary.
                </p>
              </div>
              <div className="shrink-0 rounded-[14px] bg-[#fff4eb] px-3 py-2 text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.7px] text-[#ff7a18]">Using</p>
                <p className="text-[12px] font-extrabold text-[#1a1a2e]">{origin ? 'From + To' : 'Destination'}</p>
              </div>
            </div>
          </div>

          {/* TRAVEL DATES */}
          <div className="bg-white rounded-[18px] p-4 mb-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] overflow-hidden">
            <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-[0.8px] mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.2} />
              Travel Dates
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="min-w-0">
                <label className="text-[9px] font-bold text-[#adb5bd] uppercase tracking-[0.5px] block mb-1">From</label>
                <input 
                  type="date" 
                  value={dateFrom} 
                  min={todayInput}
                  max={dateTo}
                  onChange={(e) => handleFromDateChange(e.target.value)}
                  className="block w-full min-w-0 bg-[#f8f9fb] border-[1.5px] border-[#eaedf2] rounded-[11px] py-2.5 px-2 font-inter text-[13px] font-bold text-[#1a1a2e] outline-none focus:border-[#ff7a18] appearance-none"
                />
              </div>
              <div className="min-w-0">
                <label className="text-[9px] font-bold text-[#adb5bd] uppercase tracking-[0.5px] block mb-1">To</label>
                <input 
                  type="date" 
                  value={dateTo} 
                  min={dateFrom}
                  onChange={(e) => handleToDateChange(e.target.value)}
                  className="block w-full min-w-0 bg-[#f8f9fb] border-[1.5px] border-[#eaedf2] rounded-[11px] py-2.5 px-2 font-inter text-[13px] font-bold text-[#1a1a2e] outline-none focus:border-[#ff7a18] appearance-none"
                />
              </div>
            </div>
          </div>

          {/* BUDGET */}
          <div className="bg-white rounded-[18px] p-4 mb-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] overflow-hidden">
            <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-[0.8px] mb-3 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.2} />
              Budget
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Budget', icon: '🎒', label: 'Budget', sub: '₹5–15k', note: 'per person' },
                { id: 'Medium', icon: '💳', label: 'Medium', sub: '₹15–40k', note: 'per person' },
                { id: 'Luxury', icon: '💎', label: 'Luxury', sub: '₹40k+', note: 'per person' },
              ].map(b => (
                <div 
                  key={b.id} 
                  onClick={() => setBudget(b.id)}
                  className={`border-2 rounded-[13px] py-3 px-1 cursor-pointer text-center transition-all min-w-0 active:scale-[0.93] ${budget === b.id ? 'border-[#1e90a8] bg-[#eaf7fb]' : 'border-[#eaedf2] bg-white'}`}
                >
                  <span className="text-xl mb-1 block">{b.icon}</span>
                  <span className={`text-[11px] font-extrabold block whitespace-nowrap overflow-hidden text-ellipsis ${budget === b.id ? 'text-[#1e90a8]' : 'text-[#1a1a2e]'}`}>{b.label}</span>
                  <span className="text-[8px] font-semibold text-[#adb5bd] block mt-0.5">{b.sub}</span>
                  <span className="text-[7px] font-medium text-[#c0c7d1] block mt-0.5">{b.note}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[18px] p-4 mb-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] overflow-hidden">
            <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-[0.8px] mb-3 flex items-center gap-1.5">
              <Route className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.2} />
              Journey Mode
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'Smart', label: 'Smart', sub: 'Best value mix' },
                { id: 'Road', label: 'Road', sub: 'Bus or cab first' },
                { id: 'Train', label: 'Train', sub: 'Prefer rail travel' },
                { id: 'Flight', label: 'Flight', sub: 'Prefer faster air' },
              ].map((option) => (
                <div
                  key={option.id}
                  onClick={() => setTravelMode(option.id)}
                  className={`border-2 rounded-[13px] py-3 px-3 cursor-pointer transition-all min-w-0 active:scale-[0.93] ${
                    travelMode === option.id ? 'border-[#1e90a8] bg-[#eaf7fb]' : 'border-[#eaedf2] bg-white'
                  }`}
                >
                  <span className={`text-[12px] font-extrabold block ${travelMode === option.id ? 'text-[#1e90a8]' : 'text-[#1a1a2e]'}`}>
                    {option.label}
                  </span>
                  <span className="text-[10px] font-semibold text-[#94a3b8] block mt-1">
                    {option.sub}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* TRAVEL STYLE */}
          <div className="bg-white rounded-[18px] p-4 mb-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] overflow-hidden">
            <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-[0.8px] mb-3 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.2} />
              Travel Style
            </p>
            <div className="flex flex-wrap gap-[7px]">
              {[
                { id: 'Adventure', label: '⛰️ Adventure' },
                { id: 'Relaxed', label: '😌 Relaxed' },
                { id: 'Cultural', label: '🏛️ Cultural' },
                { id: 'Food', label: '🍜 Foodie' },
              ].map(s => (
                <span 
                  key={s.id}
                  onClick={() => setTravelStyle(s.id)}
                  className={`py-2 px-[13px] rounded-[30px] border-[1.5px] text-xs font-bold cursor-pointer transition-all whitespace-nowrap active:scale-[0.93] ${travelStyle === s.id ? 'bg-[#ff7a18] border-[#ff7a18] text-white' : 'border-[#eaedf2] bg-white text-[#555]'}`}
                >
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[18px] p-4 mb-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] overflow-hidden">
            <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-[0.8px] mb-3">
              Which of these travel styles fits you best?
            </p>
            <div className="flex flex-wrap gap-[7px]">
              {travelStyleOptions
                .filter((style) => !['Adventure', 'Relaxed', 'Cultural', 'Food'].includes(style.id))
                .map((style) => (
                  <span
                    key={style.id}
                    onClick={() => setTravelStyle(style.id)}
                    className={`py-2 px-[13px] rounded-[30px] border-[1.5px] text-xs font-bold cursor-pointer transition-all whitespace-nowrap active:scale-[0.93] ${travelStyle === style.id ? 'bg-[#ff7a18] border-[#ff7a18] text-white' : 'border-[#eaedf2] bg-white text-[#555]'}`}
                  >
                    {style.label}
                  </span>
                ))}
            </div>
          </div>

          {/* INTERESTS */}
          <div className="bg-white rounded-[18px] p-4 mb-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] overflow-hidden">
            <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-[0.8px] mb-3 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.2} />
              Interests <span className="text-[#ccc] font-medium text-[10px] normal-case tracking-normal ml-0.5">(pick any)</span>
            </p>
            <div className="flex flex-wrap gap-[7px]">
              {[
                { id: 'Nature', label: '🌿 Nature' },
                { id: 'Food', label: '🍜 Food' },
                { id: 'Adventure', label: '🏄 Adventure' },
                { id: 'History', label: '📜 History' },
                { id: 'Shopping', label: '🛍️ Shopping' },
                { id: 'Wellness', label: '🧘 Wellness' },
              ].map(i => (
                <span 
                  key={i.id}
                  onClick={() => toggleInterest(i.id)}
                  className={`py-2 px-[13px] rounded-[30px] border-[1.5px] text-xs font-bold cursor-pointer transition-all whitespace-nowrap active:scale-[0.93] ${interests.includes(i.id) ? 'bg-[#ff7a18] border-[#ff7a18] text-white' : 'border-[#eaedf2] bg-white text-[#555]'}`}
                >
                  {i.label}
                </span>
              ))}
            </div>
          </div>

          {/* TRAVELERS */}
          <div className="bg-white rounded-[18px] p-4 mb-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] overflow-hidden">
            <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-[0.8px] mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.2} />
              How many people are traveling?
            </p>
            <div className="rounded-[16px] border border-[#eaedf2] bg-[#f8fafc] px-4 py-4">
              <div className="flex items-end justify-between gap-3 mb-4">
                <div>
                  <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-[0.5px]">Travelers</p>
                  <p className="text-[24px] font-black text-[#1a1a2e] leading-none mt-1">
                    {travelers}
                  </p>
                </div>
                <div className="w-[84px]">
                  <label className="text-[9px] font-bold text-[#94a3b8] uppercase tracking-[0.5px] block mb-1">
                    Custom
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={travelers}
                    onChange={(event) => handleTravelerChange(event.target.value)}
                    className="w-full h-[40px] rounded-[12px] border border-[#dbe3ec] bg-white px-3 text-[14px] font-bold text-[#1a1a2e] outline-none focus:border-[#ff7a18]"
                  />
                </div>
              </div>

              <input
                type="range"
                min="1"
                max="10"
                value={Math.min(Number.parseInt(travelers, 10) || 1, 10)}
                onChange={(event) => handleTravelerChange(event.target.value)}
                className="w-full accent-[#ff7a18]"
              />

              <div className="mt-2 flex items-center justify-between text-[10px] font-semibold text-[#94a3b8]">
                <span>1</span>
                <span>5</span>
                <span>10</span>
              </div>

              <p className="text-[10px] font-medium text-[#adb5bd] mt-3">
                Use the slider for quick selection, or enter an exact traveler count in the custom box.
              </p>
            </div>
          </div>

          {/* TRIP STYLE  */}
          <div className="bg-white rounded-[18px] p-4 mb-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] overflow-hidden">
            <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-[0.8px] mb-3 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.2} />
              Trip Style
            </p>
            <div className="flex flex-wrap gap-[7px]">
              {[
                { id: 'Relaxed', label: '🏖️ Relaxed' },
                { id: 'Adventure', label: '🧗 Adventure' },
                { id: 'Cultural', label: '🕌 Cultural' },
                { id: 'Romantic', label: '💕 Romantic' },
              ].map(t => (
                <span 
                  key={t.id}
                  onClick={() => setTripType(t.id)}
                  className={`py-2 px-[13px] rounded-[30px] border-[1.5px] text-xs font-bold cursor-pointer transition-all whitespace-nowrap active:scale-[0.93] ${tripType === t.id ? 'bg-[#ff7a18] border-[#ff7a18] text-white' : 'border-[#eaedf2] bg-white text-[#555]'}`}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* PACE */}
          <div className="bg-white rounded-[18px] p-4 mb-3 shadow-[0_4px_14px_rgba(0,0,0,0.06)] overflow-hidden">
            <p className="text-[10px] font-bold text-[#adb5bd] uppercase tracking-[0.8px] mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.2} />
              Travel Pace
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Slow', icon: '🐢', label: 'Slow', sub: '2–3 stops' },
                { id: 'Moderate', icon: '🚶', label: 'Moderate', sub: '4–5 stops' },
                { id: 'Fast', icon: '⚡', label: 'Fast', sub: '6+ stops' },
              ].map(p => (
                <div 
                  key={p.id} 
                  onClick={() => setPace(p.id)}
                  className={`border-2 rounded-[13px] py-3 px-1 cursor-pointer text-center transition-all min-w-0 active:scale-[0.93] ${pace === p.id ? 'border-[#1e90a8] bg-[#eaf7fb]' : 'border-[#eaedf2] bg-white'}`}
                >
                  <span className="text-xl mb-1 block">{p.icon}</span>
                  <span className={`text-[11px] font-extrabold block whitespace-nowrap ${pace === p.id ? 'text-[#1e90a8]' : 'text-[#1a1a2e]'}`}>{p.label}</span>
                  <span className="text-[8px] font-semibold text-[#adb5bd] block mt-0.5">{p.sub}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* BOTTOM BUTTON */}
        <div className="absolute bottom-6 left-0 right-0 px-6 bg-transparent flex justify-end z-20 pointer-events-none">
          <button 
            onClick={handleContinue}
            className="min-w-[140px] h-[46px] rounded-xl font-inter text-[13px] font-extrabold flex items-center justify-center gap-1.5 transition-all bg-gradient-to-br from-[#ff7a18] to-[#ff9a3c] text-white shadow-[0_6px_18px_rgba(255,122,24,0.3)] cursor-pointer active:scale-95 pointer-events-auto"
          >
            Continue
            <ArrowRight className="w-4 h-4 text-white/90" strokeWidth={2.5} />
          </button>
        </div>

      </div>
    </Layout>
  );
}
