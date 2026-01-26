/**
 * Cryptographic utilities for password hashing
 * Uses Web Crypto API for secure hashing
 */

/**
 * Hash a password using SHA-256
 * @param {string} password - The plain text password
 * @returns {Promise<string>} - The hashed password as a hex string
 */
export async function hashPassword(password) {
  if (!password) return null;

  // Encode the password as UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  // Hash using SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
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
