import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, Loader2, Trash2 } from 'lucide-react';

/**
 * Per-image comment section for shared gallery viewer.
 * Shows existing comments and allows adding new ones.
 */
export default function CommentSection({
  comments = [],
  onAddComment,
  onDeleteComment,
  viewerId,
  loading = false,
}) {
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const commentsEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments.length]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!newComment.trim() || submitting || !onAddComment) return;

    setSubmitting(true);
    await onAddComment(newComment.trim());
    setNewComment('');
    setSubmitting(false);
    inputRef.current?.focus();
  }

  function formatTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Comments list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-gray-400" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle size={32} className="mx-auto mb-2 text-gray-600" />
            <p className="text-sm text-gray-500">No comments yet</p>
            <p className="text-xs text-gray-600 mt-1">Be the first to comment</p>
          </div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="group">
              <div className="flex items-start gap-2.5">
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-purple-600/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-purple-300">
                    {(comment.share_viewers?.display_name || '?')[0].toUpperCase()}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-200 truncate">
                      {comment.share_viewers?.display_name || 'Unknown'}
                    </span>
                    <span className="text-[10px] text-gray-500 shrink-0">
                      {formatTime(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mt-0.5 break-words whitespace-pre-wrap">
                    {comment.comment_text}
                  </p>
                </div>

                {/* Delete button (shown for own comments, or all comments if viewerId is null = owner) */}
                {(viewerId === null || viewerId === comment.viewer_id) && onDeleteComment && (
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600/20 rounded transition-all cursor-pointer shrink-0"
                    title="Delete comment"
                  >
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* Comment input */}
      {onAddComment && (
        <form onSubmit={handleSubmit} className="border-t border-gray-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              maxLength={500}
              className="flex-1 bg-gray-700/50 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 placeholder-gray-500"
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || submitting}
              className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
