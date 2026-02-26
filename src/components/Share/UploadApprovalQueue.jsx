import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Check, Trash2, Upload, User, Clock, Loader2, AlertCircle, ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react';
import { getPendingUploads, approveUpload, rejectUpload, getShareUploads } from '../../utils/shareApi';
import { getShareImageUrl } from '../../utils/shareApi';

export default function UploadApprovalQueue({ shareConfig, token: shareToken, accessToken, ownerId, onClose, embedded = false }) {
  const [pendingUploads, setPendingUploads] = useState([]);
  const [approvedUploads, setApprovedUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [showApproved, setShowApproved] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Prevent body scroll (only when standalone modal)
  useEffect(() => {
    if (embedded) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, [embedded]);

  const pollRef = useRef(null);

  const loadUploads = useCallback(async (silent = false) => {
    if (!shareConfig?.id) return;
    if (!silent) setLoading(true);

    const [pendingResult, approvedResult] = await Promise.all([
      getPendingUploads(shareConfig.id),
      getShareUploads(shareConfig.id, true),
    ]);

    if (pendingResult.ok) setPendingUploads(pendingResult.uploads);
    if (approvedResult.ok) setApprovedUploads(approvedResult.uploads);

    if (!silent) setLoading(false);
  }, [shareConfig?.id]);

  // Initial load + poll every 15s + refresh on tab re-focus
  useEffect(() => {
    loadUploads();

    pollRef.current = setInterval(() => loadUploads(true), 15000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadUploads(true);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(pollRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadUploads]);

  // Clean up selections when pending list changes (remove stale IDs)
  useEffect(() => {
    setSelectedIds(prev => {
      const pendingIds = new Set(pendingUploads.map(u => u.id));
      const filtered = new Set([...prev].filter(id => pendingIds.has(id)));
      if (filtered.size !== prev.size) return filtered;
      return prev;
    });
  }, [pendingUploads]);

  async function handleApprove(upload) {
    setActionLoading(prev => ({ ...prev, [upload.id]: 'approving' }));
    const result = await approveUpload(upload.id);
    if (result.ok) {
      setPendingUploads(prev => prev.filter(u => u.id !== upload.id));
      setApprovedUploads(prev => [upload, ...prev]);
    }
    setActionLoading(prev => ({ ...prev, [upload.id]: null }));
  }

  async function handleReject(upload) {
    setActionLoading(prev => ({ ...prev, [upload.id]: 'rejecting' }));
    const result = await rejectUpload(upload.id, upload.image_url, accessToken, ownerId);
    if (result.ok) {
      setPendingUploads(prev => prev.filter(u => u.id !== upload.id));
    }
    setActionLoading(prev => ({ ...prev, [upload.id]: null }));
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === pendingUploads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingUploads.map(u => u.id)));
    }
  }

  async function handleBulkApprove() {
    const targets = selectedIds.size > 0
      ? pendingUploads.filter(u => selectedIds.has(u.id))
      : pendingUploads;
    for (const upload of targets) {
      await handleApprove(upload);
    }
    setSelectedIds(new Set());
  }

  async function handleBulkReject() {
    const targets = selectedIds.size > 0
      ? pendingUploads.filter(u => selectedIds.has(u.id))
      : pendingUploads;
    for (const upload of targets) {
      await handleReject(upload);
    }
    setSelectedIds(new Set());
  }

  const totalUploads = pendingUploads.length + approvedUploads.length;
  const hasSelection = selectedIds.size > 0;
  const allSelected = pendingUploads.length > 0 && selectedIds.size === pendingUploads.length;

  const content = (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
        </div>
      ) : totalUploads === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Upload size={48} className="mx-auto mb-4 opacity-50" />
          <p>No uploads yet</p>
          <p className="text-xs mt-1">Viewer uploads will appear here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Uploads */}
          {pendingUploads.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-orange-400 flex items-center gap-2">
                  <AlertCircle size={14} />
                  Pending Approval ({pendingUploads.length})
                </h3>
                {pendingUploads.length > 1 && (
                  <div className="flex items-center gap-1 sm:gap-3">
                    <button
                      onClick={toggleSelectAll}
                      className="text-xs text-gray-400 hover:text-gray-300 cursor-pointer flex items-center gap-1 p-2 sm:p-0 rounded-lg sm:rounded-none bg-gray-700 sm:bg-transparent"
                    >
                      {allSelected ? <CheckSquare size={16} className="sm:w-3 sm:h-3" /> : <Square size={16} className="sm:w-3 sm:h-3" />}
                      <span className="hidden sm:inline">{allSelected ? 'Deselect All' : 'Select All'}</span>
                    </button>
                    <button
                      onClick={handleBulkApprove}
                      className="text-xs text-green-400 hover:text-green-300 cursor-pointer flex items-center gap-1 p-2 sm:p-0 rounded-lg sm:rounded-none bg-green-600/20 sm:bg-transparent"
                    >
                      <Check size={16} className="sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">{hasSelection ? `Approve (${selectedIds.size})` : 'Approve All'}</span>
                      {hasSelection && <span className="sm:hidden text-[11px]">{selectedIds.size}</span>}
                    </button>
                    <button
                      onClick={handleBulkReject}
                      className="text-xs text-red-400 hover:text-red-300 cursor-pointer flex items-center gap-1 p-2 sm:p-0 rounded-lg sm:rounded-none bg-red-600/20 sm:bg-transparent"
                    >
                      <Trash2 size={16} className="sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">{hasSelection ? `Reject (${selectedIds.size})` : 'Reject All'}</span>
                      {hasSelection && <span className="sm:hidden text-[11px]">{selectedIds.size}</span>}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {pendingUploads.map(upload => (
                  <UploadCard
                    key={upload.id}
                    upload={upload}
                    shareToken={shareToken}
                    isPending
                    selected={selectedIds.has(upload.id)}
                    onToggleSelect={() => toggleSelect(upload.id)}
                    actionLoading={actionLoading[upload.id]}
                    onApprove={() => handleApprove(upload)}
                    onReject={() => handleReject(upload)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Approved Uploads */}
          {approvedUploads.length > 0 && (
            <div>
              <button
                onClick={() => setShowApproved(!showApproved)}
                className="flex items-center gap-2 text-sm font-semibold text-green-400 cursor-pointer mb-3"
              >
                <Check size={14} />
                Approved ({approvedUploads.length})
                {showApproved ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showApproved && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {approvedUploads.map(upload => (
                    <UploadCard
                      key={upload.id}
                      upload={upload}
                      shareToken={shareToken}
                      actionLoading={actionLoading[upload.id]}
                      onReject={() => handleReject(upload)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Upload size={22} className="text-green-400" />
            Viewer Uploads
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {content}
      </div>
    </div>
  );
}

function UploadCard({ upload, shareToken, isPending, selected, onToggleSelect, actionLoading, onApprove, onReject }) {
  const viewerName = upload.share_viewers?.display_name || 'Unknown';
  const uploadDate = new Date(upload.uploaded_at).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className={`bg-gray-700/50 rounded-lg overflow-hidden border ${selected ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-600/50'}`}>
      {/* Image preview */}
      <div className="aspect-[3/4] bg-gray-800 relative">
        <img
          src={getShareImageUrl(shareToken, upload.image_url)}
          alt={upload.original_filename || 'Upload'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {isPending && onToggleSelect && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
            className="absolute top-1.5 left-1.5 w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-colors bg-black/50 hover:bg-black/70"
          >
            {selected ? (
              <CheckSquare size={14} className="text-blue-400" />
            ) : (
              <Square size={14} className="text-gray-300" />
            )}
          </button>
        )}
        {isPending && (
          <div className="absolute top-1.5 right-1.5 bg-orange-500/90 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
            Pending
          </div>
        )}
      </div>

      {/* Info & Actions */}
      <div className="p-2 min-w-0">
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1.5">
          <User size={10} className="shrink-0" />
          <span className="truncate">{viewerName}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-2">
          <Clock size={9} className="shrink-0" />
          <span>{uploadDate}</span>
        </div>

        <div className="flex gap-1 min-w-0">
          {isPending && onApprove && (
            <button
              onClick={onApprove}
              disabled={!!actionLoading}
              className="flex-1 min-w-0 flex items-center justify-center gap-1 px-1.5 py-1.5 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {actionLoading === 'approving' ? (
                <Loader2 size={12} className="animate-spin shrink-0" />
              ) : (
                <Check size={12} className="shrink-0" />
              )}
              <span className="hidden sm:inline truncate">Approve</span>
            </button>
          )}
          {onReject && (
            <button
              onClick={onReject}
              disabled={!!actionLoading}
              className="flex-1 min-w-0 flex items-center justify-center gap-1 px-1.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 rounded text-xs text-red-400 transition-colors cursor-pointer disabled:opacity-50"
            >
              {actionLoading === 'rejecting' ? (
                <Loader2 size={12} className="animate-spin shrink-0" />
              ) : (
                <Trash2 size={12} className="shrink-0" />
              )}
              <span className="hidden sm:inline truncate">{isPending ? 'Reject' : 'Remove'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
