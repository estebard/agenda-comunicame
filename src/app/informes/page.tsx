'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  FileText, PlusCircle, Edit3, Trash2, X, Search, Calendar as CalendarIcon, Clock
} from 'lucide-react';

const ESTADOS = ['Pendiente', 'En Proceso', 'Entregado', 'Cancelado'];

export default function InformesPage() {
  const [informes, setInformes] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingInforme, setEditingInforme] = useState<any>(null);
  const [formPacienteId, setFormPacienteId] = useState('');
  const [formProfesionalId, setFormProfesionalId] = useState('');
  const [formFechaEntrega, setFormFechaEntrega] = useState('');
  const [formEstado, setFormEstado] = useState('Pendiente');
  const [formNota, setFormNota] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    const [infRes, pacRes, profRes] = await Promise.all([
      supabase.from('informe_solicitado').select(`*, paciente:paciente_id(nombre_completo), profesional:profesional_id(nombre, especialidad)`).order('created_at', { ascending: false }),
      supabase.from('paciente').select('id, nombre_completo').order('nombre_completo'),
      supabase.from('profesional').select('id, nombre, especialidad').order('nombre')
    ]);
    if (infRes.data) setInformes(infRes.data);
    if (pacRes.data) setPacientes(pacRes.data);
    if (profRes.data) setProfesionales(profRes.data);
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormPacienteId('');
    setFormProfesionalId('');
    setFormFechaEntrega('');
    setFormEstado('Pendiente');
    setFormNota('');
    setEditingInforme(null);
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (inf: any) => {
    setEditingInforme(inf);
    setFormPacienteId(inf.paciente_id);
    setFormProfesionalId(inf.profesional_id);
    setFormFechaEntrega(inf.fecha_entrega_esperada || '');
    setFormEstado(inf.estado || 'Pendiente');
    setFormNota(inf.nota_observacion || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formPacienteId) { alert('Selecciona un paciente.'); return; }
    if (!formProfesionalId) { alert('Selecciona un profesional.'); return; }

    setIsProcessing(true);
    try {
      const payload: any = {
        paciente_id: formPacienteId,
        profesional_id: formProfesionalId,
        fecha_entrega_esperada: formFechaEntrega || null,
        estado: formEstado,
        nota_observacion: formNota.trim()
      };

      if (editingInforme) {
        const { error } = await supabase.from('informe_solicitado').update(payload).eq('id', editingInforme.id);
        if (error) throw error;
      } else {
        payload.fecha_solicitud = new Date().toISOString().split('T')[0];
        const { error } = await supabase.from('informe_solicitado').insert([payload]);
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

  const handleDelete = async (inf: any) => {
    if (!confirm(`¿Eliminar el informe de ${inf.paciente?.nombre_completo}?`)) return;
    try {
      const { error } = await supabase.from('informe_solicitado').delete().eq('id', inf.id);
      if (error) throw error;
      fetchAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const filtered = informes.filter(i => {
    const matchSearch = i.paciente?.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = filterEstado ? i.estado === filterEstado : true;
    return matchSearch && matchEstado;
  });

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Entregado': return 'bg-emerald-900/30 text-emerald-400 border-emerald-900/50';
      case 'En Proceso': return 'bg-blue-900/30 text-blue-400 border-blue-900/50';
      case 'Cancelado': return 'bg-red-900/30 text-red-400 border-red-900/50';
      default: return 'bg-amber-900/30 text-amber-400 border-amber-900/50';
    }
  };

  return (
    <main className="p-4 md:p-8 space-y-6 h-[calc(100vh-2rem)] flex flex-col">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter flex items-center">
            <FileText className="mr-3 text-blue-400" size={28} /> Informes Solicitados
          </h1>
          <p className="text-sm text-slate-400 font-medium mt-1">Seguimiento de informes clínicos y psicopedagógicos</p>
        </div>
        <button onClick={openNew} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-colors shadow-lg flex items-center">
          <PlusCircle size={16} className="mr-2" /> Nuevo Informe
        </button>
      </header>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por paciente..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 pl-10 text-sm font-bold outline-none focus:border-blue-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-200 outline-none focus:border-blue-500 cursor-pointer"
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-y-auto h-full">
          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-600 font-bold uppercase text-xs tracking-widest">
              No hay informes registrados
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-950">
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha Solicitud</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Paciente</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Profesional</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Entrega Esperada</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nota</th>
                  <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map(inf => (
                  <tr key={inf.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-4 text-xs font-bold text-slate-300">
                      {inf.fecha_solicitud ? format(new Date(inf.fecha_solicitud), 'dd/MM/yyyy', { locale: es }) : '—'}
                    </td>
                    <td className="p-4 text-sm font-bold text-slate-100">{inf.paciente?.nombre_completo}</td>
                    <td className="p-4">
                      <div className="text-xs font-bold text-slate-200">{inf.profesional?.nombre}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{inf.profesional?.especialidad}</div>
                    </td>
                    <td className="p-4 text-xs font-bold text-slate-300">
                      {inf.fecha_entrega_esperada ? (
                        <span className="flex items-center"><CalendarIcon size={12} className="mr-1 text-amber-400" /> {inf.fecha_entrega_esperada}</span>
                      ) : '—'}
                    </td>
                    <td className="p-4">
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase ${getEstadoColor(inf.estado)}`}>
                        {inf.estado || 'Pendiente'}
                      </span>
                    </td>
                    <td className="p-4 max-w-[200px]">
                      <span className="text-[10px] text-slate-400 italic line-clamp-2">{inf.nota_observacion || '—'}</span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(inf)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-700 hover:text-blue-400 transition-colors">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDelete(inf)} className="p-1.5 rounded-md text-slate-500 hover:bg-red-900/50 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-slate-100 uppercase tracking-widest text-sm">
                {editingInforme ? 'Editar Informe' : 'Nuevo Informe'}
              </h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Paciente <span className="text-red-500">*</span>
                </label>
                <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-blue-500"
                  value={formPacienteId} onChange={(e) => setFormPacienteId(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Profesional <span className="text-red-500">*</span>
                </label>
                <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-blue-500"
                  value={formProfesionalId} onChange={(e) => setFormProfesionalId(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {profesionales.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.especialidad})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Fecha Entrega Esperada
                </label>
                <input type="date" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-blue-500"
                  value={formFechaEntrega} onChange={(e) => setFormFechaEntrega(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Estado
                </label>
                <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-blue-500"
                  value={formEstado} onChange={(e) => setFormEstado(e.target.value)}>
                  {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Nota / Observación
                </label>
                <textarea className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-blue-500 resize-none"
                  rows={3} value={formNota} onChange={(e) => setFormNota(e.target.value)}
                  placeholder="Ej: Retomar sesiones antes de elaborar..." />
              </div>
            </div>
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center gap-4">
              <button onClick={() => { setShowForm(false); resetForm(); }}
                className="text-[10px] font-black uppercase text-red-500 hover:text-red-400 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={isProcessing || !formPacienteId || !formProfesionalId}
                className={`text-xs font-black uppercase px-6 py-3 rounded-lg shadow-lg transition-colors ${
                  isProcessing || !formPacienteId || !formProfesionalId
                    ? 'bg-blue-900/50 text-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}>
                {isProcessing ? 'Guardando...' : (editingInforme ? 'Actualizar' : 'Solicitar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
