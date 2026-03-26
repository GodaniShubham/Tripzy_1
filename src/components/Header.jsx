import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Header({ pageTitle = 'Tripzy', showBack = false, hideHeader = false }) {
  const navigate = useNavigate();

  if (hideHeader) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-[60] shadow-sm">
      <div className="w-10">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 active:scale-95 transition-transform text-gray-900 border border-gray-100"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>
      <h1 className="text-lg font-semibold text-gray-900 tracking-tight flex-1 text-center truncate">
        {pageTitle}
      </h1>
      <div className="w-10 flex justify-end"></div>
    </div>
  );
}
