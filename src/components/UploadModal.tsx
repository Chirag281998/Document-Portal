import React, { useState } from 'react';
import { X, UploadCloud, File, CheckCircle, AlertCircle, HardDrive, Cloud } from 'lucide-react';
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
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setSelectedFiles(droppedFiles);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(10);
    setErrorMessage('');

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('nodeCode', selectedNodeCode);
        formData.append('branch', selectedBranch);
        formData.append('category', selectedCategory);
        formData.append('revision', revision || 'Rev-A');
        formData.append('drawingNumber', drawingNumber || `DWG-${selectedBranch.toUpperCase().slice(0, 3)}-${selectedNodeCode}-${String(i + 1).padStart(3, '0')}`);
        formData.append('uploadedBy', 'Engineering Team');
        formData.append('status', 'verified');

        setUploadProgress(Math.round(((i + 0.5) / selectedFiles.length) * 80));

        const response = await fetch('/api/r2/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }

        const data = await response.json();
        if (data.file) {
          onUploadFile(selectedNodeCode, data.file);
        } else {
          // Fallback client structure
          const extension = file.name.split('.').pop()?.toLowerCase() || 'dat';
          const newDoc: NodeFile = {
            id: `fl-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            name: file.name,
            extension,
            sizeBytes: file.size,
            sizeFormatted: formatBytes(file.size),
            branch: selectedBranch,
            category: selectedCategory,
            version: revision || 'Rev-A',
            uploadDate: new Date().toISOString().slice(0, 10),
            uploadedBy: 'Hardeepsinh (Planning)',
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
        setSelectedFiles([]);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error occurred during file upload.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#c4c6cf] shadow-2xl rounded-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#191c1e]">
        {/* Header */}
        <div className="bg-[#002046] text-white px-6 py-4 flex justify-between items-center border-b border-sky-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-sky-300">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">Upload Engineering Document</h2>
              <p className="text-xs text-sky-200 font-mono">Upload to 53 Plant Structures & Cloudflare R2</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-[#f8fafc]">
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#545f72] uppercase tracking-wider mb-1">
                Engineering Discipline
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value as Branch)}
                className="w-full bg-white border border-[#c4c6cf] rounded-xl px-3.5 py-2 text-xs text-[#191c1e] focus:border-[#002046] outline-none shadow-2xs"
              >
                <option value="civil">Civil Engineering</option>
                <option value="mechanical">Mechanical Piping</option>
                <option value="eni">Electrical & Inst.</option>
              </select>
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
                <option value="DRAWINGS">DRAWINGS (DWG/DXF/PDF)</option>
                <option value="GRN">GRN (Goods Receipt Note)</option>
                <option value="SRN">SRN (Service Receipt Note)</option>
                <option value="PO">PO (Purchase Order)</option>
                <option value="SO">SO (Sales/Service Order)</option>
              </select>
            </div>
          </div>

          {/* Revision & Number */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#545f72] uppercase tracking-wider mb-1">
                Revision Tag
              </label>
              <input
                type="text"
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
                placeholder="e.g. Rev-A"
                className="w-full bg-white border border-[#c4c6cf] rounded-xl px-3.5 py-2 text-xs text-[#191c1e] font-mono focus:border-[#002046] outline-none shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#545f72] uppercase tracking-wider mb-1">
                Drawing / Doc Number
              </label>
              <input
                type="text"
                value={drawingNumber}
                onChange={(e) => setDrawingNumber(e.target.value)}
                placeholder="e.g. DWG-CIV-ST1-001"
                className="w-full bg-white border border-[#c4c6cf] rounded-xl px-3.5 py-2 text-xs text-[#191c1e] font-mono focus:border-[#002046] outline-none shadow-2xs"
              />
            </div>
          </div>

          {/* Dropzone */}
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
            <input
              type="file"
              id="file-upload-input"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
            <label htmlFor="file-upload-input" className="cursor-pointer flex flex-col items-center">
              <UploadCloud className="w-8 h-8 text-[#002046] mb-2" />
              <p className="text-xs font-semibold text-[#191c1e]">
                Click to browse or drag and drop engineering files
              </p>
              <p className="text-[11px] text-[#545f72] mt-1 font-mono">
                Supports DWG, DXF, PDF, DOCX, XLSX, PNG, ZIP (Max 4GB per file)
              </p>
            </label>

            {selectedFiles.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#c4c6cf] text-left space-y-1.5">
                <p className="text-xs font-bold text-[#002046]">Selected Files ({selectedFiles.length}):</p>
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-[#f8fafc] p-2 rounded-lg border border-[#c4c6cf]">
                    <span className="font-mono truncate max-w-xs">{f.name}</span>
                    <span className="text-[#545f72] font-mono">{formatBytes(f.size)}</span>
                  </div>
                ))}
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
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-[#545f72]">
                <span>Uploading and hashing to Cloudflare R2...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-[#eceef0] rounded-full overflow-hidden">
                <div className="h-full bg-[#002046] transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Document uploaded to Cloudflare R2 & synced successfully!</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-[#eceef0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#545f72] hover:bg-[#f2f4f6] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedFiles.length === 0 || isUploading}
              className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-sm flex items-center gap-2 transition-all cursor-pointer ${
                selectedFiles.length === 0 || isUploading
                  ? 'bg-[#c4c6cf] cursor-not-allowed text-gray-500'
                  : 'bg-[#002046] hover:bg-[#1b365d] active:scale-98'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isUploading ? 'UPLOADING...' : 'START UPLOAD'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
