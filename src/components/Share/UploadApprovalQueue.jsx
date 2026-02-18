import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, Upload, User, Clock, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { getPendingUploads, approveUpload, rejectUpload, getShareUploads } from '../../utils/shareApi';
import { getShareImageUrl } from '../../utils/shareApi';

export default function UploadApprovalQueue({ shareConfig, token: shareToken, accessToken, onClose }) {
  const [pendingUploads, setPendingUploads] = useState([]);
  const [approvedUploads, setApprovedUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [showApproved, setShowApproved] = useState(false);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  useEffect(() => {
    loadUploads();
  }, [shareConfig?.id]);

  async function loadUploads() {
    if (!shareConfig?.id) return;
    setLoading(true);

    const [pendingResult, approvedResult] = await Promise.all([
      getPendingUploads(shareConfig.id),
      getShareUploads(shareConfig.id, true),
    ]);

    if (pendingResult.ok) setPendingUploads(pendingResult.uploads);
    if (approvedResult.ok) setApprovedUploads(approvedResult.uploads);

    setLoading(false);
  }

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
    const result = await rejectUpload(upload.id, upload.image_url, accessToken);
    if (result.ok) {
      setPendingUploads(prev => prev.filter(u => u.id !== upload.id));
    }
    setActionLoading(prev => ({ ...prev, [upload.id]: null }));
  }

  async function handleApproveAll() {
    for (const upload of pendingUploads) {
      await handleApprove(upload);
    }
  }

  const totalUploads = pendingUploads.length + approvedUploads.length;

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
                    <button
                      onClick={handleApproveAll}
                      className="text-xs text-green-400 hover:text-green-300 cursor-pointer flex items-center gap-1"
                    >
                      <Check size={12} />
                      Approve All
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {pendingUploads.map(upload => (
                    <UploadCard
                      key={upload.id}
                      upload={upload}
                      shareToken={shareToken}
                      isPending
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
      </div>
    </div>
  );
}

function UploadCard({ upload, shareToken, isPending, actionLoading, onApprove, onReject }) {
  const viewerName = upload.share_viewers?.display_name || 'Unknown';
  const uploadDate = new Date(upload.uploaded_at).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="bg-gray-700/50 rounded-lg overflow-hidden border border-gray-600/50">
      {/* Image preview */}
      <div className="aspect-[3/4] bg-gray-800 relative">
        <img
          src={getShareImageUrl(shareToken, upload.image_url)}
          alt={upload.original_filename || 'Upload'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {isPending && (
          <div className="absolute top-1.5 right-1.5 bg-orange-500/90 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
            Pending
          </div>
        )}
      </div>

      {/* Info & Actions */}
      <div className="p-2.5">
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1.5">
          <User size={10} />
          <span className="truncate">{viewerName}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-2">
          <Clock size={9} />
          <span>{uploadDate}</span>
        </div>

        <div className="flex gap-1.5">
          {isPending && onApprove && (
            <button
              onClick={onApprove}
              disabled={!!actionLoading}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 rounded text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {actionLoading === 'approving' ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Check size={12} />
              )}
              Approve
            </button>
          )}
          {onReject && (
            <button
              onClick={onReject}
              disabled={!!actionLoading}
              className={`flex items-center justify-center gap-1 px-2 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 rounded text-xs text-red-400 transition-colors cursor-pointer disabled:opacity-50 ${isPending ? '' : 'flex-1'}`}
            >
              {actionLoading === 'rejecting' ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Trash2 size={12} />
              )}
              {isPending ? 'Reject' : 'Remove'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
