import React, { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';

export default function SharePasswordGate({ galleryName, onSubmit, error: externalError }) {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim() || submitting) return;
    setSubmitting(true);
    await onSubmit(password);
    setSubmitting(false);
  };

  return (
    <div className="h-dvh bg-gray-900 text-white flex items-center justify-center p-4 overflow-hidden">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-orange-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Password Required</h1>
          {galleryName && (
            <p className="text-gray-400 text-sm">
              Enter the password to view <span className="text-white font-medium">{galleryName}</span>
            </p>
          )}
          {!galleryName && (
            <p className="text-gray-400 text-sm">This gallery is password protected</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
            className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />

          {externalError && (
            <p className="text-red-400 text-sm text-center">{externalError}</p>
          )}

          <button
            type="submit"
            disabled={!password.trim() || submitting}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg transition-colors cursor-pointer font-medium flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                Continue
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className="text-gray-500 text-xs text-center mt-6">
          Shared via PoseVault
        </p>
      </div>
    </div>
  );
}
