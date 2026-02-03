import React, { useState, useEffect } from 'react';
import { AlertTriangle, Lock, X } from 'lucide-react';
import { verifyPassword } from '../../utils/crypto';

export default function PrivateGalleryWarning({ 
  category, 
  onProceed, 
  onCancel 
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const requiresPassword = category.isPrivate && category.privatePassword;

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleProceed = async () => {
    if (requiresPassword) {
      try {
        const isValid = await verifyPassword(password, category.privatePassword);
        if (isValid) {
          onProceed();
        } else {
          setError('Incorrect password');
          setPassword('');
        }
      } catch (err) {
        console.error('Password verification error:', err);
        setError('Password verification failed. Please try again.');
      }
    } else {
      onProceed();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleProceed();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl border border-gray-700">
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-orange-900/30 p-2 rounded-lg">
            <AlertTriangle size={24} className="text-orange-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">
              Private Gallery Warning
            </h3>
            <p className="text-gray-400 text-sm">
              This gallery may contain private or not suitable for work images.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {requiresPassword && (
          <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); handleProceed(); }} className="mb-4">
            {/* Hidden fields to prevent Chrome password manager */}
            <input type="text" name="prevent_autofill" style={{ display: 'none' }} tabIndex={-1} />
            <input type="password" name="prevent_autofill_pass" style={{ display: 'none' }} tabIndex={-1} />

            <label className="flex items-center gap-2 text-sm font-semibold mb-2 text-gray-300">
              <Lock size={16} />
              Password Required
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter gallery password"
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
              autoFocus
              autoComplete="new-password"
              data-form-type="other"
            />
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </form>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors cursor-pointer"
          >
            Go Back
          </button>
          <button
            onClick={handleProceed}
            className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 transition-colors cursor-pointer"
          >
            {requiresPassword ? 'Unlock & Proceed' : 'Proceed'}
          </button>
        </div>
      </div>
    </div>
  );
}
