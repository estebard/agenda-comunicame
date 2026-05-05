'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Save, Trash2, User, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface ModalDetalleProps {
  isOpen: boolean;
  onClose: () => void;
  cita: any;
  onSuccess: () => void;
}

const HORARIOS = ['09:05', '10:00', '11:00', '12:00', '13:00', '14:00', '14:50', '15:40', '16:30', '17:20'];

export default function ModalDetalleCita({ isOpen, onClose, cita, onSuccess }: ModalDetalleProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [profesionales, setProfesionales] = useState<any[]>([]);

  // Estados del formulario
  const [pacienteId, setPacienteId] = useState('');
  const [profesionalId, setProfesionalId] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [estado, setEstado] = useState('');
  const [observacion, setObservacion] = useState('');
  const [esRecuperacion, setEsRecuperacion] = useState(false);

  useEffect(() => {
    if (isOpen && cita) {
      cargarDependencias();
      setPacienteId(cita.paciente_id || '');
      setProfesionalId(cita.profesional_id || '');
      setFecha(format(new Date(cita.fecha_hora_inicio), 'yyyy-MM-dd'));
      setHora(format(new Date(cita.fecha_hora_inicio), 'HH:mm'));
      setEstado(cita.estado || 'AGENDADA');
      setObservacion(cita.observacion || '');
      setEsRecuperacion(cita.es_recuperacion || false);
    }
  }, [isOpen, cita]);

  const cargarDependencias = async () => {
    const [pacientesRes, profsRes] = await Promise.all([
      supabase.from('paciente').select('id, nombre_completo').order('nombre_completo'),
      supabase.from('profesional').select('id, nombre, especialidad').order('nombre')
    ]);
    if (pacientesRes.data) setPacientes(pacientesRes.data);
    if (profsRes.data) setProfesionales(profsRes.data);
  };

  const handleUpdate = async () => {
    setIsSaving(true);
    try {
      const inicio = new Date(`${fecha}T${hora}:00`);
      const fin = new Date(inicio);
      fin.setMinutes(fin.getMinutes() + 45);

      const { error } = await supabase
        .from('cita')
        .update({
          paciente_id: pacienteId,
          profesional_id: profesionalId,
          fecha_hora_inicio: inicio.toISOString(),
          fecha_hora_fin: fin.toISOString(),
          estado,
          es_recuperacion: esRecuperacion,
          observacion
        })
        .eq('id', cita.id);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Error al actualizar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirm('¿Eliminar definitivamente este bloque oficial?')) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('cita').delete().eq('id', cita.id);
      if (error) throw error;
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !cita) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-950 p-4 flex justify-between items-center border-b border-slate-800">
          <h3 className="font-black text-lg text-slate-100 uppercase tracking-widest flex items-center">
            <User className="mr-2 text-blue-400" size={20} /> Editar Ficha Oficial
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Paciente</label>
            <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Profesional</label>
            <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200" value={profesionalId} onChange={(e) => setProfesionalId(e.target.value)}>
              {profesionales.map(p => <option key={p.id} value={p.id}>{p.especialidad} {p.nombre}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Fecha Oficial</label>
              <input type="date" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Bloque Horario</label>
              <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200" value={hora} onChange={(e) => setHora(e.target.value)}>
                {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Estado</label>
            <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="AGENDADA">Agendada</option>
              <option value="CONFIRMADA">Confirmada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>

          <label className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-700 rounded-lg cursor-pointer hover:border-purple-500/50 transition-colors">
            <input type="checkbox" checked={esRecuperacion} onChange={(e) => setEsRecuperacion(e.target.checked)}
              className="w-4 h-4 accent-purple-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase">Sesión de Recuperación</span>
          </label>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Observación Oficial</label>
            <textarea className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 h-20" value={observacion} onChange={(e) => setObservacion(e.target.value)} />
          </div>
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between">
          <button onClick={handleEliminar} disabled={isDeleting || isSaving} className="text-[10px] font-black uppercase text-red-500 hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors flex items-center">
            <Trash2 size={14} className="mr-1" /> Eliminar
          </button>
          <button onClick={handleUpdate} disabled={isSaving || isDeleting} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase px-6 py-2 rounded-lg shadow-lg flex items-center transition-colors">
            <Save size={14} className="mr-2" /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}