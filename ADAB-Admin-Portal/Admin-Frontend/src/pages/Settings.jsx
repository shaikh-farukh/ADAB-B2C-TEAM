import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('platform'); // 'platform' | 'rbac'

  // Platform Settings State
  const [settings, setSettings] = useState({
    autoApprovalEnabled: false,
    requireRejectionReason: true,
    emailNotifications: true,
    maxListingPerSeller: 100,
    autoApproveProducts: false,
    requireDocuments: true,
    notifyOnNewSeller: true
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [message, setMessage] = useState('');

  // RBAC Roles & Permissions State
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loadingRbac, setLoadingRbac] = useState(false);
  const [rbacMessage, setRbacMessage] = useState('');

  // Create Role Form
  const [newRole, setNewRole] = useState({ slug: '', name: '', description: '' });
  const [creatingRole, setCreatingRole] = useState(false);

  // Edit Role Modal / Inline State
  const [editingRole, setEditingRole] = useState(null);
  const [updatingRole, setUpdatingRole] = useState(false);

  // Manage Role Permissions Modal State
  const [permModalRole, setPermModalRole] = useState(null);
  const [selectedPermSlugs, setSelectedPermSlugs] = useState([]);
  const [savingPerms, setSavingPerms] = useState(false);

  // Load Platform Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiClient.get('/settings');
        if (res.data.success && res.data.data) {
          setSettings((prev) => ({ ...prev, ...res.data.data }));
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, []);

  // Load RBAC Roles and Permissions
  const fetchRbacData = async () => {
    setLoadingRbac(true);
    setRbacMessage('');
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiClient.get('/rbac/roles'),
        apiClient.get('/permissions')
      ]);
      if (rolesRes.data && rolesRes.data.success) {
        setRoles(rolesRes.data.data || []);
      }
      if (permsRes.data && permsRes.data.success) {
        setPermissions(permsRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load RBAC data', err);
      setRbacMessage('Failed to load roles and permissions.');
    } finally {
      setLoadingRbac(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'rbac') {
      fetchRbacData();
    }
  }, [activeTab]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await apiClient.patch('/settings', settings);
      if (res.data.success) {
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings', err);
      setMessage('Error saving settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRole.slug.trim() || !newRole.name.trim()) {
      alert('Role slug and name are required.');
      return;
    }
    setCreatingRole(true);
    try {
      const res = await apiClient.post('/rbac/roles', newRole);
      if (res.data && res.data.success) {
        setNewRole({ slug: '', name: '', description: '' });
        fetchRbacData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create role');
    } finally {
      setCreatingRole(false);
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!editingRole) return;
    setUpdatingRole(true);
    try {
      const res = await apiClient.patch(`/rbac/roles/${editingRole.id}`, {
        name: editingRole.name,
        description: editingRole.description
      });
      if (res.data && res.data.success) {
        setEditingRole(null);
        fetchRbacData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role');
    } finally {
      setUpdatingRole(false);
    }
  };

  const openPermModal = (role) => {
    setPermModalRole(role);
    const existingSlugs = Array.isArray(role.permissions)
      ? role.permissions.map(p => typeof p === 'string' ? p : p.slug)
      : [];
    setSelectedPermSlugs(existingSlugs);
  };

  const togglePermSlug = (slug) => {
    setSelectedPermSlugs(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const handleSaveRolePermissions = async () => {
    if (!permModalRole) return;
    setSavingPerms(true);
    try {
      const res = await apiClient.put(`/rbac/roles/${permModalRole.id}/permissions`, {
        permissions: selectedPermSlugs
      });
      if (res.data && res.data.success) {
        setPermModalRole(null);
        fetchRbacData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role permissions');
    } finally {
      setSavingPerms(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('platform')}
          className={`pb-3 text-xs font-bold transition-colors ${
            activeTab === 'platform'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <i className="fa-solid fa-sliders mr-2"></i> Platform Settings
        </button>
        <button
          onClick={() => setActiveTab('rbac')}
          className={`pb-3 text-xs font-bold transition-colors ${
            activeTab === 'rbac'
              ? 'border-b-2 border-indigo-600 text-indigo-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <i className="fa-solid fa-shield-halved mr-2"></i> Roles &amp; Permissions (RBAC)
        </button>
      </div>

      {/* PLATFORM SETTINGS TAB */}
      {activeTab === 'platform' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Admin Platform Settings</h1>
            <p className="text-xs text-slate-500 mt-1">Configure global approval policies, moderation rules &amp; operational limits</p>
          </div>

          {loadingSettings ? (
            <div className="py-8 text-center text-slate-500 text-xs">Loading Settings...</div>
          ) : (
            <>
              {message && (
                <div className={`p-3 font-bold text-xs rounded-xl ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {message}
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Require Rejection Reason</div>
                    <div className="text-xs text-slate-500">Enforce mandatory notes/reasons when rejecting listings or returns</div>
                  </div>
                  <input type="checkbox" checked={settings.requireRejectionReason} onChange={e => setSettings({ ...settings, requireRejectionReason: e.target.checked })} className="h-4 w-4 text-indigo-600 rounded" />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Audit Trail Notifications</div>
                    <div className="text-xs text-slate-500">Send email alerts for sensitive admin actions</div>
                  </div>
                  <input type="checkbox" checked={settings.emailNotifications} onChange={e => setSettings({ ...settings, emailNotifications: e.target.checked })} className="h-4 w-4 text-indigo-600 rounded" />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Auto-approve Products</div>
                    <div className="text-xs text-slate-500">Auto-approve trusted seller products</div>
                  </div>
                  <input type="checkbox" checked={settings.autoApproveProducts} onChange={e => setSettings({ ...settings, autoApproveProducts: e.target.checked })} className="h-4 w-4 text-indigo-600 rounded" />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Require Documents</div>
                    <div className="text-xs text-slate-500">Require business documents for sellers</div>
                  </div>
                  <input type="checkbox" checked={settings.requireDocuments} onChange={e => setSettings({ ...settings, requireDocuments: e.target.checked })} className="h-4 w-4 text-indigo-600 rounded" />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-800">Notify on New Seller</div>
                    <div className="text-xs text-slate-500">Email me on new seller registration</div>
                  </div>
                  <input type="checkbox" checked={settings.notifyOnNewSeller} onChange={e => setSettings({ ...settings, notifyOnNewSeller: e.target.checked })} className="h-4 w-4 text-indigo-600 rounded" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Active Listings per Seller</label>
                  <input type="number" value={settings.maxListingPerSeller} onChange={e => setSettings({ ...settings, maxListingPerSeller: Number(e.target.value) })} className="w-full p-2.5 text-xs border border-slate-200 rounded-xl outline-none" />
                </div>

                <button type="submit" disabled={savingSettings} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm disabled:opacity-50">
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* RBAC ROLES & PERMISSIONS TAB */}
      {activeTab === 'rbac' && (
        <div className="space-y-6">
          {/* Create Role Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-extrabold text-slate-900 mb-3 flex items-center gap-2">
              <i className="fa-solid fa-plus text-indigo-600"></i> Create New Role
            </h2>
            <form onSubmit={handleCreateRole} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Role Slug (e.g. support_lead)"
                value={newRole.slug}
                onChange={e => setNewRole({ ...newRole, slug: e.target.value })}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-indigo-600"
              />
              <input
                type="text"
                placeholder="Role Name (e.g. Support Lead)"
                value={newRole.name}
                onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-indigo-600"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Description..."
                  value={newRole.description}
                  onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-indigo-600"
                />
                <button
                  type="submit"
                  disabled={creatingRole}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shrink-0 disabled:opacity-50"
                >
                  {creatingRole ? 'Adding...' : 'Create'}
                </button>
              </div>
            </form>
          </div>

          {/* Roles List Table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Platform Roles &amp; Assigned Permissions</h2>
                <p className="text-[11px] text-slate-500">Manage permission matrix persisted in PostgreSQL role_permissions</p>
              </div>
              <button
                onClick={fetchRbacData}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
              >
                <i className="fa-solid fa-rotate-right mr-1"></i> Refresh
              </button>
            </div>

            {loadingRbac ? (
              <div className="py-8 text-center text-slate-500 text-xs">Loading Roles &amp; Permissions...</div>
            ) : roles.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic">No roles configured.</div>
            ) : (
              <div className="space-y-3">
                {roles.map(role => (
                  <div key={role.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800 text-sm">{role.name}</span>
                          <span className="text-[11px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">{role.slug}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{role.description || 'No description provided.'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingRole({ id: role.id, name: role.name, description: role.description || '' })}
                          className="text-xs bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg font-bold"
                        >
                          <i className="fa-solid fa-pen mr-1"></i> Edit
                        </button>
                        <button
                          onClick={() => openPermModal(role)}
                          className="text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-lg font-bold"
                        >
                          <i className="fa-solid fa-key mr-1"></i> Manage Permissions ({Array.isArray(role.permissions) ? role.permissions.length : 0})
                        </button>
                      </div>
                    </div>

                    {/* Permissions Badges */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Assigned Permissions:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(role.permissions) && role.permissions.length > 0 ? (
                          role.permissions.map((p, idx) => {
                            const slug = typeof p === 'string' ? p : p.slug;
                            return (
                              <span key={idx} className="text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-md font-semibold">
                                {slug}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-slate-400 italic">No permissions assigned to this role.</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="font-extrabold text-sm text-slate-900">Edit Role Details</h3>
            <form onSubmit={handleUpdateRole} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role Name</label>
                <input
                  type="text"
                  value={editingRole.name}
                  onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editingRole.description}
                  onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-indigo-600"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingRole}
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {updatingRole ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Permissions Modal */}
      {permModalRole && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl max-h-[85vh] flex flex-col">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                Manage Permissions: {permModalRole.name}
              </h3>
              <p className="text-xs text-slate-500">Toggle system permissions to assign or revoke for this role</p>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 flex-1">
              {permissions.map(perm => {
                const isChecked = selectedPermSlugs.includes(perm.slug);
                return (
                  <label
                    key={perm.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-indigo-50/70 border-indigo-200'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePermSlug(perm.slug)}
                      className="mt-0.5 h-4 w-4 text-indigo-600 rounded"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span>{perm.slug}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono uppercase">{perm.module}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{perm.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-medium">
                {selectedPermSlugs.length} permissions selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPermModalRole(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRolePermissions}
                  disabled={savingPerms}
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingPerms ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
