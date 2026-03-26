import React, { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';

export default function Layout({ 
  children, 
  pageTitle, 
  showBack = false, 
  hideHeader = false, 
  hideBottomNav = false 
}) {
  const location = useLocation();
  const scrollRef = useRef(null);
  const isFullscreenPage = hideHeader && hideBottomNav;

  useLayoutEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  return (
    <div className="bg-gray-100 min-h-screen flex justify-center text-gray-900 antialiased selection:bg-orange-100 font-inter">
      {/* Global App Container (max-w: 420px) */}
      <div className="w-full max-w-[420px] mx-auto bg-white min-h-screen flex flex-col relative overflow-hidden shadow-2xl">
        
        <Header pageTitle={pageTitle} showBack={showBack} hideHeader={hideHeader} />

        {/* Scrollable Content Area */}
        <div
          ref={scrollRef}
          className={`flex-grow hide-scrollbar ${
            isFullscreenPage ? 'overflow-hidden pb-0' : 'overflow-y-auto pb-32'
          }`}
        >
          {children}
        </div>

        <BottomNav hideBottomNav={hideBottomNav} />

      </div>
    </div>
  );
}
