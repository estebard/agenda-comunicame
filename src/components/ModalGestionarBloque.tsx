'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { Search, Save, X, Trash2 } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  dia: Date;
  hora: string;
  profesionalGrid: any;
  bloqueExistente: any; 
  onSuccess: () => void;
}

export default function ModalGestionarBloque({ isOpen, onClose, dia, hora, profesionalGrid, bloqueExistente, onSuccess }: ModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estados Asíncronos
  const [searchTerm, setSearchTerm] = useState('');
  const [pacientesResult, setPacientesResult] = useState<any[]>([]);
  const [citasDisponibles, setCitasDisponibles] = useState<any[]>([]);
  const [profesionalesTotales, setProfesionalesTotales] = useState<any[]>([]);

  // Estados Formulario
  const [pacienteId, setPacienteId] = useState('');
  const [citaSeleccionadaId, setCitaSeleccionadaId] = useState('');
  const [profesionalId, setProfesionalId] = useState('');
  const [estado, setEstado] = useState('ASISTE');
  const [observacion, setObservacion] = useState('');

  // 1. Inicialización Segura (Null-Safety)
  useEffect(() => {
    if (isOpen) {
      cargarProfesionales();
      const idProfesionalSeguro = profesionalGrid?.id || '';

      if (bloqueExistente) {
        setProfesionalId(bloqueExistente.profesionalId || idProfesionalSeguro);
        setEstado(bloqueExistente.estado || 'ASISTE');
        setObservacion(bloqueExistente.observacion || '');
        setCitaSeleccionadaId(bloqueExistente.citaOficialId || '');
      } else {
        setSearchTerm('');
        setPacientesResult([]);
        setCitasDisponibles([]);
        setPacienteId('');
        setCitaSeleccionadaId('');
        setProfesionalId(idProfesionalSeguro);
        setEstado('ASISTE');
        setObservacion('');
      }
    }
  }, [isOpen, bloqueExistente, profesionalGrid]);

  // 2. Motor de Búsqueda Typeahead con Debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim().length >= 3 && !pacienteId) {
        const { data } = await supabase.from('paciente')
          .select('id, nombre_completo')
          .ilike('nombre_completo', `%${searchTerm}%`)
          .limit(10);
        setPacientesResult(data || []);
      } else if (!searchTerm.trim()) {
        setPacientesResult([]);
      }
    }, 400); // 400ms delay para evitar saturación de BD

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, pacienteId]);

  const cargarProfesionales = async () => {
    const { data } = await supabase.from('profesional').select('id, nombre').order('nombre');
    if (data) setProfesionalesTotales(data);
  };

  // 3. Sincronización de UI y Estado de Paciente
  const seleccionarPaciente = async (id: string, nombreCompleto: string) => {
    setPacienteId(id);
    setSearchTerm(nombreCompleto); // Bloquea visualmente el input con el nombre
    setPacientesResult([]); // Cierra el menú desplegable

    const { data } = await supabase.from('cita')
      .select('id, fecha_hora_inicio, profesional:profesional_id(nombre)')
      .eq('paciente_id', id)
      .in('estado', ['AGENDADA', 'CONFIRMADA'])
      .order('fecha_hora_inicio', { ascending: false })
      .limit(15);
    setCitasDisponibles(data || []);
  };

  const limpiarSeleccion = () => {
    setSearchTerm('');
    setPacienteId('');
    setCitasDisponibles([]);
    setCitaSeleccionadaId('');
  };

  const handleSave = async () => {
    const targetCitaId = bloqueExistente ? bloqueExistente.citaOficialId : citaSeleccionadaId;
    
    if (!targetCitaId) return alert('Debe referenciar una ficha de agenda oficial.');
    setIsSaving(true);

    try {
      // Obtener paciente_id de la cita (para token)
      const { data: citaData } = await supabase
        .from('cita')
        .select('paciente_id')
        .eq('id', targetCitaId)
        .single();

      let newAsistenciaId: string | null = null;

      if (bloqueExistente?.isEjecucion) {
        const { error: errAsistencia } = await supabase.from('asistencia').update({
          profesional_id: profesionalId,
          estado,
          observacion
        }).eq('id', bloqueExistente.asistenciaId);
        if (errAsistencia) throw errAsistencia;
      } else {
        const inicioEjecucion = new Date(dia);
        const [h, m] = hora.split(':').map(Number);
        inicioEjecucion.setHours(h, m, 0, 0);

        const { data: inserted, error: errAsistencia } = await supabase.from('asistencia').insert([{
          cita_oficial_id: targetCitaId,
          profesional_id: profesionalId,
          fecha_hora_ejecucion: inicioEjecucion.toISOString(),
          estado,
          observacion
        }]).select('id');

        if (errAsistencia) throw errAsistencia;
        newAsistenciaId = inserted?.[0]?.id || null;
      }

      const { error: errCita } = await supabase.from('cita')
        .update({ observacion })
        .eq('id', targetCitaId);
      if (errCita) throw new Error(`Error sincronizando cita maestra: ${errCita.message}`);

      // Descontar token si asiste (solo primera vez)
      const debeDescontar = estado === 'ASISTE' && (
        newAsistenciaId !== null ||
        (bloqueExistente?.isEjecucion && bloqueExistente.estado !== 'ASISTE')
      );

      if (debeDescontar && citaData?.paciente_id) {
        const ledgerPayload: any = {
          paciente_id: citaData.paciente_id,
          tipo_operacion: 'CONSUMO_SESION',
          cantidad: -1,
          observacion: 'Consumo de 1 sesión'
        };
        if (newAsistenciaId) {
          ledgerPayload.referencia_asistencia_id = newAsistenciaId;
        } else if (bloqueExistente?.asistenciaId) {
          ledgerPayload.referencia_asistencia_id = bloqueExistente.asistenciaId;
        }
        await supabase.from('paciente_token_ledger').insert([ledgerPayload]);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Error transaccional DML: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminarEjecucion = async () => {
    if (!confirm('¿Eliminar este registro de ejecución? La cita volverá a su estado oficial planificado.')) return;
    setIsDeleting(true);
    try {
      await supabase.from('asistencia').delete().eq('id', bloqueExistente.asistenciaId);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Error al eliminar: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-black text-slate-100 uppercase tracking-widest text-sm">Control de Asistencia</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="bg-blue-900/20 border border-blue-900/50 p-3 rounded-xl text-center">
            <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Ejecución Operativa</div>
            <div className="text-lg font-black text-slate-200 mt-1">{hora} hrs</div>
          </div>

          {!bloqueExistente && (
            <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Buscar Paciente</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      placeholder="Escriba al menos 3 letras..." 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 pl-8 text-sm text-slate-200 focus:border-blue-500 outline-none disabled:opacity-50"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (pacienteId) limpiarSeleccion(); 
                      }}
                    />
                    <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                  </div>
                  {pacienteId && (
                    <button type="button" onClick={limpiarSeleccion} className="bg-red-900/20 hover:bg-red-900/40 p-2 rounded-lg transition-colors border border-red-900/50">
                      <X size={18} className="text-red-400" />
                    </button>
                  )}
                </div>

                {pacientesResult.length > 0 && !pacienteId && (
                  <div className="absolute w-full mt-1 max-h-40 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                    {pacientesResult.map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => seleccionarPaciente(p.id, p.nombre_completo)} 
                        className="p-3 hover:bg-slate-700 cursor-pointer text-sm text-slate-200 border-b border-slate-700/50 last:border-0 transition-colors"
                      >
                        {p.nombre_completo}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {pacienteId && citasDisponibles.length > 0 && (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Ficha Oficial a Referenciar</label>
                  <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-slate-200" value={citaSeleccionadaId} onChange={(e) => setCitaSeleccionadaId(e.target.value)}>
                    <option value="">-- Seleccione Agenda Oficial --</option>
                    {citasDisponibles.map(c => (
                      <option key={c.id} value={c.id}>{format(new Date(c.fecha_hora_inicio), 'dd/MM HH:mm')} - {c.profesional?.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Estado de Ejecución</label>
              <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200" value={estado} onChange={(e) => setEstado(e.target.value)}>
                <option value="ASISTE">Asiste</option>
                <option value="NO_ASISTE">No Asiste</option>
                <option value="CONFIRMADA">Confirmada</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Atiende / Ejecuta</label>
              <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200" value={profesionalId} onChange={(e) => setProfesionalId(e.target.value)}>
                {profesionalesTotales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Novedad / Observación Diaria</label>
            <textarea className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-slate-200 h-24 resize-none" value={observacion} onChange={(e) => setObservacion(e.target.value)} />
          </div>
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center gap-4">
          {/* Botón Eliminar: Solo disponible si ya existe una transacción de asistencia */}
          {bloqueExistente?.isEjecucion ? (
            <button onClick={handleEliminarEjecucion} disabled={isDeleting} className="text-[10px] font-black uppercase text-red-500 hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors flex items-center">
              <Trash2 size={14} className="mr-1" /> Eliminar Ejecución
            </button>
          ) : <div />}
          
          <button onClick={handleSave} disabled={isSaving || isDeleting} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase px-6 py-3 rounded-lg shadow-lg flex items-center transition-colors">
            <Save size={16} className="mr-2" /> Guardar Registro
          </button>
        </div>
      </div>
    </div>
  );
}