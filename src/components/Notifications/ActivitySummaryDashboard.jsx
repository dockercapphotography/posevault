import React, { useState, useEffect } from 'react';
import { X, BarChart3, Eye, Heart, Upload, MessageCircle, Users, Clock, Image, ChevronDown, ChevronUp } from 'lucide-react';
import { getActivitySummary } from '../../utils/notificationApi';
import { getShareImageUrl } from '../../utils/shareApi';

function formatTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function ActivitySummaryDashboard({ shareConfig, token, onClose, embedded = false }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [showViewers, setShowViewers] = useState(false);

  // Prevent body scroll (only when standalone modal)
  useEffect(() => {
    if (embedded) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, [embedded]);

  useEffect(() => {
    loadSummary();
  }, [shareConfig?.id]);

  async function loadSummary() {
    if (!shareConfig?.id) return;
    setLoading(true);
    const result = await getActivitySummary(shareConfig.id);
    if (result.ok) {
      setSummary(result.summary);
    }
    setLoading(false);
  }

  const content = (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      ) : !summary ? (
        <p className="text-gray-400 text-sm text-center py-8">Failed to load activity data.</p>
      ) : (
        <div className="space-y-4">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard icon={Eye} color="text-blue-400" bg="bg-blue-400/10" label="Total Views" value={summary.totalViews} />
            <StatCard icon={Users} color="text-teal-400" bg="bg-teal-400/10" label="Unique Viewers" value={summary.uniqueViewers} />
            <StatCard icon={Heart} color="text-red-400" bg="bg-red-400/10" label="Total Favorites" value={summary.totalFavorites} />
            <StatCard icon={Upload} color="text-green-400" bg="bg-green-400/10" label="Approved Uploads" value={summary.approvedUploads} />
            {summary.pendingUploads > 0 && (
              <StatCard icon={Clock} color="text-orange-400" bg="bg-orange-400/10" label="Pending Uploads" value={summary.pendingUploads} highlight />
            )}
            <StatCard icon={MessageCircle} color="text-purple-400" bg="bg-purple-400/10" label="Comments" value={summary.totalComments} />
          </div>

          {/* Most-favorited images */}
          {summary.mostFavorited.length > 0 && (
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Heart size={14} className="text-red-400" />
                Most Favorited
              </h3>
              <div className="space-y-2">
                {summary.mostFavorited.map(({ imageId, count, r2Key }, i) => (
                  <div key={imageId} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-4 text-right">{i + 1}.</span>
                    {token && r2Key ? (
                      <div className="w-10 h-10 rounded bg-gray-600 overflow-hidden shrink-0">
                        <img
                          src={getShareImageUrl(token, r2Key)}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-600 flex items-center justify-center shrink-0">
                        <Image size={14} className="text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 truncate">Image #{imageId}</p>
                    </div>
                    <div className="flex items-center gap-1 text-red-400">
                      <Heart size={12} />
                      <span className="text-xs font-medium">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Viewers list */}
          {summary.viewers.length > 0 && (
            <div className="bg-gray-700/50 rounded-lg p-4">
              <button
                onClick={() => setShowViewers(!showViewers)}
                className="w-full flex items-center justify-between cursor-pointer"
              >
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Users size={14} className="text-teal-400" />
                  Viewers ({summary.viewers.length})
                </h3>
                {showViewers ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>

              {showViewers && (
                <div className="mt-3 space-y-2">
                  {summary.viewers.map(v => (
                    <div key={v.id} className="flex items-center justify-between bg-gray-600/50 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{v.displayName}</p>
                        <p className="text-[11px] text-gray-400">Joined {formatTimeAgo(v.joinedAt)}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {v.favoriteCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Heart size={10} className="text-red-400" />
                            {v.favoriteCount}
                          </span>
                        )}
                        {v.uploadCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Upload size={10} className="text-green-400" />
                            {v.uploadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent comments */}
          {summary.recentComments.length > 0 && (
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <MessageCircle size={14} className="text-purple-400" />
                Recent Comments
              </h3>
              <div className="space-y-2">
                {summary.recentComments.map(c => (
                  <div key={c.id} className="bg-gray-600/50 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-blue-300">{c.viewerName}</span>
                      <span className="text-[11px] text-gray-500">{formatTimeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-2">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {summary.totalViews === 0 && summary.uniqueViewers === 0 && (
            <div className="text-center py-6">
              <BarChart3 size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No activity yet</p>
              <p className="text-gray-600 text-xs mt-1">Share your gallery to start seeing activity here</p>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-400" />
            Activity Dashboard
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {content}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, color, bg, label, value, highlight = false }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-orange-900/20 border border-orange-600/30' : 'bg-gray-700/50'}`}>
      <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center mb-2`}>
        <Icon size={14} className={color} />
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[11px] text-gray-400">{label}</p>
    </div>
  );
}
