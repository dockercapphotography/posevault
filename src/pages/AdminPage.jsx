import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';
import { supabase } from '../supabaseClient';
import { Shield, ArrowLeft, Search, Users, Database, RefreshCw, ChevronDown } from 'lucide-react';
import LoginScreen from '../components/LoginScreen';

export default function AdminPage() {
  const { isAuthenticated, session, isLoading: authLoading, login, register, resetPassword, updatePassword, isPasswordRecovery } = useAuth();
  const userId = session?.user?.id;
  const { isAdmin, isLoading: adminLoading } = useAdmin(userId);

  const [users, setUsers] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [savingUserId, setSavingUserId] = useState(null);
  const [successUserId, setSuccessUserId] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      loadTiers();
      loadUsers();
    }
  }, [isAdmin]);

  const loadTiers = async () => {
    const { data, error } = await supabase
      .from('storage_tiers')
      .select('*')
      .order('sort_order');

    if (!error && data) {
      setTiers(data);
    }
  };

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    const { data, error } = await supabase
      .from('user_storage')
      .select('uid, user_id, current_storage, maximum_storage, storage_tier, is_admin, created_at');

    if (!error && data) {
      setUsers(data);
    }
    setIsLoadingUsers(false);
  };

  const handleTierChange = async (userStorageUid, userUserId, newTierId) => {
    const tier = tiers.find(t => t.id === newTierId);
    if (!tier) return;

    setSavingUserId(userStorageUid);
    const { error } = await supabase
      .from('user_storage')
      .update({
        storage_tier: newTierId,
        maximum_storage: tier.storage_bytes,
        updated_at: new Date().toISOString(),
      })
      .eq('uid', userStorageUid);

    if (!error) {
      setUsers(prev =>
        prev.map(u =>
          u.uid === userStorageUid
            ? { ...u, storage_tier: newTierId, maximum_storage: tier.storage_bytes }
            : u
        )
      );
      setSuccessUserId(userStorageUid);
      setTimeout(() => setSuccessUserId(null), 2000);
    }
    setSavingUserId(null);
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${Math.round(mb)} MB`;
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    return u.user_id?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Loading states
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Not logged in
  if (!isAuthenticated || isPasswordRecovery) {
    return (
      <LoginScreen
        onLogin={login}
        onRegister={register}
        onResetPassword={resetPassword}
        onUpdatePassword={updatePassword}
        isPasswordRecovery={isPasswordRecovery}
      />
    );
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <Shield size={48} className="mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">You don't have admin privileges.</p>
          <a
            href="/"
            className="inline-block bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg transition-colors"
          >
            Back to PoseVault
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </a>
            <Shield size={20} className="text-purple-400" />
            <h1 className="text-lg font-bold">Admin Panel</h1>
          </div>
          <button
            onClick={loadUsers}
            disabled={isLoadingUsers}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm cursor-pointer"
          >
            <RefreshCw size={16} className={isLoadingUsers ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
              <Users size={16} />
              Total Users
            </div>
            <div className="text-2xl font-bold">{users.length}</div>
          </div>
          {tiers.map(tier => {
            const count = users.filter(u => u.storage_tier === tier.id).length;
            return (
              <div key={tier.id} className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                  <Database size={16} />
                  {tier.name}
                </div>
                <div className="text-2xl font-bold">{count}</div>
              </div>
            );
          })}
        </div>

        {/* Tier definitions */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="font-semibold mb-3">Storage Tiers</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left pb-2 pr-4">Name</th>
                  <th className="text-left pb-2 pr-4">Storage</th>
                  <th className="text-left pb-2 pr-4">Description</th>
                  <th className="text-left pb-2">Default</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map(tier => (
                  <tr key={tier.id} className="border-b border-gray-700/50">
                    <td className="py-2 pr-4 font-medium">{tier.name}</td>
                    <td className="py-2 pr-4 text-gray-300">{formatBytes(tier.storage_bytes)}</td>
                    <td className="py-2 pr-4 text-gray-400">{tier.description}</td>
                    <td className="py-2">
                      {tier.is_default && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* User management */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">User Storage Management</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-700 text-white pl-9 pr-4 py-2 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {isLoadingUsers ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left pb-2 pr-4">User ID</th>
                    <th className="text-left pb-2 pr-4">Used</th>
                    <th className="text-left pb-2 pr-4">Limit</th>
                    <th className="text-left pb-2 pr-4">Usage</th>
                    <th className="text-left pb-2 pr-4">Tier</th>
                    <th className="text-left pb-2">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => {
                    const pct = user.maximum_storage > 0
                      ? ((user.current_storage / user.maximum_storage) * 100).toFixed(1)
                      : 0;
                    const currentTier = tiers.find(t => t.id === user.storage_tier);

                    return (
                      <tr key={user.uid} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-3 pr-4">
                          <span className="font-mono text-xs text-gray-300" title={user.user_id}>
                            {user.user_id?.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-300">
                          {formatBytes(user.current_storage)}
                        </td>
                        <td className="py-3 pr-4 text-gray-300">
                          {formatBytes(user.maximum_storage)}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-600 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  pct < 50 ? 'bg-green-500' :
                                  pct < 75 ? 'bg-yellow-500' :
                                  pct < 90 ? 'bg-orange-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400">{pct}%</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="relative">
                            <select
                              value={user.storage_tier || 1}
                              onChange={(e) => handleTierChange(user.uid, user.user_id, parseInt(e.target.value))}
                              disabled={savingUserId === user.uid}
                              className={`appearance-none bg-gray-700 text-white pl-3 pr-8 py-1.5 rounded-lg text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                successUserId === user.uid ? 'ring-2 ring-green-500' : ''
                              }`}
                            >
                              {tiers.map(tier => (
                                <option key={tier.id} value={tier.id}>
                                  {tier.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </td>
                        <td className="py-3">
                          {user.is_admin && (
                            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                              Admin
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <p className="text-center text-gray-500 py-8">No users found.</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
