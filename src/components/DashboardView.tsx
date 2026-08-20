import React, { useMemo } from 'react';
import { 
  Cloud, 
  ArrowRight, 
  ShieldCheck, 
  FolderOpen,
  Eye,
  Edit2
} from 'lucide-react';
import { StructureNode, Branch, AppView, R2ConnectionStatus } from '../types';
import { DrawingCanvas } from './DrawingCanvas';
import { BranchOverviewCards } from './BranchOverviewCards';
import { formatBytes } from '../data/plantStructures';

interface DashboardViewProps {
  nodes: StructureNode[];
  onSelectBranch: (branch: Branch) => void;
  onViewChange: (view: AppView) => void;
  onSelectNode: (node: StructureNode) => void;
  r2Status: R2ConnectionStatus | null;
  onOpenSettings: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  nodes,
  onSelectBranch,
  onViewChange,
  onSelectNode,
  r2Status,
  onOpenSettings,
}) => {
  // Compute live totals
  const totalFilesCount = useMemo(() => {
    return nodes.reduce((acc, n) => acc + n.files.length, 0);
  }, [nodes]);

  const totalSizeBytes = useMemo(() => {
    return nodes.reduce((acc, n) => acc + n.files.reduce((sub, f) => sub + f.sizeBytes, 0), 0);
  }, [nodes]);

  const isR2Connected = Boolean(r2Status?.configured);

  return (
    <div className="flex flex-col gap-6 md:gap-7 max-w-7xl mx-auto w-full text-[#191c1e]">
      {/* Top Header & Quick Info Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 pb-3 border-b border-[#c4c6cf]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-[#d5e0f7] text-[#002046] text-[10px] font-mono font-bold uppercase tracking-wider">
              Plant Infrastructure Portal
            </span>
          </div>
          <h1 className="text-[26px] md:text-[32px] font-bold text-[#002046] tracking-tight leading-tight">
            Executive Engineering Dashboard
          </h1>
          <p className="text-xs md:text-sm text-[#44474e] mt-0.5">
            Technical drawing & plant infrastructure repository overview
          </p>
        </div>

        {/* Quick Storage Status Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSettings}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-mono transition-all shadow-2xs cursor-pointer ${
              isR2Connected
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
            }`}
            title="Configure Cloudflare R2 object storage"
          >
            <Cloud className={`w-4 h-4 ${isR2Connected ? 'text-emerald-600' : 'text-amber-600'}`} />
            <div className="text-left">
              <div className="font-bold flex items-center gap-1.5 leading-none">
                <span>R2 Storage</span>
                <span className={`w-2 h-2 rounded-full ${isR2Connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              </div>
              <span className="text-[10px] text-[#545f72]">
                {isR2Connected ? r2Status?.bucketName : 'Setup Keys'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* KPI Metric Summary Bento */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-[#c4c6cf] p-4 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold text-[#74777f] uppercase tracking-wider block">
            Monitored Units
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-[#002046]">53</span>
            <span className="text-xs text-[#545f72]">ST-1 to ST-53</span>
          </div>
        </div>

        <div className="bg-white border border-[#c4c6cf] p-4 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold text-[#74777f] uppercase tracking-wider block">
            Total Documents
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-[#002046]">
              {totalFilesCount}
            </span>
            <span className="text-xs text-[#545f72]">Attached</span>
          </div>
        </div>

        <div className="bg-white border border-[#c4c6cf] p-4 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold text-[#74777f] uppercase tracking-wider block">
            Storage Utilized
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-[#002046]">
              {formatBytes(totalSizeBytes)}
            </span>
            <span className="text-xs text-[#545f72]">Cloud R2</span>
          </div>
        </div>

        <div className="bg-white border border-[#c4c6cf] p-4 rounded-2xl shadow-2xs">
          <span className="text-[10px] font-bold text-[#74777f] uppercase tracking-wider block">
            Security Status
          </span>
          <div className="flex items-center gap-1.5 mt-1 text-emerald-700">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-bold font-mono">Protected</span>
          </div>
        </div>
      </div>

      {/* DRAWING OPTION AT THE TOP OF DASHBOARD */}
      <section className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <div>
            <h2 className="text-base font-bold text-[#002046] tracking-tight flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-[#002046]" />
              <span>Technical Drawing & CAD Markup Suite</span>
            </h2>
            <p className="text-xs text-[#545f72]">
              Interactive engineering markup canvas for field schematics, annotations, and blueprint drafting
            </p>
          </div>
        </div>

        <DrawingCanvas />
      </section>

      {/* Engineering Disciplines Overview */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <div>
            <h2 className="text-base font-bold text-[#002046] tracking-tight">
              Engineering Disciplines
            </h2>
            <p className="text-xs text-[#545f72]">
              Civil, Mechanical, and Electrical & Instrumentation branches
            </p>
          </div>
          <button
            onClick={() => onViewChange('files')}
            className="text-xs font-bold text-[#002046] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Open Full Repository View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <BranchOverviewCards
          nodes={nodes}
          selectedBranch="civil"
          onSelectBranch={(b) => {
            onSelectBranch(b);
            onViewChange('files');
          }}
        />
      </section>
    </div>
  );
};
