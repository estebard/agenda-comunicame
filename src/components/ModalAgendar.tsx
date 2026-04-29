'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Save, AlertCircle } from 'lucide-react';
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
        // Traemos los pacientes con su saldo para que el admin sepa a quién priorizar
        const { data } = await supabase
          .from('vw_control_panel_agendamiento')
          .select('*')
          .order('saldo_tokens', { ascending: false });
        if (data) setPacientes(data);
      }
      fetchPacientes();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAgendar = async () => {
    if (!pacienteId) return alert('Seleccione un paciente');
    
    setIsSaving(true);
    const [h, m] = hora.split(':').map(Number);
    const inicio = new Date(dia);
    inicio.setHours(h, m, 0, 0);
    
    const fin = new Date(inicio);
    fin.setMinutes(fin.getMinutes() + 45); // Duración estándar 45 min

    const { error } = await supabase.from('cita').insert({
      paciente_id: pacienteId,
      profesional_id: profesionalId,
      fecha_hora_inicio: inicio.toISOString(),
      fecha_hora_fin: fin.toISOString(),
      es_recuperacion: esRecuperacion,
      estado: 'AGENDADA'
    });

    if (error) {
      alert('Error al agendar: ' + error.message);
    } else {
      onSuccess();
      onClose();
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg">Agendar Sesión</h3>
          <button onClick={onClose} className="hover:bg-blue-700 rounded-full p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <div className="text-sm text-blue-700 font-medium">Fecha y Hora Seleccionada:</div>
            <div className="text-lg font-bold text-blue-900 capitalize">
              {format(dia, 'EEEE dd/MM', { locale: es })} a las {hora}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Seleccionar Paciente</label>
            <select 
              className="w-full border-2 border-gray-200 rounded-lg p-3 focus:border-blue-500 focus:ring-0 outline-none transition-all"
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value)}
            >
              <option value="">-- Buscar en la nómina --</option>
              {pacientes.map(p => (
                <option key={p.paciente_id} value={p.paciente_id}>
                  {p.nombre_completo} (Saldo: {p.saldo_tokens})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <input 
              type="checkbox" 
              id="recup"
              checked={esRecuperacion}
              onChange={(e) => setEsRecuperacion(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="recup" className="text-sm font-semibold text-gray-700 cursor-pointer">
              ¿Es una sesión de recuperación?
            </label>
          </div>

          <button
            onClick={handleAgendar}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:bg-gray-400"
          >
            <Save size={20} />
            <span>{isSaving ? 'Procesando...' : 'Confirmar Agendamiento'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}