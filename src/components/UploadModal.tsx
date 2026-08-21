import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  File, 
  Folder, 
  FolderUp, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  HardDrive, 
  Cloud,
  ChevronRight,
  Layers,
  Sparkles
} from 'lucide-react';
import { StructureNode, Branch, Category, NodeFile } from '../types';
import { formatBytes } from '../data/plantStructures';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: StructureNode[];
  onUploadFile: (nodeCode: string, newFile: NodeFile) => void;
  defaultNodeCode?: string;
  defaultBranch?: Branch;
}

interface SelectedUploadItem {
  file: File;
  relativePath: string;
  folderName?: string;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  nodes,
  onUploadFile,
  defaultNodeCode,
  defaultBranch = 'civil',
}) => {
  const [selectedNodeCode, setSelectedNodeCode] = useState(defaultNodeCode || nodes[0]?.code || 'ST-1');
  const [selectedBranch, setSelectedBranch] = useState<Branch>(defaultBranch);
  const [selectedCategory, setSelectedCategory] = useState<Category>('DRAWINGS');
  const [revision, setRevision] = useState('Rev-A');
  const [drawingNumber, setDrawingNumber] = useState('');
  
  // Upload mode: 'files' vs 'folder'
  const [uploadMode, setUploadMode] = useState<'files' | 'folder'>('files');
  
  const [dragActive, setDragActive] = useState(false);
  const [uploadItems, setUploadItems] = useState<SelectedUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentUploadingFileName, setCurrentUploadingFileName] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Synchronize initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultBranch) setSelectedBranch(defaultBranch);
      if (defaultNodeCode) setSelectedNodeCode(defaultNodeCode);
      setUploadItems([]);
      setUploadSuccess(false);
      setErrorMessage('');
      setIsUploading(false);
      setUploadProgress(0);
      setCurrentUploadingFileName('');
    }
  }, [isOpen, defaultBranch, defaultNodeCode]);

  if (!isOpen) return null;

  // Helper to read entries recursively from drag & drop
  const getFilesFromEntry = async (
    entry: any,
    basePath = '',
    rootFolder = ''
  ): Promise<SelectedUploadItem[]> => {
    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file: File) => {
          const relPath = basePath ? `${basePath}/${file.name}` : file.name;
          resolve([{ file, relativePath: relPath, folderName: rootFolder || undefined }]);
        });
      });
    } else if (entry.isDirectory) {
      const dirFolder = rootFolder || entry.name;
      const reader = entry.createReader();
      return new Promise((resolve) => {
        reader.readEntries(async (entries: any[]) => {
          const promises = entries.map(e =>
            getFilesFromEntry(e, basePath ? `${basePath}/${entry.name}` : entry.name, dirFolder)
          );
          const results = await Promise.all(promises);
          resolve(results.flat());
        });
      });
    }
    return [];
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const items = Array.from(e.dataTransfer.items);
      const extracted: SelectedUploadItem[] = [];

      for (const item of items) {
        if (typeof (item as any).webkitGetAsEntry === 'function') {
          const entry = (item as any).webkitGetAsEntry();
          if (entry) {
            const results = await getFilesFromEntry(entry);
            extracted.push(...results);
          }
        }
      }

      if (extracted.length > 0) {
        setUploadItems(extracted);
        // If folders were detected in drop, set mode to folder
        if (extracted.some(it => it.folderName)) {
          setUploadMode('folder');
        }
        return;
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files) as File[];
      setUploadItems(
        files.map(f => ({
          file: f,
          relativePath: f.name,
        }))
      );
    }
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      setUploadItems(
        files.map(f => ({
          file: f,
          relativePath: f.name,
        }))
      );
    }
  };

  const handleFolderSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const items: SelectedUploadItem[] = files.map(f => {
        const relPath = (f as any).webkitRelativePath || f.name;
        const topFolder = relPath.includes('/') ? relPath.split('/')[0] : 'Folder';
        return {
          file: f,
          relativePath: relPath,
          folderName: topFolder,
        };
      });
      setUploadItems(items);
    }
  };

  const totalSelectedBytes = uploadItems.reduce((sum, it) => sum + it.file.size, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadItems.length === 0) return;

    setIsUploading(true);
    setUploadProgress(5);
    setErrorMessage('');

    try {
      for (let i = 0; i < uploadItems.length; i++) {
        const item = uploadItems[i];
        setCurrentUploadingFileName(item.relativePath);

        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('nodeCode', selectedNodeCode);
        formData.append('branch', selectedBranch);
        formData.append('category', selectedCategory);
        formData.append('revision', revision || 'Rev-A');
        formData.append('relativePath', item.relativePath);
        formData.append(
          'drawingNumber',
          drawingNumber ||
            `DWG-${selectedBranch.toUpperCase().slice(0, 3)}-${selectedNodeCode}-${String(i + 1).padStart(3, '0')}`
        );
        formData.append('uploadedBy', 'Engineering Team');
        formData.append('status', 'verified');

        const currentPct = Math.round(((i + 1) / uploadItems.length) * 90);
        setUploadProgress(currentPct);

        const response = await fetch('/api/r2/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${item.relativePath}`);
        }

        const data = await response.json();
        if (data.file) {
          onUploadFile(selectedNodeCode, data.file);
        } else {
          // Fallback client structure
          const extension = item.file.name.split('.').pop()?.toLowerCase() || 'dwg';
          const newDoc: NodeFile = {
            id: `fl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            name: item.relativePath,
            extension,
            sizeBytes: item.file.size,
            sizeFormatted: formatBytes(item.file.size),
            branch: selectedBranch,
            category: selectedCategory,
            version: revision || 'Rev-A',
            uploadDate: new Date().toISOString().slice(0, 10),
            uploadedBy: 'Planning & Site Engineering',
            status: 'verified',
            drawingNumber: drawingNumber || `DWG-${selectedNodeCode}-${Date.now().toString().slice(-4)}`,
            revision: revision || 'Rev-A',
          };
          onUploadFile(selectedNodeCode, newDoc);
        }
      }

      setUploadProgress(100);
      setUploadSuccess(true);
      setTimeout(() => {
        setIsUploading(false);
        setUploadSuccess(false);
        setUploadItems([]);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error occurred during file upload.');
      setIsUploading(false);
    }
  };

  const branchLabels: Record<Branch, { label: string; tag: string; bg: string; text: string }> = {
    civil: { label: 'Civil Engineering', tag: 'CIVIL', bg: 'bg-amber-100', text: 'text-amber-900' },
    mechanical: { label: 'Mechanical Piping', tag: 'MECH', bg: 'bg-blue-100', text: 'text-blue-900' },
    eni: { label: 'Electrical & Inst.', tag: 'E&I', bg: 'bg-purple-100', text: 'text-purple-900' },
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#c4c6cf] shadow-2xl rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#191c1e]">
        {/* Header */}
        <div className="bg-[#002046] text-white px-6 py-4 flex justify-between items-center border-b border-sky-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-sky-300">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">Upload Engineering Data & Folders</h2>
              <p className="text-xs text-sky-200 font-mono">Scoped to Plant Structure & Engineering Discipline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Mode Selector (Files vs Folder) */}
        <div className="bg-[#f2f4f6] px-6 py-2.5 border-b border-[#c4c6cf] flex items-center justify-between">
          <div className="flex bg-white p-1 rounded-xl border border-[#c4c6cf] gap-1">
            <button
              type="button"
              onClick={() => {
                setUploadMode('files');
                setUploadItems([]);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                uploadMode === 'files'
                  ? 'bg-[#002046] text-white shadow-2xs'
                  : 'text-[#545f72] hover:text-[#002046]'
              }`}
            >
              <File className="w-3.5 h-3.5" />
              <span>Upload Individual Files</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUploadMode('folder');
                setUploadItems([]);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                uploadMode === 'folder'
                  ? 'bg-[#002046] text-white shadow-2xs'
                  : 'text-[#545f72] hover:text-[#002046]'
              }`}
            >
              <FolderUp className="w-3.5 h-3.5" />
              <span>Upload Entire Folder</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-[#545f72] hidden sm:inline">
            Destination: <strong className="text-[#002046]">{selectedNodeCode}</strong> • {branchLabels[selectedBranch].tag}
          </span>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 bg-[#f8fafc]">
          {/* Target Structure Selector */}
          <div>
            <label className="block text-[11px] font-bold text-[#545f72] uppercase tracking-wider mb-1">
              Target Plant Structure (53 Master Units)
            </label>
            <select
              value={selectedNodeCode}
              onChange={(e) => setSelectedNodeCode(e.target.value)}
              className="w-full bg-white border border-[#c4c6cf] rounded-xl px-3.5 py-2.5 text-xs text-[#191c1e] font-mono focus:border-[#002046] outline-none shadow-2xs"
            >
              {nodes.map((node) => (
                <option key={node.id} value={node.code}>
                  {node.code} — {node.name}
                </option>
              ))}
            </select>
          </div>

          {/* Discipline & Category Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#545f72] uppercase tracking-wider mb-1">
                Target Discipline (Civil / Mech / E&I)
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value as Branch)}
                className="w-full bg-white border border-[#c4c6cf] rounded-xl px-3.5 py-2 text-xs text-[#191c1e] font-bold focus:border-[#002046] outline-none shadow-2xs"
              >
                <option value="civil">Civil Engineering (Foundation, RCC, Shed)</option>
                <option value="mechanical">Mechanical Piping (Valves, Equipment)</option>
                <option value="eni">Electrical & Instrumentation (Panels, Cables)</option>
              </select>
              <p className="text-[10px] text-[#545f72] mt-1">
                Document will only be visible under <strong>{branchLabels[selectedBranch].label}</strong>.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#545f72] uppercase tracking-wider mb-1">
                Document Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as Category)}
                className="w-full bg-white border border-[#c4c6cf] rounded-xl px-3.5 py-2 text-xs text-[#191c1e] focus:border-[#002046] outline-none shadow-2xs"
              >
                <option value="DRAWINGS">DRAWINGS (DWG / DXF / CAD / PDF)</option>
                <option value="GRN">GRN (Goods Receipt Note)</option>
                <option value="SRN">SRN (Service Receipt Note)</option>
                <option value="PO">PO (Purchase Order)</option>
                <option value="SO">SO (Sales / Service Order)</option>
              </select>
            </div>
          </div>

          {/* Revision & Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#545f72] uppercase tracking-wider mb-1">
                Revision Tag
              </label>
              <input
                type="text"
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
                placeholder="e.g. Rev-A, Rev-0"
                className="w-full bg-white border border-[#c4c6cf] rounded-xl px-3.5 py-2 text-xs text-[#191c1e] font-mono focus:border-[#002046] outline-none shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#545f72] uppercase tracking-wider mb-1">
                Drawing / Document Reference
              </label>
              <input
                type="text"
                value={drawingNumber}
                onChange={(e) => setDrawingNumber(e.target.value)}
                placeholder={`e.g. DWG-${branchLabels[selectedBranch].tag}-${selectedNodeCode}-001`}
                className="w-full bg-white border border-[#c4c6cf] rounded-xl px-3.5 py-2 text-xs text-[#191c1e] font-mono focus:border-[#002046] outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* Dropzone Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              dragActive
                ? 'border-[#002046] bg-[#d5e0f7]/40'
                : 'border-[#c4c6cf] hover:border-[#002046] bg-white'
            }`}
          >
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={handleFilesSelected}
              className="hidden"
            />
            {/* Hidden folder input */}
            <input
              type="file"
              ref={folderInputRef}
              // @ts-ignore
              webkitdirectory="true"
              // @ts-ignore
              directory=""
              multiple
              onChange={handleFolderSelected}
              className="hidden"
            />

            <div className="flex flex-col items-center">
              {uploadMode === 'folder' ? (
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-2">
                  <FolderUp className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#002046] flex items-center justify-center mb-2">
                  <UploadCloud className="w-6 h-6" />
                </div>
              )}

              <p className="text-sm font-bold text-[#191c1e]">
                {uploadMode === 'folder'
                  ? 'Drag & drop a folder here or browse'
                  : 'Drag & drop engineering files or browse'}
              </p>
              <p className="text-xs text-[#545f72] mt-1 font-mono">
                {uploadMode === 'folder'
                  ? 'Preserves sub-folder structure and uploads all files inside'
                  : 'Supports DWG, DXF, PDF, DOCX, XLSX, PNG, ZIP'}
              </p>

              <div className="flex gap-2.5 mt-3.5">
                {uploadMode === 'folder' ? (
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="px-4 py-2 bg-[#002046] text-white text-xs font-bold rounded-xl shadow-2xs hover:bg-[#1b365d] transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>Select Folder from Computer</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#002046] text-white text-xs font-bold rounded-xl shadow-2xs hover:bg-[#1b365d] transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <File className="w-3.5 h-3.5" />
                    <span>Browse Files</span>
                  </button>
                )}
              </div>
            </div>

            {/* Selected items list */}
            {uploadItems.length > 0 && (
              <div className="mt-5 pt-3 border-t border-[#c4c6cf] text-left space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-[#002046]">
                  <span className="flex items-center gap-1.5">
                    {uploadMode === 'folder' ? <Folder className="w-4 h-4 text-amber-600" /> : <FileText className="w-4 h-4 text-[#002046]" />}
                    <span>Items Ready ({uploadItems.length} files • {formatBytes(totalSelectedBytes)})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setUploadItems([])}
                    className="text-red-600 hover:underline font-normal text-[11px]"
                  >
                    Clear All
                  </button>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {uploadItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-[#f8fafc] p-2 rounded-lg border border-[#c4c6cf]"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        {item.folderName ? (
                          <Folder className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-[#545f72] shrink-0" />
                        )}
                        <span className="font-mono truncate">{item.relativePath}</span>
                      </div>
                      <span className="text-[#545f72] font-mono text-[11px] shrink-0">
                        {formatBytes(item.file.size)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error notice */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Progress bar */}
          {isUploading && (
            <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-[#c4c6cf]">
              <div className="flex justify-between text-xs font-mono text-[#545f72]">
                <span className="truncate pr-2">Uploading: {currentUploadingFileName || 'Processing package...'}</span>
                <span className="font-bold text-[#002046] shrink-0">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-[#eceef0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#002046] transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Upload successfully saved to {branchLabels[selectedBranch].label} and synced!</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-3 border-t border-[#eceef0]">
            <div className="text-[11px] text-[#545f72] font-mono">
              {uploadItems.length > 0 && `${uploadItems.length} document(s) ready`}
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#545f72] hover:bg-[#f2f4f6] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadItems.length === 0 || isUploading}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer ${
                  uploadItems.length === 0 || isUploading
                    ? 'bg-[#c4c6cf] cursor-not-allowed text-gray-500'
                    : 'bg-[#002046] hover:bg-[#1b365d] active:scale-98'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isUploading ? 'UPLOADING...' : `UPLOAD (${uploadItems.length})`}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
