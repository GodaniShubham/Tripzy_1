import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  ArrowRight,
  ArrowUpDown,
  Check,
  MapPin,
  Plane,
  Search,
} from 'lucide-react';

import WikipediaImage from '../components/WikipediaImage';
import { searchPlaces } from '../lib/tripPlanner';

const departureCities = [
  'New Delhi',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kolkata',
  'Ahmedabad',
  'Gandhinagar',
  'Surat',
  'Pune',
];

const normalizeTripInput = (value = '') =>
  value.toLowerCase().replace(/[^a-z0-9,\s-]/g, ' ').replace(/\s+/g, ' ').trim();

const destinations = [
  { name: 'Goa', tag: 'Beach', bg: '#e8f4fd' },
  { name: 'Jaipur', tag: 'Heritage', bg: '#fdf0e8' },
  { name: 'Manali', tag: 'Mountains', bg: '#e8f0fd', wikiTitle: 'Manali, Himachal Pradesh' },
  { name: 'Kerala', tag: 'Nature', bg: '#e8fdf0', wikiTitle: 'Kerala' },
  { name: 'Shimla', tag: 'Hill Station', bg: '#e8ecfd', wikiTitle: 'Shimla' },
  { name: 'Varanasi', tag: 'Spiritual', bg: '#fdf5e8', wikiTitle: 'Varanasi' },
  { name: 'Udaipur', tag: 'Lakes', bg: '#eef7ff', wikiTitle: 'Udaipur' },
  { name: 'Agra', tag: 'Monuments', bg: '#fff1f2', wikiTitle: 'Agra' },
  { name: 'Rishikesh', tag: 'Wellness', bg: '#eafaf1', wikiTitle: 'Rishikesh' },
  { name: 'Darjeeling', tag: 'Tea Hills', bg: '#edf7f1', wikiTitle: 'Darjeeling' },
  { name: 'Leh Ladakh', tag: 'Adventure', bg: '#f1f5ff', wikiTitle: 'Ladakh' },
  { name: 'Amritsar', tag: 'Culture', bg: '#fff7e6', wikiTitle: 'Amritsar' },
];

export default function Trips() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  const initialDestination = searchParams.get('destination') || '';
  const initialOrigin = searchParams.get('origin') || searchParams.get('from') || '';

  const [fromCity, setFromCity] = useState(initialOrigin);
  const [toCity, setToCity] = useState(initialDestination);
  const [fromInput, setFromInput] = useState(initialOrigin);
  const [toInput, setToInput] = useState(initialDestination);
  const [activeField, setActiveField] = useState(
    initialOrigin ? (initialDestination ? null : 'to') : 'from'
  );
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const fromInputRef = useRef(null);
  const toInputRef = useRef(null);

  const isFromDirty = Boolean(
    activeField === 'from' &&
    fromInput.trim() &&
    normalizeTripInput(fromInput) !== normalizeTripInput(fromCity)
  );
  const isToDirty = Boolean(
    activeField === 'to' &&
    toInput.trim() &&
    normalizeTripInput(toInput) !== normalizeTripInput(toCity)
  );
  const canProceed = Boolean(fromCity.trim() && toCity.trim()) && !isFromDirty && !isToDirty;
  const selectedDestination = toCity.trim().toLowerCase();

  useEffect(() => {
    if (activeField === 'from') {
      fromInputRef.current?.focus();
    }
    if (activeField === 'to') {
      toInputRef.current?.focus();
    }
  }, [activeField]);

  useEffect(() => {
    if (!activeField) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const query = activeField === 'from' ? fromInput.trim() : toInput.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    let isMounted = true;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces(query, 5);
        if (!isMounted) return;
        setSuggestions(results);
      } catch (error) {
        if (!isMounted) return;
        console.error('Place search failed', error);
        setSuggestions([]);
      } finally {
        if (isMounted) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeField, fromInput, toInput]);

  const activateField = (field) => {
    if (field === 'to' && !fromCity.trim()) return;
    setActiveField(field);
  };

  const commitFrom = (value = fromInput) => {
    const nextValue = value.trim();
    if (!nextValue) return;
    setFromCity(nextValue);
    setFromInput(nextValue);
    setSuggestions([]);
    setActiveField(toCity.trim() ? null : 'to');
  };

  const commitTo = (value = toInput) => {
    const nextValue = value.trim();
    if (!nextValue) return;
    setToCity(nextValue);
    setToInput(nextValue);
    setSuggestions([]);
    setActiveField(null);
  };

  const handleDeparturePick = (city) => {
    setFromInput(city);
    setFromCity(city);
    setSuggestions([]);
    setActiveField(toCity.trim() ? null : 'to');
  };

  const handleDestinationPick = (city) => {
    setToInput(city);
    setToCity(city);
    setSuggestions([]);
    setActiveField(null);
  };

  const handleSwap = () => {
    if (!canProceed) return;
    setFromCity(toCity);
    setToCity(fromCity);
    setFromInput(toCity);
    setToInput(fromCity);
    setActiveField(null);
  };

  const handleProceed = () => {
    if (!fromCity.trim()) {
      setActiveField('from');
      return;
    }
    if (!toCity.trim()) {
      setActiveField('to');
      return;
    }
    navigate(
      `/preferences?destination=${encodeURIComponent(toCity)}&origin=${encodeURIComponent(fromCity)}`
    );
  };

  const handleInputKeyDown = (event, field) => {
    if (event.key !== 'Enter') return;
    if (field === 'from') {
      commitFrom();
      return;
    }
    commitTo();
  };

  const handleSuggestionPick = (suggestion) => {
    const value = suggestion.formatted || suggestion.name;
    if (activeField === 'from') {
      commitFrom(value);
      return;
    }
    commitTo(value);
  };

  return (
    <Layout hideHeader>
      <div className="flex flex-col min-h-full bg-[#f0f2f5] relative">
        <div className="shrink-0 bg-gradient-to-br from-[#ff7a18] via-[#ff9a3c] to-[#ffb347] pt-[90px] pb-9 px-[22px] relative overflow-hidden animate-[fadeUp_0.4s_ease_both]">
          <div className="absolute -top-[70px] -right-[70px] w-[220px] h-[220px] rounded-full bg-white/10" />
          <div className="absolute -bottom-[50px] -left-[50px] w-[180px] h-[180px] rounded-full bg-white/10" />

          <p className="text-[11px] font-extrabold text-white/75 tracking-[5px] uppercase mb-3 flex items-center gap-1.5 relative z-10">
            <Plane className="w-4 h-4 fill-white text-white" />
\
            Tripzy
          </p>
          <h1 className="text-[28px] font-black text-white leading-[1.2] mb-1.5 relative z-10">
            Plan your trip in 30 seconds
          </h1>
          <p className="text-[13px] text-white/85 font-medium relative z-10 max-w-[250px]">
            Start with where you are, then pick the place you want to explore next.
          </p>
        </div>

        <div className="shrink-0 px-4 -mt-7 relative z-10 animate-[fadeUp_0.4s_0.07s_ease_both]">
          <div className="bg-white rounded-[26px] shadow-[0_16px_40px_rgba(0,0,0,0.14)] border border-white/70 p-3 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[72px] bg-gradient-to-r from-[#fff7ef] via-white to-white opacity-80 pointer-events-none" />

            {canProceed && (
              <button
                onClick={handleSwap}
                className="absolute right-4 top-[58px] z-10 w-10 h-10 rounded-2xl bg-[#fff4ec] border border-[#ffd7bf] text-[#ff7a18] flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                aria-label="Swap from and to city"
              >
                <ArrowUpDown className="w-4 h-4" strokeWidth={2.4} />
              </button>
            )}

            <button
              onClick={() => activateField('from')}
              className={`relative z-10 w-full text-left rounded-[20px] px-4 py-3.5 transition-all ${
                activeField === 'from'
                  ? 'bg-[#fff7ef] ring-2 ring-[#ffcfaa]'
                  : fromCity
                    ? 'bg-[#f9fbfd]'
                    : 'bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    activeField === 'from' || fromCity ? 'bg-[#fff0e5] text-[#ff7a18]' : 'bg-[#f2f5f8] text-[#94a3b8]'
                  }`}
                >
                  <MapPin className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[1.2px] text-[#94a3b8] mb-1">From</p>
                  {activeField === 'from' ? (
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-[#ff7a18] shrink-0" strokeWidth={2.6} />
                      <input
                        ref={fromInputRef}
                        type="text"
                        value={fromInput}
                        onChange={(event) => setFromInput(event.target.value)}
                        onKeyDown={(event) => handleInputKeyDown(event, 'from')}
                        placeholder="Where are you starting from?"
                        className="w-full bg-transparent outline-none text-[15px] font-bold text-[#1a1a2e] placeholder:text-[#a8b3c2]"
                      />
                    </div>
                  ) : (
                    <p className={`text-[15px] font-bold truncate ${fromCity ? 'text-[#1a1a2e]' : 'text-[#a8b3c2]'}`}>
                      {fromCity || 'Where are you starting from?'}
                    </p>
                  )}
                </div>
                {fromCity && activeField !== 'from' && (
                  <div className="w-7 h-7 rounded-full bg-[#ff7a18] text-white flex items-center justify-center shrink-0 mt-1">
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </div>
                )}
              </div>
            </button>

            <div className="mx-4 my-1 h-px bg-[#edf1f5]" />

            <button
              onClick={() => activateField('to')}
              className={`relative z-10 w-full text-left rounded-[20px] px-4 py-3.5 transition-all ${
                !fromCity.trim()
                  ? 'opacity-55'
                  : activeField === 'to'
                    ? 'bg-[#fff7ef] ring-2 ring-[#ffcfaa]'
                    : toCity
                      ? 'bg-[#f9fbfd]'
                      : 'bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    !fromCity.trim()
                      ? 'bg-[#f2f5f8] text-[#94a3b8]'
                      : activeField === 'to' || toCity
                        ? 'bg-[#fff0e5] text-[#ff7a18]'
                        : 'bg-[#f2f5f8] text-[#94a3b8]'
                  }`}
                >
                  <Plane className="w-4 h-4" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[1.2px] text-[#94a3b8] mb-1">To</p>
                  {activeField === 'to' ? (
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-[#ff7a18] shrink-0" strokeWidth={2.6} />
                      <input
                        ref={toInputRef}
                        type="text"
                        value={toInput}
                        onChange={(event) => setToInput(event.target.value)}
                        onKeyDown={(event) => handleInputKeyDown(event, 'to')}
                        placeholder="Where do you want to go?"
                        className="w-full bg-transparent outline-none text-[15px] font-bold text-[#1a1a2e] placeholder:text-[#a8b3c2]"
                      />
                    </div>
                  ) : (
                    <p className={`text-[15px] font-bold truncate ${toCity ? 'text-[#1a1a2e]' : 'text-[#a8b3c2]'}`}>
                      {toCity || (fromCity ? 'Where do you want to go?' : 'Select your starting city first')}
                    </p>
                  )}
                </div>
                {toCity && activeField !== 'to' && (
                  <div className="w-7 h-7 rounded-full bg-[#ff7a18] text-white flex items-center justify-center shrink-0 mt-1">
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </div>
                )}
              </div>
            </button>

            {activeField && (
              <div className="px-2 pt-2 pb-1">
                <button
                  onClick={activeField === 'from' ? () => commitFrom() : () => commitTo()}
                  className="w-full h-[44px] rounded-[16px] bg-gradient-to-r from-[#ff7a18] to-[#ff9a3c] text-white text-[13px] font-extrabold flex items-center justify-center gap-2 shadow-[0_8px_18px_rgba(255,122,24,0.24)] active:scale-[0.98] transition-transform"
                >
                  {activeField === 'from' ? 'Set departure city' : 'Set destination'}
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            )}

            {activeField && (isSearching || suggestions.length > 0) && (
              <div className="px-2 pt-2">
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[20px] overflow-hidden">
                  {isSearching && (
                    <div className="px-4 py-3 text-[12px] font-semibold text-[#64748b]">
                      Searching places...
                    </div>
                  )}
                  {!isSearching && suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.placeId || suggestion.formatted}-${index}`}
                      onClick={() => handleSuggestionPick(suggestion)}
                      className="w-full text-left px-4 py-3 border-b last:border-b-0 border-[#e2e8f0] hover:bg-white transition-colors"
                    >
                      <p className="text-[13px] font-bold text-[#1a1a2e] truncate">
                        {suggestion.name}
                      </p>
                      <p className="text-[11px] text-[#64748b] font-medium mt-1 truncate">
                        {suggestion.formatted}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {canProceed && (
              <div className="mx-2 mt-2 rounded-[18px] bg-gradient-to-r from-[#fff6ee] to-[#fffaf5] border border-[#ffe0c9] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[1px] text-[#ff7a18] mb-1">Journey Ready</p>
                    <p className="text-[14px] font-extrabold text-[#1a1a2e] truncate">
                      {fromCity} to {toCity}
                    </p>
                  </div>
                  <div className="shrink-0 px-2.5 py-1 rounded-full bg-white text-[10px] font-black text-[#ff7a18] border border-[#ffd7bf]">
                    India route
                  </div>
                </div>

                <button
                  onClick={handleProceed}
                  className="mt-3 w-full h-[46px] rounded-[16px] bg-gradient-to-r from-[#ff7a18] to-[#ff9a3c] text-white text-[13px] font-extrabold flex items-center justify-center gap-2 shadow-[0_8px_22px_rgba(255,122,24,0.28)] active:scale-[0.98] transition-transform"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            )}

            {(isFromDirty || isToDirty) && (
              <div className="mx-2 mt-2 rounded-[16px] border border-[#ffe0c9] bg-[#fff8f1] px-4 py-3">
                <p className="text-[11px] font-bold text-[#ff7a18]">
                  Select a suggestion or press the orange button to confirm the typed city.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 px-4 pt-5 pb-24 animate-[fadeUp_0.4s_0.14s_ease_both]">
          {!fromCity.trim() ? (
            <>
              <div className="mb-4">
                <h2 className="text-base font-extrabold text-[#1a1a2e]">Choose your departure city</h2>
                <p className="text-[12px] text-[#8b98a5] font-medium mt-1">
                  Pick a quick start city or type your own in the From row above.
                </p>
              </div>

              <div className="bg-white rounded-[22px] p-4 border border-[#edf1f5] shadow-[0_6px_22px_rgba(15,23,42,0.05)] mb-4">
                <p className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8] mb-3">Popular departures</p>
                <div className="flex flex-wrap gap-2.5">
                  {departureCities.map((city) => (
                    <button
                      key={city}
                      onClick={() => handleDeparturePick(city)}
                      className="px-3.5 py-2.5 rounded-full bg-[#f8fafc] border border-[#e2e8f0] text-[12px] font-bold text-[#334155] active:scale-95 transition-transform"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3.5">
                <div>
                  <h2 className="text-base font-extrabold text-[#1a1a2e]">Popular Destinations</h2>
                  <p className="text-[12px] text-[#8b98a5] font-medium mt-1">
                    Tap a destination card or edit the To row to enter any city.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-[#ff7a18] bg-[#fff4ec] px-2.5 py-1 rounded-full">India</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                {destinations.map((destination) => (
                  <div
                    key={destination.name}
                    onClick={() => handleDestinationPick(destination.name)}
                    style={{ backgroundColor: destination.bg }}
                    className={`rounded-2xl overflow-hidden cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.07)] border-[2.5px] transition-all active:scale-95 ${
                      selectedDestination === destination.name.toLowerCase()
                        ? 'border-[#ff7a18] shadow-[0_6px_20px_rgba(255,122,24,0.25)]'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="w-full h-[110px] bg-[#e8edf2] relative">
                      <WikipediaImage
                        place={destination.name}
                        wikiTitle={destination.wikiTitle}
                        className="w-full h-full object-cover"
                        alt={destination.name}
                      />
                    </div>
                    <div className="p-2.5 relative">
                      <p className="text-[9px] font-bold text-[#adb5bd] uppercase tracking-wider mb-0.5">India</p>
                      <p className="text-sm font-extrabold text-[#1a1a2e]">{destination.name}</p>
                      <span className="text-[9px] font-bold text-[#ff7a18] bg-[#fff4ec] px-2 py-0.5 rounded-full mt-1 inline-block">
                        {destination.tag}
                      </span>

                      {selectedDestination === destination.name.toLowerCase() && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#ff7a18] flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3.5} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-center text-[#94a3b8] text-xs font-medium my-4">
                Search any city in the To row if it is not listed here.
              </p>
            </>
          )}
        </div>

      </div>
    </Layout>
  );
}
