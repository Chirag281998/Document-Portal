import React from 'react';
import { LayoutDashboard, Edit3, FolderOpen } from 'lucide-react';
import { AppView } from '../types';

interface BottomNavProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeView, onViewChange }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center h-16 pb-safe bg-white border-t border-[#c4c6cf] shadow-lg">
      {/* Dashboard Tab */}
      <button
        id="btn-bottom-dashboard"
        onClick={() => onViewChange('dashboard')}
        className={`flex flex-col items-center justify-center px-4 py-1.5 transition-all cursor-pointer ${
          activeView === 'dashboard'
            ? 'bg-[#d5e0f7] text-[#002046] rounded-full scale-95 duration-150 font-bold'
            : 'text-[#44474e] hover:text-[#002046]'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] uppercase tracking-wider">
          Dashboard
        </span>
      </button>

      {/* Data Entry Tab */}
      <button
        id="btn-bottom-data-entry"
        onClick={() => onViewChange('data-entry')}
        className={`flex flex-col items-center justify-center px-4 py-1.5 transition-all cursor-pointer ${
          activeView === 'data-entry'
            ? 'bg-[#d5e0f7] text-[#002046] rounded-full scale-95 duration-150 font-bold'
            : 'text-[#44474e] hover:text-[#002046]'
        }`}
      >
        <Edit3 className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] uppercase tracking-wider">
          Data Entry
        </span>
      </button>

      {/* Files Tab */}
      <button
        id="btn-bottom-files"
        onClick={() => onViewChange('files')}
        className={`flex flex-col items-center justify-center px-4 py-1.5 transition-all cursor-pointer ${
          activeView === 'files'
            ? 'bg-[#d5e0f7] text-[#002046] rounded-full scale-95 duration-150 font-bold'
            : 'text-[#44474e] hover:text-[#002046]'
        }`}
      >
        <FolderOpen className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] uppercase tracking-wider">
          Repository
        </span>
      </button>
    </nav>
  );
};
