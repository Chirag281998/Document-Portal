import React, { useState } from 'react';
import { X, FileText, Download, Trash2, Plus, CheckCircle, AlertTriangle, ExternalLink, HardDrive, Calendar, User, Eye } from 'lucide-react';
import { StructureNode, Category, NodeFile, Branch } from '../types';
import { formatBytes } from '../data/plantStructures';

interface StructureDetailsModalProps {
  isOpen: boolean;
  node: StructureNode | null;
  onClose: () => void;
  onUploadForThisNode?: (nodeCode: string) => void;
  onDeleteFile?: (nodeCode: string, fileId: string) => void;
  canUpload?: boolean;
  initialBranch?: Branch;
}

export const StructureDetailsModal: React.FC<StructureDetailsModalProps> = ({
  isOpen,
  node,
  onClose,
  onUploadForThisNode,
  onDeleteFile,
  canUpload = false,
  initialBranch,
}) => {
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('ALL');
  const [selectedBranchTab, setSelectedBranchTab] = useState<string>(initialBranch || 'ALL');

  React.useEffect(() => {
    if (isOpen && initialBranch) {
      setSelectedBranchTab(initialBranch);
    }
  }, [isOpen, initialBranch]);

  if (!isOpen || !node) return null;

  const categories: { label: string; value: string }[] = [
    { label: 'ALL FILES', value: 'ALL' },
    { label: 'DRAWINGS', value: 'DRAWINGS' },
    { label: 'GRN', value: 'GRN' },
    { label: 'SRN', value: 'SRN' },
    { label: 'PO', value: 'PO' },
    { label: 'SO', value: 'SO' },
  ];

  const branchOptions: { label: string; value: string }[] = [
    { label: 'ALL DISCIPLINES', value: 'ALL' },
    { label: 'CIVIL', value: 'civil' },
    { label: 'MECHANICAL', value: 'mechanical' },
    { label: 'E&I', value: 'eni' },
  ];

  const displayedFiles = node.files.filter(f => {
    const matchCategory = selectedCategoryTab === 'ALL' || f.category === selectedCategoryTab;
    const matchBranch = selectedBranchTab === 'ALL' || f.branch === selectedBranchTab;
    return matchCategory && matchBranch;
  });

  const totalBytes = node.files.reduce((acc, f) => acc + f.sizeBytes, 0);

  const handleDownloadFile = (file: NodeFile) => {
    if (file.downloadUrl) {
      window.open(file.downloadUrl, '_blank');
      return;
    }

    if (file.r2Key) {
      window.open(`/api/r2/download-key?key=${encodeURIComponent(file.r2Key)}`, '_blank');
      return;
    }

    // Client package file fallback
    const content = `ENGINEERING DOCUMENT FILE EXPORT\n` +
      `File Name: ${file.name}\n` +
      `Structure: ${node.fullTag}\n` +
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

  const handleDownloadPackage = () => {
    const summary = `STRUCTURE NODE DOCUMENT REPOSITORY PACKAGE\n` +
      `Node: ${node.fullTag}\n` +
      `Total Files: ${node.files.length}\n` +
      `Total Size: ${formatBytes(totalBytes)}\n` +
      `Generated At: ${new Date().toISOString()}\n\n` +
      `File Index:\n` +
      node.files.map((f, i) => `${i + 1}. [${f.category}] [${f.extension.toUpperCase()}] ${f.name} (${f.sizeFormatted}) - Rev: ${f.revision || 'N/A'}`).join('\n');

    const blob = new Blob([summary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${node.code}_Complete_Manifest.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#c4c6cf] shadow-2xl rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#191c1e]">
        {/* Modal Header */}
        <div className="bg-[#002046] text-white px-6 py-4 flex justify-between items-center border-b border-sky-950">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold px-2.5 py-1 bg-white/20 text-white rounded">
              {node.code}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight text-white">{node.name}</h3>
                {node.isHighlighted && (
                  <span className="px-2 py-0.5 bg-emerald-400 text-emerald-950 text-[10px] font-bold rounded">
                    Key Plant Unit
                  </span>
                )}
              </div>
              <p className="text-xs text-sky-200 font-mono">
                Node ID: {node.id} • Total Files: {node.files.length} • Size: {formatBytes(totalBytes)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls (Discipline + Category) */}
        <div className="bg-[#f2f4f6] px-6 py-2.5 border-b border-[#c4c6cf] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Discipline Pills */}
            <div className="flex bg-white p-0.5 rounded-lg border border-[#c4c6cf]">
              {branchOptions.map((b) => (
                <button
                  key={b.value}
                  onClick={() => setSelectedBranchTab(b.value)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md uppercase tracking-wider transition-colors cursor-pointer ${
                    selectedBranchTab === b.value
                      ? 'bg-[#002046] text-white shadow-2xs'
                      : 'text-[#545f72] hover:text-[#002046]'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Category Pills */}
            <div className="flex space-x-1 overflow-x-auto hide-scrollbar">
              {categories.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setSelectedCategoryTab(c.value)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md uppercase tracking-wider transition-colors cursor-pointer ${
                    selectedCategoryTab === c.value
                      ? 'bg-[#002046] text-white shadow-2xs'
                      : 'bg-white text-[#545f72] border border-[#c4c6cf] hover:bg-[#e6e8ea]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {canUpload && onUploadForThisNode && (
            <button
              onClick={() => {
                onClose();
                onUploadForThisNode(node.code);
              }}
              className="text-xs font-bold text-white bg-[#002046] hover:bg-[#1b365d] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs uppercase tracking-wider cursor-pointer self-end sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          )}
        </div>

        {/* Documents Content Table / List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-[300px] bg-[#f8fafc]">
          {displayedFiles.length === 0 ? (
            <div className="text-center py-16 text-[#74777f]">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-40 text-[#002046]" />
              <p className="text-sm font-semibold text-[#191c1e]">No documents in this category</p>
              <p className="text-xs font-mono mt-1">Select another category or view through Data Entry.</p>
              {canUpload && onUploadForThisNode && (
                <button
                  onClick={() => {
                    onClose();
                    onUploadForThisNode(node.code);
                  }}
                  className="mt-4 px-4 py-2 bg-[#002046] text-white text-xs font-bold rounded-lg shadow-sm hover:bg-[#1b365d] cursor-pointer"
                >
                  Upload First File
                </button>
              )}
            </div>
          ) : (
            displayedFiles.map((file) => {
              const isCAD = file.extension === 'dwg' || file.extension === 'dxf';
              return (
                <div
                  key={file.id}
                  className="bg-white border border-[#c4c6cf] hover:border-[#002046] rounded-xl p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
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
                        <p className="text-sm font-bold text-[#191c1e] truncate">{file.name}</p>
                        <span className="px-2 py-0.5 bg-[#eceef0] text-[#545f72] rounded text-[10px] font-mono font-bold">
                          {file.version}
                        </span>
                        <span className="px-2 py-0.5 bg-[#d5e0f7] text-[#002046] rounded text-[10px] font-semibold uppercase">
                          {file.branch}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-[#545f72] font-mono mt-1 flex-wrap">
                        {file.drawingNumber && <span>Doc#: {file.drawingNumber}</span>}
                        <span>Size: {file.sizeFormatted}</span>
                        <span>Date: {file.uploadDate}</span>
                        {file.r2Key && <span className="text-emerald-700 font-semibold">R2 Cloud Synced</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="px-3 py-1.5 bg-[#f2f4f6] hover:bg-[#d5e0f7] text-[#002046] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Download or open real file"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download / Open</span>
                    </button>

                    {onDeleteFile && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${file.name}" from ${node.code}?`)) {
                            onDeleteFile(node.code, file.id);
                          }
                        }}
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200 hover:border-red-600 text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                        title="Delete this document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#f2f4f6] px-6 py-3 border-t border-[#c4c6cf] flex justify-between items-center text-xs">
          <span className="text-[#545f72] font-mono">
            {displayedFiles.length} files in this node
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPackage}
              className="px-4 py-2 bg-[#002046] text-white font-bold rounded-lg hover:bg-[#1b365d] transition-colors flex items-center gap-1.5 uppercase tracking-wider cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>EXPORT MANIFEST</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-[#c4c6cf] text-[#191c1e] font-semibold rounded-lg hover:bg-[#e6e8ea] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
