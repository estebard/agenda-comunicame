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
    // VALIDACIÓN CRÍTICA: Evitar UUID vacío
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200">
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white rounded-t-xl">
          <h3 className="font-bold text-lg uppercase tracking-tight">Nuevo Agendamiento</h3>
          <button onClick={onClose} className="hover:bg-blue-700 rounded-full p-1"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-100">
            <span className="text-xs font-black text-blue-400 uppercase">Bloque Seleccionado</span>
            <div className="text-xl font-black text-blue-900 leading-tight">
              {format(dia, "EEEE dd 'de' MMMM", { locale: es })} <br/> {hora} hrs
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-500 uppercase mb-2">Paciente</label>
            <select 
              className="w-full border-2 border-gray-300 rounded-lg p-3 font-bold text-gray-700 focus:border-blue-600 outline-none"
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
            >
              <option value="">Seleccionar de la lista...</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>{p.nombre_completo}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-200 cursor-pointer" onClick={() => setEsRecuperacion(!esRecuperacion)}>
            <input 
              type="checkbox" 
              checked={esRecuperacion} 
              onChange={() => {}} 
              className="w-5 h-5 accent-orange-600"
            />
            <span className="text-sm font-bold text-orange-800 uppercase">Marcar como Recuperación</span>
          </div>

          <button
            onClick={handleAgendar}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg transition-all disabled:bg-gray-400 uppercase"
          >
            {isSaving ? 'Guardando...' : 'Confirmar Cita'}
          </button>
        </div>
      </div>
    </div>
  );
}