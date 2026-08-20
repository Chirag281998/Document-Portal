import React, { useState, useEffect, useMemo } from 'react';
import { AppView, Branch, StructureNode, NodeFile, R2ConnectionStatus } from './types';
import { INITIAL_STRUCTURE_NODES } from './data/plantStructures';
import { TopAppBar } from './components/TopAppBar';
import { NavigationDrawer } from './components/NavigationDrawer';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { FilesView } from './components/FilesView';
import { DataEntryView } from './components/DataEntryView';
import { UploadModal } from './components/UploadModal';
import { StructureDetailsModal } from './components/StructureDetailsModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  // App navigation state
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [selectedBranch, setSelectedBranch] = useState<Branch>('civil');

  // Nodes state - starts clean / synchronized
  const [nodes, setNodes] = useState<StructureNode[]>(() => {
    const saved = localStorage.getItem('eng_docs_master_nodes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_STRUCTURE_NODES;
  });

  // Cloudflare R2 Connection state
  const [r2Status, setR2Status] = useState<R2ConnectionStatus | null>(null);

  const fetchR2Status = async () => {
    try {
      const res = await fetch('/api/r2/status');
      if (res.ok) {
        const data = await res.json();
        setR2Status(data);
      }
    } catch (e) {
      console.warn('Could not fetch R2 status', e);
    }
  };

  const fetchServerNodes = async () => {
    try {
      const res = await fetch('/api/nodes');
      if (res.ok) {
        const data = await res.json();
        if (data.nodes && Array.isArray(data.nodes) && data.nodes.length > 0) {
          setNodes(data.nodes);
        }
      }
    } catch (e) {
      console.warn('Could not fetch server nodes', e);
    }
  };

  useEffect(() => {
    fetchR2Status();
    fetchServerNodes();
  }, []);

  // Modals and Options Drawer state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTargetNodeCode, setUploadTargetNodeCode] = useState<string | undefined>(undefined);
  const [inspectNode, setInspectNode] = useState<StructureNode | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOptionsDrawerOpen, setIsOptionsDrawerOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('eng_docs_master_nodes', JSON.stringify(nodes));
  }, [nodes]);

  // Compute live totals
  const totalFilesCount = useMemo(() => {
    return nodes.reduce((acc, n) => acc + n.files.length, 0);
  }, [nodes]);

  const totalSizeBytes = useMemo(() => {
    return nodes.reduce((acc, n) => acc + n.files.reduce((sub, f) => sub + f.sizeBytes, 0), 0);
  }, [nodes]);

  // Handlers
  const handleUploadFile = async (nodeCode: string, newFile: NodeFile) => {
    const updated = nodes.map(node => {
      if (node.code === nodeCode) {
        return {
          ...node,
          files: [newFile, ...node.files]
        };
      }
      return node;
    });

    setNodes(updated);

    try {
      await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: updated }),
      });
    } catch (e) {
      console.warn('Server sync failed', e);
    }
  };

  const handleDeleteFile = async (nodeCode: string, fileId: string) => {
    const updated = nodes.map(node => {
      if (node.code === nodeCode) {
        return {
          ...node,
          files: node.files.filter(f => f.id !== fileId)
        };
      }
      return node;
    });

    setNodes(updated);
    if (inspectNode && inspectNode.code === nodeCode) {
      setInspectNode({
        ...inspectNode,
        files: inspectNode.files.filter(f => f.id !== fileId)
      });
    }

    try {
      await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: updated }),
      });
    } catch (e) {
      console.warn('Server sync failed', e);
    }
  };

  const handleDeleteBranch = async (branch: Branch) => {
    const updated = nodes.map(node => ({
      ...node,
      files: node.files.filter(f => f.branch !== branch)
    }));

    setNodes(updated);
    if (inspectNode) {
      setInspectNode({
        ...inspectNode,
        files: inspectNode.files.filter(f => f.branch !== branch)
      });
    }

    try {
      await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: updated }),
      });
    } catch (e) {
      console.warn('Server sync failed', e);
    }
    localStorage.setItem('eng_docs_master_nodes', JSON.stringify(updated));
  };

  const handleResetToZeroFiles = async () => {
    const zeroed = nodes.map(node => ({
      ...node,
      files: []
    }));

    setNodes(zeroed);

    try {
      await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: zeroed }),
      });
    } catch (e) {
      console.warn('Server sync failed', e);
    }
  };

  const handleOpenUpload = (defaultCode?: string) => {
    setUploadTargetNodeCode(defaultCode || 'ST-1');
    setIsUploadModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#191c1e] flex flex-col font-sans antialiased selection:bg-[#002046] selection:text-white">
      {/* Top App Bar with 3 lines hamburger menu button at top left */}
      <TopAppBar
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenMenu={() => setIsOptionsDrawerOpen(true)}
        storageUsedBytes={totalSizeBytes}
        totalFilesCount={totalFilesCount}
        r2Status={r2Status}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Slide-Over Options Drawer (Controlled only via 3-lines menu at top left) */}
        <NavigationDrawer
          activeView={activeView}
          onViewChange={setActiveView}
          selectedBranch={selectedBranch}
          onSelectBranch={setSelectedBranch}
          totalFiles={totalFilesCount}
          totalStructures={nodes.length}
          isOpen={isOptionsDrawerOpen}
          onClose={() => setIsOptionsDrawerOpen(false)}
          r2Status={r2Status}
        />

        {/* Main Content Area - Full screen width with clean padding */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-12 flex flex-col min-w-0">
          {activeView === 'dashboard' && (
            <DashboardView
              nodes={nodes}
              onSelectBranch={setSelectedBranch}
              onViewChange={setActiveView}
              onSelectNode={(node) => setInspectNode(node)}
              r2Status={r2Status}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )}

          {activeView === 'files' && (
            <FilesView
              nodes={nodes}
              selectedBranch={selectedBranch}
              onSelectBranch={setSelectedBranch}
              onSelectNode={(node) => setInspectNode(node)}
            />
          )}

          {activeView === 'data-entry' && (
            <DataEntryView
              nodes={nodes}
              onUpdateNodes={setNodes}
              selectedBranch={selectedBranch}
              onSelectBranch={setSelectedBranch}
              onOpenUploadModal={(code) => handleOpenUpload(code)}
              onSelectNode={(node) => setInspectNode(node)}
              onDeleteFile={handleDeleteFile}
              onDeleteBranch={handleDeleteBranch}
            />
          )}

          {activeView === 'settings' && (
            <div className="max-w-3xl mx-auto w-full pt-4 space-y-6">
              <div className="bg-white border border-[#c4c6cf] rounded-2xl p-6 shadow-xs space-y-4">
                <h2 className="text-xl font-bold text-[#002046]">
                  System Settings & Cloudflare R2 Storage
                </h2>
                <p className="text-xs text-[#545f72] leading-relaxed">
                  Configure Cloudflare R2 bucket connection, S3 API credentials, persistent multi-user uploads, and file manifest settings.
                </p>

                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="px-5 py-2.5 bg-[#002046] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs hover:bg-[#1b365d] active:scale-98 transition-all cursor-pointer"
                  >
                    Open R2 Bucket & Keys Configuration
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav activeView={activeView} onViewChange={setActiveView} />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        nodes={nodes}
        onUploadFile={handleUploadFile}
        defaultNodeCode={uploadTargetNodeCode}
        defaultBranch={selectedBranch}
      />

      {/* Structure Details / File Inspector Modal */}
      <StructureDetailsModal
        isOpen={inspectNode !== null}
        node={inspectNode}
        onClose={() => setInspectNode(null)}
        onUploadForThisNode={(code) => handleOpenUpload(code)}
        onDeleteFile={handleDeleteFile}
        canUpload={activeView === 'data-entry'}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        nodes={nodes}
        onResetToZeroFiles={handleResetToZeroFiles}
        r2Status={r2Status}
        onRefreshR2Status={fetchR2Status}
      />
    </div>
  );
}
