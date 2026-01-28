/**
 * Cryptographic utilities for password hashing
 * Uses Web Crypto API when available (secure contexts),
 * falls back to pure JS SHA-256 for non-secure contexts (e.g. phone on local network).
 */

/**
 * Pure JS SHA-256 implementation (fallback for non-secure contexts where crypto.subtle is unavailable)
 */
function sha256Fallback(message) {
  // Pre-processing constants
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  // Encode message as UTF-8 bytes
  const encoder = new TextEncoder();
  const msgBytes = encoder.encode(message);
  const msgLen = msgBytes.length;

  // Pre-processing: pad message to multiple of 512 bits (64 bytes)
  const bitLen = msgLen * 8;
  const padLen = ((msgLen + 9 + 63) & ~63); // next multiple of 64
  const padded = new Uint8Array(padLen);
  padded.set(msgBytes);
  padded[msgLen] = 0x80;

  // Append original length in bits as 64-bit big-endian
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 4, bitLen, false);

  // Initial hash values
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  // Process each 512-bit (64-byte) block
  for (let offset = 0; offset < padLen; offset += 64) {
    const w = new Array(64);

    // Copy block into first 16 words
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }

    // Extend to 64 words
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }

    // Initialize working variables
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    // Compression function
    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  // Produce final hex digest
  const toHex = (n) => (n >>> 0).toString(16).padStart(8, '0');
  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) +
         toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7);
}

/**
 * Hash a password using SHA-256
 * Uses Web Crypto API in secure contexts, pure JS fallback otherwise.
 * @param {string} password - The plain text password
 * @returns {Promise<string>} - The hashed password as a hex string
 */
export async function hashPassword(password) {
  if (!password) return null;

  // Use Web Crypto API if available (secure context: HTTPS or localhost)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback: pure JS SHA-256 (for non-secure contexts like phone on local network)
  return sha256Fallback(password);
}

/**
 * Verify a password against a stored hash
 * @param {string} password - The plain text password to verify
 * @param {string} storedHash - The stored hash to compare against
 * @returns {Promise<boolean>} - True if password matches
 */
export async function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;

  const inputHash = await hashPassword(password);
  return inputHash === storedHash;
}
