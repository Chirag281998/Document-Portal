import React, { useState, useMemo } from 'react';
import { Search, Download, CheckCircle, FileText, Folder, Eye, Filter, ArrowDownToLine, Check } from 'lucide-react';
import { StructureNode, Branch, Category, NodeFile } from '../types';
import { BRANCH_IMAGES, formatBytes } from '../data/plantStructures';

interface FilesViewProps {
  nodes: StructureNode[];
  selectedBranch: Branch;
  onSelectBranch: (branch: Branch) => void;
  onSelectNode: (node: StructureNode) => void;
}

export const FilesView: React.FC<FilesViewProps> = ({
  nodes,
  selectedBranch,
  onSelectBranch,
  onSelectNode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category>('DRAWINGS');
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);

  const categories: Category[] = ['DRAWINGS', 'GRN', 'SRN', 'PO', 'SO'];

  // Dynamic calculation of branch totals from real nodes
  const branchStats = useMemo(() => {
    const calc = (b: Branch) => {
      let count = 0;
      let size = 0;
      nodes.forEach(n => {
        n.files.forEach(f => {
          if (f.branch === b) {
            count++;
            size += f.sizeBytes;
          }
        });
      });
      return { count, sizeFormatted: formatBytes(size) };
    };

    return {
      civil: calc('civil'),
      mechanical: calc('mechanical'),
      eni: calc('eni'),
    };
  }, [nodes]);

  // Filter 53 structures based on search and selected branch/category
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      const branchFiles = node.files.filter(f => f.branch === selectedBranch);
      const matchSearch =
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.id.includes(searchQuery) ||
        branchFiles.some(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchSearch;
    });
  }, [nodes, searchQuery, selectedBranch]);

  const handleDownloadAllNodeFiles = (node: StructureNode, e: React.MouseEvent) => {
    e.stopPropagation();
    const relevantFiles = node.files.filter(
      f => f.branch === selectedBranch && f.category === selectedCategory
    );

    const content = `ENGINEERING DOCUMENT REPOSITORY - BATCH EXPORT\n` +
      `Structure Node: ${node.fullTag}\n` +
      `Category: ${selectedCategory}\n` +
      `Branch: ${selectedBranch.toUpperCase()}\n` +
      `Export Timestamp: ${new Date().toISOString()}\n\n` +
      `Files in Package (${relevantFiles.length}):\n` +
      relevantFiles.map((f, i) => `${i + 1}. [${f.extension.toUpperCase()}] ${f.name} (${f.sizeFormatted}) - Rev: ${f.revision || 'N/A'}`).join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${node.code}_${selectedBranch.toUpperCase()}_${selectedCategory}_Document_Manifest.txt`;
    link.click();
    URL.revokeObjectURL(url);

    setDownloadSuccessId(node.id);
    setTimeout(() => setDownloadSuccessId(null), 2000);
  };

  const branchCards = [
    {
      id: 'civil' as Branch,
      title: 'Civil',
      stats: `${branchStats.civil.sizeFormatted} • ${branchStats.civil.count} Files`,
      imageUrl: BRANCH_IMAGES.civil,
      imageAlt: 'Civil foundation concrete structure',
    },
    {
      id: 'mechanical' as Branch,
      title: 'Mechanical Engineering',
      stats: `${branchStats.mechanical.sizeFormatted} • ${branchStats.mechanical.count} Files`,
      imageUrl: BRANCH_IMAGES.mechanical,
      imageAlt: 'Mechanical engineering structure',
    },
    {
      id: 'eni' as Branch,
      title: 'Electrical & Inst.',
      stats: `${branchStats.eni.sizeFormatted} • ${branchStats.eni.count} Files`,
      imageUrl: BRANCH_IMAGES.eni,
      imageAlt: 'Electrical control room',
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full text-[#191c1e]">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#c4c6cf]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-[#d5e0f7] text-[#002046] text-[10px] font-mono font-bold uppercase tracking-wider">
              Document Bank
            </span>
          </div>
          <h1 className="text-[26px] md:text-[32px] font-bold text-[#002046] tracking-tight leading-tight">
            Plant Document Repository
          </h1>
          <p className="text-xs md:text-sm text-[#44474e] mt-0.5">
            Browse, inspect, and download engineering documentation across 53 structures
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#74777f] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-repository-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ST-1 to ST-53 or file names..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#c4c6cf] rounded-xl text-xs text-[#191c1e] placeholder:text-[#74777f] focus:border-[#002046] outline-none shadow-2xs transition-all"
            />
          </div>
        </div>
      </div>

      {/* Branch Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {branchCards.map((b) => {
          const isSelected = selectedBranch === b.id;
          return (
            <div
              key={b.id}
              onClick={() => onSelectBranch(b.id)}
              className={`relative overflow-hidden rounded-2xl border transition-all cursor-pointer shadow-2xs group ${
                isSelected
                  ? 'border-2 border-[#002046] ring-2 ring-[#002046]/10 shadow-md bg-white'
                  : 'border-[#c4c6cf] hover:border-[#002046] bg-white'
              }`}
            >
              <div className="h-28 w-full relative overflow-hidden bg-slate-900">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url('${b.imageUrl}')` }}
                />
                <div className={`absolute inset-0 transition-colors ${isSelected ? 'bg-black/55' : 'bg-black/45 group-hover:bg-black/35'}`} />

                <div className="absolute top-2.5 left-3 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono uppercase tracking-wider font-bold">
                  <span>{b.id.toUpperCase()}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                </div>

                <div className="absolute bottom-2.5 left-3.5 right-3.5 flex justify-between items-end">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {b.title}
                    </h3>
                    <p className="text-[11px] text-white/90 font-mono">
                      {b.stats}
                    </p>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isSelected ? 'bg-[#002046] text-white' : 'bg-white/20 text-white'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto border-b border-[#c4c6cf] hide-scrollbar gap-1">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 border-b-2 text-xs uppercase tracking-wider font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'border-[#002046] text-[#002046]'
                  : 'border-transparent text-[#545f72] hover:text-[#002046] hover:border-[#74777f]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Data Table (View Mode) */}
      <div className="bg-white border border-[#c4c6cf] rounded-2xl overflow-hidden shadow-xs flex flex-col">
        <div className="px-4 py-3 bg-[#f2f4f6] border-b border-[#c4c6cf] flex justify-between items-center text-xs text-[#545f72]">
          <span className="font-semibold">
            Showing <strong className="text-[#191c1e]">{filteredNodes.length}</strong> of 53 Plant Structures
          </span>
          <span className="font-mono text-[11px]">
            Discipline: <strong className="text-[#002046] uppercase">{selectedBranch}</strong> •{' '}
            Category: <strong className="text-[#002046]">{selectedCategory}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#e0e3e5] text-[11px] font-bold text-[#545f72] uppercase tracking-wider border-b border-[#c4c6cf]">
              <tr>
                <th className="py-3 px-4 w-16">ID</th>
                <th className="py-3 px-4">Structure / Location</th>
                <th className="py-3 px-4 text-right">Files</th>
                <th className="py-3 px-4 text-right">Size</th>
                <th className="py-3 px-4 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-[#eceef0]">
              {filteredNodes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#74777f]">
                    <p className="text-sm font-medium">No matching structure nodes found</p>
                    <p className="text-xs font-mono mt-1">Try refining your search query</p>
                  </td>
                </tr>
              ) : (
                filteredNodes.map((node, index) => {
                  const relevantFiles = node.files.filter(
                    f => f.branch === selectedBranch && f.category === selectedCategory
                  );
                  const totalCategoryBytes = relevantFiles.reduce((acc, f) => acc + f.sizeBytes, 0);
                  const isZebra = index % 2 === 1;

                  return (
                    <tr
                      key={node.id}
                      onClick={() => onSelectNode(node)}
                      className={`hover:bg-[#d5e0f7]/30 transition-colors group cursor-pointer ${
                        isZebra ? 'bg-[#f7f9fb]/80' : 'bg-white'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-xs text-[#545f72] font-semibold">
                        {node.id}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#191c1e] group-hover:text-[#002046] transition-colors">
                            {node.fullTag}
                          </span>
                          {node.isHighlighted && (
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Key Plant Structure" />
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right text-xs font-mono text-[#545f72]">
                        {relevantFiles.length > 0 ? (
                          <span className="font-bold text-[#002046]">{relevantFiles.length}</span>
                        ) : (
                          <span className="text-[#74777f]">0</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-xs text-[#545f72]">
                        {relevantFiles.length > 0 ? (
                          formatBytes(totalCategoryBytes)
                        ) : (
                          <span className="text-[#74777f] italic">--</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {relevantFiles.length > 0 ? (
                            <button
                              id={`btn-download-node-${node.id}`}
                              onClick={(e) => handleDownloadAllNodeFiles(node, e)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                downloadSuccessId === node.id
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'text-[#545f72] hover:text-[#002046] hover:bg-[#e6e8ea]'
                              }`}
                              title="Download Manifest for this node"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              disabled
                              className="text-[#c4c6cf] cursor-not-allowed p-1.5"
                              title="No files available in this category"
                            >
                              <Download className="w-4 h-4 opacity-40" />
                            </button>
                          )}

                          <button
                            onClick={() => onSelectNode(node)}
                            className="text-[#002046] hover:bg-[#d5e0f7] p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="View Structure Files"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
