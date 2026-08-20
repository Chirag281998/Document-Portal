import React, { useState } from 'react';
import { User, Menu, Cloud, ChevronRight, Settings, FolderKanban, ShieldCheck, HardDrive, FileSpreadsheet } from 'lucide-react';
import { AppView, R2ConnectionStatus } from '../types';
import { formatBytes } from '../data/plantStructures';

interface TopAppBarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  onOpenMenu: () => void;
  storageUsedBytes: number;
  totalFilesCount: number;
  r2Status?: R2ConnectionStatus | null;
  onOpenSettings: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  activeView,
  onViewChange,
  onOpenMenu,
  storageUsedBytes,
  totalFilesCount,
  r2Status,
  onOpenSettings,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const formattedUsed = formatBytes(storageUsedBytes);
  const isR2Connected = Boolean(r2Status?.configured);

  return (
    <header className="bg-white border-b border-[#c4c6cf] flex justify-between items-center w-full px-4 md:px-7 py-2.5 z-40 sticky top-0 h-16 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          id="btn-options-menu-toggle"
          onClick={onOpenMenu}
          className="text-[#002046] hover:bg-[#e0e7f5] active:scale-95 transition-all p-2 rounded-xl flex items-center justify-center border border-[#c4c6cf] bg-[#f8fafc] shadow-2xs cursor-pointer group"
          title="Open Portal Options & Navigation Menu"
          aria-label="Open portal options menu"
        >
          <Menu className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" />
        </button>

        <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => onViewChange('dashboard')}>
          <div className="w-9 h-9 rounded-xl bg-[#002046] text-white flex items-center justify-center font-bold shadow-xs">
            <FolderKanban className="w-5 h-5 text-sky-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[17px] md:text-[19px] font-bold text-[#002046] tracking-tight leading-none">
                Document Portal
              </h1>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#d5e0f7] text-[#002046]">
                53 UNITS
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#545f72] hidden sm:inline-block tracking-wider font-medium">
              TECHNICAL DRAWING & PLANT REPOSITORY
            </span>
          </div>
        </div>
      </div>

      {/* Cloudflare R2 Status & Quick Stats */}
      <div className="hidden lg:flex items-center gap-5">
        <button
          onClick={onOpenSettings}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono transition-all shadow-2xs ${
            isR2Connected
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
              : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
          }`}
          title="Click to configure Cloudflare R2 credentials"
        >
          <Cloud className={`w-3.5 h-3.5 ${isR2Connected ? 'text-emerald-600' : 'text-amber-600'}`} />
          <span className="font-semibold">
            {isR2Connected
              ? `R2 Cloud: ${r2Status?.bucketName || 'Connected'}`
              : 'R2 Cloud: Setup Needed'}
          </span>
          <span className={`w-2 h-2 rounded-full ${isR2Connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
        </button>

        <div className="text-right">
          <p className="text-[10px] font-bold tracking-wider text-[#74777f] uppercase">Total Active Documents</p>
          <p className="text-[12px] font-mono font-bold text-[#002046]">
            {totalFilesCount} Files <span className="text-[#545f72] font-normal">({formattedUsed})</span>
          </p>
        </div>
      </div>

      {/* User & Settings Controls */}
      <div className="flex items-center gap-2.5">
        {/* Settings button */}
        <button
          id="btn-quick-settings"
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-[#545f72] hover:bg-[#e6e8ea] hover:text-[#002046] border border-[#c4c6cf] bg-[#f8fafc] transition-colors flex items-center justify-center shadow-2xs"
          title="Cloudflare R2 & Portal Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User profile button */}
        <div className="relative">
          <button
            id="btn-user-profile-menu"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 text-[#44474e] hover:bg-[#e6e8ea] transition-colors p-1.5 rounded-xl border border-[#c4c6cf] bg-[#f8fafc] shadow-2xs"
            title="Account & Portal Management"
          >
            <div className="w-7 h-7 rounded-lg bg-[#002046] text-white flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[#002046] hidden md:inline-block pr-1">
              Engineer
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#c4c6cf] rounded-2xl shadow-xl z-50 p-4 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-start gap-3 pb-3 border-b border-[#eceef0]">
                <div className="w-10 h-10 rounded-xl bg-[#002046] text-white flex items-center justify-center">
                  <User className="w-5 h-5 text-sky-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#191c1e] truncate">
                    Document Portal Engineer
                  </p>
                  <p className="text-xs text-[#545f72] truncate font-mono">
                    Planning & Infrastructure
                  </p>
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-[#d5e0f7] text-[#002046] rounded-md text-[10px] font-bold">
                    <ShieldCheck className="w-3 h-3 text-[#002046]" /> Authorized User
                  </span>
                </div>
              </div>

              <div className="py-3 border-b border-[#eceef0] space-y-2">
                <div className="flex justify-between text-xs text-[#44474e]">
                  <span>Cloudflare R2 Status</span>
                  <span className={`font-mono font-semibold ${isR2Connected ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isR2Connected ? 'Active' : 'Unconfigured'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-[#44474e]">
                  <span>Total Plant Documents</span>
                  <span className="font-mono font-bold text-[#002046]">{totalFilesCount} Files</span>
                </div>
                <div className="flex justify-between text-xs text-[#44474e]">
                  <span>Total Storage</span>
                  <span className="font-mono font-bold text-[#002046]">{formattedUsed}</span>
                </div>
              </div>

              <div className="pt-2 space-y-1">
                <button
                  onClick={() => {
                    onOpenSettings();
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-[#191c1e] hover:bg-[#f2f4f6] rounded-lg flex items-center justify-between"
                >
                  <span>Cloudflare R2 Bucket Settings</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#74777f]" />
                </button>
                <button
                  onClick={() => {
                    onViewChange('data-entry');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-[#191c1e] hover:bg-[#f2f4f6] rounded-lg flex items-center justify-between"
                >
                  <span>Data Entry (Upload & Manage)</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#74777f]" />
                </button>
                <button
                  onClick={() => {
                    onViewChange('files');
                    setShowProfileMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-[#191c1e] hover:bg-[#f2f4f6] rounded-lg flex items-center justify-between"
                >
                  <span>Browse 53 Plant Structures</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#74777f]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
