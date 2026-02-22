import React, { useState, useEffect } from 'react';
import { X, Share2, Link, Copy, Check, Lock, Clock, RefreshCw, Trash2, ToggleLeft, ToggleRight, Eye, EyeOff, Heart, Upload, ShieldCheck, Inbox, MessageCircle, BarChart3 } from 'lucide-react';
import ActivitySummaryDashboard from '../Notifications/ActivitySummaryDashboard';
import {
  createShareLink,
  getShareConfig,
  updateShareConfig,
  setSharePassword,
  deactivateShare,
  reactivateShare,
  deleteShareLink,
  regenerateShareToken,
  getPendingUploads,
} from '../../utils/shareApi';
import UploadApprovalQueue from './UploadApprovalQueue';

const EXPIRATION_OPTIONS = [
  { label: 'Never', value: null },
  { label: '24 hours', value: 24 * 60 * 60 * 1000 },
  { label: '7 days', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 days', value: 30 * 24 * 60 * 60 * 1000 },
];

export default function ShareConfigModal({ category, userId, accessToken, onClose }) {
  const [loading, setLoading] = useState(true);
  const [shareConfig, setShareConfig] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Expiration state
  const [expirationChoice, setExpirationChoice] = useState(null);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Upload approval queue
  const [showApprovalQueue, setShowApprovalQueue] = useState(false);
  const [pendingUploadCount, setPendingUploadCount] = useState(0);

  // Activity dashboard
  const [showActivityDashboard, setShowActivityDashboard] = useState(false);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  // Load existing share config
  useEffect(() => {
    loadShareConfig();
  }, [category?.supabaseUid]);

  async function loadShareConfig() {
    setLoading(true);
    const result = await getShareConfig(category.supabaseUid);
    if (result.ok && result.data) {
      setShareConfig(result.data);
      // Set expiration choice based on existing config
      if (result.data.expires_at) {
        setExpirationChoice('custom');
      }
      // Load pending upload count if uploads are enabled
      if (result.data.allow_uploads) {
        loadPendingCount(result.data.id);
      }
    }
    setLoading(false);
  }

  async function loadPendingCount(shareId) {
    const result = await getPendingUploads(shareId);
    if (result.ok) {
      setPendingUploadCount(result.uploads.length);
    }
  }

  async function handleCreateLink() {
    setError('');
    setLoading(true);
    const result = await createShareLink(category.supabaseUid, userId);
    if (result.ok) {
      setShareConfig(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  async function handleCopyLink() {
    if (!shareConfig) return;
    const url = `${window.location.origin}/share/${shareConfig.share_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-secure contexts
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleToggleActive() {
    if (!shareConfig) return;
    setError('');
    const result = shareConfig.is_active
      ? await deactivateShare(shareConfig.id)
      : await reactivateShare(shareConfig.id);
    if (result.ok) {
      setShareConfig(result.data);
    } else {
      setError(result.error);
    }
  }

  async function handleSetPassword() {
    if (!shareConfig) return;
    setError('');

    if (newPassword && newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const result = await setSharePassword(shareConfig.id, newPassword || null);
    if (result.ok) {
      setShareConfig(result.data);
      setShowPasswordForm(false);
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(result.error);
    }
  }

  async function handleRemovePassword() {
    if (!shareConfig) return;
    setError('');
    const result = await setSharePassword(shareConfig.id, null);
    if (result.ok) {
      setShareConfig(result.data);
    } else {
      setError(result.error);
    }
  }

  async function handleExpirationChange(value) {
    if (!shareConfig) return;
    setError('');

    const expiresAt = value ? new Date(Date.now() + value).toISOString() : null;
    const result = await updateShareConfig(shareConfig.id, { expires_at: expiresAt });
    if (result.ok) {
      setShareConfig(result.data);
      setExpirationChoice(value);
    } else {
      setError(result.error);
    }
  }

  async function handleTogglePermission(field) {
    if (!shareConfig) return;
    setError('');
    const result = await updateShareConfig(shareConfig.id, { [field]: !shareConfig[field] });
    if (result.ok) {
      setShareConfig(result.data);
    } else {
      setError(result.error);
    }
  }

  async function handleRegenerateToken() {
    if (!shareConfig) return;
    setError('');
    const result = await regenerateShareToken(shareConfig.id);
    if (result.ok) {
      setShareConfig(result.data);
    } else {
      setError(result.error);
    }
  }

  async function handleDelete() {
    if (!shareConfig) return;
    setError('');
    const result = await deleteShareLink(shareConfig.id);
    if (result.ok) {
      setShareConfig(null);
      setShowDeleteConfirm(false);
    } else {
      setError(result.error);
    }
  }

  const shareUrl = shareConfig
    ? `${window.location.origin}/share/${shareConfig.share_token}`
    : '';

  const isExpired = shareConfig?.expires_at && new Date(shareConfig.expires_at) < new Date();
  const hasPassword = !!shareConfig?.password_hash;

  // Guard: gallery must be synced to cloud before sharing
  if (!category?.supabaseUid) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full shadow-2xl border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Share2 size={22} className="text-blue-400" />
              Share Gallery
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer">
              <X size={24} />
            </button>
          </div>
          <p className="text-gray-400 text-sm mb-4">
            This gallery hasn't synced to the cloud yet. Please wait for the sync to complete, then try again.
          </p>
          <button onClick={onClose} className="w-full bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors cursor-pointer">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Share2 size={22} className="text-blue-400" />
            Share Gallery
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-5">
          Share <span className="text-white font-medium">{category?.name}</span> with anyone via a link.
          Viewers can browse your poses without a PoseVault account.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          </div>
        ) : !shareConfig ? (
          /* No share link exists yet */
          <div className="text-center py-8">
            <Share2 size={48} className="text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No share link yet for this gallery.</p>
            <button
              onClick={handleCreateLink}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-lg transition-colors cursor-pointer font-medium"
            >
              Generate Share Link
            </button>
          </div>
        ) : (
          /* Share link exists */
          <div className="space-y-4">
            {/* Share Link */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <label className="text-sm font-semibold text-gray-300 mb-2 block flex items-center gap-2">
                <Link size={14} />
                Share Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-mono truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-3 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-sm font-medium ${
                    copied
                      ? 'bg-green-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                shareConfig.is_active && !isExpired
                  ? 'bg-green-600/20 text-green-400'
                  : 'bg-red-600/20 text-red-400'
              }`}>
                {isExpired ? 'Expired' : shareConfig.is_active ? 'Active' : 'Inactive'}
              </span>
              {hasPassword && (
                <span className="bg-orange-600/20 text-orange-400 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <Lock size={10} />
                  Password Protected
                </span>
              )}
              {shareConfig.expires_at && !isExpired && (
                <span className="bg-blue-600/20 text-blue-400 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <Clock size={10} />
                  Expires {new Date(shareConfig.expires_at).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Active Toggle */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <button
                onClick={handleToggleActive}
                className="w-full flex items-center justify-between cursor-pointer"
              >
                <div className="text-left">
                  <p className="font-medium text-sm">Link Active</p>
                  <p className="text-xs text-gray-400">
                    {shareConfig.is_active ? 'Viewers can access this gallery' : 'Viewers will see "Gallery Not Found" if accessed'}
                  </p>
                </div>
                {shareConfig.is_active ? (
                  <ToggleRight size={28} className="text-green-400" />
                ) : (
                  <ToggleLeft size={28} className="text-gray-500" />
                )}
              </button>
            </div>

            {/* Password Protection */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-orange-400" />
                  <p className="font-medium text-sm">Password Protection</p>
                </div>
                {hasPassword ? (
                  <span className="text-xs text-green-400">Enabled</span>
                ) : (
                  <span className="text-xs text-gray-500">Off</span>
                )}
              </div>

              {!showPasswordForm && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="text-sm text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    {hasPassword ? 'Change Password' : 'Set Password'}
                  </button>
                  {hasPassword && (
                    <button
                      onClick={handleRemovePassword}
                      className="text-sm text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}

              {showPasswordForm && (
                <div className="mt-3 space-y-2">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                    placeholder="Enter password"
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  {newPassword && (
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                      placeholder="Confirm password"
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSetPassword}
                      disabled={!newPassword}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setShowPasswordForm(false); setNewPassword(''); setConfirmPassword(''); setError(''); }}
                      className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Expiration */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-blue-400" />
                <p className="font-medium text-sm">Expiration</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {EXPIRATION_OPTIONS.map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => handleExpirationChange(value)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      (expirationChoice === value || (!expirationChoice && !value && !shareConfig.expires_at))
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {shareConfig.expires_at && (
                <p className="text-xs text-gray-400 mt-2">
                  {isExpired
                    ? `Expired on ${new Date(shareConfig.expires_at).toLocaleString()}`
                    : `Expires on ${new Date(shareConfig.expires_at).toLocaleString()}`
                  }
                </p>
              )}
            </div>

            {/* Viewer Permissions */}
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
              <p className="font-medium text-sm mb-1">Viewer Permissions</p>

              {/* Allow Favorites */}
              <button
                onClick={() => handleTogglePermission('allow_favorites')}
                className="w-full flex items-center justify-between cursor-pointer"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <Heart size={14} className="text-red-400" />
                    <p className="text-sm">Allow Favorites</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 ml-6">Viewers can mark poses as favorites</p>
                </div>
                {shareConfig.allow_favorites ? (
                  <ToggleRight size={28} className="text-green-400 shrink-0" />
                ) : (
                  <ToggleLeft size={28} className="text-gray-500 shrink-0" />
                )}
              </button>

              {/* Favorites Visible to Others */}
              {shareConfig.allow_favorites && (
                <button
                  onClick={() => handleTogglePermission('favorites_visible_to_others')}
                  className="w-full flex items-center justify-between cursor-pointer"
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      {shareConfig.favorites_visible_to_others ? (
                        <Eye size={14} className="text-blue-400" />
                      ) : (
                        <EyeOff size={14} className="text-gray-400" />
                      )}
                      <p className="text-sm">Favorites Visible to Others</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 ml-6">
                      {shareConfig.favorites_visible_to_others
                        ? 'Viewers can see how many people favorited each pose'
                        : 'Each viewer only sees their own favorites'}
                    </p>
                  </div>
                  {shareConfig.favorites_visible_to_others ? (
                    <ToggleRight size={28} className="text-green-400 shrink-0" />
                  ) : (
                    <ToggleLeft size={28} className="text-gray-500 shrink-0" />
                  )}
                </button>
              )}

              {/* Divider */}
              <div className="border-t border-gray-600 my-1"></div>

              {/* Allow Uploads */}
              <button
                onClick={() => handleTogglePermission('allow_uploads')}
                className="w-full flex items-center justify-between cursor-pointer"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <Upload size={14} className="text-green-400" />
                    <p className="text-sm">Allow Uploads</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 ml-6">Viewers can upload pose reference images</p>
                </div>
                {shareConfig.allow_uploads ? (
                  <ToggleRight size={28} className="text-green-400 shrink-0" />
                ) : (
                  <ToggleLeft size={28} className="text-gray-500 shrink-0" />
                )}
              </button>

              {/* Upload sub-settings (only shown if uploads enabled) */}
              {shareConfig.allow_uploads && (
                <>
                  {/* Require Approval */}
                  <button
                    onClick={() => handleTogglePermission('require_upload_approval')}
                    className="w-full flex items-center justify-between cursor-pointer"
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-orange-400" />
                        <p className="text-sm">Require Approval</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 ml-6">
                        {shareConfig.require_upload_approval
                          ? 'Uploads need your approval before appearing'
                          : 'Uploads appear immediately in the gallery'}
                      </p>
                    </div>
                    {shareConfig.require_upload_approval ? (
                      <ToggleRight size={28} className="text-green-400 shrink-0" />
                    ) : (
                      <ToggleLeft size={28} className="text-gray-500 shrink-0" />
                    )}
                  </button>

                  {/* Max Upload Size */}
                  <div className="ml-6">
                    <p className="text-xs text-gray-400 mb-1.5">Max file size per upload</p>
                    <div className="flex gap-2">
                      {[5, 10, 25, 50].map(size => (
                        <button
                          key={size}
                          onClick={() => updateShareConfig(shareConfig.id, { max_upload_size_mb: size }).then(r => r.ok && setShareConfig(r.data))}
                          className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                            shareConfig.max_upload_size_mb === size
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                          }`}
                        >
                          {size}MB
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Max Uploads Per Viewer */}
                  <div className="ml-6">
                    <p className="text-xs text-gray-400 mb-1.5">Max uploads per viewer</p>
                    <div className="flex gap-2">
                      {[
                        { label: 'Unlimited', value: null },
                        { label: '5', value: 5 },
                        { label: '10', value: 10 },
                        { label: '20', value: 20 },
                      ].map(({ label, value }) => (
                        <button
                          key={label}
                          onClick={() => updateShareConfig(shareConfig.id, { max_uploads_per_viewer: value }).then(r => r.ok && setShareConfig(r.data))}
                          className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                            shareConfig.max_uploads_per_viewer === value
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Divider */}
              <div className="border-t border-gray-600 my-1"></div>

              {/* Allow Comments */}
              <button
                onClick={() => handleTogglePermission('allow_comments')}
                className="w-full flex items-center justify-between cursor-pointer"
              >
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={14} className="text-purple-400" />
                    <p className="text-sm">Allow Comments</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 ml-6">Viewers can leave comments on individual images</p>
                </div>
                {shareConfig.allow_comments ? (
                  <ToggleRight size={28} className="text-green-400 shrink-0" />
                ) : (
                  <ToggleLeft size={28} className="text-gray-500 shrink-0" />
                )}
              </button>
            </div>

            {/* Upload Approval Queue Button */}
            {shareConfig.allow_uploads && (
              <button
                onClick={() => setShowApprovalQueue(true)}
                className="w-full flex items-center gap-2 px-4 py-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-sm transition-colors cursor-pointer"
              >
                <Inbox size={16} className="text-green-400" />
                <span>View Uploads</span>
                {pendingUploadCount > 0 && (
                  <span className="ml-auto bg-orange-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                    {pendingUploadCount}
                  </span>
                )}
                {pendingUploadCount === 0 && (
                  <span className="text-xs text-gray-400 ml-auto">No pending</span>
                )}
              </button>
            )}

            {/* Activity Dashboard Button */}
            <button
              onClick={() => setShowActivityDashboard(true)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-sm transition-colors cursor-pointer"
            >
              <BarChart3 size={16} className="text-blue-400" />
              <span>Activity Dashboard</span>
              <span className="text-xs text-gray-400 ml-auto">Views, favorites, comments</span>
            </button>

            {/* Advanced Actions */}
            <div className="border-t border-gray-700 pt-4 space-y-2">
              <button
                onClick={handleRegenerateToken}
                className="w-full flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors cursor-pointer"
              >
                <RefreshCw size={14} />
                Generate New Link
                <span className="text-xs text-gray-400 ml-auto">Invalidates current link</span>
              </button>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-red-900/20 hover:bg-red-900/30 border border-red-600/30 rounded-lg text-sm text-red-400 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                  Delete Share Link
                </button>
              ) : (
                <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3">
                  <p className="text-sm text-red-300 mb-3">
                    This will permanently delete the share link and all viewer data. Are you sure?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      className="px-4 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-1.5 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm mt-3">{error}</p>
        )}
      </div>

      {/* Upload Approval Queue Modal */}
      {showApprovalQueue && shareConfig && (
        <UploadApprovalQueue
          shareConfig={shareConfig}
          token={shareConfig.share_token}
          accessToken={accessToken}
          ownerId={userId}
          onClose={() => {
            setShowApprovalQueue(false);
            // Refresh pending count
            if (shareConfig?.id) loadPendingCount(shareConfig.id);
          }}
        />
      )}

      {/* Activity Summary Dashboard Modal */}
      {showActivityDashboard && shareConfig && (
        <ActivitySummaryDashboard
          shareConfig={shareConfig}
          token={shareConfig.share_token}
          onClose={() => setShowActivityDashboard(false)}
        />
      )}
    </div>
  );
}
