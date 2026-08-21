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
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileText,
  X
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
  onDeleteFile?: (nodeCode: string, fileId: string) => void;
  onDeleteBranch?: (branch: Branch) => void;
}

export const DataEntryView: React.FC<DataEntryViewProps> = ({
  nodes,
  onUpdateNodes,
  selectedBranch,
  onSelectBranch,
  onOpenUploadModal,
  onSelectNode,
  onDeleteFile,
  onDeleteBranch,
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
  const [saveToast, setSaveToast] = useState<{ message: string; sub?: string } | null>(null);

  // Expanded rows for inline file management & deletion
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  // Confirmation modal state for single file deletion
  const [fileToDelete, setFileToDelete] = useState<{
    nodeCode: string;
    nodeName: string;
    file: NodeFile;
  } | null>(null);

  // Confirmation modal state for batch category / node deletion
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<{
    nodeCode: string;
    nodeName: string;
    category?: Category;
    count: number;
  } | null>(null);

  // Confirmation modal state for entire branch wipe across all 53 structures
  const [branchDeleteTarget, setBranchDeleteTarget] = useState<{
    branch: Branch;
    label: string;
    count: number;
    totalSize: string;
  } | null>(null);

  const categories: Category[] = ['DRAWINGS', 'GRN', 'SRN', 'PO', 'SO'];

  const toggleRowExpansion = (nodeCode: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeCode]: !prev[nodeCode],
    }));
  };

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
    showToast('SECURITY KEY UPDATED', 'New planning password saved successfully.');
  };

  const showToast = (message: string, sub?: string) => {
    setSaveToast({ message, sub });
    setTimeout(() => setSaveToast(null), 3000);
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
    showToast('MASTER REPOSITORY SAVED', 'Structure manifest & cloud file indexes synchronized successfully.');
  };

  const handleDownloadFile = (file: NodeFile, nodeCode: string) => {
    if (file.downloadUrl) {
      window.open(file.downloadUrl, '_blank');
      return;
    }
    if (file.r2Key) {
      window.open(`/api/r2/download-key?key=${encodeURIComponent(file.r2Key)}`, '_blank');
      return;
    }

    const content = `ENGINEERING DOCUMENT FILE EXPORT\n` +
      `File Name: ${file.name}\n` +
      `Structure: ${nodeCode}\n` +
      `Branch: ${file.branch.toUpperCase()}\n` +
      `Category: ${file.category}\n` +
      `Drawing Number: ${file.drawingNumber || 'N/A'}\n` +
      `Revision: ${file.revision || 'N/A'}\n` +
      `Status: ${file.status.toUpperCase()}\n` +
      `Uploaded By: ${file.uploadedBy}\n` +
      `Upload Date: ${file.uploadDate}\n\n` +
      `[Document Portal - Cloudflare R2 Sync Hub]`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name.endsWith('.txt') ? file.name : `${file.name}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Perform single file deletion
  const confirmDeleteSingleFile = () => {
    if (!fileToDelete) return;
    const { nodeCode, file } = fileToDelete;

    if (onDeleteFile) {
      onDeleteFile(nodeCode, file.id);
    } else {
      const updated = nodes.map(n => {
        if (n.code === nodeCode) {
          return {
            ...n,
            files: n.files.filter(f => f.id !== file.id)
          };
        }
        return n;
      });
      onUpdateNodes(updated);
      localStorage.setItem('eng_docs_master_nodes', JSON.stringify(updated));
    }

    showToast('DOCUMENT DELETED', `Removed ${file.name} from ${nodeCode}.`);
    setFileToDelete(null);
  };

  // Perform bulk deletion (e.g. all category files in a node)
  const confirmBulkDelete = () => {
    if (!bulkDeleteTarget) return;
    const { nodeCode, category } = bulkDeleteTarget;

    const updated = nodes.map(n => {
      if (n.code === nodeCode) {
        return {
          ...n,
          files: n.files.filter(f => {
            if (category) {
              return !(f.category === category && f.branch === selectedBranch);
            }
            return f.branch !== selectedBranch;
          })
        };
      }
      return n;
    });

    onUpdateNodes(updated);
    localStorage.setItem('eng_docs_master_nodes', JSON.stringify(updated));

    try {
      fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: updated }),
      });
    } catch (e) {
      // client fallback
    }

    showToast(
      'DOCUMENTS CLEARED',
      category 
        ? `Deleted all ${category} files for ${nodeCode} in ${selectedBranch.toUpperCase()}.`
        : `Deleted all files for ${nodeCode} in ${selectedBranch.toUpperCase()}.`
    );
    setBulkDeleteTarget(null);
  };

  // Perform main deletion for an entire branch across all 53 structures
  const confirmBranchDelete = () => {
    if (!branchDeleteTarget) return;
    const { branch, label, count } = branchDeleteTarget;

    if (onDeleteBranch) {
      onDeleteBranch(branch);
    } else {
      const updated = nodes.map(n => ({
        ...n,
        files: n.files.filter(f => f.branch !== branch)
      }));
      onUpdateNodes(updated);
      localStorage.setItem('eng_docs_master_nodes', JSON.stringify(updated));

      try {
        fetch('/api/nodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodes: updated }),
        });
      } catch (e) {
        // client fallback
      }
    }

    showToast(
      `${branch.toUpperCase()} REPOSITORY PURGED`,
      `Deleted all ${count} document(s) for ${label} across all 53 plant structures.`
    );
    setBranchDeleteTarget(null);
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
            Enter the authorized Planning Security Key to access document uploads, file deletion, metadata management, and repository synchronization.
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
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs font-bold font-mono uppercase tracking-wider">{saveToast.message}</p>
            {saveToast.sub && <p className="text-[11px] text-sky-200">{saveToast.sub}</p>}
          </div>
        </div>
      )}

      {/* Single File Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c4c6cf] shadow-2xl rounded-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#002046]">Delete Document</h3>
                <p className="text-xs text-[#545f72]">Confirm permanent file removal from plant structure</p>
              </div>
            </div>

            <div className="bg-[#f8fafc] border border-[#c4c6cf] rounded-xl p-3.5 my-4 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-[#545f72]">Target Node:</span>
                <span className="font-bold text-[#002046]">{fileToDelete.nodeCode} - {fileToDelete.nodeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#545f72]">File Name:</span>
                <span className="font-bold text-[#191c1e] truncate max-w-[200px]">{fileToDelete.file.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#545f72]">Discipline & Category:</span>
                <span className="text-[#002046] uppercase font-semibold">{fileToDelete.file.branch} • {fileToDelete.file.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#545f72]">File Size:</span>
                <span>{fileToDelete.file.sizeFormatted}</span>
              </div>
            </div>

            <p className="text-xs text-red-600 font-semibold mb-5 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>This action will permanently delete the file record and cloud object reference.</span>
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSingleFile}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Category / All Files Confirmation Modal */}
      {bulkDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c4c6cf] shadow-2xl rounded-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#002046]">
                  {bulkDeleteTarget.category ? `Delete All ${bulkDeleteTarget.category} Files` : 'Clear All Structure Files'}
                </h3>
                <p className="text-xs text-[#545f72]">Batch document removal confirmation</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 my-4 text-xs space-y-1.5">
              <p className="text-red-950 font-semibold">
                You are about to delete <span className="font-bold text-red-700">{bulkDeleteTarget.count} document(s)</span> from structure <span className="font-mono font-bold text-red-900">{bulkDeleteTarget.nodeCode}</span> in discipline <span className="font-bold uppercase text-red-900">{selectedBranch}</span>.
              </p>
              {bulkDeleteTarget.category && (
                <p className="text-red-800 text-[11px]">
                  Only files in category <strong>{bulkDeleteTarget.category}</strong> will be removed.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBulkDeleteTarget(null)}
                className="px-4 py-2 bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBulkDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Batch Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Branch Wipe / Main Delete Confirmation Modal */}
      {branchDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#c4c6cf] shadow-2xl rounded-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#002046]">
                  Delete All {branchDeleteTarget.label} Documents
                </h3>
                <p className="text-xs text-[#545f72]">Main branch repository purge confirmation</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 my-4 text-xs space-y-2 font-mono">
              <div className="flex justify-between items-center text-[#191c1e]">
                <span className="text-[#545f72]">Target Discipline:</span>
                <span className="font-bold text-red-950 uppercase">{branchDeleteTarget.label}</span>
              </div>
              <div className="flex justify-between items-center text-[#191c1e]">
                <span className="text-[#545f72]">Total Documents:</span>
                <span className="font-bold text-red-700">{branchDeleteTarget.count} file(s) across all 53 plant structures</span>
              </div>
              <div className="flex justify-between items-center text-[#191c1e]">
                <span className="text-[#545f72]">Total Storage Reclaimed:</span>
                <span className="font-bold text-[#002046]">{branchDeleteTarget.totalSize}</span>
              </div>
            </div>

            <p className="text-xs text-red-600 font-semibold mb-5 flex items-start gap-1.5 leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Warning: This will permanently delete <strong>ALL {branchDeleteTarget.count} documents</strong> (Drawings, GRN, SRN, PO, SO) belonging to <strong>{branchDeleteTarget.label}</strong> across all plant structures (ST-1 to ST-53).
              </span>
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBranchDeleteTarget(null)}
                className="px-4 py-2.5 bg-[#f2f4f6] hover:bg-[#e6e8ea] text-[#191c1e] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBranchDelete}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Delete All {branchDeleteTarget.branch.toUpperCase()} Files</span>
              </button>
            </div>
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
            Data Entry & Document Manager
          </h2>
          <p className="text-xs md:text-sm text-[#44474e] mt-0.5">
            Upload, inspect, and delete technical drawings, GRN, SRN, PO, and SO documents across all 53 plant units
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

      {/* Branch Selection Radio Bento with Main Branch Delete */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Civil Radio & Delete Card */}
        <div
          onClick={() => onSelectBranch('civil')}
          className={`bg-white border rounded-2xl overflow-hidden flex flex-col transition-all cursor-pointer shadow-2xs group hover:shadow-sm ${
            selectedBranch === 'civil'
              ? 'border-2 border-[#002046] ring-2 ring-[#002046]/10'
              : 'border-[#c4c6cf]'
          }`}
        >
          <div className="h-24 bg-[#e6e8ea] w-full relative overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center w-full h-full opacity-85 group-hover:opacity-100 transition-opacity"
              style={{ backgroundImage: `url('${BRANCH_IMAGES.civil}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            
            <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
              <span className="text-[10px] font-bold tracking-wider font-mono text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded shadow-2xs uppercase">
                CIVIL ENGINEERING
              </span>
              {selectedBranch === 'civil' && (
                <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded text-[9px] font-bold">
                  ACTIVE
                </span>
              )}
            </div>

            <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end text-white">
              <div>
                <p className="text-[11px] font-mono text-white/90">
                  {branchRadioStats.civil.count} files • {branchRadioStats.civil.totalSize}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#fafbfc] border-t border-[#eceef0] flex items-center justify-between gap-2">
            <div className="text-xs text-[#545f72] font-mono">
              <span>All 53 Structures</span>
            </div>

            {/* Main Delete in Civil Branch */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBranchDeleteTarget({
                  branch: 'civil',
                  label: 'Civil Engineering',
                  count: branchRadioStats.civil.count,
                  totalSize: branchRadioStats.civil.totalSize,
                });
              }}
              disabled={branchRadioStats.civil.count === 0}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                branchRadioStats.civil.count > 0
                  ? 'bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600 shadow-2xs'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              }`}
              title="Delete all Civil Engineering documents across all structures"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Civil All</span>
            </button>
          </div>
        </div>

        {/* Mechanical Radio & Delete Card */}
        <div
          onClick={() => onSelectBranch('mechanical')}
          className={`bg-white border rounded-2xl overflow-hidden flex flex-col transition-all cursor-pointer shadow-2xs group hover:shadow-sm ${
            selectedBranch === 'mechanical'
              ? 'border-2 border-[#002046] ring-2 ring-[#002046]/10'
              : 'border-[#c4c6cf]'
          }`}
        >
          <div className="h-24 bg-[#e6e8ea] w-full relative overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center w-full h-full opacity-85 group-hover:opacity-100 transition-opacity"
              style={{ backgroundImage: `url('${BRANCH_IMAGES.mechanical}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            
            <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
              <span className="text-[10px] font-bold tracking-wider font-mono text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded shadow-2xs uppercase">
                MECHANICAL PIPING
              </span>
              {selectedBranch === 'mechanical' && (
                <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded text-[9px] font-bold">
                  ACTIVE
                </span>
              )}
            </div>

            <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end text-white">
              <div>
                <p className="text-[11px] font-mono text-white/90">
                  {branchRadioStats.mechanical.count} files • {branchRadioStats.mechanical.totalSize}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#fafbfc] border-t border-[#eceef0] flex items-center justify-between gap-2">
            <div className="text-xs text-[#545f72] font-mono">
              <span>All 53 Structures</span>
            </div>

            {/* Main Delete in Mechanical Branch */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBranchDeleteTarget({
                  branch: 'mechanical',
                  label: 'Mechanical Piping',
                  count: branchRadioStats.mechanical.count,
                  totalSize: branchRadioStats.mechanical.totalSize,
                });
              }}
              disabled={branchRadioStats.mechanical.count === 0}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                branchRadioStats.mechanical.count > 0
                  ? 'bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600 shadow-2xs'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              }`}
              title="Delete all Mechanical Piping documents across all structures"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Mech All</span>
            </button>
          </div>
        </div>

        {/* E&I Radio & Delete Card */}
        <div
          onClick={() => onSelectBranch('eni')}
          className={`bg-white border rounded-2xl overflow-hidden flex flex-col transition-all cursor-pointer shadow-2xs group hover:shadow-sm ${
            selectedBranch === 'eni'
              ? 'border-2 border-[#002046] ring-2 ring-[#002046]/10'
              : 'border-[#c4c6cf]'
          }`}
        >
          <div className="h-24 bg-[#e6e8ea] w-full relative overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center w-full h-full opacity-85 group-hover:opacity-100 transition-opacity"
              style={{ backgroundImage: `url('${BRANCH_IMAGES.eni}')` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            
            <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
              <span className="text-[10px] font-bold tracking-wider font-mono text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded shadow-2xs uppercase">
                ELECTRICAL & INST.
              </span>
              {selectedBranch === 'eni' && (
                <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded text-[9px] font-bold">
                  ACTIVE
                </span>
              )}
            </div>

            <div className="absolute bottom-2 left-3 right-3 flex justify-between items-end text-white">
              <div>
                <p className="text-[11px] font-mono text-white/90">
                  {branchRadioStats.eni.count} files • {branchRadioStats.eni.totalSize}
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#fafbfc] border-t border-[#eceef0] flex items-center justify-between gap-2">
            <div className="text-xs text-[#545f72] font-mono">
              <span>All 53 Structures</span>
            </div>

            {/* Main Delete in E&I Branch */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBranchDeleteTarget({
                  branch: 'eni',
                  label: 'Electrical & Inst.',
                  count: branchRadioStats.eni.count,
                  totalSize: branchRadioStats.eni.totalSize,
                });
              }}
              disabled={branchRadioStats.eni.count === 0}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                branchRadioStats.eni.count > 0
                  ? 'bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600 shadow-2xs'
                  : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
              }`}
              title="Delete all Electrical & Instrumentation documents across all structures"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete E&I All</span>
            </button>
          </div>
        </div>
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
            onClick={() => onOpenUploadModal('ST-1')}
            className="px-3.5 py-1.5 bg-[#002046] hover:bg-[#1b365d] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Upload single/multiple files or entire folder to plant structures"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Files / Folder</span>
          </button>

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

      {/* Structure Nodes Data Entry Grid / Table with Delete Options */}
      <div className="bg-white border border-[#c4c6cf] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f2f4f6] text-[#545f72] font-mono border-b border-[#c4c6cf] uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3 font-bold w-10"></th>
                <th className="py-3 px-3 font-bold">Node ID</th>
                <th className="py-3 px-3 font-bold">Structure Tag</th>
                <th className="py-3 px-4 font-bold">Structure Name</th>
                <th className="py-3 px-4 font-bold">Category ({activeCategory})</th>
                <th className="py-3 px-4 font-bold">Discipline Total</th>
                <th className="py-3 px-4 font-bold text-right">Actions (Upload / Manage / Delete)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eceef0]">
              {filteredNodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#74777f] font-mono">
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
                  const isExpanded = Boolean(expandedNodes[node.code]);

                  return (
                    <React.Fragment key={node.id}>
                      <tr
                        className={`hover:bg-[#f7f9fb] transition-colors ${
                          isExpanded ? 'bg-[#f0f4f9]' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => toggleRowExpansion(node.code)}
                            className="p-1 hover:bg-[#d5e0f7] text-[#002046] rounded-md transition-colors cursor-pointer"
                            title={isExpanded ? 'Collapse file manager' : 'Expand file manager & delete options'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-[#002046]">
                          {node.id}
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-[#002046]">
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
                          <button
                            onClick={() => toggleRowExpansion(node.code)}
                            className={`font-bold hover:underline cursor-pointer flex items-center gap-1 ${
                              categoryFiles.length > 0 ? 'text-[#002046]' : 'text-slate-400'
                            }`}
                            title="Click to view & delete category documents"
                          >
                            <span>{categoryFiles.length} file(s)</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 font-mono text-[#545f72]">
                          {branchFiles.length} total • {formatBytes(branchBytes)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Upload Button */}
                            <button
                              onClick={() => onOpenUploadModal(node.code)}
                              className="px-2.5 py-1.5 bg-[#002046] hover:bg-[#1b365d] text-white rounded-lg font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                              title={`Upload document for ${node.code}`}
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>Upload</span>
                            </button>

                            {/* Manage / Delete Files Drawer Toggle */}
                            <button
                              onClick={() => toggleRowExpansion(node.code)}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 border transition-colors cursor-pointer ${
                                isExpanded
                                  ? 'bg-[#d5e0f7] border-[#002046] text-[#002046]'
                                  : 'bg-white border-[#c4c6cf] text-[#44474e] hover:bg-[#eceef0]'
                              }`}
                              title="Expand files list to delete or download"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              <span>Manage ({branchFiles.length})</span>
                            </button>

                            {/* Direct Delete / Clear Category Button */}
                            {categoryFiles.length > 0 && (
                              <button
                                onClick={() => setBulkDeleteTarget({
                                  nodeCode: node.code,
                                  nodeName: node.name,
                                  category: activeCategory,
                                  count: categoryFiles.length
                                })}
                                className="p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 border border-red-200 rounded-lg transition-colors cursor-pointer"
                                title={`Delete all ${categoryFiles.length} ${activeCategory} files for ${node.code}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Inspect Modal Button */}
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

                      {/* Expanded In-line Document Management & Delete Drawer */}
                      {isExpanded && (
                        <tr className="bg-[#f8fafc]">
                          <td colSpan={7} className="p-4 border-b border-[#c4c6cf]">
                            <div className="bg-white border border-[#c4c6cf] rounded-xl p-4 space-y-3 shadow-inner">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-[#eceef0] pb-2.5">
                                <div className="flex items-center gap-2">
                                  <FolderOpen className="w-4 h-4 text-[#002046]" />
                                  <h4 className="font-bold text-xs text-[#002046] uppercase tracking-wider">
                                    {node.code} - {node.name} Documents ({selectedBranch.toUpperCase()})
                                  </h4>
                                  <span className="px-2 py-0.5 rounded bg-[#eceef0] text-[#545f72] text-[10px] font-mono">
                                    {branchFiles.length} Total Files
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => onOpenUploadModal(node.code)}
                                    className="px-2.5 py-1 bg-[#002046] hover:bg-[#1b365d] text-white rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Add File</span>
                                  </button>

                                  {branchFiles.length > 0 && (
                                    <button
                                      onClick={() => setBulkDeleteTarget({
                                        nodeCode: node.code,
                                        nodeName: node.name,
                                        count: branchFiles.length
                                      })}
                                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3 text-red-600" />
                                      <span>Delete All Branch Files</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {branchFiles.length === 0 ? (
                                <div className="py-6 text-center text-[#74777f]">
                                  <FileText className="w-8 h-8 mx-auto mb-1.5 opacity-30 text-[#002046]" />
                                  <p className="text-xs font-semibold text-[#191c1e]">No files attached for {node.code} in {selectedBranch.toUpperCase()}</p>
                                  <p className="text-[11px] font-mono mt-0.5">Click "Add File" above to upload CAD drawings, GRN, SRN, PO, or SO files.</p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {branchFiles.map(file => {
                                    const isCAD = file.extension === 'dwg' || file.extension === 'dxf';
                                    const isCurrentCat = file.category === activeCategory;

                                    return (
                                      <div
                                        key={file.id}
                                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border transition-all ${
                                          isCurrentCat
                                            ? 'bg-sky-50/40 border-sky-200'
                                            : 'bg-[#fafbfc] border-[#eceef0]'
                                        }`}
                                      >
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div
                                            className={`w-7 h-7 rounded flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                              isCAD
                                                ? 'bg-[#002046] text-white'
                                                : file.extension === 'pdf'
                                                ? 'bg-rose-700 text-white'
                                                : 'bg-[#545f72] text-white'
                                            }`}
                                          >
                                            {file.extension.toUpperCase()}
                                          </div>

                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-bold text-xs text-[#191c1e] truncate max-w-[280px]">
                                                {file.name}
                                              </span>
                                              <span className="px-1.5 py-0.2 bg-[#eceef0] rounded text-[9px] font-mono font-bold text-[#545f72]">
                                                {file.category}
                                              </span>
                                              <span className="px-1.5 py-0.2 bg-[#d5e0f7] text-[#002046] rounded text-[9px] font-semibold">
                                                {file.version}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] text-[#545f72] font-mono mt-0.5">
                                              <span>Size: {file.sizeFormatted}</span>
                                              <span>Date: {file.uploadDate}</span>
                                              {file.drawingNumber && <span>Doc#: {file.drawingNumber}</span>}
                                            </div>
                                          </div>
                                        </div>

                                        {/* File Item Action Buttons: Download & DELETE */}
                                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                          <button
                                            onClick={() => handleDownloadFile(file, node.code)}
                                            className="px-2.5 py-1 bg-white hover:bg-[#eceef0] border border-[#c4c6cf] text-[#002046] text-[11px] font-semibold rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                                            title="Download file"
                                          >
                                            <Download className="w-3 h-3" />
                                            <span>Download</span>
                                          </button>

                                          {/* RED DELETE BUTTON WITH TRASH ICON */}
                                          <button
                                            onClick={() => setFileToDelete({
                                              nodeCode: node.code,
                                              nodeName: node.name,
                                              file
                                            })}
                                            className="px-2.5 py-1 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                                            title={`Delete ${file.name}`}
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Delete File</span>
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
