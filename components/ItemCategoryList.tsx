
import React, { useState, useRef, useEffect } from 'react';
import { ItemCategory } from '../types';

interface Props {
  categories: ItemCategory[];
  onUpdateCategories: (categories: ItemCategory[]) => void;
}

type ModalMode = 'category' | 'subcategory' | null;

const ItemCategoryList: React.FC<Props> = ({ categories = [], onUpdateCategories }) => {
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<string | null>(null); // original name when editing
  const [inputValue, setInputValue] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modalMode && inputRef.current) inputRef.current.focus();
  }, [modalMode]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        openNewCategory();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const openNewCategory = () => {
    setEditingCategoryId(null);
    setEditingSubcategory(null);
    setInputValue('');
    setModalMode('category');
  };

  const openEditCategory = (cat: ItemCategory) => {
    setEditingCategoryId(cat.id);
    setEditingSubcategory(null);
    setInputValue(cat.name);
    setModalMode('category');
  };

  const openNewSubcategory = (catId: string) => {
    setEditingCategoryId(catId);
    setEditingSubcategory(null);
    setInputValue('');
    setModalMode('subcategory');
  };

  const openEditSubcategory = (catId: string, sub: string) => {
    setEditingCategoryId(catId);
    setEditingSubcategory(sub);
    setInputValue(sub);
    setModalMode('subcategory');
  };

  const closeModal = () => {
    setModalMode(null);
    setInputValue('');
    setEditingCategoryId(null);
    setEditingSubcategory(null);
  };

  const handleSave = () => {
    const val = inputValue.trim();
    if (!val) return;

    if (modalMode === 'category') {
      if (editingCategoryId) {
        // rename existing
        onUpdateCategories(categories.map(c => c.id === editingCategoryId ? { ...c, name: val } : c));
      } else {
        // new category
        const newCat: ItemCategory = {
          id: crypto.randomUUID(),
          name: val,
          subcategories: [],
          isActive: true,
        };
        onUpdateCategories([...categories, newCat]);
      }
    } else if (modalMode === 'subcategory' && editingCategoryId) {
      onUpdateCategories(categories.map(c => {
        if (c.id !== editingCategoryId) return c;
        if (editingSubcategory) {
          // rename
          return { ...c, subcategories: c.subcategories.map(s => s === editingSubcategory ? val : s) };
        } else {
          // add new — no duplicates
          if (c.subcategories.includes(val)) return c;
          return { ...c, subcategories: [...c.subcategories, val] };
        }
      }));
    }
    closeModal();
  };

  const deleteSubcategory = (catId: string, sub: string) => {
    onUpdateCategories(categories.map(c =>
      c.id === catId ? { ...c, subcategories: c.subcategories.filter(s => s !== sub) } : c
    ));
  };

  const deleteCategory = (catId: string) => {
    onUpdateCategories(categories.filter(c => c.id !== catId));
  };

  const toggleActive = (catId: string) => {
    onUpdateCategories(categories.map(c => c.id === catId ? { ...c, isActive: !c.isActive } : c));
  };

  const toggleExpand = (catId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));
  const activeCount = categories.filter(c => c.isActive).length;
  const totalSubs = categories.reduce((n, c) => n + c.subcategories.length, 0);

  const modalTitle =
    modalMode === 'category'
      ? editingCategoryId ? 'Edit Category' : 'New Category'
      : editingSubcategory ? 'Edit Subcategory' : 'New Subcategory';

  const parentCatName = modalMode === 'subcategory' && editingCategoryId
    ? categories.find(c => c.id === editingCategoryId)?.name
    : undefined;

  return (
    <div className="flex flex-col h-full bg-slate-50 select-none">
      {/* Toolbar */}
      <div className="bg-white border-b border-slate-200 p-2 flex gap-3 items-center shadow-sm z-10">
        <button
          onClick={openNewCategory}
          className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-[12px] font-semibold flex items-center gap-2 shadow-sm active:scale-95"
        >
          <span className="text-lg leading-none">+</span> New Category
        </button>
        <div className="h-6 w-px bg-slate-200 mx-1"></div>
        <span className="text-slate-400 text-[11px] font-medium italic">
          Double-click a row to edit · Click ▶ to expand subcategories
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-2">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-600 uppercase text-[11px] tracking-wider w-8"></th>
                <th className="px-4 py-3 font-semibold text-slate-600 uppercase text-[11px] tracking-wider">Category</th>
                <th className="px-4 py-3 font-semibold text-slate-600 uppercase text-[11px] tracking-wider text-center">Subcategories</th>
                <th className="px-4 py-3 font-semibold text-slate-600 uppercase text-[11px] tracking-wider text-center w-28">Status</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-[13px] italic">
                    No categories yet. Click "+ New Category" to create one.
                  </td>
                </tr>
              )}
              {sorted.map(cat => {
                const expanded = expandedIds.has(cat.id);
                return (
                  <React.Fragment key={cat.id}>
                    {/* Category row */}
                    <tr
                      className="hover:bg-blue-50/40 group cursor-pointer transition-colors"
                      onDoubleClick={() => openEditCategory(cat)}
                    >
                      <td className="px-2 py-3 text-center">
                        {cat.subcategories.length > 0 && (
                          <button
                            onClick={() => toggleExpand(cat.id)}
                            className="text-slate-400 hover:text-blue-600 transition-colors text-[11px] font-bold w-5 h-5 flex items-center justify-center"
                          >
                            {expanded ? '▼' : '▶'}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-semibold">{cat.name}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-slate-500 text-[12px]">
                            {cat.subcategories.length > 0 ? `${cat.subcategories.length} sub` : '—'}
                          </span>
                          <button
                            onClick={() => { openNewSubcategory(cat.id); setExpandedIds(p => new Set(p).add(cat.id)); }}
                            className="opacity-0 group-hover:opacity-100 text-[10px] font-black text-white bg-blue-500 hover:bg-blue-600 px-2 py-0.5 rounded transition-all"
                            title="Add subcategory"
                          >
                            + Sub
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cat.isActive}
                            onChange={() => toggleActive(cat.id)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                          <span className="ml-2 text-[11px] font-medium text-slate-500 w-12 text-left">
                            {cat.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </label>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete category "${cat.name}"? This cannot be undone.`)) deleteCategory(cat.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-[11px] font-black transition-all px-2 py-1 rounded hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>

                    {/* Subcategory rows */}
                    {expanded && cat.subcategories.map(sub => (
                      <tr
                        key={sub}
                        className="bg-blue-50/20 hover:bg-blue-50/60 group/sub cursor-pointer transition-colors"
                        onDoubleClick={() => openEditSubcategory(cat.id, sub)}
                      >
                        <td className="px-2 py-2"></td>
                        <td className="px-4 py-2 pl-10 text-slate-600 text-[12px] flex items-center gap-2">
                          <span className="text-slate-300 font-bold">└</span>
                          <span>{sub}</span>
                        </td>
                        <td className="px-4 py-2 text-center text-slate-400 text-[11px] italic">subcategory</td>
                        <td></td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => deleteSubcategory(cat.id, sub)}
                            className="opacity-0 group-hover/sub:opacity-100 text-red-400 hover:text-red-600 text-[11px] font-black transition-all px-2 py-0.5 rounded hover:bg-red-50"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-white border-t border-slate-200 px-4 py-2 flex justify-between items-center text-[11px] text-slate-400 font-medium">
        <div className="flex gap-4">
          <span>Categories: {categories.length}</span>
          <span>Active: {activeCount}</span>
          <span>Total Subcategories: {totalSubs}</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-600 text-[10px]">Ctrl+N</kbd>
          <span>New Category</span>
        </div>
      </div>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[2000]">
          <div className="bg-white rounded-2xl w-[95vw] h-[95vh] shadow-2xl overflow-hidden border border-white/20 flex flex-col">
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-slate-100">
              <div>
                <h3 className="text-slate-800 font-bold text-sm tracking-tight">{modalTitle}</h3>
                {parentCatName && (
                  <p className="text-[11px] text-slate-400 mt-0.5">Under: <span className="font-semibold text-blue-600">{parentCatName}</span></p>
                )}
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
              >✕</button>
            </div>
            <div className="p-8">
              <div className="space-y-2">
                <label className="text-[12px] font-semibold text-slate-500 ml-1">
                  {modalMode === 'category' ? 'Category Name' : 'Subcategory Name'}
                </label>
                <input
                  ref={inputRef}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none text-slate-700 placeholder:text-slate-300"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder={modalMode === 'category' ? 'e.g. Hardware, Electronics...' : 'e.g. Fasteners, Cables...'}
                />
              </div>
              <div className="mt-8 flex gap-3">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-xl transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!inputValue.trim()}
                  className="flex-[1.5] px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-40"
                >
                  {editingCategoryId && modalMode === 'category' ? 'Update Category' :
                    editingSubcategory ? 'Update Subcategory' :
                    modalMode === 'subcategory' ? 'Add Subcategory' : 'Save Category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemCategoryList;
