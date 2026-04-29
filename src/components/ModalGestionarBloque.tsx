'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { X, Save, UserCheck, AlertTriangle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  dia: Date;
  hora: string;
  profesional: any;
  citaExistente: any;
  onSuccess: () => void;
}

export default function ModalGestionarBloque({ isOpen, onClose, dia, hora, profesional, citaExistente, onSuccess }: ModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [pacientes, setPacientes] = useState<any[]>([]);
  
  // Estados del formulario
  const [pacienteId, setPacienteId] = useState('');
  const [estado, setEstado] = useState('AGENDADA');
  const [observacion, setObservacion] = useState('');
  const [esRecuperacion, setEsRecuperacion] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (citaExistente) {
        setEstado(citaExistente.estado || 'AGENDADA');
        setObservacion(citaExistente.observacion || '');
      } else {
        // Limpiar para nueva cita
        setPacienteId('');
        setEstado('AGENDADA');
        setObservacion('');
        setEsRecuperacion(false);
        fetchPacientes();
      }
    }
  }, [isOpen, citaExistente]);

  async function fetchPacientes() {
    const { data } = await supabase.from('paciente').select('id, nombre_completo').order('nombre_completo');
    if (data) setPacientes(data);
  }

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);

    if (citaExistente) {
      // ACTUALIZAR CITA EXISTENTE
      const { error } = await supabase
        .from('cita')
        .update({ estado, observacion })
        .eq('id', citaExistente.id);
      
      if (!error) {
        onSuccess();
        onClose();
      } else {
        alert('Error al actualizar: ' + error.message);
      }
    } else {
      // CREAR NUEVA CITA O BLOQUEO
      if (estado === 'BLOQUEADO') {
        // Lógica simplificada: guardamos una cita sin paciente como bloqueo
        const inicio = new Date(dia);
        const [h, m] = hora.split(':').map(Number);
        inicio.setHours(h, m, 0, 0);
        const fin = new Date(inicio);
        fin.setMinutes(fin.getMinutes() + 45);

        await supabase.from('cita').insert({
          profesional_id: profesional.id,
          fecha_hora_inicio: inicio.toISOString(),
          fecha_hora_fin: fin.toISOString(),
          estado: 'BLOQUEADO',
          observacion: observacion || 'Bloqueo manual'
        });
        onSuccess();
        onClose();
      } else {
        if (!pacienteId) {
          alert('Seleccione un paciente');
          setIsSaving(false);
          return;
        }
        const inicio = new Date(dia);
        const [h, m] = hora.split(':').map(Number);
        inicio.setHours(h, m, 0, 0);
        const fin = new Date(inicio);
        fin.setMinutes(fin.getMinutes() + 45);

        await supabase.from('cita').insert({
          paciente_id: pacienteId,
          profesional_id: profesional.id,
          fecha_hora_inicio: inicio.toISOString(),
          fecha_hora_fin: fin.toISOString(),
          es_recuperacion: esRecuperacion,
          estado: estado,
          observacion: observacion
        });
        onSuccess();
        onClose();
      }
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700 overflow-hidden">
        <div className="bg-slate-950 p-4 flex justify-between items-center border-b border-slate-800">
          <h3 className="font-black text-lg text-slate-100 uppercase tracking-widest">
            {citaExistente ? 'Gestionar Sesión' : 'Nuevo Registro'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">
                {profesional?.nombre} ({profesional?.especialidad})
              </span>
              <div className="text-lg font-black text-slate-200 capitalize">
                {format(dia, "EEEE dd", { locale: es })} a las {hora}
              </div>
            </div>
            <UserCheck className="text-slate-600" size={32} />
          </div>

          {!citaExistente && estado !== 'BLOQUEADO' && (
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">Paciente</label>
              <select 
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-bold text-slate-200 outline-none focus:border-blue-500"
                value={pacienteId}
                onChange={(e) => setPacienteId(e.target.value)}
              >
                <option value="">Seleccionar paciente...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase mb-2">Estado Operativo</label>
              <select 
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-bold text-slate-200 outline-none focus:border-blue-500"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                <option value="AGENDADA">Agendada (Base)</option>
                <option value="CONFIRMADA">✅ Confirmada</option>
                <option value="ASISTE">🟢 Asiste (Presente)</option>
                <option value="NO_ASISTE">🔴 No Asiste (Ausente)</option>
                <option value="CANCELADA">⚪ Cancelada</option>
                <option value="BLOQUEADO">🔒 Bloquear Horario</option>
              </select>
            </div>
          </div>

          {!citaExistente && estado !== 'BLOQUEADO' && (
            <div className="flex items-center space-x-3 p-3 bg-slate-800 rounded-xl border border-slate-700 cursor-pointer" onClick={() => setEsRecuperacion(!esRecuperacion)}>
              <input type="checkbox" checked={esRecuperacion} onChange={() => {}} className="w-5 h-5 accent-blue-600 rounded" />
              <span className="text-xs font-black text-slate-300 uppercase">Es sesión de recuperación</span>
            </div>
          )}

          <div>
            <label className="flex items-center text-xs font-black text-slate-500 uppercase mb-2">
              <MessageSquare size={14} className="mr-2" /> Observaciones (Excel)
            </label>
            <textarea 
              rows={3}
              placeholder="Ej: Posible recuperación 27-03, Confirmado..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 outline-none focus:border-blue-500 resize-none"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg transition-all disabled:bg-slate-600 uppercase tracking-widest flex justify-center items-center"
          >
            <Save size={18} className="mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}