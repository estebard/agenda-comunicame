'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Save } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  dia: Date;
  hora: string;
  profesionalId: string;
  onSuccess: () => void;
}

export default function ModalAgendar({ isOpen, onClose, dia, hora, profesionalId, onSuccess }: ModalProps) {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [pacienteId, setPacienteId] = useState('');
  const [esRecuperacion, setEsRecuperacion] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      async function fetchPacientes() {
        const { data } = await supabase.from('paciente').select('id, nombre_completo').order('nombre_completo');
        if (data) setPacientes(data);
      }
      fetchPacientes();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAgendar = async () => {
    if (!pacienteId || pacienteId === "" || !profesionalId) {
      alert('Por favor, seleccione un paciente de la lista.');
      return;
    }

    setIsSaving(true);
    const [h, m] = hora.split(':').map(Number);
    const inicio = new Date(dia);
    inicio.setHours(h, m, 0, 0);

    const fin = new Date(inicio);
    fin.setMinutes(fin.getMinutes() + 45);

    // Validar duplicados en el mismo slot
    const { data: duplicados } = await supabase
      .from('cita')
      .select('id, paciente:nombre_completo')
      .eq('profesional_id', profesionalId)
      .eq('fecha_hora_inicio', inicio.toISOString())
      .neq('estado', 'CANCELADA');

    if (duplicados && duplicados.length > 0) {
      alert(`Ya existe una cita en este bloque horario.`);
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from('cita').insert({
      paciente_id: pacienteId,
      profesional_id: profesionalId,
      fecha_hora_inicio: inicio.toISOString(),
      fecha_hora_fin: fin.toISOString(),
      es_recuperacion: esRecuperacion,
      estado: 'AGENDADA'
    });

    if (error) {
      alert('Error en base de datos: ' + error.message);
    } else {
      onSuccess();
      onClose();
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700 overflow-hidden">
        <div className="bg-slate-950 p-4 flex justify-between items-center border-b border-slate-800">
          <h3 className="font-black text-slate-100 uppercase tracking-widest flex items-center">
            Nuevo Agendamiento
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-slate-950 border border-slate-700 p-4 rounded-xl text-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bloque Seleccionado</span>
            <div className="text-lg font-black text-slate-200 mt-1">
              {format(dia, "EEEE dd 'de' MMMM", { locale: es })} — {hora} hrs
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Paciente</label>
            <select 
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-blue-500"
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
            >
              <option value="">Seleccionar de la lista...</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>{p.nombre_completo}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-700 rounded-xl cursor-pointer hover:border-purple-500/50 transition-colors">
            <input type="checkbox" checked={esRecuperacion} onChange={(e) => setEsRecuperacion(e.target.checked)}
              className="w-4 h-4 accent-purple-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marcar como Recuperación</span>
          </label>

          <button
            onClick={handleAgendar}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/50 text-white font-black py-4 rounded-xl shadow-lg transition-all uppercase text-xs tracking-widest"
          >
            {isSaving ? 'Guardando...' : 'Confirmar Cita'}
          </button>
        </div>
      </div>
    </div>
  );
}