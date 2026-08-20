import React from 'react';
import { 
  LayoutDashboard, 
  FolderTree, 
  Database, 
  Settings, 
  X, 
  Cloud, 
  Layers,
  ChevronRight,
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { AppView, Branch, R2ConnectionStatus } from '../types';

interface NavigationDrawerProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  selectedBranch: Branch;
  onSelectBranch: (branch: Branch) => void;
  totalFiles: number;
  totalStructures: number;
  isOpen: boolean;
  onClose: () => void;
  r2Status?: R2ConnectionStatus | null;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  activeView,
  onViewChange,
  selectedBranch,
  onSelectBranch,
  totalFiles,
  totalStructures,
  isOpen,
  onClose,
  r2Status,
}) => {
  const isR2Connected = Boolean(r2Status?.configured);

  const navItems = [
    {
      id: 'dashboard' as AppView,
      label: 'Executive Dashboard',
      description: 'Plant overview, statistics & CAD canvas',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'files' as AppView,
      label: 'Document Repository',
      description: 'Browse & download 53 plant unit documents',
      icon: FolderTree,
      badge: `${totalFiles || 0} docs`
    },
    {
      id: 'data-entry' as AppView,
      label: 'Data Entry (Uploads)',
      description: 'Upload drawings, GRN, SRN, PO, SO',
      icon: Database,
      badge: 'Protected'
    },
    {
      id: 'settings' as AppView,
      label: 'Cloudflare R2 Settings',
      description: 'S3 API credentials & storage config',
      icon: Settings,
      badge: isR2Connected ? 'Connected' : 'Setup'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative flex flex-col w-full max-w-sm bg-white shadow-2xl z-10 h-full border-r border-[#c4c6cf] animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 bg-[#002046] text-white border-b border-sky-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-sky-300 font-bold border border-white/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white leading-tight">
                Document Portal
              </h2>
              <p className="text-[10px] text-sky-200 font-mono tracking-wider">
                53 PLANT STRUCTURES • S3 R2
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            title="Close Options Menu"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 select-none bg-[#f8fafc]">
          {/* Main Navigation Links */}
          <div>
            <p className="text-[11px] font-bold text-[#545f72] tracking-wider uppercase mb-2 px-1">
              Portal Options & Navigation
            </p>
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-link-${item.id}`}
                    onClick={() => {
                      onViewChange(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all text-left border cursor-pointer ${
                      isActive
                        ? 'bg-[#002046] text-white border-[#002046] shadow-sm'
                        : 'bg-white text-[#191c1e] border-[#c4c6cf] hover:bg-[#e0e7f5] hover:border-[#002046]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-white/20 text-white' : 'bg-[#f0f4f8] text-[#002046]'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-xs block leading-tight">
                          {item.label}
                        </span>
                        <span className={`text-[10px] line-clamp-1 mt-0.5 ${
                          isActive ? 'text-sky-200' : 'text-[#545f72]'
                        }`}>
                          {item.description}
                        </span>
                      </div>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#d5e0f7] text-[#002046]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Engineering Disciplines Filter */}
          <div>
            <div className="flex justify-between items-center px-1 mb-2">
              <p className="text-[11px] font-bold text-[#545f72] tracking-wider uppercase">
                Engineering Discipline
              </p>
              <span className="text-[10px] font-mono text-[#002046] font-bold">
                {selectedBranch.toUpperCase()} SELECTED
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                id="nav-branch-civil"
                onClick={() => {
                  onSelectBranch('civil');
                  onClose();
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  selectedBranch === 'civil'
                    ? 'bg-[#002046] text-white border-[#002046] shadow-xs'
                    : 'bg-white text-[#44474e] border-[#c4c6cf] hover:bg-[#f0f4f8]'
                }`}
              >
                <span className="text-xs font-bold">Civil</span>
                <span className={`text-[9px] font-mono mt-0.5 ${selectedBranch === 'civil' ? 'text-sky-200' : 'text-[#74777f]'}`}>
                  Foundation
                </span>
              </button>

              <button
                id="nav-branch-mechanical"
                onClick={() => {
                  onSelectBranch('mechanical');
                  onClose();
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  selectedBranch === 'mechanical'
                    ? 'bg-[#002046] text-white border-[#002046] shadow-xs'
                    : 'bg-white text-[#44474e] border-[#c4c6cf] hover:bg-[#f0f4f8]'
                }`}
              >
                <span className="text-xs font-bold">Mechanical</span>
                <span className={`text-[9px] font-mono mt-0.5 ${selectedBranch === 'mechanical' ? 'text-sky-200' : 'text-[#74777f]'}`}>
                  Piping
                </span>
              </button>

              <button
                id="nav-branch-eni"
                onClick={() => {
                  onSelectBranch('eni');
                  onClose();
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  selectedBranch === 'eni'
                    ? 'bg-[#002046] text-white border-[#002046] shadow-xs'
                    : 'bg-white text-[#44474e] border-[#c4c6cf] hover:bg-[#f0f4f8]'
                }`}
              >
                <span className="text-xs font-bold">E&I</span>
                <span className={`text-[9px] font-mono mt-0.5 ${selectedBranch === 'eni' ? 'text-sky-200' : 'text-[#74777f]'}`}>
                  Controls
                </span>
              </button>
            </div>
          </div>

          {/* Cloudflare R2 Connection Card */}
          <div className="p-4 bg-white rounded-2xl border border-[#c4c6cf] shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#002046]">
                <Cloud className="w-4 h-4 text-[#002046]" />
                <span>Cloudflare R2 Bucket</span>
              </div>
              <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded-full font-bold ${
                isR2Connected 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {isR2Connected ? 'Synced' : 'Setup Needed'}
              </span>
            </div>
            <p className="text-[11px] text-[#545f72] leading-relaxed">
              {isR2Connected
                ? `Active bucket: ${r2Status?.bucketName || 'document-bank'}`
                : 'Configure R2 Access Key & Secret in settings to enable cloud file sync.'}
            </p>
            <button
              onClick={() => {
                onViewChange('settings');
                onClose();
              }}
              className="w-full py-2.5 px-3 bg-[#f0f4f8] hover:bg-[#e0e7f5] text-[#002046] text-xs font-bold rounded-xl transition-colors flex items-center justify-between cursor-pointer"
            >
              <span>Manage Storage & S3 Keys</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 bg-white border-t border-[#c4c6cf] flex items-center justify-between text-xs text-[#545f72]">
          <span className="font-mono text-[10px]">
            53 Plant Structures Active
          </span>
          <span className="text-[10px] font-bold text-[#002046]">
            Document Portal
          </span>
        </div>
      </div>
    </div>
  );
};
