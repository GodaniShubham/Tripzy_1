import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import L from 'leaflet';
import { MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CalendarRange, ChevronDown, ChevronLeft, ChevronUp, Compass, MapPin, Navigation, Route } from 'lucide-react';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import { loadTripPlan } from '../lib/tripStorage';

const defaultMarkerIcon = new L.Icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

export default function AIPlanner() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const tripPlan = loadTripPlan();
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);

  const destination = tripPlan?.destination?.name || searchParams.get('destination') || 'India';
  const days = tripPlan?.preferences?.days || searchParams.get('days') || '3';
  const budget = tripPlan?.preferences?.budget || searchParams.get('budget') || 'Medium';
  const travelModePreference = tripPlan?.preferences?.travelMode || searchParams.get('travelMode') || 'Smart';
  const journey = tripPlan?.journey || {
    primaryMode: 'Road',
    totalDurationText: tripPlan?.route?.durationText || '--',
    dataSourceLabel: 'Estimated transport plan',
    legs: [],
  };

  const journeyLegs = journey.legs || [];
  const routeLine = tripPlan?.route?.line || [];
  const stops = useMemo(() => {
    if (!tripPlan) return [];

    const dayStops = tripPlan.ai.days.flatMap((day) => day.stops || []);
    const transferStops = journeyLegs.flatMap((leg) => [
      {
        name: leg.fromLabel,
        lat: leg.line?.[0]?.[0],
        lon: leg.line?.[0]?.[1],
        type: leg.mode,
      },
      {
        name: leg.toLabel,
        lat: leg.line?.[leg.line.length - 1]?.[0],
        lon: leg.line?.[leg.line.length - 1]?.[1],
        type: leg.mode,
      },
    ]);
    const uniqueStops = [];
    const seen = new Set();

    [{ name: tripPlan.origin.name, lat: tripPlan.origin.lat, lon: tripPlan.origin.lon, type: 'Origin' },
      ...transferStops,
      ...dayStops.map((stop) => ({ name: stop.name, lat: stop.lat, lon: stop.lon, type: stop.type })),
      { name: tripPlan.destination.name, lat: tripPlan.destination.lat, lon: tripPlan.destination.lon, type: 'Destination' },
    ].forEach((stop) => {
      if (!stop.lat || !stop.lon) return;
      const key = `${stop.name}-${stop.lat}-${stop.lon}`;
      if (seen.has(key)) return;
      seen.add(key);
      uniqueStops.push(stop);
    });

    return uniqueStops.slice(0, 12);
  }, [journeyLegs, tripPlan]);

  const mapPoints = useMemo(() => {
    const journeyPoints = journeyLegs.flatMap((leg) => leg.line || []);
    const stopPoints = stops.map((stop) => [stop.lat, stop.lon]);

    return [...journeyPoints, ...stopPoints];
  }, [journeyLegs, stops]);

  const center = mapPoints[0] || routeLine[0] || (tripPlan ? [tripPlan.destination.lat, tripPlan.destination.lon] : [20.5937, 78.9629]);

  if (!tripPlan) {
    return (
      <Layout hideHeader hideBottomNav>
        <div className="flex flex-col h-full min-h-[100dvh] bg-white px-5 pt-16 pb-8">
          <button
            onClick={() => navigate('/trips')}
            className="w-11 h-11 rounded-[16px] bg-white border border-[#f0f2f5] shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center justify-center text-[#1a1a2e] active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
          </button>
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Compass className="w-10 h-10 text-[#ff7a18] mb-4" strokeWidth={2.2} />
            <h1 className="text-[24px] font-black text-[#1a1a2e]">No live route yet</h1>
            <p className="text-[13px] text-[#64748b] font-medium mt-3 max-w-[280px] leading-relaxed">
              Generate a trip first so we can map your real route and planned stops.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout hideHeader hideBottomNav>
      <div className="flex flex-col h-full min-h-[100dvh] bg-white relative">
        <div className="absolute top-0 left-0 right-0 p-5 z-[500] pointer-events-none flex justify-between items-start">
          <button
            onClick={() => navigate(-1)}
            className="w-11 h-11 rounded-[16px] bg-white border border-[#f0f2f5] shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center justify-center text-[#1a1a2e] active:scale-95 transition-transform pointer-events-auto"
          >
            <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
          </button>

          <div className="bg-white/95 backdrop-blur-md border border-[#eaedf2] px-4 py-2.5 rounded-[16px] shadow-[0_4px_16px_rgba(0,0,0,0.06)] flex items-center gap-2 pointer-events-auto">
            <MapPin className="w-4 h-4 text-[#ff7a18]" strokeWidth={2.5} />
            <span className="text-[13px] font-black text-[#1a1a2e]">{destination}</span>
          </div>
        </div>

        <div className="flex-1 w-full bg-[#f8f9fa] relative z-0">
          {mapPoints.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f8f9fa] z-10">
              <Compass className="w-10 h-10 text-[#ff7a18] animate-[spin_2s_linear_infinite] mb-4" strokeWidth={2} />
              <p className="text-[13px] font-bold text-[#1a1a2e] animate-pulse">Preparing route map...</p>
            </div>
          ) : (
            <MapContainer center={center} zoom={8} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              {(journeyLegs.length ? journeyLegs : [{ mode: 'Road', line: routeLine }]).map((leg, index) => (
                <Polyline
                  key={`${leg.mode}-${index}`}
                  positions={leg.line}
                  color={leg.mode === 'Flight' ? '#1e90a8' : '#ff7a18'}
                  weight={leg.mode === 'Auto-rickshaw' ? 4 : 5}
                  opacity={0.88}
                  dashArray={leg.mode === 'Flight' || leg.mode === 'Train' ? '10 10' : undefined}
                  lineCap="round"
                  lineJoin="round"
                />
              ))}
              {stops.map((stop, index) => (
                <Marker key={`${stop.name}-${index}`} position={[stop.lat, stop.lon]} icon={defaultMarkerIcon}>
                  <Popup className="font-inter">
                    <div className="min-w-[160px]">
                      <p className="text-[12px] font-black text-[#1a1a2e]">{stop.name}</p>
                      <p className="text-[11px] font-semibold text-[#64748b] mt-1">{stop.type}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
              <MapUpdater points={mapPoints.length ? mapPoints : [...routeLine, ...stops.map((stop) => [stop.lat, stop.lon])]} />
            </MapContainer>
          )}
        </div>

        <div className="absolute bottom-6 left-4 right-4 z-[500] pointer-events-none">
          {isSheetCollapsed ? (
            <div className="bg-white rounded-[20px] px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#f0f2f5] pointer-events-auto animate-[fadeUp_0.3s_ease_out]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[1px] text-[#94a3b8] mb-1">Map view</p>
                  <p className="text-[13px] font-black text-[#1a1a2e] truncate">{journey.primaryMode} · {journey.totalDurationText}</p>
                </div>
                <button
                  onClick={() => setIsSheetCollapsed(false)}
                  className="shrink-0 h-10 px-3 rounded-[14px] bg-gradient-to-r from-[#ff7a18] to-[#ff9a3c] text-white font-extrabold text-[12px] flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  Show details
                  <ChevronUp className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[24px] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#f0f2f5] pointer-events-auto animate-[fadeUp_0.5s_ease_out]">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#1e90a8] to-[#0f6a7a] rounded-xl flex items-center justify-center shadow-inner shrink-0 text-white">
                    <Navigation className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-black text-[#1a1a2e] mb-0.5 leading-tight">Live Route View</h3>
                    <p className="text-[12px] font-semibold text-[#8b98a5] flex items-center gap-1.5">
                      <CalendarRange className="w-3.5 h-3.5 text-[#ff7a18]" strokeWidth={2.5} />
                      {days} Days &middot; {budget} Budget &middot; {travelModePreference}
                    </p>
                    {journey.dataSourceLabel && (
                      <p className="text-[11px] font-medium text-[#64748b] mt-1">{journey.dataSourceLabel}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsSheetCollapsed(true)}
                  className="shrink-0 w-10 h-10 rounded-[14px] bg-[#fff4ec] border border-[#ffd7bf] text-[#ff7a18] flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="Hide route details to view more of the map"
                >
                  <ChevronDown className="w-5 h-5" strokeWidth={2.6} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-[18px] bg-[#fff6ee] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[1px] text-[#ff7a18] mb-1 flex items-center gap-1.5">
                    <Route className="w-3.5 h-3.5" strokeWidth={2.4} />
                    Journey
                  </p>
                  <p className="text-[16px] font-black text-[#1a1a2e]">{journey.primaryMode}</p>
                </div>
                <div className="rounded-[18px] bg-[#eef8fb] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[1px] text-[#1e90a8] mb-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" strokeWidth={2.4} />
                    Travel time
                  </p>
                  <p className="text-[16px] font-black text-[#1a1a2e]">{journey.totalDurationText}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 mb-4">
                {journey.legs.map((leg, index) => (
                  <div key={`${leg.title}-${index}`} className="rounded-[16px] bg-[#f8fafc] border border-[#e5edf5] px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[12px] font-black text-[#1a1a2e]">{leg.mode}</p>
                      <span className="text-[10px] font-black text-[#ff7a18]">{leg.costLabel}</span>
                    </div>
                    <p className="text-[11px] text-[#64748b] font-medium mt-1 leading-relaxed">
                      {leg.fromLabel} to {leg.toLabel}
                    </p>
                    <p className="text-[10px] text-[#94a3b8] font-semibold mt-1">
                      {leg.distanceKm} km · {leg.durationText}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate(-1)}
                className="w-full h-[52px] rounded-[16px] bg-gradient-to-r from-[#ff7a18] to-[#ff9a3c] text-white font-extrabold text-[14px] flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(255,122,24,0.3)] active:scale-95 transition-transform"
              >
                Return to Overview
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function MapUpdater({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;

    const validPoints = points.filter(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1])
    );

    if (!validPoints.length) return;

    const refreshMap = () => {
      map.invalidateSize();

      if (validPoints.length === 1) {
        map.setView(validPoints[0], 11, { animate: false });
        return;
      }

      map.fitBounds(validPoints, {
        paddingTopLeft: [24, 96],
        paddingBottomRight: [24, 280],
        animate: false,
      });
    };

    refreshMap();
    const timerA = setTimeout(refreshMap, 80);
    const timerB = setTimeout(refreshMap, 260);

    window.addEventListener('resize', refreshMap);

    return () => {
      clearTimeout(timerA);
      clearTimeout(timerB);
      window.removeEventListener('resize', refreshMap);
    };
  }, [map, points]);

  return null;
}
