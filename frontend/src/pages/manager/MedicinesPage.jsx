import React, { useState, useEffect } from 'react';
import { medicinesApi, categoriesApi } from '../../api/client';
import { formatCurrency } from '../../utils/currency';
import { Modal } from '../../components/Modal';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import {
  Pill,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Filter,
} from 'lucide-react';

export const MedicinesPage = () => {
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    generic_name: '',
    category_id: '',
    manufacturer: '',
    description: '',
    selling_price: '',
    reorder_level: 10,
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
    loadMedicines();
  }, [search, selectedCategory]);

  const loadCategories = async () => {
    try {
      const res = await categoriesApi.list();
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadMedicines = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedCategory) params.category_id = selectedCategory;
      const res = await medicinesApi.list(params);
      setMedicines(res.data);
    } catch (err) {
      console.error('Failed to load medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingMed(null);
    setFormData({
      name: '',
      generic_name: '',
      category_id: categories[0]?.id || '',
      manufacturer: '',
      description: '',
      selling_price: '',
      reorder_level: 10,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (med) => {
    setEditingMed(med);
    setFormData({
      name: med.name,
      generic_name: med.generic_name || '',
      category_id: med.category_id,
      manufacturer: med.manufacturer || '',
      description: med.description || '',
      selling_price: med.selling_price,
      reorder_level: med.reorder_level,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      const payload = {
        name: formData.name,
        generic_name: formData.generic_name || null,
        category_id: formData.category_id,
        manufacturer: formData.manufacturer || null,
        description: formData.description || null,
        selling_price: parseFloat(formData.selling_price),
        reorder_level: parseInt(formData.reorder_level, 10),
      };

      if (editingMed) {
        await medicinesApi.update(editingMed.id, payload);
      } else {
        await medicinesApi.create(payload);
      }
      setIsModalOpen(false);
      loadMedicines();
    } catch (err) {
      setFormError(err.message || 'Failed to save medicine');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!window.confirm(`Are you sure you want to safely deactivate '${name}'?`)) return;
    try {
      await medicinesApi.deactivate(id);
      loadMedicines();
    } catch (err) {
      alert(`Deactivation failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Medicine Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage pharmaceutical formulas, selling prices, and reorder alerts
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Medicine</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by brand name or generic formula..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
        </div>
        <div className="w-full sm:w-64">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : medicines.length === 0 ? (
          <EmptyState
            icon={Pill}
            title="No medicines found"
            description="Add your first medicine or adjust your search filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Brand / Generic</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Manufacturer</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Sellable Stock</th>
                  <th className="py-3 px-4">Reorder Level</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {medicines.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{med.name}</p>
                      <p className="text-[11px] text-slate-400">{med.generic_name || '-'}</p>
                    </td>
                    <td className="py-3 px-4">{med.category_name || '-'}</td>
                    <td className="py-3 px-4 text-slate-500">{med.manufacturer || '-'}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatCurrency(med.selling_price)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] ${
                          med.sellable_quantity <= 0
                            ? 'bg-red-50 text-red-600'
                            : med.sellable_quantity <= med.reorder_level
                            ? 'bg-amber-50 text-amber-700'
                            : 'text-slate-800'
                        }`}
                      >
                        {med.sellable_quantity} units
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{med.reorder_level} units</td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(med)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeactivate(med.id, med.name)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Medicine Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMed ? 'Edit Medicine' : 'Add New Medicine'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Panadol 500mg Tablets"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Generic Formula</label>
              <input
                type="text"
                value={formData.generic_name}
                onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                placeholder="e.g. Paracetamol"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Manufacturer</label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="e.g. GSK, Abbott"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price (PKR) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reorder Level *</label>
            <input
              type="number"
              min="0"
              required
              value={formData.reorder_level}
              onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="text-[10px] text-slate-400 mt-1">Triggers low stock alert when sellable stock falls to or below this count.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Dosage, packaging, or usage notes..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingMed ? 'Save Changes' : 'Create Medicine'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
