import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Map, User } from 'lucide-react';
import './BottomNav.css';

export default function BottomNav({ hideBottomNav = false }) {
  const location = useLocation();
  const path = location.pathname;
  const isAccountActive = path.startsWith('/account') || path.startsWith('/dashboard');

  if (hideBottomNav) return null;

  const isActive = (tabPath) => {
    if (tabPath === '/' && path === '/') return true;
    if (tabPath !== '/' && path.startsWith(tabPath)) return true;
    return false;
  };

  const handleNavClick = (event, targetPath) => {
    const feedbackGate = window.__tripzyOverviewFeedbackGate;

    if (typeof feedbackGate === 'function' && targetPath !== path) {
      event.preventDefault();
      feedbackGate('Please submit your feedback before leaving this page.');
    }
  };

  return (
    <nav className="tnav">
      {/* Home */}
      <Link to="/" className={isActive('/') ? 'on' : ''} onClick={(event) => handleNavClick(event, '/')}>
        <div className="tnav-ic">
          <Home className={`w-[22px] h-[22px] ${isActive('/') ? 'text-[#ff7a18] fill-[#ff7a18]' : 'text-gray-400'}`} strokeWidth={isActive('/') ? 0 : 2} />
        </div>
        <span className="tnav-lbl">Home</span>
        <div className="tnav-dot"></div>
      </Link>

      {/* Discover */}
      <Link
        to="/discover"
        className={isActive('/discover') ? 'on' : ''}
        onClick={(event) => handleNavClick(event, '/discover')}
      >
        <div className="tnav-ic">
          <Compass className={`w-[22px] h-[22px] ${isActive('/discover') ? 'text-[#ff7a18]' : 'text-gray-400'}`} strokeWidth={isActive('/discover') ? 2.5 : 2} />
        </div>
        <span className="tnav-lbl">Discover</span>
        <div className="tnav-dot"></div>
      </Link>

      {/* Trips (Center) */}
      <Link
        to="/trips"
        className={isActive('/trips') ? 'on' : ''}
        style={{ position: 'relative' }}
        onClick={(event) => handleNavClick(event, '/trips')}
      >
        <div 
          style={{
            width: '48px', height: '48px', borderRadius: '16px',
            background: isActive('/trips') ? 'linear-gradient(135deg,#ff7a18,#ff9a3c)' : '#f5f6f8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '2px',
            boxShadow: isActive('/trips') ? '0 4px 14px rgba(255,122,24,.4)' : 'none',
            transition: 'all .25s'
          }}
        >
          <Map className={`w-[22px] h-[22px] ${isActive('/trips') ? 'text-white' : 'text-gray-400'}`} strokeWidth={isActive('/trips') ? 2.2 : 2} />
        </div>
        <span className="tnav-lbl">Trips</span>
      </Link>

      {/* Account */}
      <Link
        to="/account"
        className={isAccountActive ? 'on' : ''}
        onClick={(event) => handleNavClick(event, '/account')}
      >
        <div className="tnav-ic">
          <User className={`w-[22px] h-[22px] ${isAccountActive ? 'text-[#ff7a18]' : 'text-gray-400'}`} strokeWidth={isAccountActive ? 2.5 : 2} />
        </div>
        <span className="tnav-lbl">Account</span>
        <div className="tnav-dot"></div>
      </Link>
    </nav>
  );
}
