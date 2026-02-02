import React, { useState, useEffect } from 'react';
import { X, User, Trash2, AlertTriangle, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { updateUserProfile, updateUserEmail, updateUserPassword, deleteUserAccount } from '../utils/userSettingsSync';

export default function UserSettingsModal({
  onClose,
  currentUser,
  categoryGridColumns,
  imageGridColumns,
  onCategoryGridChange,
  onImageGridChange,
  onAccountDeleted,
  deleteFromR2,
  accessToken,
  onStartTutorial,
  onResetImageTutorial
}) {
  const [activeTab, setActiveTab] = useState('account');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Account Info State
  const fullName = currentUser?.user_metadata?.firstName && currentUser?.user_metadata?.lastName 
    ? `${currentUser.user_metadata.firstName} ${currentUser.user_metadata.lastName}`
    : '';
  const [displayName, setDisplayName] = useState(fullName);
  const [email, setEmail] = useState(currentUser?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Account Deletion State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveAccountInfo = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      // Update display name if changed
      const currentFullName = currentUser?.user_metadata?.firstName && currentUser?.user_metadata?.lastName
        ? `${currentUser.user_metadata.firstName} ${currentUser.user_metadata.lastName}`
        : '';
      if (displayName !== currentFullName) {
        const result = await updateUserProfile(currentUser.id, { displayName });
        if (!result.ok) {
          setSaveMessage(`Error updating name: ${result.error}`);
          setIsSaving(false);
          return;
        }
      }

      // Update email if changed
      if (email !== currentUser?.email) {
        const result = await updateUserEmail(email);
        if (!result.ok) {
          setSaveMessage(`Error updating email: ${result.error}`);
          setIsSaving(false);
          return;
        }
        setSaveMessage('Verification email sent! Check your inbox to confirm the new email.');
        setIsSaving(false);
        return;
      }

      // Update password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setSaveMessage('Passwords do not match');
          setIsSaving(false);
          return;
        }
        
        if (newPassword.length < 6) {
          setSaveMessage('Password must be at least 6 characters');
          setIsSaving(false);
          return;
        }

        const result = await updateUserPassword(newPassword);
        if (!result.ok) {
          setSaveMessage(`Error updating password: ${result.error}`);
          setIsSaving(false);
          return;
        }
        
        setNewPassword('');
        setConfirmPassword('');
      }

      setSaveMessage('Account information updated successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      setSaveMessage(`Error: ${err.message}`);
    }
    
    setIsSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteUserAccount(
        currentUser.id,
        accessToken,
        deleteFromR2
      );

      if (!result.ok) {
        alert(`Account deletion failed. Errors: ${result.errors.join(', ')}`);
        setIsDeleting(false);
        return;
      }

      // Account deleted successfully
      alert('Your account has been permanently deleted.');
      onAccountDeleted();
    } catch (err) {
      alert(`Error deleting account: ${err.message}`);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('account')}
            className={`flex-1 px-6 py-3 font-medium transition-colors cursor-pointer ${
              activeTab === 'account'
                ? 'bg-gray-700 text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-750'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <User size={18} />
              <span>Account</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('delete')}
            className={`flex-1 px-6 py-3 font-medium transition-colors cursor-pointer ${
              activeTab === 'delete'
                ? 'bg-gray-700 text-white border-b-2 border-red-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-750'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Trash2 size={18} />
              <span>Delete Account</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
                <p className="text-xs text-gray-400 mt-1">
                  You'll receive a verification email if you change this
                </p>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Change Password</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {saveMessage && (
                <div className={`p-3 rounded-lg ${
                  saveMessage.includes('Error') || saveMessage.includes('failed')
                    ? 'bg-red-900/30 text-red-400'
                    : 'bg-green-900/30 text-green-400'
                }`}>
                  {saveMessage}
                </div>
              )}

              {/* Show Tutorial Button */}
              <div className="border-t border-gray-700 pt-6">
                <button
                  onClick={() => {
                    onClose();
                    onStartTutorial();
                    if (onResetImageTutorial) {
                      onResetImageTutorial();
                    }
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <HelpCircle size={18} />
                  Show Tutorial Again
                </button>
              </div>

              <button
                onClick={handleSaveAccountInfo}
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Delete Account Tab */}
          {activeTab === 'delete' && (
            <div className="space-y-6">
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle size={24} className="text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-400 mb-2">
                      Delete Account
                    </h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Permanently delete your PoseVault account and all associated data. This action cannot be undone.
                    </p>
                    <ul className="text-gray-400 text-sm space-y-1 mb-4">
                      <li>• All galleries will be deleted</li>
                      <li>• All images will be deleted from storage</li>
                      <li>• All tags will be deleted</li>
                      <li>• Your account will be permanently removed</li>
                    </ul>
                  </div>
                </div>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trash2 size={18} />
                    Delete My Account
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Type <span className="font-mono bg-gray-700 px-2 py-1 rounded">DELETE</span> to confirm
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Type DELETE"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Trash2 size={18} />
                        {isDeleting ? 'Deleting...' : 'Permanently Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
