import React from 'react';
import { HardHat, Wrench, Zap, ArrowUpRight } from 'lucide-react';
import { Branch, BranchStats, StructureNode } from '../types';
import { BRANCH_IMAGES, formatBytes } from '../data/plantStructures';

interface BranchOverviewCardsProps {
  nodes: StructureNode[];
  selectedBranch: Branch;
  onSelectBranch: (branch: Branch) => void;
}

export const BranchOverviewCards: React.FC<BranchOverviewCardsProps> = ({
  nodes,
  selectedBranch,
  onSelectBranch,
}) => {
  // Compute live statistics from the structure nodes
  const civilFiles = nodes.flatMap(n => n.files.filter(f => f.branch === 'civil'));
  const civilBytes = civilFiles.reduce((sum, f) => sum + f.sizeBytes, 0);

  const mechFiles = nodes.flatMap(n => n.files.filter(f => f.branch === 'mechanical'));
  const mechBytes = mechFiles.reduce((sum, f) => sum + f.sizeBytes, 0);

  const eniFiles = nodes.flatMap(n => n.files.filter(f => f.branch === 'eni'));
  const eniBytes = eniFiles.reduce((sum, f) => sum + f.sizeBytes, 0);

  const branchData: BranchStats[] = [
    {
      branch: 'civil',
      label: 'Civil Engineering',
      iconName: 'foundation',
      totalFiles: civilFiles.length,
      totalSizeBytes: civilBytes,
      totalSizeFormatted: formatBytes(civilBytes),
      imageUrl: BRANCH_IMAGES.civil,
      imageAlt: 'Civil engineering reinforced foundation structure',
      activeNodesCount: nodes.filter(n => n.files.some(f => f.branch === 'civil')).length || 53
    },
    {
      branch: 'mechanical',
      label: 'Mechanical Engineering',
      iconName: 'precision_manufacturing',
      totalFiles: mechFiles.length,
      totalSizeBytes: mechBytes,
      totalSizeFormatted: formatBytes(mechBytes),
      imageUrl: BRANCH_IMAGES.mechanical,
      imageAlt: 'Industrial mechanical engineering equipment and plant assembly',
      activeNodesCount: nodes.filter(n => n.files.some(f => f.branch === 'mechanical')).length || 53
    },
    {
      branch: 'eni',
      label: 'Electrical & Inst.',
      iconName: 'electrical_services',
      totalFiles: eniFiles.length,
      totalSizeBytes: eniBytes,
      totalSizeFormatted: formatBytes(eniBytes),
      imageUrl: BRANCH_IMAGES.eni,
      imageAlt: 'Electrical control panels and automation instrumentation',
      activeNodesCount: nodes.filter(n => n.files.some(f => f.branch === 'eni')).length || 53
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      {branchData.map((b) => {
        const isSelected = selectedBranch === b.branch;

        return (
          <div
            key={b.branch}
            className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-2xs ${
              isSelected
                ? 'border-2 border-[#002046] ring-2 ring-[#002046]/10 shadow-md bg-white'
                : 'border-[#c4c6cf] hover:border-[#002046] bg-white'
            }`}
            onClick={() => onSelectBranch(b.branch)}
          >
            {/* Background Graphic Banner */}
            <div className="relative h-32 w-full overflow-hidden bg-slate-900">
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url('${b.imageUrl}')` }}
              />
              <div className={`absolute inset-0 transition-colors ${isSelected ? 'bg-black/55' : 'bg-black/45 group-hover:bg-black/35'}`} />

              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono uppercase tracking-wider font-bold">
                <span>{b.branch.toUpperCase()}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
              </div>

              <div className="absolute bottom-3 left-3.5 right-3.5 flex justify-between items-end">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight leading-tight">
                    {b.label}
                  </h3>
                  <p className="text-[11px] text-white/90 font-mono">
                    {b.totalFiles} {b.totalFiles === 1 ? 'Document' : 'Documents'} • {b.totalSizeFormatted}
                  </p>
                </div>
                <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
                  <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </div>

            {/* Bottom Details Bar */}
            <div className="p-3 bg-[#f7f9fb] flex items-center justify-between text-xs text-[#545f72] border-t border-[#eceef0]">
              <span className="font-mono text-[11px]">
                53 Plant Structures
              </span>
              <span className="text-[11px] font-bold text-[#002046]">
                Browse Documents &rarr;
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
