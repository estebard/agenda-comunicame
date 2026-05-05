'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  PackageSearch, PlusCircle, Edit3, Trash2, X, Search, AlertTriangle
} from 'lucide-react';

const CATEGORIAS = ['Material Terapéutico', 'Insumos Escritorio', 'Aseo', 'Instrumentos', 'Otro'];

export default function InventarioPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formCategoria, setFormCategoria] = useState('Material Terapéutico');
  const [formArticulo, setFormArticulo] = useState('');
  const [formCantidad, setFormCantidad] = useState('');
  const [formEstado, setFormEstado] = useState('Disponible');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('inventario').select('*').order('categoria', { ascending: true }).order('articulo', { ascending: true });
    if (data) setItems(data);
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormCategoria('Material Terapéutico');
    setFormArticulo('');
    setFormCantidad('');
    setFormEstado('Disponible');
    setEditingItem(null);
  };

  const openNew = () => { resetForm(); setShowForm(true); };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormCategoria(item.categoria || 'Material Terapéutico');
    setFormArticulo(item.articulo || '');
    setFormCantidad(String(item.cantidad || 0));
    setFormEstado(item.estado || 'Disponible');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formArticulo.trim()) { alert('Ingresa el artículo.'); return; }
    const cantidad = parseInt(formCantidad);
    if (isNaN(cantidad) || cantidad < 0) { alert('Ingresa una cantidad válida.'); return; }

    setIsProcessing(true);
    try {
      const payload: any = {
        categoria: formCategoria,
        articulo: formArticulo.trim(),
        cantidad,
        estado: formEstado
      };

      if (editingItem) {
        const { error } = await supabase.from('inventario').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventario').insert([payload]);
        if (error) throw error;
      }

      setShowForm(false);
      resetForm();
      fetchAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`¿Eliminar "${item.articulo}" del inventario?`)) return;
    try {
      const { error } = await supabase.from('inventario').delete().eq('id', item.id);
      if (error) throw error;
      fetchAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const filtered = items.filter(i => {
    const matchSearch = i.articulo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = filterCategoria ? i.categoria === filterCategoria : true;
    return matchSearch && matchCategoria;
  });

  const grouped = filtered.reduce((acc: any, item) => {
    const cat = item.categoria || 'Otro';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const getCategoriaIcon = (cat: string) => {
    switch (cat) {
      case 'Material Terapéutico': return '🎨';
      case 'Insumos Escritorio': return '📝';
      case 'Aseo': return '🧹';
      case 'Instrumentos': return '🎵';
      default: return '📦';
    }
  };

  return (
    <main className="p-4 md:p-8 space-y-6 h-[calc(100vh-2rem)] flex flex-col">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter flex items-center">
            <PackageSearch className="mr-3 text-emerald-400" size={28} /> Inventario
          </h1>
          <p className="text-sm text-slate-400 font-medium mt-1">Materiales terapéuticos, insumos y recursos del centro</p>
        </div>
        <button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-colors shadow-lg flex items-center">
          <PlusCircle size={16} className="mr-2" /> Agregar Item
        </button>
      </header>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Buscar artículo..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 pl-10 text-sm font-bold outline-none focus:border-emerald-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-200 outline-none focus:border-emerald-500 cursor-pointer"
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-y-auto h-full p-4 space-y-6">
          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="text-center py-20 text-slate-600 font-bold uppercase text-xs tracking-widest">
              No hay artículos registrados
            </div>
          ) : (
            Object.entries(grouped).map(([categoria, items]: [string, any]) => (
              <div key={categoria}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{getCategoriaIcon(categoria)}</span>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{categoria}</h3>
                  <span className="text-[9px] font-bold text-slate-600">({items.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {(items as any[]).map(item => (
                    <div key={item.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-200 truncate">{item.articulo}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                            item.cantidad === 0 ? 'bg-red-900/30 text-red-400' :
                            item.cantidad <= 2 ? 'bg-amber-900/30 text-amber-400' :
                            'bg-emerald-900/30 text-emerald-400'
                          }`}>
                            {item.cantidad} un.
                          </span>
                          {item.estado && item.estado !== 'Disponible' && (
                            <span className="text-[9px] font-bold text-slate-500 flex items-center">
                              <AlertTriangle size={10} className="mr-0.5" /> {item.estado}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-700 hover:text-blue-400 transition-colors">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDelete(item)} className="p-1.5 rounded-md text-slate-500 hover:bg-red-900/50 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-slate-100 uppercase tracking-widest text-sm">
                {editingItem ? 'Editar Artículo' : 'Nuevo Artículo'}
              </h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Categoría</label>
                <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  value={formCategoria} onChange={(e) => setFormCategoria(e.target.value)}>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Artículo <span className="text-red-500">*</span>
                </label>
                <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-emerald-500"
                  value={formArticulo} onChange={(e) => setFormArticulo(e.target.value)} placeholder="Nombre del artículo" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Cantidad</label>
                  <input type="number" min="0" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    value={formCantidad} onChange={(e) => setFormCantidad(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Estado</label>
                  <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-emerald-500"
                    value={formEstado} onChange={(e) => setFormEstado(e.target.value)}>
                    <option value="Disponible">Disponible</option>
                    <option value="En Uso">En Uso</option>
                    <option value="Dañado">Dañado</option>
                    <option value="Reponer">Reponer</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center gap-4">
              <button onClick={() => { setShowForm(false); resetForm(); }}
                className="text-[10px] font-black uppercase text-red-500 hover:text-red-400 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={isProcessing || !formArticulo.trim()}
                className={`text-xs font-black uppercase px-6 py-3 rounded-lg shadow-lg transition-colors ${
                  isProcessing || !formArticulo.trim()
                    ? 'bg-emerald-900/50 text-emerald-300 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}>
                {isProcessing ? 'Guardando...' : (editingItem ? 'Actualizar' : 'Agregar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
