'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Save, CalendarPlus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotData: any; // Datos del bloque horario seleccionado
  onSuccess: () => void;
}

export default function ModalPlanificacion({ isOpen, onClose, slotData, onSuccess }: ModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [profesionales, setProfesionales] = useState<any[]>([]);
  
  const [pacienteId, setPacienteId] = useState('');
  const [profesionalId, setProfesionalId] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setPacienteId('');
      setProfesionalId('');
    }
  }, [isOpen]);

  async function fetchData() {
    const [pacientesRes, profsRes] = await Promise.all([
      supabase.from('paciente').select('id, nombre_completo').order('nombre_completo'),
      supabase.from('profesional').select('id, nombre, especialidad').order('nombre')
    ]);
    if (pacientesRes.data) setPacientes(pacientesRes.data);
    if (profsRes.data) setProfesionales(profsRes.data);
  }

  if (!isOpen || !slotData) return null;

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!pacienteId || !profesionalId) {
      alert("Debes seleccionar un Paciente y un Profesional.");
      return;
    }

    setIsSaving(true);
    try {
      // Por ahora guardamos en la tabla cita como "AGENDADA" para que se refleje inmediatamente
      const payload = {
        paciente_id: pacienteId,
        profesional_id: profesionalId,
        fecha_hora_inicio: slotData.start.toISOString(),
        fecha_hora_fin: slotData.end.toISOString(),
        estado: 'AGENDADA',
        observacion: 'Agendamiento Oficial'
      };

      const { error } = await supabase.from('cita').insert([payload]);
      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Error al guardar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 overflow-hidden">
        <div className="bg-slate-950 p-4 flex justify-between items-center border-b border-slate-800">
          <h3 className="font-black text-lg text-slate-100 uppercase tracking-widest flex items-center">
            <CalendarPlus className="mr-2 text-blue-400" size={20} />
            Agendar Bloque
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
            <div className="text-sm font-black text-slate-200 capitalize">
              {format(slotData.start, "EEEE dd 'de' MMMM", { locale: es })}
            </div>
            <div className="text-blue-400 font-black mt-1">
              {format(slotData.start, "HH:mm")} - {format(slotData.end, "HH:mm")} hrs
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase mb-2">Profesional</label>
            <select 
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-bold text-slate-200 outline-none focus:border-blue-500"
              value={profesionalId}
              onChange={(e) => setProfesionalId(e.target.value)}
            >
              <option value="">-- Seleccionar Profesional --</option>
              {profesionales.map(p => <option key={p.id} value={p.id}>{p.especialidad} {p.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase mb-2">Paciente</label>
            <select 
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-bold text-slate-200 outline-none focus:border-blue-500"
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
            >
              <option value="">-- Seleccionar Paciente --</option>
              {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
            </select>
          </div>

          <button
            type="button" 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg transition-all disabled:bg-slate-600 uppercase tracking-widest flex justify-center items-center"
          >
            <Save size={18} className="mr-2" />
            {isSaving ? 'Guardando...' : 'Fijar en Agenda Oficial'}
          </button>
        </div>
      </div>
    </div>
  );
}