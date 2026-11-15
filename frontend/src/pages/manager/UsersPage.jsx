import React, { useState, useEffect } from 'react';
import { authApi } from '../../api/client';
import { formatDateTime } from '../../utils/date';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { UserCog, ShieldCheck, Check, X, AlertCircle } from 'lucide-react';

export const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await authApi.getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load user accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      await authApi.updateUser(userId, { role: newRole });
      loadUsers();
    } catch (err) {
      alert(`Failed to update role: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    setUpdatingId(userId);
    try {
      await authApi.updateUser(userId, { is_active: !currentStatus });
      loadUsers();
    } catch (err) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Staff Account Management</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Role assignments (Manager, Cashier, Stock Handler) and account activation controls
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={UserCog} title="No staff accounts found" description="Staff accounts sync here upon Supabase sign-in." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Member Since</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        disabled={updatingId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="Manager">Manager</option>
                        <option value="Cashier">Cashier</option>
                        <option value="Stock Handler">Stock Handler</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={u.is_active ? 'success' : 'danger'}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{formatDateTime(u.created_at)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleActive(u.id, u.is_active)}
                        disabled={updatingId === u.id}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg border transition ${
                          u.is_active
                            ? 'text-red-600 border-red-200 hover:bg-red-50'
                            : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
