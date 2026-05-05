'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ActivitySquare, PlusCircle, Edit3, Trash2, X, Search, CheckCircle2, AlertCircle, Calendar as CalendarIcon, Clock
} from 'lucide-react';

export default function Ados2Page() {
  const [citaciones, setCitaciones] = useState<any[]>([]);
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEtapa, setFilterEtapa] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingCitacion, setEditingCitacion] = useState<any>(null);
  const [formExaminadorId, setFormExaminadorId] = useState('');
  const [formNombreTutor, setFormNombreTutor] = useState('');
  const [formNombreUsuario, setFormNombreUsuario] = useState('');
  const [formEdad, setFormEdad] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formFechaEntrevista, setFormFechaEntrevista] = useState('');
  const [formHoraEntrevista, setFormHoraEntrevista] = useState('');
  const [formEntrevistaRealizada, setFormEntrevistaRealizada] = useState(false);
  const [formFechaEvaluacion, setFormFechaEvaluacion] = useState('');
  const [formHoraEvaluacion, setFormHoraEvaluacion] = useState('');
  const [formEvaluacionRealizada, setFormEvaluacionRealizada] = useState(false);
  const [formFechaEntrega, setFormFechaEntrega] = useState('');
  const [formInformeEntregado, setFormInformeEntregado] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    const [citRes, profRes] = await Promise.all([
      supabase.from('citacion_ados2').select(`*, examinador:examinador_id(nombre, especialidad)`).order('fecha_solicitud', { ascending: false }),
      supabase.from('profesional').select('id, nombre, especialidad').order('nombre')
    ]);
    if (citRes.data) setCitaciones(citRes.data);
    if (profRes.data) setProfesionales(profRes.data);
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormExaminadorId('');
    setFormNombreTutor('');
    setFormNombreUsuario('');
    setFormEdad('');
    setFormTelefono('');
    setFormFechaEntrevista('');
    setFormHoraEntrevista('');
    setFormEntrevistaRealizada(false);
    setFormFechaEvaluacion('');
    setFormHoraEvaluacion('');
    setFormEvaluacionRealizada(false);
    setFormFechaEntrega('');
    setFormInformeEntregado(false);
    setEditingCitacion(null);
  };

  const openNew = () => { resetForm(); setShowForm(true); };

  const openEdit = (c: any) => {
    setEditingCitacion(c);
    setFormExaminadorId(c.examinador_id || '');
    setFormNombreTutor(c.nombre_tutor || '');
    setFormNombreUsuario(c.nombre_usuario || '');
    setFormEdad(c.edad || '');
    setFormTelefono(c.telefono || '');
    setFormFechaEntrevista(c.fecha_hora_entrevista ? format(new Date(c.fecha_hora_entrevista), 'yyyy-MM-dd') : '');
    setFormHoraEntrevista(c.fecha_hora_entrevista ? format(new Date(c.fecha_hora_entrevista), 'HH:mm') : '');
    setFormEntrevistaRealizada(c.entrevista_realizada || false);
    setFormFechaEvaluacion(c.fecha_hora_evaluacion ? format(new Date(c.fecha_hora_evaluacion), 'yyyy-MM-dd') : '');
    setFormHoraEvaluacion(c.fecha_hora_evaluacion ? format(new Date(c.fecha_hora_evaluacion), 'HH:mm') : '');
    setFormEvaluacionRealizada(c.evaluacion_realizada || false);
    setFormFechaEntrega(c.fecha_entrega_informe ? format(new Date(c.fecha_entrega_informe), 'yyyy-MM-dd') : '');
    setFormInformeEntregado(c.informe_entregado || false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formExaminadorId) { alert('Selecciona un examinador.'); return; }
    if (!formNombreUsuario.trim()) { alert('Ingresa el nombre del usuario.'); return; }

    setIsProcessing(true);
    try {
      const payload: any = {
        examinador_id: formExaminadorId,
        nombre_tutor: formNombreTutor.trim(),
        nombre_usuario: formNombreUsuario.trim(),
        edad: formEdad.trim(),
        telefono: formTelefono.trim(),
        fecha_hora_entrevista: formFechaEntrevista && formHoraEntrevista ? `${formFechaEntrevista}T${formHoraEntrevista}:00` : null,
        entrevista_realizada: formEntrevistaRealizada,
        fecha_hora_evaluacion: formFechaEvaluacion && formHoraEvaluacion ? `${formFechaEvaluacion}T${formHoraEvaluacion}:00` : null,
        evaluacion_realizada: formEvaluacionRealizada,
        fecha_entrega_informe: formFechaEntrega || null,
        informe_entregado: formInformeEntregado
      };

      if (editingCitacion) {
        const { error } = await supabase.from('citacion_ados2').update(payload).eq('id', editingCitacion.id);
        if (error) throw error;
      } else {
        payload.fecha_solicitud = new Date().toISOString().split('T')[0];
        const { error } = await supabase.from('citacion_ados2').insert([payload]);
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

  const handleDelete = async (c: any) => {
    if (!confirm(`¿Eliminar la citación ADOS-2 de ${c.nombre_usuario}?`)) return;
    try {
      const { error } = await supabase.from('citacion_ados2').delete().eq('id', c.id);
      if (error) throw error;
      fetchAll();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const getEtapa = (c: any) => {
    if (c.informe_entregado) return 'Entregado';
    if (c.evaluacion_realizada) return 'Evaluación Realizada';
    if (c.fecha_hora_evaluacion) return 'Evaluación Programada';
    if (c.entrevista_realizada) return 'Entrevista Realizada';
    if (c.fecha_hora_entrevista) return 'Entrevista Programada';
    return 'Solicitado';
  };

  const getEtapaColor = (etapa: string) => {
    switch (etapa) {
      case 'Entregado': return 'bg-emerald-900/30 text-emerald-400 border-emerald-900/50';
      case 'Evaluación Realizada': return 'bg-purple-900/30 text-purple-400 border-purple-900/50';
      case 'Evaluación Programada': return 'bg-blue-900/30 text-blue-400 border-blue-900/50';
      case 'Entrevista Realizada': return 'bg-amber-900/30 text-amber-400 border-amber-900/50';
      case 'Entrevista Programada': return 'bg-slate-700/50 text-slate-300 border-slate-600/50';
      default: return 'bg-red-900/20 text-red-400 border-red-900/30';
    }
  };

  const filtered = citaciones.filter(c => {
    const matchSearch = c.nombre_usuario?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.nombre_tutor?.toLowerCase().includes(searchTerm.toLowerCase());
    const etapa = getEtapa(c);
    const matchEtapa = filterEtapa ? etapa === filterEtapa : true;
    return matchSearch && matchEtapa;
  });

  const ETAPAS = ['Solicitado', 'Entrevista Programada', 'Entrevista Realizada', 'Evaluación Programada', 'Evaluación Realizada', 'Entregado'];

  return (
    <main className="p-4 md:p-8 space-y-6 h-[calc(100vh-2rem)] flex flex-col">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter flex items-center">
            <ActivitySquare className="mr-3 text-purple-400" size={28} /> Citaciones ADOS-2
          </h1>
          <p className="text-sm text-slate-400 font-medium mt-1">Evaluaciones diagnósticas ADOS-2: entrevistas, sesiones e informes</p>
        </div>
        <button onClick={openNew} className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-colors shadow-lg flex items-center">
          <PlusCircle size={16} className="mr-2" /> Nueva Citación
        </button>
      </header>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por usuario o tutor..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 pl-10 text-sm font-bold outline-none focus:border-purple-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-200 outline-none focus:border-purple-500 cursor-pointer"
          value={filterEtapa}
          onChange={(e) => setFilterEtapa(e.target.value)}
        >
          <option value="">Todas las etapas</option>
          {ETAPAS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-y-auto h-full">
          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-600 font-bold uppercase text-xs tracking-widest">
              No hay citaciones ADOS-2 registradas
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filtered.map(c => {
                const etapa = getEtapa(c);
                return (
                  <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-colors group">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-sm font-black text-slate-100 uppercase">{c.nombre_usuario}</div>
                        <div className="flex gap-4 mt-1">
                          <span className="text-[10px] font-bold text-slate-500">Edad: {c.edad || '—'}</span>
                          <span className="text-[10px] font-bold text-slate-500">Tutor: {c.nombre_tutor || '—'}</span>
                          {c.telefono && <span className="text-[10px] font-bold text-slate-500">Tel: {c.telefono}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase ${getEtapaColor(etapa)}`}>
                          {etapa}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(c)} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-700 hover:text-purple-400 transition-colors">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleDelete(c)} className="p-1.5 rounded-md text-slate-500 hover:bg-red-900/50 hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-[10px]">
                      <div className="bg-slate-900/50 rounded-lg p-2.5">
                        <div className="font-black text-slate-500 uppercase mb-1 flex items-center"><CalendarIcon size={10} className="mr-1" /> Solicitud</div>
                        <div className="text-slate-300 font-bold">{c.fecha_solicitud ? format(new Date(c.fecha_solicitud), 'dd/MM/yyyy') : '—'}</div>
                        <div className="text-slate-500 mt-0.5">Examinador: {c.examinador?.nombre || '—'}</div>
                      </div>

                      <div className={`rounded-lg p-2.5 ${c.fecha_hora_entrevista ? 'bg-slate-900/80' : 'bg-slate-900/30'}`}>
                        <div className="font-black text-slate-500 uppercase mb-1 flex items-center">
                          {c.entrevista_realizada ? <CheckCircle2 size={10} className="mr-1 text-emerald-400" /> : <AlertCircle size={10} className="mr-1 text-amber-400" />}
                          Entrevista
                        </div>
                        {c.fecha_hora_entrevista ? (
                          <div className="text-slate-300 font-bold">{format(new Date(c.fecha_hora_entrevista), "dd/MM/yyyy HH:mm")} hrs</div>
                        ) : <div className="text-slate-600 font-bold">No programada</div>}
                      </div>

                      <div className={`rounded-lg p-2.5 ${c.fecha_hora_evaluacion ? 'bg-slate-900/80' : 'bg-slate-900/30'}`}>
                        <div className="font-black text-slate-500 uppercase mb-1 flex items-center">
                          {c.evaluacion_realizada ? <CheckCircle2 size={10} className="mr-1 text-emerald-400" /> : <AlertCircle size={10} className="mr-1 text-amber-400" />}
                          Evaluación
                        </div>
                        {c.fecha_hora_evaluacion ? (
                          <div className="text-slate-300 font-bold">{format(new Date(c.fecha_hora_evaluacion), "dd/MM/yyyy HH:mm")} hrs</div>
                        ) : <div className="text-slate-600 font-bold">No programada</div>}
                      </div>
                    </div>

                    {c.fecha_entrega_informe && (
                      <div className="mt-2 bg-purple-900/10 border border-purple-900/30 rounded-lg p-2 flex items-center gap-2">
                        <CalendarIcon size={12} className="text-purple-400" />
                        <span className="text-[10px] font-bold text-purple-400 uppercase">Entrega informe: {format(new Date(c.fecha_entrega_informe), "dd/MM/yyyy")}</span>
                        {c.informe_entregado && <CheckCircle2 size={12} className="text-emerald-400 ml-1" />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-lg border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-slate-100 uppercase tracking-widest text-sm">
                {editingCitacion ? 'Editar Citación ADOS-2' : 'Nueva Citación ADOS-2'}
              </h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Examinador <span className="text-red-500">*</span>
                  </label>
                  <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-purple-500"
                    value={formExaminadorId} onChange={(e) => setFormExaminadorId(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {profesionales.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.especialidad})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Edad
                  </label>
                  <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-purple-500"
                    value={formEdad} onChange={(e) => setFormEdad(e.target.value)} placeholder="Ej: 5 años" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Nombre del Usuario <span className="text-red-500">*</span>
                </label>
                <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-purple-500"
                  value={formNombreUsuario} onChange={(e) => setFormNombreUsuario(e.target.value)} placeholder="Nombre completo del usuario" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tutor</label>
                  <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-purple-500"
                    value={formNombreTutor} onChange={(e) => setFormNombreTutor(e.target.value)} placeholder="Nombre del tutor" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Teléfono</label>
                  <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-purple-500"
                    value={formTelefono} onChange={(e) => setFormTelefono(e.target.value)} placeholder="569..." />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3">Entrevista</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1">Fecha</label>
                    <input type="date" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-purple-500"
                      value={formFechaEntrevista} onChange={(e) => setFormFechaEntrevista(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1">Hora</label>
                    <input type="time" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-purple-500"
                      value={formHoraEntrevista} onChange={(e) => setFormHoraEntrevista(e.target.value)} />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formEntrevistaRealizada} onChange={(e) => setFormEntrevistaRealizada(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase">Realizada</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">Evaluación</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1">Fecha</label>
                    <input type="date" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-purple-500"
                      value={formFechaEvaluacion} onChange={(e) => setFormFechaEvaluacion(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1">Hora</label>
                    <input type="time" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-purple-500"
                      value={formHoraEvaluacion} onChange={(e) => setFormHoraEvaluacion(e.target.value)} />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formEvaluacionRealizada} onChange={(e) => setFormEvaluacionRealizada(e.target.checked)}
                        className="w-4 h-4 accent-blue-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase">Realizada</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">Informe</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1">Fecha Entrega</label>
                    <input type="date" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-purple-500"
                      value={formFechaEntrega} onChange={(e) => setFormFechaEntrega(e.target.value)} />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formInformeEntregado} onChange={(e) => setFormInformeEntregado(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500" />
                      <span className="text-[9px] font-black text-slate-400 uppercase">Entregado</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center gap-4">
              <button onClick={() => { setShowForm(false); resetForm(); }}
                className="text-[10px] font-black uppercase text-red-500 hover:text-red-400 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={isProcessing || !formExaminadorId || !formNombreUsuario.trim()}
                className={`text-xs font-black uppercase px-6 py-3 rounded-lg shadow-lg transition-colors ${
                  isProcessing || !formExaminadorId || !formNombreUsuario.trim()
                    ? 'bg-purple-900/50 text-purple-300 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}>
                {isProcessing ? 'Guardando...' : (editingCitacion ? 'Actualizar' : 'Solicitar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
