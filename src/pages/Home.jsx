import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Search, Mic, Plane, Hotel, Train, Car, Map as MapIcon, RefreshCw, SlidersHorizontal, ChevronRight, Flame, MapPin, Star, Heart, Sparkles, ArrowRight, Eye, CheckCircle, Edit3, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WikipediaImage from '../components/WikipediaImage';

const aiSuggestionPool = [
  { place: 'Jaipur', tag: 'CULTURE', reason: 'Royal palaces, lively bazaars, and heritage walks' },
  { place: 'Rishikesh', tag: 'WELLNESS', reason: 'Yoga retreats, river views, and peaceful ghats' },
  { place: 'Andaman', tag: 'BEACH', reason: 'Clear waters, island hopping, and scuba spots' },
  { place: 'Goa', tag: 'BEACH', reason: 'Sunset beaches, cafes, and easy coastal breaks' },
  { place: 'Udaipur', tag: 'ROMANTIC', reason: 'Lake views, palace charm, and slow evenings' },
  { place: 'Leh Ladakh', tag: 'ADVENTURE', reason: 'High-altitude drives, valleys, and epic viewpoints' },
  { place: 'Kerala', tag: 'NATURE', reason: 'Backwaters, greenery, and calm scenic routes' },
  { place: 'Varanasi', tag: 'SPIRITUAL', reason: 'Ghats, rituals, and timeless old-city energy' },
  { place: 'Darjeeling', tag: 'HILLS', reason: 'Tea gardens, toy train vibes, and cool weather' },
  { place: 'Manali', tag: 'MOUNTAINS', reason: 'Snow peaks, waterfalls, and adventure routes' },
  { place: 'Amritsar', tag: 'FOOD', reason: 'Iconic food, heritage streets, and Golden Temple visits' },
  { place: 'Shimla', tag: 'HILL STATION', reason: 'Colonial charm, ridge walks, and mountain air' },
];

const getRandomSuggestions = (count = 6) =>
  [...aiSuggestionPool]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setLoading(false);
      loadMockAISuggestions();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const loadMockAISuggestions = () => {
    setAiSuggestions(getRandomSuggestions());
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      loadMockAISuggestions();
    }, 800);
  };

  return (
    <Layout pageTitle="Home" hideHeader={true}>
      
      {loading && (
        <div id="preloader" className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center transition-opacity duration-500">
          <div className="flex flex-col items-center">
            {/* Logo placeholder - replace with actual tripzy.png if imported */}
            <div className="w-40 h-40 relative flex items-center justify-center text-4xl font-black text-orange-500">
              Tripzy
            </div>
            <div className="mt-8">
              <div className="w-8 h-8 border-3 border-gray-200 border-t-orange-500 rounded-full animate-spin border-4 border-solid"></div>
            </div>
            <div className="mt-4 text-sm text-gray-400">Ready to explore...</div>
          </div>
        </div>
      )}

      {/* Hero Banner with Background Image */}
      <div className="relative w-full overflow-hidden rounded-b-[2.5rem] mx-0 shadow-xl" style={{ minHeight: '320px' }}>
        <img 
            src="https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop" 
            alt="Tropical Beach" 
            className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-[#f3cca8]/95 font-inter"></div>
        
        <div className="relative z-10 flex flex-col gap-6 px-5 pt-12 pb-6">
          <div className="flex flex-col gap-1.5">
              <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-md">Discover Your Next Adventure</h1>
              <p className="text-sm text-white/90 font-medium">Find stays, trips, and experiences crafted for you</p>
          </div>

          {/* Search Bar */}
          <div className="w-full flex items-center gap-3 bg-white/20 backdrop-blur-xl border border-white/40 p-2 rounded-full shadow-lg">
              <div className="w-10 h-10 shrink-0 rounded-full relative flex items-center justify-center ml-0.5">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-300 rounded-full blur-[2px] opacity-80"></div>
                  <Search className="w-4 h-4 text-white relative z-10" />
              </div>
              <input 
                type="text" 
                placeholder="Search destinations, hotels, trips..." 
                className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-white/70 font-medium text-white min-w-0" 
                onFocus={() => navigate('/trips')}
              />
              <button className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md transition-colors text-white border border-white/30">
                  <Mic strokeWidth={1.5} className="w-5 h-5" />
              </button>
          </div>

          {/* Category Tabs */}
          <div className="flex justify-between px-2 overflow-x-auto hide-scrollbar gap-8 pb-2 mt-2">
              <div className="flex flex-col items-center gap-2.5 shrink-0 group cursor-pointer">
                  <div className="w-14 h-14 rounded-[1.3rem] bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center active:scale-90 transition-all">
                      <Plane strokeWidth={2} className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider opacity-90">Flights</span>
              </div>
              <div className="flex flex-col items-center gap-2.5 shrink-0 group cursor-pointer">
                  <div className="w-14 h-14 rounded-[1.3rem] bg-white flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.08)] active:scale-90 transition-all">
                      <Hotel strokeWidth={2.5} className="w-6 h-6 text-slate-800" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Hotels</span>
              </div>
              <div className="flex flex-col items-center gap-2.5 shrink-0 group cursor-pointer">
                  <div className="w-14 h-14 rounded-[1.3rem] bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center active:scale-90 transition-all">
                      <Train strokeWidth={2} className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider opacity-90">Trains</span>
              </div>
              <div className="flex flex-col items-center gap-2.5 shrink-0 group cursor-pointer">
                  <div className="w-14 h-14 rounded-[1.3rem] bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center active:scale-90 transition-all">
                      <Car strokeWidth={2} className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider opacity-90">Cars</span>
              </div>
              <div className="flex flex-col items-center gap-2.5 shrink-0 group cursor-pointer">
                  <div className="w-14 h-14 rounded-[1.3rem] bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center active:scale-90 transition-all">
                      <MapIcon strokeWidth={2} className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider opacity-90">Tours</span>
              </div>
          </div>
        </div>
      </div>

      {/* AI Suggestions Section */}
      <div className="mt-8 px-6">
          <div className="flex items-center justify-between mb-5">
              <div>
                  <h2 className="text-xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                      AI Suggestions <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter">NEW</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Smart picks based on your style</p>
              </div>
              <div className="flex gap-2">
                  <button onClick={handleRefresh} className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-orange-500 transition-colors">
                      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <button className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600">
                      <SlidersHorizontal className="w-4 h-4" />
                  </button>
              </div>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 px-1 -mx-1 hide-scrollbar">
              {aiSuggestions.length === 0 ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="min-w-[140px] w-[140px] flex-shrink-0">
                      <div className="w-full h-44 rounded-3xl bg-gray-100 animate-pulse mb-3"></div>
                      <div className="w-3/4 h-3 bg-gray-100 animate-pulse rounded-full mb-2"></div>
                      <div className="w-1/2 h-2 bg-gray-50 animate-pulse rounded-full"></div>
                  </div>
                ))
              ) : (
                aiSuggestions.map((item, idx) => (
                  <div key={idx} onClick={() => navigate(`/trips?destination=${encodeURIComponent(item.place)}`)} className="snap-start min-w-[170px] w-[170px] relative group cursor-pointer flex-shrink-0" style={{ animation: `fadeUp 0.6s ${idx * 0.1}s ease both` }}>
                      <div className="relative h-56 rounded-[2rem] overflow-hidden shadow-md group-active:scale-95 transition-all bg-gray-100">
                          <WikipediaImage place={item.place} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.place} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                          <div className="absolute bottom-0 left-0 p-4 w-full z-10">
                              <span className="bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-[8px] font-black text-gray-900 uppercase tracking-tighter mb-2 inline-block">{item.tag}</span>
                              <h3 className="text-sm font-bold text-white line-clamp-1">{item.place}</h3>
                              <p className="text-[9px] text-white/70 mt-1 line-clamp-2 leading-tight">{item.reason}</p>
                          </div>
                      </div>
                  </div>
                ))
              )}
          </div>
      </div>

      {/* Popular Trips Section */}
      <div className="mt-8">
          <div className="flex items-end justify-between px-6 mb-5">
              <div>
                  <h2 className="text-xl font-bold tracking-tight text-gray-900">Popular Trips</h2>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Ready-made itineraries loved by travelers</p>
              </div>
              <button className="text-xs font-bold text-blue-600 flex items-center gap-0.5 mb-1 active:opacity-70 uppercase tracking-wider">
                  See All <ChevronRight className="w-3.5 h-3.5" />
              </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 px-6 snap-x hide-scrollbar">
              {[
                { place: 'Goa', title: 'Goa Beach Escape', state: 'Goa, India', price: '₹18,000', rating: '4.8', reviews: '2.3k', days: '4D / 3N', trending: true },
                { place: 'Manali, Himachal Pradesh', title: 'Manali Snow Adventure', state: 'Himachal Pradesh', price: '₹20,000', rating: '4.7', reviews: '1.6k', days: '5D / 4N', trending: false },
                { place: 'Kerala', title: 'Kerala Backwater Retreat', state: 'Alleppey & Munnar', price: '₹22,000', rating: '4.9', reviews: '980', days: '5D / 4N', trending: false },
                { place: 'Jaipur', title: 'Jaipur Royal Heritage', state: 'Rajasthan', price: '₹15,000', rating: '4.6', reviews: '1.2k', days: '3D / 2N', trending: true }
              ].map((trip, idx) => (
              <div key={idx} className="snap-start min-w-[280px] w-[280px] bg-white border border-neutral-100 rounded-[2rem] overflow-hidden shadow-md active:scale-[0.98] transition-all flex-shrink-0 relative group">
                  <div className="relative h-48 bg-gray-100">
                      <WikipediaImage place={trip.place} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={trip.title} />
                      <div className="absolute top-4 left-4 flex gap-2">
                            {trip.trending && <span className="bg-orange-500 text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg flex items-center gap-1">
                                <Flame className="w-3 h-3 fill-current" /> TRENDING
                            </span>}
                            <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold text-gray-700 shadow-sm">{trip.days}</span>
                      </div>
                      <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white hover:bg-black/40 transition-colors">
                          <Heart className="w-4.5 h-4.5" />
                      </button>
                      <div className="absolute bottom-4 right-4 bg-white px-3 py-1.5 rounded-full shadow-lg border border-neutral-100">
                            <p className="text-[10px] font-bold text-gray-900">From <span className="text-indigo-600 text-sm">{trip.price}</span></p>
                      </div>
                  </div>
                  <div className="p-5">
                      <div className="flex items-center gap-1.5 mb-1">
                            <MapPin className="w-3 h-3 text-orange-500" />
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{trip.state}</p>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{trip.title}</h3>
                      <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-1.5">
                              <div className="flex items-center gap-0.5">
                                  <Star className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                                  <span className="text-xs font-bold text-gray-900">{trip.rating}</span>
                              </div>
                              <span className="text-[10px] font-medium text-gray-400">({trip.reviews} travelers)</span>
                          </div>
                          <button onClick={() => navigate(`/trips?destination=${encodeURIComponent(trip.place)}`)} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">VIEW TRIP</button>
                      </div>
                  </div>
              </div>
              ))}
          </div>
      </div>

      {/* Popular Stays Section */}
      <div className="mt-8">
          <div className="flex items-end justify-between px-6 mb-5">
              <div>
                  <h2 className="text-xl font-bold tracking-tight text-gray-900">Popular Stays</h2>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Handpicked collection of luxury retreats</p>
              </div>
              <button className="text-xs font-bold text-blue-600 flex items-center gap-0.5 mb-1 active:opacity-70 uppercase tracking-wider">
                  See All <ChevronRight className="w-3.5 h-3.5" />
              </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 px-6 snap-x hide-scrollbar">
              {[
                { place: 'Taj Lake Palace, Udaipur', title: 'Taj Lake Palace', loc: 'Udaipur, Rajasthan', price: '₹35,000', rating: '5.0', reviews: '1.2k' },
                { place: 'The Leela Palace, New Delhi', title: 'The Leela Palace', loc: 'New Delhi, India', price: '₹28,000', rating: '4.9', reviews: '2.1k' },
                { place: 'Taj Falaknuma Palace', title: 'Taj Falaknuma Palace', loc: 'Hyderabad, Telangana', price: '₹45,000', rating: '5.0', reviews: '1.5k' },
                { place: 'Oberoi Udaivilas', title: 'Oberoi Udaivilas', loc: 'Udaipur, Rajasthan', price: '₹42,000', rating: '5.0', reviews: '940' }
              ].map((stay, idx) => (
              <div key={idx} className="snap-start min-w-[280px] w-[280px] bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-md active:scale-[0.98] transition-all relative group shrink-0">
                  <div className="relative h-48 p-2.5 pb-0">
                      <div className="w-full h-full rounded-[1.5rem] overflow-hidden bg-gray-100 relative">
                          <WikipediaImage place={stay.place} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={stay.title} />
                      </div>
                      <button className="absolute top-5 right-5 w-9 h-9 rounded-full bg-black/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white hover:bg-black/40 transition-colors">
                          <Heart className="w-4.5 h-4.5" />
                      </button>
                      <div className="absolute bottom-3 right-5 bg-white px-3 py-1.5 rounded-full shadow-lg">
                           <p className="text-[10px] font-bold text-gray-900"><span className="text-indigo-600 text-sm">{stay.price}</span> / night</p>
                      </div>
                  </div>
                  <div className="p-5 pt-4">
                      <div className="flex items-center gap-1.5 text-xs mb-2">
                          <Star className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                          <span className="font-bold text-gray-900">{stay.rating}</span>
                          <span className="text-gray-400 font-medium">({stay.reviews} Reviews)</span>
                      </div>
                      <h3 className="text-base font-bold text-gray-900">{stay.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 font-medium">{stay.loc}</p>
                  </div>
              </div>
              ))}
          </div>
      </div>

      {/* Trending Destinations Section */}
      <div className="mt-8 mb-8">
          <div className="flex items-end justify-between px-6 mb-5">
              <div>
                  <h2 className="text-xl font-bold tracking-tight text-gray-900">Trending Destinations</h2>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Top locations travelers are exploring now</p>
              </div>
              <button className="text-xs font-bold text-blue-600 flex items-center gap-0.5 mb-1 active:opacity-70 uppercase tracking-wider">
                  See All <ChevronRight className="w-3.5 h-3.5" />
              </button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 px-6 snap-x hide-scrollbar">
              {[
                { place: 'Goa', title: 'Goa', desc: 'Tropical beaches & nightlife', price: '₹4,500' },
                { place: 'Leh Ladakh', title: 'Leh Ladakh', desc: 'Mountain adventure & landscapes', price: '₹6,000' },
                { place: 'Udaipur', title: 'Udaipur', desc: 'City of Lakes and palaces', price: '₹5,500' },
                { place: 'Shimla', title: 'Shimla', desc: 'Queen of Hill Stations', price: '₹4,000' }
              ].map((dest, idx) => (
              <div key={idx} onClick={() => navigate(`/trips?destination=${encodeURIComponent(dest.title)}`)} className="snap-start min-w-[200px] w-[200px] relative h-[280px] rounded-[2.5rem] overflow-hidden cursor-pointer active:scale-95 transition-all shadow-md group shrink-0 bg-gray-100">
                  <WikipediaImage place={dest.place} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={dest.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-5 text-white w-full">
                      <h3 className="text-base font-bold">{dest.title}</h3>
                      <p className="text-[10px] text-gray-200 mt-1 line-clamp-2 leading-relaxed font-medium">{dest.desc}</p>
                      <p className="text-[10px] font-bold mt-3 uppercase tracking-wider text-orange-400">From {dest.price}/night</p>
                  </div>
              </div>
              ))}
          </div>
      </div>

      {/* AI Trip Planner CTA Section */}
      <div className="mt-8 px-6 mb-12">
          <div className="bg-indigo-600 rounded-[2.5rem] p-8 relative overflow-hidden shadow-xl shadow-indigo-100">
                  <div className="relative z-10">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                          <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <h2 className="text-2xl font-black text-white mb-3">AI Trip Planner</h2>
                      <p className="text-white/70 text-xs leading-relaxed mb-8 font-medium">Let our AI build your dream itinerary for any destination in India. Get personalized recommendations in seconds with dynamic weather mapping.</p>
                      <button onClick={() => navigate('/ai-planner')} className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3.5 rounded-2xl font-bold text-xs hover:bg-neutral-50 active:scale-95 transition-all shadow-lg">
                          Start Planning Free
                          <ArrowRight className="w-4 h-4" />
                      </button>
                  </div>
                  <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              </div>
      </div>

    </Layout>
  );
}
