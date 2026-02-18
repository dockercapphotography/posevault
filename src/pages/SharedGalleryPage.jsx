import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Clock, LinkIcon } from 'lucide-react';
import SharePasswordGate from '../components/Share/SharePasswordGate';
import NameEntryGate from '../components/Share/NameEntryGate';
import SharedGalleryViewer from '../components/Share/SharedGalleryViewer';
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
} from '../utils/shareApi';

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

  const handleUpload = useCallback(async (file) => {
    if (!viewer || !shareInfo?.allowUploads) return;

    setUploadState({ status: 'uploading', message: `Uploading ${file.name}...` });

    const result = await uploadToSharedGallery(
      token,
      shareInfo.id,
      viewer.id,
      file,
      shareInfo.maxUploadSizeMb || 10,
    );

    if (!result.ok) {
      setUploadState({ status: 'error', message: result.error });
      setTimeout(() => setUploadState(null), 5000);
      return;
    }

    // Log the upload action
    logShareAccess(shareInfo.id, viewer.id, 'upload');

    const message = result.data?.approved !== false
      ? 'Image uploaded successfully!'
      : 'Image submitted for approval.';

    setUploadState({ status: 'success', message });
    setTimeout(() => setUploadState(null), 4000);

    // Reload uploads if auto-approved
    if (result.data?.approved !== false) {
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
