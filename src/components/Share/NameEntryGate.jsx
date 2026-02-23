import React, { useState } from 'react';
import { User, ArrowRight, Mail } from 'lucide-react';

export default function NameEntryGate({ galleryName, requireEmail = false, onSubmit }) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');

  function validateEmail(value) {
    if (!value) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim() || submitting) return;

    if (requireEmail) {
      if (!email.trim()) {
        setEmailError('Email is required');
        return;
      }
      if (!validateEmail(email.trim())) {
        setEmailError('Please enter a valid email address');
        return;
      }
    }

    setSubmitting(true);
    await onSubmit(displayName.trim(), requireEmail ? email.trim() : null);
    setSubmitting(false);
  };

  return (
    <div className="h-dvh bg-gray-900 text-white flex items-center justify-center p-4 overflow-hidden">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={32} className="text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome</h1>
          {galleryName && (
            <p className="text-gray-400 text-sm">
              You've been invited to view <span className="text-white font-medium">{galleryName}</span>
            </p>
          )}
          <p className="text-gray-400 text-sm mt-1">
            Enter your {requireEmail ? 'name and email' : 'name'} to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            autoFocus
            maxLength={100}
            className="w-full bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />

          {requireEmail && (
            <div>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  placeholder="Your email"
                  maxLength={254}
                  className={`w-full bg-gray-800 border text-white pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    emailError ? 'border-red-500' : 'border-gray-700'
                  }`}
                />
              </div>
              {emailError && (
                <p className="text-red-400 text-xs mt-1">{emailError}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={!displayName.trim() || (requireEmail && !email.trim()) || submitting}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg transition-colors cursor-pointer font-medium flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                View Gallery
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="flex justify-center mt-6 opacity-40">
          <img src="/posevault-logo-white.svg" alt="PoseVault" className="h-5" />
        </div>
      </div>
    </div>
  );
}
