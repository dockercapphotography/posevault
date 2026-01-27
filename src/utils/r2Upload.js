const R2_WORKER_URL = 'https://r2-worker.sitranephotography.workers.dev';

/**
 * Convert a base64 data URL to a Blob
 */
function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Upload a single image to R2
 * @param {string} dataURL - Base64 data URL of the image
 * @param {string} filename - Original filename
 * @param {string} accessToken - Supabase session access token
 * @returns {Promise<{ok: boolean, key?: string, error?: string}>}
 */
export async function uploadToR2(dataURL, filename, accessToken) {
  if (!accessToken) {
    return { ok: false, error: 'Not authenticated' };
  }

  try {
    const blob = dataURLtoBlob(dataURL);
    const formData = new FormData();
    formData.append('file', blob, filename);

    const response = await fetch(R2_WORKER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      console.error('R2 upload failed:', result);
      return { ok: false, error: result.error || 'Upload failed' };
    }

    return { ok: true, key: result.key, size: result.size };
  } catch (err) {
    console.error('R2 upload error:', err);
    return { ok: false, error: err.message };
  }
}

/**
 * Construct a public R2 URL for an image key.
 * Used for cross-device sync — images are displayed directly from R2.
 */
export function getR2Url(r2Key) {
  if (!r2Key) return null;
  return `${R2_WORKER_URL}/${r2Key}`;
}

/**
 * Fetch an image from R2 with authentication and return as a data URL.
 * Used when the R2 worker requires auth for GET requests.
 * @param {string} r2Key - The R2 object key
 * @param {string} accessToken - Supabase session access token
 * @returns {Promise<{ok: boolean, dataURL?: string, error?: string}>}
 */
export async function fetchFromR2(r2Key, accessToken) {
  if (!r2Key || !accessToken) {
    return { ok: false, error: 'Missing r2Key or accessToken' };
  }

  try {
    const response = await fetch(`${R2_WORKER_URL}/${r2Key}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ ok: true, dataURL: reader.result });
      reader.onerror = () => resolve({ ok: false, error: 'Failed to read blob' });
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Delete an image from R2
 * @param {string} r2Key - The R2 object key to delete
 * @param {string} accessToken - Supabase session access token
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function deleteFromR2(r2Key, accessToken) {
  if (!r2Key || !accessToken) {
    return { ok: false, error: 'Missing r2Key or accessToken' };
  }

  try {
    const response = await fetch(`${R2_WORKER_URL}/${r2Key}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      return { ok: false, error: result.error || `HTTP ${response.status}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Upload multiple images to R2 in the background
 * @param {Array<{src: string, filename: string}>} images - Images to upload
 * @param {string} accessToken - Supabase session access token
 * @param {Function} onProgress - Callback for progress updates (index, total, result)
 * @returns {Promise<Array<{index: number, result: object}>>}
 */
export async function uploadMultipleToR2(images, accessToken, onProgress) {
  const results = [];

  for (let i = 0; i < images.length; i++) {
    const { src, filename } = images[i];
    const result = await uploadToR2(src, filename, accessToken);
    results.push({ index: i, result });

    if (onProgress) {
      onProgress(i + 1, images.length, result);
    }
  }

  return results;
}
