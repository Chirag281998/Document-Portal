import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AppView, Branch, StructureNode, NodeFile, R2ConnectionStatus, GlobalStorageStats } from './types';
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

  // Master structure nodes state (Directly hydrated from Server Database, NO localStorage)
  const [nodes, setNodes] = useState<StructureNode[]>(INITIAL_STRUCTURE_NODES);
  const [storageStats, setStorageStats] = useState<GlobalStorageStats | null>(null);
  const [r2Status, setR2Status] = useState<R2ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals and Options Drawer state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTargetNodeCode, setUploadTargetNodeCode] = useState<string | undefined>(undefined);
  const [inspectNode, setInspectNode] = useState<StructureNode | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOptionsDrawerOpen, setIsOptionsDrawerOpen] = useState(false);

  // Fetch real-time server database nodes
  const fetchServerNodes = useCallback(async () => {
    try {
      const res = await fetch('/api/nodes');
      if (res.ok) {
        const data = await res.json();
        if (data.nodes && Array.isArray(data.nodes) && data.nodes.length > 0) {
          setNodes(data.nodes);
          // If a structure is currently open in inspector modal, update it with fresh server files
          setInspectNode(prev => {
            if (!prev) return null;
            const updated = data.nodes.find((n: StructureNode) => n.code === prev.code);
            return updated || prev;
          });
        }
      }
    } catch (e) {
      console.warn('Could not fetch server nodes:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch real-time storage stats
  const fetchStorageStats = useCallback(async () => {
    try {
      const res = await fetch('/api/storage-stats');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStorageStats(data);
        }
      }
    } catch (e) {
      console.warn('Could not fetch storage stats:', e);
    }
  }, []);

  // Fetch Cloudflare R2 Connection status
  const fetchR2Status = useCallback(async () => {
    try {
      const res = await fetch('/api/r2/status');
      if (res.ok) {
        const data = await res.json();
        setR2Status(data);
      }
    } catch (e) {
      console.warn('Could not fetch R2 status:', e);
    }
  }, []);

  // Master Initial Hydration & Multi-PC Synchronization Poll
  useEffect(() => {
    // 1. Initial hydration on mount
    fetchServerNodes();
    fetchStorageStats();
    fetchR2Status();

    // 2. Periodic sync timer to reflect changes made on other PCs automatically
    const syncInterval = setInterval(() => {
      fetchServerNodes();
      fetchStorageStats();
    }, 8000);

    // 3. Window focus trigger for instant sync when user switches tabs/windows
    const onFocus = () => {
      fetchServerNodes();
      fetchStorageStats();
      fetchR2Status();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchServerNodes, fetchStorageStats, fetchR2Status]);

  // Live calculated totals (matching server stats)
  const totalFilesCount = useMemo(() => {
    return nodes.reduce((acc, n) => acc + (n.files?.length || 0), 0);
  }, [nodes]);

  const totalSizeBytes = useMemo(() => {
    return nodes.reduce((acc, n) => acc + (n.files || []).reduce((sub, f) => sub + (f.sizeBytes || 0), 0), 0);
  }, [nodes]);

  // ----------------------------------------------------
  // SERVER-SYNCHRONIZED MUTATION HANDLERS
  // ----------------------------------------------------
  const handleUploadFile = async (nodeCode: string, newFileOrFiles: NodeFile | NodeFile[]) => {
    const fileArray = Array.isArray(newFileOrFiles) ? newFileOrFiles : [newFileOrFiles];
    if (fileArray.length === 0) return;

    // Optimistic UI update
    setNodes(prevNodes => {
      const updated = prevNodes.map(node => {
        if (node.code === nodeCode) {
          const newIds = new Set(fileArray.map(f => f.id));
          const existing = (node.files || []).filter(f => !newIds.has(f.id));
          return {
            ...node,
            files: [...fileArray, ...existing],
          };
        }
        return node;
      });
      return updated;
    });

    // Sync with central backend server
    try {
      await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeCode,
          files: fileArray,
          branch: fileArray[0]?.branch || selectedBranch,
          category: fileArray[0]?.category || 'DRAWINGS',
        }),
      });
    } catch (e) {
      console.warn('Server sync error on file add:', e);
    } finally {
      // Re-fetch authoritatively to ensure consistent state
      fetchServerNodes();
      fetchStorageStats();
    }
  };

  const handleDeleteFile = async (nodeCode: string, fileId: string) => {
    // Optimistic update
    setNodes(prev =>
      prev.map(node => {
        if (node.code === nodeCode) {
          return {
            ...node,
            files: (node.files || []).filter(f => f.id !== fileId),
          };
        }
        return node;
      })
    );

    if (inspectNode && inspectNode.code === nodeCode) {
      setInspectNode(prev => (prev ? { ...prev, files: (prev.files || []).filter(f => f.id !== fileId) } : null));
    }

    try {
      await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Server sync error on file delete:', e);
    } finally {
      fetchServerNodes();
      fetchStorageStats();
    }
  };

  const handleDeleteBranch = async (branch: Branch) => {
    // Optimistic update
    setNodes(prev =>
      prev.map(node => ({
        ...node,
        files: (node.files || []).filter(f => f.branch !== branch && f.branchId !== branch),
      }))
    );

    if (inspectNode) {
      setInspectNode(prev => (prev ? { ...prev, files: (prev.files || []).filter(f => f.branch !== branch && f.branchId !== branch) } : null));
    }

    try {
      await fetch(`/api/branches/${branch}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Server sync error on branch delete:', e);
    } finally {
      fetchServerNodes();
      fetchStorageStats();
    }
  };

  const handleResetToZeroFiles = async () => {
    // Optimistic update
    setNodes(prev => prev.map(node => ({ ...node, files: [] })));
    if (inspectNode) {
      setInspectNode(prev => (prev ? { ...prev, files: [] } : null));
    }

    try {
      await fetch('/api/structures/reset', {
        method: 'POST',
      });
    } catch (e) {
      console.warn('Server sync error on reset:', e);
    } finally {
      fetchServerNodes();
      fetchStorageStats();
    }
  };

  const handleUpdateNodesDirect = async (updated: StructureNode[]) => {
    setNodes(updated);
    try {
      await fetch('/api/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: updated }),
      });
    } catch (e) {
      console.warn('Server sync error on nodes update:', e);
    } finally {
      fetchServerNodes();
      fetchStorageStats();
    }
  };

  const handleOpenUpload = (defaultCode?: string) => {
    setUploadTargetNodeCode(defaultCode || 'ST-1');
    setIsUploadModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#191c1e] flex flex-col font-sans antialiased selection:bg-[#002046] selection:text-white">
      {/* Top App Bar with Options Menu button at top left */}
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
        {/* Slide-Over Options Drawer */}
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

        {/* Main Content Area */}
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
              onUpdateNodes={handleUpdateNodesDirect}
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
        onDeleteFile={activeView === 'data-entry' ? handleDeleteFile : undefined}
        canUpload={activeView === 'data-entry'}
        initialBranch={selectedBranch}
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
