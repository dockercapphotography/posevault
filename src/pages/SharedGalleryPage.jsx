import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, Clock, LinkIcon } from 'lucide-react';
import SharePasswordGate from '../components/Share/SharePasswordGate';
import NameEntryGate from '../components/Share/NameEntryGate';
import SharedGalleryViewer from '../components/Share/SharedGalleryViewer';
import { convertToWebP } from '../utils/imageOptimizer';
import {
  validateShareToken,
  verifySharePassword,
  fetchSharedGalleryData,
  getOrCreateViewer,
  checkExistingSession,
  logShareAccess,
  getViewerFavorites,
  getAllFavoriteCounts,
  toggleShareFavorite,
  uploadToSharedGallery,
  getShareUploads,
  getViewerUploadCount,
  addShareComment,
  getCommentsForImage,
  getCommentCounts,
  deleteShareComment,
} from '../utils/shareApi';

function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) { u8arr[n] = bstr.charCodeAt(n); }
  return new Blob([u8arr], { type: mime });
}

/**
 * Top-level page for /share/:token routes.
 * Orchestrates: token validation → password gate → name entry → gallery viewer.
 */
export default function SharedGalleryPage({ token }) {
  // Flow state: 'loading' | 'error' | 'password' | 'name' | 'ready'
  const [stage, setStage] = useState('loading');
  const [error, setError] = useState(null);
  const [passwordError, setPasswordError] = useState('');

  // Share metadata
  const [shareInfo, setShareInfo] = useState(null);

  // Gallery data (from edge function)
  const [galleryData, setGalleryData] = useState(null);

  // Viewer session
  const [viewer, setViewer] = useState(null);

  // Favorites state
  const [favorites, setFavorites] = useState(new Set());
  const [favoriteCounts, setFavoriteCounts] = useState({});

  // Uploads state
  const [uploads, setUploads] = useState([]);
  const [uploadState, setUploadState] = useState(null);

  // Comments state
  const [commentCounts, setCommentCounts] = useState({});
  const [currentImageComments, setCurrentImageComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    initializeShare();
  }, [token]);

  async function initializeShare() {
    setStage('loading');
    setError(null);

    // Step 1: Validate the share token
    const validation = await validateShareToken(token);
    if (!validation.ok) {
      setError(validation.error);
      setStage('error');
      return;
    }

    setShareInfo(validation.data);

    // Step 2: Check if password is needed
    if (validation.data.needsPassword) {
      // Check if we already verified password this session
      const passwordVerified = sessionStorage.getItem(`share_pw_${token}`);
      if (!passwordVerified) {
        setStage('password');
        return;
      }
    }

    // Step 3: Load gallery data and check viewer session
    await loadGalleryAndViewer(validation.data);
  }

  async function loadGalleryAndViewer(info) {
    // Fetch gallery data from edge function
    const galleryResult = await fetchSharedGalleryData(token, info.galleryId, info.ownerId);
    if (!galleryResult.ok) {
      setError(galleryResult.error);
      setStage('error');
      return;
    }

    setGalleryData(galleryResult.data);

    // Check for existing viewer session
    const existingSession = await checkExistingSession(info.id);
    if (existingSession.ok) {
      setViewer(existingSession.data);
      setStage('ready');

      // Log return visit
      logShareAccess(info.id, existingSession.data.id, 'view_gallery');
      return;
    }

    // Need name entry
    setStage('name');
  }

  async function handlePasswordSubmit(password) {
    setPasswordError('');

    const result = await verifySharePassword(token, password);
    if (!result.ok) {
      if (result.error === 'password_incorrect') {
        setPasswordError('Incorrect password. Please try again.');
      } else {
        setPasswordError('Something went wrong. Please try again.');
      }
      return;
    }

    // Mark password as verified for this browser session
    sessionStorage.setItem(`share_pw_${token}`, 'true');

    // Continue to gallery/name
    await loadGalleryAndViewer(shareInfo);
  }

  async function handleNameSubmit(displayName) {
    const result = await getOrCreateViewer(shareInfo.id, displayName);
    if (!result.ok) {
      setError('Failed to create your session. Please try again.');
      return;
    }

    setViewer(result.data);
    setStage('ready');

    // Log first visit
    logShareAccess(shareInfo.id, result.data.id, 'view_gallery');
  }

  // Load favorites when viewer is ready
  useEffect(() => {
    if (stage !== 'ready' || !viewer || !shareInfo) return;
    if (!shareInfo.allowFavorites) return;

    loadFavorites();
  }, [stage, viewer?.id, shareInfo?.id]);

  // Load uploads when viewer is ready and uploads are enabled
  useEffect(() => {
    if (stage !== 'ready' || !shareInfo?.allowUploads) return;

    loadUploads();
  }, [stage, shareInfo?.id, shareInfo?.allowUploads]);

  // Auto-refresh: poll for new images and uploads every 30 seconds
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    if (stage !== 'ready' || !shareInfo) return;

    const pollData = async () => {
      // Silently refresh gallery images
      const galleryResult = await fetchSharedGalleryData(token, shareInfo.galleryId, shareInfo.ownerId);
      if (galleryResult.ok) {
        setGalleryData(galleryResult.data);
      }

      // Refresh uploads if enabled
      if (shareInfo.allowUploads) {
        const uploadsResult = await getShareUploads(shareInfo.id, true);
        if (uploadsResult.ok) {
          setUploads(uploadsResult.uploads);
        }
      }

      // Refresh favorites if enabled
      if (shareInfo.allowFavorites && viewer) {
        const viewerResult = await getViewerFavorites(shareInfo.id, viewer.id);
        if (viewerResult.ok) {
          setFavorites(viewerResult.favorites);
        }
        if (shareInfo.favoritesVisibleToOthers) {
          const countsResult = await getAllFavoriteCounts(shareInfo.id);
          if (countsResult.ok) {
            setFavoriteCounts(countsResult.counts);
          }
        }
      }

      // Refresh comment counts if enabled
      if (shareInfo.allowComments) {
        const commentCountsResult = await getCommentCounts(shareInfo.id);
        if (commentCountsResult.ok) {
          setCommentCounts(commentCountsResult.counts);
        }
      }
    };

    pollIntervalRef.current = setInterval(pollData, 30000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [stage, shareInfo?.id, viewer?.id]);

  async function loadFavorites() {
    const viewerResult = await getViewerFavorites(shareInfo.id, viewer.id);
    if (viewerResult.ok) {
      setFavorites(viewerResult.favorites);
    }

    if (shareInfo.favoritesVisibleToOthers) {
      const countsResult = await getAllFavoriteCounts(shareInfo.id);
      if (countsResult.ok) {
        setFavoriteCounts(countsResult.counts);
      }
    }
  }

  async function loadUploads() {
    // Viewers only see approved uploads
    const result = await getShareUploads(shareInfo.id, true);
    if (result.ok) {
      setUploads(result.uploads);
    }
  }

  // Load comment counts when viewer is ready and comments are enabled
  useEffect(() => {
    if (stage !== 'ready' || !shareInfo?.allowComments) return;

    loadCommentCounts();
  }, [stage, shareInfo?.id, shareInfo?.allowComments]);

  async function loadCommentCounts() {
    const result = await getCommentCounts(shareInfo.id);
    if (result.ok) {
      setCommentCounts(result.counts);
    }
  }

  async function loadCommentsForImage(imageId) {
    if (!shareInfo?.allowComments) return;
    setLoadingComments(true);
    const result = await getCommentsForImage(shareInfo.id, imageId);
    if (result.ok) {
      setCurrentImageComments(result.comments);
    }
    setLoadingComments(false);
  }

  async function handleAddComment(imageId, commentText) {
    if (!viewer || !shareInfo?.allowComments) return;

    const result = await addShareComment(shareInfo.id, imageId, viewer.id, commentText);
    if (result.ok) {
      // Add to current comments list
      setCurrentImageComments(prev => [...prev, result.comment]);
      // Update count
      setCommentCounts(prev => ({
        ...prev,
        [imageId]: (prev[imageId] || 0) + 1,
      }));
      // Log the action
      logShareAccess(shareInfo.id, viewer.id, 'comment', imageId);
    }
  }

  async function handleDeleteComment(commentId) {
    const comment = currentImageComments.find(c => c.id === commentId);
    if (!comment) return;

    const result = await deleteShareComment(commentId);
    if (result.ok) {
      setCurrentImageComments(prev => prev.filter(c => c.id !== commentId));
      setCommentCounts(prev => ({
        ...prev,
        [comment.image_id]: Math.max(0, (prev[comment.image_id] || 0) - 1),
      }));
    }
  }

  async function handleToggleFavorite(imageId) {
    if (!viewer || !shareInfo?.allowFavorites) return;

    // Optimistic update
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(imageId)) {
        next.delete(imageId);
      } else {
        next.add(imageId);
      }
      return next;
    });

    // Optimistic count update
    if (shareInfo.favoritesVisibleToOthers) {
      setFavoriteCounts(prev => {
        const wasFavorited = favorites.has(imageId);
        const current = prev[imageId] || 0;
        return {
          ...prev,
          [imageId]: wasFavorited ? Math.max(0, current - 1) : current + 1,
        };
      });
    }

    // Sync to DB
    const result = await toggleShareFavorite(shareInfo.id, imageId, viewer.id);
    if (!result.ok) {
      // Revert on failure
      loadFavorites();
    } else {
      // Log the action
      logShareAccess(shareInfo.id, viewer.id, result.isFavorite ? 'favorite' : 'unfavorite', imageId);
    }
  }

  const handleUpload = useCallback(async (files) => {
    if (!viewer || !shareInfo?.allowUploads) return;

    const fileArray = Array.isArray(files) ? files : [files];

    // Pre-check upload limit before sending any files
    const maxUploads = shareInfo.maxUploadsPerViewer;
    let filesToUpload = fileArray;
    if (maxUploads != null) {
      const currentCount = await getViewerUploadCount(shareInfo.id, viewer.id);
      const remaining = Math.max(0, maxUploads - currentCount);
      if (remaining === 0) {
        setUploadState({ status: 'error', message: `Upload limit reached (${maxUploads} max)` });
        setTimeout(() => setUploadState(null), 5000);
        return;
      }
      if (fileArray.length > remaining) {
        filesToUpload = fileArray.slice(0, remaining);
        // We'll show a warning after uploads complete
      }
    }

    const total = filesToUpload.length;
    let succeeded = 0;
    let lastApproved = true;

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      setUploadState({
        status: 'uploading',
        message: total > 1
          ? `Optimizing & uploading ${i + 1} of ${total}...`
          : `Optimizing & uploading ${file.name}...`,
      });

      // Compress and convert to webp (same as regular gallery uploads)
      let optimizedFile = file;
      try {
        const webpDataUrl = await convertToWebP(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.85,
        });
        const blob = dataURLtoBlob(webpDataUrl);
        const webpName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
        optimizedFile = new File([blob], webpName, { type: 'image/webp' });
      } catch (err) {
        console.warn('WebP conversion failed, uploading original:', err);
      }

      const result = await uploadToSharedGallery(
        token,
        shareInfo.id,
        viewer.id,
        optimizedFile,
        shareInfo.maxUploadSizeMb || 10,
      );

      if (!result.ok) {
        setUploadState({ status: 'error', message: result.error });
        setTimeout(() => setUploadState(null), 5000);
        return;
      }

      succeeded++;
      lastApproved = result.data?.approved !== false;
      logShareAccess(shareInfo.id, viewer.id, 'upload');
    }

    const skipped = fileArray.length - filesToUpload.length;
    const needsApproval = !lastApproved;
    const approvalNote = needsApproval ? ' Submitted for approval.' : '';
    let message;
    if (skipped > 0) {
      message = `Uploaded ${succeeded} image${succeeded !== 1 ? 's' : ''}. ${skipped} skipped (upload limit: ${maxUploads}).${approvalNote}`;
    } else if (succeeded > 1) {
      message = needsApproval
        ? `${succeeded} images submitted for approval.`
        : `${succeeded} images uploaded successfully!`;
    } else {
      message = needsApproval
        ? 'Image submitted for approval.'
        : 'Image uploaded successfully!';
    }

    setUploadState({ status: 'success', message });
    setTimeout(() => setUploadState(null), 5000);

    if (lastApproved) {
      loadUploads();
    }
  }, [viewer, shareInfo, token]);

  // Error states
  if (stage === 'error') {
    return <ErrorScreen error={error} />;
  }

  // Loading
  if (stage === 'loading') {
    return (
      <div className="h-dvh bg-gray-900 text-white flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading shared gallery...</p>
        </div>
      </div>
    );
  }

  // Password gate
  if (stage === 'password') {
    return (
      <SharePasswordGate
        galleryName={galleryData?.gallery?.name}
        onSubmit={handlePasswordSubmit}
        error={passwordError}
      />
    );
  }

  // Name entry gate
  if (stage === 'name') {
    return (
      <NameEntryGate
        galleryName={galleryData?.gallery?.name}
        onSubmit={handleNameSubmit}
      />
    );
  }

  // Gallery viewer
  if (stage === 'ready' && galleryData) {
    return (
      <SharedGalleryViewer
        token={token}
        gallery={galleryData.gallery}
        images={galleryData.images}
        permissions={shareInfo}
        viewer={viewer}
        favorites={favorites}
        favoriteCounts={favoriteCounts}
        onToggleFavorite={handleToggleFavorite}
        uploads={uploads}
        onUpload={shareInfo?.allowUploads ? handleUpload : undefined}
        uploadState={uploadState}
        commentCounts={commentCounts}
        currentImageComments={currentImageComments}
        loadingComments={loadingComments}
        onImageSelect={shareInfo?.allowComments ? loadCommentsForImage : undefined}
        onAddComment={shareInfo?.allowComments ? handleAddComment : undefined}
        onDeleteComment={shareInfo?.allowComments ? handleDeleteComment : undefined}
      />
    );
  }

  return null;
}

function ErrorScreen({ error }) {
  let icon, title, message;

  switch (error) {
    case 'not_found':
      icon = <LinkIcon size={48} className="text-gray-500" />;
      title = 'Gallery Not Found';
      message = 'This share link doesn\'t exist or has been removed.';
      break;
    case 'share_expired':
      icon = <Clock size={48} className="text-orange-400" />;
      title = 'Link Expired';
      message = 'This share link has expired. Ask the gallery owner for a new link.';
      break;
    case 'share_inactive':
      icon = <AlertCircle size={48} className="text-red-400" />;
      title = 'Link Disabled';
      message = 'This share link has been disabled by the gallery owner.';
      break;
    default:
      icon = <AlertCircle size={48} className="text-red-400" />;
      title = 'Something Went Wrong';
      message = 'We couldn\'t load this gallery. Please try again later.';
  }

  return (
    <div className="h-dvh bg-gray-900 text-white flex items-center justify-center p-4 overflow-hidden">
      <div className="text-center max-w-sm">
        <div className="mb-4 flex justify-center">{icon}</div>
        <h1 className="text-2xl font-bold mb-2">{title}</h1>
        <p className="text-gray-400">{message}</p>
        <div className="flex justify-center mt-8 opacity-30">
          <img src="/posevault-logo-white.svg" alt="PoseVault" className="h-5" />
        </div>
      </div>
    </div>
  );
}
