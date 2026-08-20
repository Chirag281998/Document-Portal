import React, { useState, useEffect } from 'react';
import { X, Settings, HardDrive, Cloud, RefreshCw, CheckCircle, Database, ShieldAlert, Key, AlertCircle, Check } from 'lucide-react';
import { StructureNode, R2ConnectionStatus } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: StructureNode[];
  onResetToZeroFiles: () => void;
  r2Status: R2ConnectionStatus | null;
  onRefreshR2Status: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  nodes,
  onResetToZeroFiles,
  r2Status,
  onRefreshR2Status,
}) => {
  const [accountId, setAccountId] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [bucketName, setBucketName] = useState('');
  const [publicUrl, setPublicUrl] = useState('');

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (r2Status) {
      if (r2Status.bucketName && !bucketName) setBucketName(r2Status.bucketName);
      if (r2Status.publicUrl && !publicUrl) setPublicUrl(r2Status.publicUrl);
    }
  }, [r2Status]);

  if (!isOpen) return null;

  const totalFiles = nodes.reduce((sum, n) => sum + n.files.length, 0);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setSaveSuccess(false);
    setTestResult(null);

    try {
      const res = await fetch('/api/r2/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          accessKeyId,
          secretAccessKey,
          bucketName,
          publicUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        onRefreshR2Status();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err: any) {
      console.error('Error saving R2 config:', err);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);

    try {
      if (accountId || accessKeyId || secretAccessKey || bucketName) {
        await fetch('/api/r2/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId,
            accessKeyId,
            secretAccessKey,
            bucketName,
            publicUrl,
          }),
        });
      }

      const res = await fetch('/api/r2/test-connection', {
        method: 'POST',
      });
      const data = await res.json();
      setTestResult(data);
      onRefreshR2Status();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test request failed',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-[#c4c6cf] shadow-2xl rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#191c1e]">
        {/* Header */}
        <div className="bg-[#002046] text-white px-6 py-4 flex justify-between items-center border-b border-sky-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-sky-300">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">System Settings & Cloud Storage</h2>
              <p className="text-xs text-sky-200 font-mono">Cloudflare R2 (S3 API) & Database Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f8fafc]">
          {/* Cloudflare R2 Config Card */}
          <div className="bg-white border border-[#c4c6cf] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-[#002046]" />
                <h3 className="text-sm font-bold text-[#002046]">Cloudflare R2 Object Storage (S3 API)</h3>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                r2Status?.configured
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {r2Status?.configured ? 'R2 ACTIVE' : 'CREDENTIALS NEEDED'}
              </span>
            </div>

            <p className="text-xs text-[#545f72] leading-relaxed">
              Connect your Cloudflare R2 bucket for multi-GB CAD & PDF document persistence without egress fees.
            </p>

            <form onSubmit={handleSaveConfig} className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-[#545f72] uppercase tracking-wider mb-1">
                  Cloudflare Account ID
                </label>
                <input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="e.g. 9b8830182402a7b8e192"
                  className="w-full bg-[#f2f4f6] border border-[#c4c6cf] rounded-xl px-3.5 py-2 text-xs font-mono text-[#191c1e] focus:border-[#002046] focus:bg-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#545f72] uppercase tracking-wider mb-1">
                    Access Key ID
                  </label>
                  <input
                    type="text"
                    value={accessKeyId}
                    onChange={(e) => setAccessKeyId(e.target.value)}
                    placeholder="e.g. 79435b62b..."
                    className="w-full bg-[#f2f4f6] border border-[#c4c6cf] rounded-xl px-3.5 py-2 text-xs font-mono text-[#191c1e] focus:border-[#002046] focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#545f72] uppercase tracking-wider mb-1">
                    Secret Access Key
                  </label>
                  <input
                    type="password"
                    value={secretAccessKey}
                    onChange={(e) => setSecretAccessKey(e.target.value)}
                    placeholder="Enter R2 secret key"
                    className="w-full bg-[#f2f4f6] border border-[#c4c6cf] rounded-xl px-3.5 py-2 text-xs font-mono text-[#191c1e] focus:border-[#002046] focus:bg-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#545f72] uppercase tracking-wider mb-1">
                    Bucket Name
                  </label>
                  <input
                    type="text"
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value)}
                    placeholder="e.g. plant-documents"
                    className="w-full bg-[#f2f4f6] border border-[#c4c6cf] rounded-xl px-3.5 py-2 text-xs font-mono text-[#191c1e] focus:border-[#002046] focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#545f72] uppercase tracking-wider mb-1">
                    Public Domain URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={publicUrl}
                    onChange={(e) => setPublicUrl(e.target.value)}
                    placeholder="e.g. https://pub-xxxx.r2.dev"
                    className="w-full bg-[#f2f4f6] border border-[#c4c6cf] rounded-xl px-3.5 py-2 text-xs font-mono text-[#191c1e] focus:border-[#002046] focus:bg-white outline-none"
                  />
                </div>
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-red-50 text-red-800 border-red-300'
                }`}>
                  {testResult.success ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />}
                  <span>{testResult.message}</span>
                </div>
              )}

              {saveSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>R2 Configuration saved successfully.</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="px-4 py-2 bg-white border border-[#c4c6cf] hover:bg-[#e6e8ea] text-[#002046] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                  <span>{testingConnection ? 'Testing...' : 'Test S3 Connection'}</span>
                </button>

                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2 bg-[#002046] hover:bg-[#1b365d] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
                >
                  {savingConfig ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>

          {/* Plant Structure Master Reset Card */}
          <div className="bg-white border border-[#c4c6cf] rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 text-[#ba1a1a]">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-sm font-bold">Document Bank Clean Reset</h3>
            </div>
            <p className="text-xs text-[#545f72] leading-relaxed">
              Reset attached document file lists across all 53 plant structures back to zero for a clean initial deployment. Structure metadata (ST-1 to ST-53) is preserved.
            </p>
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs font-mono text-[#545f72]">Currently attached: {totalFiles} files</span>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to reset all document counts to zero?')) {
                    onResetToZeroFiles();
                  }
                }}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Reset Files to Zero
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#f2f4f6] px-6 py-3 border-t border-[#c4c6cf] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#002046] text-white font-semibold rounded-xl hover:bg-[#1b365d] text-xs transition-colors cursor-pointer"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
