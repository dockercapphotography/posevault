import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';
import { supabase } from '../supabaseClient';
import { Shield, ArrowLeft, Search, Users, Database, RefreshCw, ChevronDown, Plus, Pencil, Check, X, Star } from 'lucide-react';
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

  // Tier editing state
  const [editingTierId, setEditingTierId] = useState(null);
  const [editTierName, setEditTierName] = useState('');
  const [editTierStorage, setEditTierStorage] = useState('');
  const [editTierStorageUnit, setEditTierStorageUnit] = useState('GB');
  const [editTierDescription, setEditTierDescription] = useState('');
  const [savingTier, setSavingTier] = useState(false);

  // New tier state
  const [showAddTier, setShowAddTier] = useState(false);
  const [newTierName, setNewTierName] = useState('');
  const [newTierStorage, setNewTierStorage] = useState('');
  const [newTierStorageUnit, setNewTierStorageUnit] = useState('GB');
  const [newTierDescription, setNewTierDescription] = useState('');

  // Admin toggle state
  const [togglingAdminId, setTogglingAdminId] = useState(null);

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

    // Try the RPC function first (returns display names + emails)
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_admin_user_list');

    if (!rpcError && rpcData) {
      setUsers(rpcData);
    } else {
      console.error('get_admin_user_list RPC failed:', rpcError?.message || rpcError);
      // Fallback to direct query (no display names)
      const { data, error } = await supabase
        .from('user_storage')
        .select('uid, user_id, current_storage, maximum_storage, storage_tier, is_admin, created_at');

      if (!error && data) {
        setUsers(data.map(u => ({ ...u, display_name: '', email: '' })));
      }
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

  const handleToggleAdmin = async (userStorageUid, userUserId, currentIsAdmin) => {
    // Prevent removing your own admin status
    if (userUserId === userId && currentIsAdmin) return;

    setTogglingAdminId(userStorageUid);
    const { error } = await supabase
      .from('user_storage')
      .update({ is_admin: !currentIsAdmin, updated_at: new Date().toISOString() })
      .eq('uid', userStorageUid);

    if (!error) {
      setUsers(prev =>
        prev.map(u =>
          u.uid === userStorageUid ? { ...u, is_admin: !currentIsAdmin } : u
        )
      );
    }
    setTogglingAdminId(null);
  };

  const parseStorageToBytes = (value, unit) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return null;
    return unit === 'GB' ? Math.round(num * 1024 * 1024 * 1024) : Math.round(num * 1024 * 1024);
  };

  const bytesToUnit = (bytes) => {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return { value: gb % 1 === 0 ? gb.toString() : gb.toFixed(1), unit: 'GB' };
    const mb = bytes / (1024 * 1024);
    return { value: Math.round(mb).toString(), unit: 'MB' };
  };

  const startEditTier = (tier) => {
    const { value, unit } = bytesToUnit(tier.storage_bytes);
    setEditingTierId(tier.id);
    setEditTierName(tier.name);
    setEditTierStorage(value);
    setEditTierStorageUnit(unit);
    setEditTierDescription(tier.description || '');
  };

  const cancelEditTier = () => {
    setEditingTierId(null);
    setEditTierName('');
    setEditTierStorage('');
    setEditTierDescription('');
  };

  const saveEditTier = async () => {
    const storageBytes = parseStorageToBytes(editTierStorage, editTierStorageUnit);
    if (!editTierName.trim() || !storageBytes) return;

    setSavingTier(true);
    const { error } = await supabase
      .from('storage_tiers')
      .update({
        name: editTierName.trim(),
        storage_bytes: storageBytes,
        description: editTierDescription.trim(),
      })
      .eq('id', editingTierId);

    if (!error) {
      await loadTiers();
      cancelEditTier();
    }
    setSavingTier(false);
  };

  const handleSetDefault = async (tierId) => {
    setSavingTier(true);
    // Clear existing default
    await supabase
      .from('storage_tiers')
      .update({ is_default: false })
      .neq('id', tierId);

    // Set new default
    const { error } = await supabase
      .from('storage_tiers')
      .update({ is_default: true })
      .eq('id', tierId);

    if (!error) {
      await loadTiers();
    }
    setSavingTier(false);
  };

  const handleAddTier = async () => {
    const storageBytes = parseStorageToBytes(newTierStorage, newTierStorageUnit);
    if (!newTierName.trim() || !storageBytes) return;

    setSavingTier(true);
    const maxOrder = tiers.reduce((max, t) => Math.max(max, t.sort_order || 0), 0);

    const { error } = await supabase
      .from('storage_tiers')
      .insert({
        name: newTierName.trim(),
        storage_bytes: storageBytes,
        description: newTierDescription.trim(),
        sort_order: maxOrder + 1,
        is_default: false,
      });

    if (!error) {
      await loadTiers();
      setShowAddTier(false);
      setNewTierName('');
      setNewTierStorage('');
      setNewTierDescription('');
    }
    setSavingTier(false);
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${Math.round(mb)} MB`;
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.user_id?.toLowerCase().includes(q) ||
      u.display_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
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
            onClick={() => { loadTiers(); loadUsers(); }}
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

        {/* Tier management */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Storage Tiers</h2>
            {!showAddTier && (
              <button
                onClick={() => setShowAddTier(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition-colors cursor-pointer"
              >
                <Plus size={14} />
                Add Tier
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left pb-2 pr-4">Name</th>
                  <th className="text-left pb-2 pr-4">Storage</th>
                  <th className="text-left pb-2 pr-4">Description</th>
                  <th className="text-left pb-2 pr-4">Default</th>
                  <th className="text-left pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map(tier => (
                  <tr key={tier.id} className="border-b border-gray-700/50">
                    {editingTierId === tier.id ? (
                      <>
                        <td className="py-2 pr-4">
                          <input
                            type="text"
                            value={editTierName}
                            onChange={(e) => setEditTierName(e.target.value)}
                            className="bg-gray-700 text-white px-2 py-1 rounded text-sm w-24 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={editTierStorage}
                              onChange={(e) => setEditTierStorage(e.target.value)}
                              className="bg-gray-700 text-white px-2 py-1 rounded text-sm w-20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                              min="1"
                              step="any"
                            />
                            <select
                              value={editTierStorageUnit}
                              onChange={(e) => setEditTierStorageUnit(e.target.value)}
                              className="bg-gray-700 text-white px-1 py-1 rounded text-sm cursor-pointer focus:outline-none"
                            >
                              <option value="MB">MB</option>
                              <option value="GB">GB</option>
                            </select>
                          </div>
                        </td>
                        <td className="py-2 pr-4">
                          <input
                            type="text"
                            value={editTierDescription}
                            onChange={(e) => setEditTierDescription(e.target.value)}
                            className="bg-gray-700 text-white px-2 py-1 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          {tier.is_default && (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                              Default
                            </span>
                          )}
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={saveEditTier}
                              disabled={savingTier}
                              className="p-1.5 hover:bg-green-500/20 rounded text-green-400 transition-colors cursor-pointer"
                              title="Save"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={cancelEditTier}
                              className="p-1.5 hover:bg-red-500/20 rounded text-red-400 transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 pr-4 font-medium">{tier.name}</td>
                        <td className="py-2 pr-4 text-gray-300">{formatBytes(tier.storage_bytes)}</td>
                        <td className="py-2 pr-4 text-gray-400">{tier.description}</td>
                        <td className="py-2 pr-4">
                          {tier.is_default ? (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                              Default
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetDefault(tier.id)}
                              disabled={savingTier}
                              className="text-xs text-gray-500 hover:text-yellow-400 transition-colors cursor-pointer"
                              title="Set as default tier for new users"
                            >
                              Set default
                            </button>
                          )}
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => startEditTier(tier)}
                            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                            title="Edit tier"
                          >
                            <Pencil size={14} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}

                {/* Add new tier row */}
                {showAddTier && (
                  <tr className="border-b border-gray-700/50 bg-gray-700/20">
                    <td className="py-2 pr-4">
                      <input
                        type="text"
                        value={newTierName}
                        onChange={(e) => setNewTierName(e.target.value)}
                        placeholder="Tier name"
                        className="bg-gray-700 text-white px-2 py-1 rounded text-sm w-24 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={newTierStorage}
                          onChange={(e) => setNewTierStorage(e.target.value)}
                          placeholder="Size"
                          className="bg-gray-700 text-white px-2 py-1 rounded text-sm w-20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          min="1"
                          step="any"
                        />
                        <select
                          value={newTierStorageUnit}
                          onChange={(e) => setNewTierStorageUnit(e.target.value)}
                          className="bg-gray-700 text-white px-1 py-1 rounded text-sm cursor-pointer focus:outline-none"
                        >
                          <option value="MB">MB</option>
                          <option value="GB">GB</option>
                        </select>
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="text"
                        value={newTierDescription}
                        onChange={(e) => setNewTierDescription(e.target.value)}
                        placeholder="Description"
                        className="bg-gray-700 text-white px-2 py-1 rounded text-sm w-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </td>
                    <td className="py-2 pr-4"></td>
                    <td className="py-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleAddTier}
                          disabled={savingTier || !newTierName.trim() || !newTierStorage}
                          className="p-1.5 hover:bg-green-500/20 rounded text-green-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Save new tier"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => { setShowAddTier(false); setNewTierName(''); setNewTierStorage(''); setNewTierDescription(''); }}
                          className="p-1.5 hover:bg-red-500/20 rounded text-red-400 transition-colors cursor-pointer"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User management */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold">User Storage Management</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-700 text-white pl-9 pr-4 py-2 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    <th className="text-left pb-2 pr-4">User</th>
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

                    const displayName = user.display_name?.trim();
                    const isSelf = user.user_id === userId;

                    return (
                      <tr key={user.uid} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                        <td className="py-3 pr-4">
                          <div className="min-w-0">
                            {displayName ? (
                              <div className="font-medium text-white truncate max-w-[200px]" title={displayName}>
                                {displayName}
                                {isSelf && <span className="ml-1.5 text-xs text-purple-400">(you)</span>}
                              </div>
                            ) : (
                              <div className="font-medium text-gray-400 italic">
                                No name set
                                {isSelf && <span className="ml-1.5 text-xs text-purple-400 not-italic">(you)</span>}
                              </div>
                            )}
                            {user.email && (
                              <div className="text-xs text-gray-500 truncate max-w-[200px]" title={user.email}>
                                {user.email}
                              </div>
                            )}
                            <div className="font-mono text-xs text-gray-600" title={user.user_id}>
                              {user.user_id?.slice(0, 8)}...
                            </div>
                          </div>
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
                          <button
                            onClick={() => handleToggleAdmin(user.uid, user.user_id, user.is_admin)}
                            disabled={togglingAdminId === user.uid || (isSelf && user.is_admin)}
                            className={`text-xs px-2 py-1 rounded-full transition-colors cursor-pointer ${
                              user.is_admin
                                ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                                : 'bg-gray-700 text-gray-500 hover:bg-gray-600 hover:text-gray-300'
                            } ${isSelf && user.is_admin ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={
                              isSelf && user.is_admin
                                ? "Can't remove your own admin status"
                                : user.is_admin
                                ? 'Click to remove admin'
                                : 'Click to make admin'
                            }
                          >
                            {user.is_admin ? 'Admin' : 'User'}
                          </button>
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
