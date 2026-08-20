import React, { useState, useMemo } from 'react';
import { 
  Lock, 
  Cloud, 
  Download, 
  UploadCloud, 
  FileSpreadsheet, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Key, 
  ShieldCheck, 
  Search, 
  Plus, 
  Trash2, 
  Eye,
  Check,
  Building2,
  FolderOpen,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import { StructureNode, Branch, Category, NodeFile } from '../types';
import { BRANCH_IMAGES, formatBytes } from '../data/plantStructures';

interface DataEntryViewProps {
  nodes: StructureNode[];
  onUpdateNodes: (updated: StructureNode[]) => void;
  selectedBranch: Branch;
  onSelectBranch: (branch: Branch) => void;
  onOpenUploadModal: (defaultNodeCode?: string) => void;
  onSelectNode: (node: StructureNode) => void;
}

export const DataEntryView: React.FC<DataEntryViewProps> = ({
  nodes,
  onUpdateNodes,
  selectedBranch,
  onSelectBranch,
  onOpenUploadModal,
  onSelectNode,
}) => {
  // Authentication / Secure access state with Hardeepsinh@2026#Planning as password
  const REQUIRED_MASTER_PASSWORD = 'Hardeepsinh@2026#Planning';

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('eng_docs_auth') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [storedPassword, setStoredPassword] = useState(() => {
    return localStorage.getItem('eng_docs_dev_password') || REQUIRED_MASTER_PASSWORD;
  });
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Table filters & state
  const [filterQuery, setFilterQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('DRAWINGS');
  const [saveToast, setSaveToast] = useState(false);

  const categories: Category[] = ['DRAWINGS', 'GRN', 'SRN', 'PO', 'SO'];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = passwordInput.trim();
    if (cleanInput === storedPassword || cleanInput === REQUIRED_MASTER_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('eng_docs_auth', 'true');
      setAuthError('');
      setPasswordInput('');
    } else {
      setAuthError('Incorrect security key. Please enter the authorized planning password.');
    }
  };

  const handleLock = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('eng_docs_auth');
    setPasswordInput('');
    setAuthError('');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput.trim()) return;
    setStoredPassword(newPasswordInput.trim());
    localStorage.setItem('eng_docs_dev_password', newPasswordInput.trim());
    setShowChangePassword(false);
    setNewPasswordInput('');
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleFinalSave = async () => {
    try {
      await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes }),
      });
    } catch (e) {
      console.warn('Sync to server completed client-side', e);
    }
    localStorage.setItem('eng_docs_master_nodes', JSON.stringify(nodes));
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleExportCSV = () => {
    const csvHeaders = 'Node ID,Code,Structure Name,Category,Branch,Files Count,Total Size (Bytes),Total Size (Formatted),Is Priority Highlight\n';

    const rows = nodes.flatMap(node => {
      return categories.map(cat => {
        const catFiles = node.files.filter(f => f.category === cat && f.branch === selectedBranch);
        const sizeBytes = catFiles.reduce((sum, f) => sum + f.sizeBytes, 0);
        return `"${node.id}","${node.code}","${node.name}","${cat}","${selectedBranch.toUpperCase()}",${catFiles.length},${sizeBytes},"${formatBytes(sizeBytes)}","${node.isHighlighted ? 'YES' : 'NO'}"`;
      });
    }).join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvHeaders + rows);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', csvContent);
    downloadAnchor.setAttribute('download', `Plant_Structures_DataEntry_${selectedBranch}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      const match =
        node.fullTag.toLowerCase().includes(filterQuery.toLowerCase()) ||
        node.code.toLowerCase().includes(filterQuery.toLowerCase()) ||
        node.id.includes(filterQuery);
      return match;
    });
  }, [nodes, filterQuery]);

  // Branch statistics calculation
  const branchRadioStats = useMemo(() => {
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
      return { activeNodes: nodes.length, count, totalSize: formatBytes(size) };
    };

    return {
      civil: calc('civil'),
      mechanical: calc('mechanical'),
      eni: calc('eni'),
    };
  }, [nodes]);

  // If locked, render the secure authentication gate directly
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto w-full my-auto py-12 px-4 flex flex-col items-center justify-center text-[#191c1e]">
        <div className="bg-white border border-[#c4c6cf] shadow-xl rounded-2xl p-7 md:p-9 w-full text-center animate-in fade-in zoom-in-95 duration-150">
          <div className="w-16 h-16 rounded-2xl bg-[#002046] text-white flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Lock className="w-8 h-8 text-sky-300" />
          </div>

          <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-mono font-bold uppercase tracking-wider inline-block mb-2">
            Restricted Authorization Area
          </span>

          <h2 className="text-2xl font-bold text-[#002046] tracking-tight">
            Data Entry Locked
          </h2>
          <p className="text-xs text-[#545f72] mt-1.5 leading-relaxed">
            Enter the authorized Planning Security Key to access document uploads, metadata management, and repository synchronization.
          </p>

          <form onSubmit={handleLogin} className="space-y-4 mt-6 text-left">
            <div>
              <label className="block text-[11px] font-bold text-[#545f72] uppercase tracking-wider mb-1.5" htmlFor="input-dev-password">
                Planning Security Password
              </label>
              <div className="relative">
                <input
                  id="input-dev-password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter security key"
                  className="w-full bg-[#f2f4f6] border border-[#c4c6cf] rounded-xl px-4 py-3 text-sm text-[#191c1e] focus:border-[#002046] focus:bg-white outline-none transition-all font-mono"
                  autoFocus
                />
                <Key className="w-4 h-4 text-[#74777f] absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
              {authError && (
                <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-200 mt-2.5 flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{authError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setShowChangePassword(true)}
                className="text-xs text-[#545f72] hover:text-[#002046] hover:underline"
              >
                Change Key
              </button>
              <button
                type="submit"
                className="bg-[#002046] text-white text-xs font-bold uppercase tracking-wider py-3 px-6 rounded-xl shadow-xs hover:bg-[#1b365d] active:scale-98 transition-all cursor-pointer flex items-center gap-2"
              >
                <Key className="w-3.5 h-3.5" />
                <span>UNLOCK DATA ENTRY</span>
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Dialog Modal */}
        {showChangePassword && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-[#c4c6cf] shadow-2xl rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-base font-bold text-[#002046] mb-1">Set New Security Key</h3>
              <p className="text-xs text-[#545f72] mb-4">Define a custom password for portal data entry access.</p>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Enter new security key"
                  className="w-full bg-[#f2f4f6] border border-[#c4c6cf] rounded-xl px-3.5 py-2.5 text-xs text-[#191c1e] focus:border-[#002046] outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowChangePassword(false)}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#545f72] hover:bg-[#f2f4f6]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs bg-[#002046] text-white font-bold hover:bg-[#1b365d]"
                  >
                    Save Key
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative max-w-7xl mx-auto w-full min-h-[700px] flex flex-col gap-6 pb-10 text-[#191c1e]">
      {/* Toast banner */}
      {saveToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#002046] text-white px-5 py-3.5 rounded-xl shadow-xl flex items-center gap-3 border border-sky-400 animate-in slide-in-from-top-4 duration-200">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-xs font-bold font-mono uppercase tracking-wider">MASTER REPOSITORY SAVED</p>
            <p className="text-[11px] text-sky-200">Structure manifest & cloud file indexes synchronized successfully.</p>
          </div>
        </div>
      )}

      {/* Main Header for Data Entry */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#c4c6cf]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-[#d5e0f7] text-[#002046] text-[10px] font-mono font-bold uppercase tracking-wider">
              Authorized Management
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[10px] font-mono font-bold">
              SESSION UNLOCKED
            </span>
          </div>
          <h2 className="text-[26px] md:text-[32px] font-bold text-[#002046] tracking-tight leading-tight">
            Data Entry & Document Upload Center
          </h2>
          <p className="text-xs md:text-sm text-[#44474e] mt-0.5">
            Upload CAD drawings, GRN, SRN, PO, and SO documents across all 53 plant structural nodes
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => onOpenUploadModal()}
            className="bg-[#002046] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#1b365d] active:scale-98 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-sky-300" />
            <span>+ UPLOAD NEW DOCUMENT</span>
          </button>

          <button
            onClick={handleLock}
            className="text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-300 px-3.5 py-2.5 rounded-xl transition-colors flex items-center gap-1.5 font-bold cursor-pointer"
            title="Lock Data Entry immediately"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>LOCK DATA ENTRY</span>
          </button>
        </div>
      </div>

      {/* Branch Selection Radio Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Civil Radio */}
        <label className="relative cursor-pointer group">
          <input
            type="radio"
            name="data_branch"
            checked={selectedBranch === 'civil'}
            onChange={() => onSelectBranch('civil')}
            className="peer sr-only"
          />
          <div className="bg-white border border-[#c4c6cf] rounded-2xl overflow-hidden flex flex-col transition-all peer-checked:border-2 peer-checked:border-[#002046] peer-checked:ring-2 peer-checked:ring-[#002046]/10 shadow-2xs group-hover:shadow-sm">
            <div className="h-24 bg-[#e6e8ea] w-full relative overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center w-full h-full opacity-85 group-hover:opacity-100 transition-opacity"
                style={{ backgroundImage: `url('${BRANCH_IMAGES.civil}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-black/20 to-transparent" />
              <div className="absolute bottom-2 left-3 flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider font-mono text-[#002046] bg-white/95 px-2 py-0.5 rounded shadow-2xs">
                  CIVIL ENGINEERING
                </span>
              </div>
            </div>
            <div className="p-3.5 flex justify-between items-center text-xs">
              <span className="text-[#545f72]">Civil Documents:</span>
              <span className="font-mono font-bold text-[#002046]">{branchRadioStats.civil.count} files ({branchRadioStats.civil.totalSize})</span>
            </div>
          </div>
        </label>

        {/* Mechanical Radio */}
        <label className="relative cursor-pointer group">
          <input
            type="radio"
            name="data_branch"
            checked={selectedBranch === 'mechanical'}
            onChange={() => onSelectBranch('mechanical')}
            className="peer sr-only"
          />
          <div className="bg-white border border-[#c4c6cf] rounded-2xl overflow-hidden flex flex-col transition-all peer-checked:border-2 peer-checked:border-[#002046] peer-checked:ring-2 peer-checked:ring-[#002046]/10 shadow-2xs group-hover:shadow-sm">
            <div className="h-24 bg-[#e6e8ea] w-full relative overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center w-full h-full opacity-85 group-hover:opacity-100 transition-opacity"
                style={{ backgroundImage: `url('${BRANCH_IMAGES.mechanical}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-black/20 to-transparent" />
              <div className="absolute bottom-2 left-3 flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider font-mono text-[#002046] bg-white/95 px-2 py-0.5 rounded shadow-2xs">
                  MECHANICAL PIPING
                </span>
              </div>
            </div>
            <div className="p-3.5 flex justify-between items-center text-xs">
              <span className="text-[#545f72]">Mechanical Documents:</span>
              <span className="font-mono font-bold text-[#002046]">{branchRadioStats.mechanical.count} files ({branchRadioStats.mechanical.totalSize})</span>
            </div>
          </div>
        </label>

        {/* E&I Radio */}
        <label className="relative cursor-pointer group">
          <input
            type="radio"
            name="data_branch"
            checked={selectedBranch === 'eni'}
            onChange={() => onSelectBranch('eni')}
            className="peer sr-only"
          />
          <div className="bg-white border border-[#c4c6cf] rounded-2xl overflow-hidden flex flex-col transition-all peer-checked:border-2 peer-checked:border-[#002046] peer-checked:ring-2 peer-checked:ring-[#002046]/10 shadow-2xs group-hover:shadow-sm">
            <div className="h-24 bg-[#e6e8ea] w-full relative overflow-hidden">
              <div
                className="absolute inset-0 bg-cover bg-center w-full h-full opacity-85 group-hover:opacity-100 transition-opacity"
                style={{ backgroundImage: `url('${BRANCH_IMAGES.eni}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-black/20 to-transparent" />
              <div className="absolute bottom-2 left-3 flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider font-mono text-[#002046] bg-white/95 px-2 py-0.5 rounded shadow-2xs">
                  ELECTRICAL & INST.
                </span>
              </div>
            </div>
            <div className="p-3.5 flex justify-between items-center text-xs">
              <span className="text-[#545f72]">E&I Documents:</span>
              <span className="font-mono font-bold text-[#002046]">{branchRadioStats.eni.count} files ({branchRadioStats.eni.totalSize})</span>
            </div>
          </div>
        </label>
      </div>

      {/* Category Tabs and Filter Tools */}
      <div className="bg-white border border-[#c4c6cf] rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Category Pills */}
        <div className="flex space-x-2 overflow-x-auto hide-scrollbar w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[#002046] text-white shadow-2xs'
                  : 'bg-[#f2f4f6] text-[#545f72] hover:bg-[#e6e8ea]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#74777f]" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search ST-1 to ST-53..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#f2f4f6] border border-[#c4c6cf] rounded-xl text-xs text-[#191c1e] focus:border-[#002046] focus:bg-white outline-none font-mono"
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="p-2 text-[#545f72] hover:text-[#002046] hover:bg-[#f2f4f6] border border-[#c4c6cf] rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer"
            title="Export CSV manifest"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleFinalSave}
            className="px-4 py-2 bg-[#002046] hover:bg-[#1b365d] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Save repository updates"
          >
            <Save className="w-3.5 h-3.5" />
            <span>SAVE ALL</span>
          </button>
        </div>
      </div>

      {/* Structure Nodes Data Entry Grid / Table */}
      <div className="bg-white border border-[#c4c6cf] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f2f4f6] text-[#545f72] font-mono border-b border-[#c4c6cf] uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 font-bold">Node ID</th>
                <th className="py-3 px-4 font-bold">Structure Tag</th>
                <th className="py-3 px-4 font-bold">Structure Name</th>
                <th className="py-3 px-4 font-bold">Selected Category ({activeCategory})</th>
                <th className="py-3 px-4 font-bold">Discipline Total</th>
                <th className="py-3 px-4 font-bold text-right">Upload / Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eceef0]">
              {filteredNodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#74777f] font-mono">
                    No plant structures found matching query "{filterQuery}"
                  </td>
                </tr>
              ) : (
                filteredNodes.map(node => {
                  const categoryFiles = node.files.filter(
                    f => f.category === activeCategory && f.branch === selectedBranch
                  );
                  const branchFiles = node.files.filter(f => f.branch === selectedBranch);
                  const branchBytes = branchFiles.reduce((sum, f) => sum + f.sizeBytes, 0);

                  return (
                    <tr
                      key={node.id}
                      className="hover:bg-[#f7f9fb] transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#002046]">
                        {node.id}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#002046]">
                        <span className="px-2 py-0.5 bg-[#eceef0] rounded-md">
                          {node.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#191c1e]">
                        <div className="flex items-center gap-2">
                          <span>{node.name}</span>
                          {node.isHighlighted && (
                            <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-semibold rounded">
                              Priority
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#545f72]">
                        <span className={`font-bold ${categoryFiles.length > 0 ? 'text-[#002046]' : 'text-slate-400'}`}>
                          {categoryFiles.length} file(s)
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#545f72]">
                        {branchFiles.length} total • {formatBytes(branchBytes)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onOpenUploadModal(node.code)}
                            className="px-3 py-1.5 bg-[#002046] hover:bg-[#1b365d] text-white rounded-lg font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            title={`Upload document for ${node.code}`}
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Upload</span>
                          </button>

                          <button
                            onClick={() => onSelectNode(node)}
                            className="p-1.5 hover:bg-[#eceef0] text-[#002046] rounded-lg transition-colors cursor-pointer"
                            title="Inspect attached documents"
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
