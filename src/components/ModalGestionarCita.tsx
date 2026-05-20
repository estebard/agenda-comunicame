'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format, addWeeks, getDay, getDaysInMonth, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { X, Save, Trash2, RefreshCw, ArrowRight, Plus } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  dia: Date;
  hora: string;
  profesionalId: string;
  profesionalNombre?: string;
  citaExistente: any;
  onSuccess: () => void;
}

const HORARIOS = ['09:05', '10:00', '11:00', '12:00', '14:00', '14:50', '15:40', '16:30', '17:20'];

export default function ModalGestionarCita({ isOpen, onClose, dia, hora, profesionalId, profesionalNombre, citaExistente, onSuccess }: ModalProps) {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [citasOriginales, setCitasOriginales] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [pacienteId, setPacienteId] = useState('');
  const [estado, setEstado] = useState('AGENDADA');
  const [esRecuperacion, setEsRecuperacion] = useState(false);
  const [observacion, setObservacion] = useState('');
  const [vincularOriginal, setVincularOriginal] = useState(false);
  const [originalId, setOriginalId] = useState('');

  // Adelantar
  const [showAdelantar, setShowAdelantar] = useState(false);
  const [adelantarFecha, setAdelantarFecha] = useState('');
  const [adelantarHora, setAdelantarHora] = useState('');

  useEffect(() => {
    if (isOpen) {
      console.log('[MODAL] abierto | esCrear:', !citaExistente, '| estado:', citaExistente?.estado, '| id:', citaExistente?.id?.slice(0,8) || 'null');
      supabase.from('paciente').select('id, nombre_completo').eq('activo', true).order('nombre_completo').then(({ data }) => {
        if (data) setPacientes(data);
      });

      if (citaExistente) {
        setPacienteId(citaExistente.paciente_id || '');
        setEstado(citaExistente.estado || 'AGENDADA');
        setEsRecuperacion(citaExistente.es_recuperacion || false);
        setObservacion(citaExistente.observacion || '');
        setVincularOriginal(false);
        setOriginalId('');
      } else {
        setPacienteId('');
        setEstado('AGENDADA');
        setEsRecuperacion(false);
        setObservacion('');
        setVincularOriginal(false);
        setOriginalId('');
        setShowAdelantar(false);
      }
      setCitasOriginales([]);
    }
  }, [isOpen, citaExistente]);

  useEffect(() => {
    if (vincularOriginal && pacienteId) {
      supabase.from('cita')
        .select('id, fecha_hora_inicio, estado, es_recuperacion, profesional:profesional_id(nombre)')
        .eq('paciente_id', pacienteId)
        .in('estado', ['AGENDADA', 'CONFIRMADA', 'ASISTE', 'NO_ASISTE'])
        .order('fecha_hora_inicio', { ascending: false })
        .limit(30)
        .then(({ data }) => { if (data) setCitasOriginales(data); });
    } else {
      setCitasOriginales([]);
      setOriginalId('');
    }
  }, [vincularOriginal, pacienteId]);

  const esCrear = !citaExistente;
  const bloqueada = !esCrear && citaExistente?.estado === 'REASIGNADA';

  useEffect(() => {
    if (isOpen) console.log('[MODAL] bloqueada:', bloqueada, '| estado:', citaExistente?.estado);
  }, [isOpen, bloqueada, citaExistente?.estado]);

  if (!isOpen) return null;
  const originalSeleccionada = citasOriginales.find(c => c.id === originalId);

  const getPreviewText = () => {
    if (!originalSeleccionada) return '';
    const fechaOrig = new Date(originalSeleccionada.fecha_hora_inicio);
    const hoy = new Date();
    const esPasada = fechaOrig < hoy;
    return esPasada
      ? 'Recupera del ' + format(fechaOrig, 'dd/MM HH:mm')
      : 'Se adelanta del ' + format(fechaOrig, 'dd/MM HH:mm');
  };

  const handleSave = async () => {
    if (!pacienteId) { alert('Selecciona un paciente.'); return; }
    setIsSaving(true);

    try {
      const [h, m] = hora.split(':').map(Number);
      const inicio = new Date(dia);
      inicio.setHours(h, m, 0, 0);
      const fin = new Date(inicio);
      fin.setMinutes(fin.getMinutes() + 45);

      if (esCrear) {
        // Guard: si es edición y está REASIGNADA, bloquear
        if (bloqueada) {
          alert('Esta cita está reasignada a otra sesión. No se puede modificar.');
          setIsSaving(false); return;
        }

        // Validar duplicados: solo el mismo paciente en el mismo slot
        const { data: dup } = await supabase.from('cita')
          .select('id').eq('profesional_id', profesionalId)
          .eq('paciente_id', pacienteId)
          .gte('fecha_hora_inicio', new Date(inicio.getTime() - 300000).toISOString())
          .lte('fecha_hora_inicio', new Date(inicio.getTime() + 300000).toISOString())
          .neq('estado', 'CANCELADA');
        if (dup && dup.length > 0) { alert('Este paciente ya tiene una cita en este slot.'); setIsSaving(false); return; }

        const payload: any = {
          paciente_id: pacienteId,
          profesional_id: profesionalId,
          fecha_hora_inicio: inicio.toISOString(),
          fecha_hora_fin: fin.toISOString(),
          estado: 'AGENDADA',
          observacion: observacion.trim() || null
        };

        if (vincularOriginal && originalId) {
          const { data: orgData } = await supabase.from('cita')
            .select('fecha_hora_inicio, observacion').eq('id', originalId).single();

          if (orgData) {
            const fechaOrig = new Date(orgData.fecha_hora_inicio);
            const profName = profesionalNombre || '';

            const { error: errUpdate } = await supabase.from('cita').update({
              estado: 'REASIGNADA',
              observacion: (orgData.observacion ? orgData.observacion + ' | ' : '') +
                'Reasignada al ' + format(dia, 'dd/MM') + ' ' + hora + ' con ' + profName
            }).eq('id', originalId);

            if (errUpdate) {
              alert('Error al actualizar cita original: ' + errUpdate.message);
              setIsSaving(false);
              return;
            }

            payload.referencia_cita_id = originalId;
            payload.observacion = (observacion.trim() ? observacion.trim() + ' | ' : '') +
              'Original: ' + format(fechaOrig, 'dd/MM HH:mm') + ' — ' + profName;
          }
        }

        // GRUPO: si el slot ya tiene citas activas, marcar todas como grupo
        const { data: existentes } = await supabase.from('cita')
          .select('id').eq('profesional_id', profesionalId)
          .gte('fecha_hora_inicio', new Date(inicio.getTime() - 300000).toISOString())
          .lte('fecha_hora_inicio', new Date(inicio.getTime() + 300000).toISOString())
          .not('estado', 'in', '("CANCELADA","REASIGNADA")');
        if (existentes && existentes.length > 0) {
          payload.grupo = true;
          await supabase.from('cita').update({ grupo: true }).in('id', existentes.map((e: any) => e.id));
        }

        const initialInsert = [payload];
        if (!vincularOriginal) {
          const diaSemana = getDay(dia);
          const inicioMes = startOfMonth(dia);
          const diasEnMes = getDaysInMonth(dia);
          for (let d = 1; d <= diasEnMes; d++) {
            const f = new Date(inicioMes.getFullYear(), inicioMes.getMonth(), d);
            if (getDay(f) === diaSemana && f > dia) {
              const ir = new Date(f);
              ir.setHours(h, m, 0, 0);
              initialInsert.push({
                paciente_id: pacienteId, profesional_id: profesionalId,
                fecha_hora_inicio: ir.toISOString(),
                fecha_hora_fin: new Date(ir.getTime() + 45 * 60000).toISOString(),
                estado: 'AGENDADA',
                es_recuperacion: false,
                observacion: null
              });
            }
          }
        }
        const { error } = await supabase.from('cita').insert(initialInsert);
        if (error) throw error;
      } else {
        await supabase.from('cita').update({
          estado, es_recuperacion: esRecuperacion, observacion: observacion.trim() || null
        }).eq('id', citaExistente.id);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar esta cita definitivamente?')) return;
    setIsDeleting(true);
    try {
      // Guard: si está REASIGNADA, bloquear
      if (citaExistente?.estado === 'REASIGNADA') {
        alert('Esta cita está reasignada a otra sesión. No se puede eliminar.');
        setIsDeleting(false); return;
      }

      const citasToDelete = [citaExistente.id];
      if (citaExistente.referencia_cita_id) {
        await supabase.from('cita').update({ observacion: null }).eq('id', citaExistente.referencia_cita_id);
      }
      await supabase.from('cita').delete().in('id', citasToDelete);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAdelantar = async () => {
    if (!adelantarFecha || !adelantarHora) { alert('Selecciona fecha y hora.'); return; }
    setIsSaving(true);
    try {
      const [ah, am] = adelantarHora.split(':').map(Number);
      const inicioAd = new Date(adelantarFecha + 'T12:00:00');
      inicioAd.setHours(ah, am, 0, 0);

      const profName = profesionalNombre || '';
      const { error: errUpdate } = await supabase.from('cita').update({
        estado: 'REASIGNADA',
        observacion: (citaExistente.observacion ? citaExistente.observacion + ' | ' : '') +
          'Reasignada al ' + format(inicioAd, 'dd/MM HH:mm') + ' con ' + profName
      }).eq('id', citaExistente.id);

      if (errUpdate) {
        alert('Error al actualizar cita original: ' + errUpdate.message);
        setIsSaving(false);
        return;
      }

      await supabase.from('cita').insert({
        paciente_id: citaExistente.paciente_id,
        profesional_id: citaExistente.profesional_id,
        fecha_hora_inicio: inicioAd.toISOString(),
        fecha_hora_fin: new Date(inicioAd.getTime() + 45 * 60000).toISOString(),
        estado: 'AGENDADA',
        referencia_cita_id: citaExistente.id,
        observacion: 'Original: ' + format(new Date(citaExistente.fecha_hora_inicio), 'dd/MM HH:mm') + ' — ' + profName
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getEstadoColor = (est: string) => {
    switch (est) {
      case 'CONFIRMADA': return 'text-blue-400';
      case 'ASISTE': return 'text-emerald-400';
      case 'NO_ASISTE': return 'text-red-400';
      case 'CANCELADA': return 'text-slate-500 line-through';
      default: return 'text-amber-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="font-black text-slate-100 uppercase tracking-widest text-sm">
            {esCrear ? 'Nueva Cita' : 'Editar Cita'} — {format(dia, 'dd/MM', { locale: es })} {hora}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Paciente */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Paciente</label>
            {esCrear ? (
              <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-blue-500"
                value={pacienteId} onChange={(e) => { setPacienteId(e.target.value); setVincularOriginal(false); }}>
                <option value="">Seleccionar...</option>
                {pacientes.map(p => <option key={p.id} value={p.id}>{p.nombre_completo}</option>)}
              </select>
            ) : (
              <div className="text-sm font-bold text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-700">
                {citaExistente?.paciente?.nombre_completo || '—'}
              </div>
            )}
          </div>

          {/* Profesional */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Profesional</label>
            <div className="text-sm font-bold text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-700">
              {citaExistente?.profesional?.nombre || profesionalNombre || '—'}
            </div>
          </div>

          {/* Crear: vincular */}
          {esCrear && (
            <>
              <label className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-700 rounded-xl cursor-pointer hover:border-purple-500/50 transition-colors"
                onClick={() => { if (pacienteId) setVincularOriginal(!vincularOriginal); else alert('Selecciona un paciente primero.'); }}>
                <input type="checkbox" checked={vincularOriginal} onChange={() => {}}
                  className="w-4 h-4 accent-purple-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <RefreshCw size={12} /> Vincular a cita original (recuperar / adelantar)
                </span>
              </label>

              {vincularOriginal && citasOriginales.length > 0 && (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Cita original</label>
                  <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-purple-500"
                    value={originalId} onChange={(e) => setOriginalId(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {citasOriginales.map(c => (
                      <option key={c.id} value={c.id}>
                        {format(new Date(c.fecha_hora_inicio), 'dd/MM HH:mm')} — {c.estado} — {c.profesional?.nombre}
                      </option>
                    ))}
                  </select>
                  {getPreviewText() && (
                    <div className="mt-2 bg-amber-900/20 border border-amber-900/50 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                        {getPreviewText()}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {vincularOriginal && pacienteId && citasOriginales.length === 0 && (
                <div className="text-[10px] text-slate-500 text-center">No hay citas disponibles para vincular.</div>
              )}
            </>
          )}

          {/* Estado */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Estado</label>
              <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-blue-500 disabled:opacity-50"
                value={estado} onChange={(e) => setEstado(e.target.value)} disabled={bloqueada}>
                <option value="AGENDADA">Agendada</option>
                <option value="CONFIRMADA">Confirmada</option>
                <option value="ASISTE">Asiste</option>
                <option value="NO_ASISTE">No Asiste</option>
                <option value="REASIGNADA">Reasignada</option>
                <option value="CANCELADA">Cancelada</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className={`flex items-center gap-2 p-3 bg-slate-950 border border-slate-700 rounded-lg w-full justify-center ${bloqueada ? 'opacity-50' : 'cursor-pointer hover:border-purple-500/50 transition-colors'}`}>
                <input type="checkbox" checked={esRecuperacion} onChange={(e) => setEsRecuperacion(e.target.checked)}
                  disabled={bloqueada}
                  className="w-4 h-4 accent-purple-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase">Recuperación</span>
              </label>
            </div>
          </div>

          {bloqueada && (
            <div className="bg-amber-900/20 border border-amber-900/50 p-3 rounded-xl text-center">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                Esta cita está reasignada a otra sesión. No se puede modificar.
              </span>
              <div className="text-[9px] text-slate-400 mt-1">
                Eliminá la cita vinculada para desbloquearla.
              </div>
            </div>
          )}

          {/* Badges informativos (solo editar) */}
          {!esCrear && (
            <div className="flex flex-wrap gap-2">
              {citaExistente?.es_recuperacion && (
                <span className="bg-purple-900/30 text-purple-400 text-[9px] font-black uppercase px-2 py-1 rounded border border-purple-500/30">
                  Recuperación
                </span>
              )}
              {citaExistente?.referencia_cita_id && (
                <span className="bg-amber-900/30 text-amber-400 text-[9px] font-black uppercase px-2 py-1 rounded border border-amber-500/30">
                  Réplica vinculada
                </span>
              )}
              {citaExistente?.observacion && citaExistente.observacion.includes('Se adelanta') && (
                <span className="bg-amber-900/30 text-amber-400 text-[9px] font-black uppercase px-2 py-1 rounded border border-amber-500/30 w-full text-center">
                  {citaExistente.observacion}
                </span>
              )}
            </div>
          )}

          {/* Observación */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Observación</label>
            <textarea className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 h-20 resize-none outline-none focus:border-blue-500 disabled:opacity-50"
              value={observacion} onChange={(e) => setObservacion(e.target.value)} disabled={bloqueada} />
          </div>

          {/* Adelantar (solo editar y no bloqueado) */}
          {!esCrear && !bloqueada && (
            <>
              <button onClick={() => { setShowAdelantar(!showAdelantar); setAdelantarFecha(''); setAdelantarHora(''); }}
                className="w-full border-2 border-dashed border-amber-800/50 rounded-xl p-3 text-[10px] font-black text-amber-400 uppercase tracking-widest hover:border-amber-500/50 hover:bg-amber-900/10 transition-colors flex items-center justify-center gap-2">
                <ArrowRight size={14} />
                {showAdelantar ? 'Cerrar' : 'Adelantar esta cita'}
              </button>

              {showAdelantar && (
                <div className="bg-slate-950 border border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-1">Fecha destino</label>
                      <input type="date" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                        value={adelantarFecha} onChange={(e) => setAdelantarFecha(e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-1">Hora</label>
                      <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                        value={adelantarHora} onChange={(e) => setAdelantarHora(e.target.value)}>
                        <option value="">Seleccionar</option>
                        {HORARIOS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                  <button onClick={handleAdelantar} disabled={isSaving}
                    className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-amber-900/50 text-white text-xs font-black uppercase py-2.5 rounded-lg shadow-lg transition-colors">
                    {isSaving ? 'Procesando...' : 'Adelantar'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center gap-4">
          {!esCrear && !bloqueada && (
              <button onClick={handleDelete} disabled={isDeleting} className="text-[10px] font-black uppercase text-red-500 hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors flex items-center">
                <Trash2 size={14} className="mr-1" /> Eliminar
              </button>
            )}
            {(esCrear || bloqueada) && <div />}
            {!bloqueada && (
            <button onClick={handleSave} disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/50 text-white text-xs font-black uppercase px-6 py-3 rounded-lg shadow-lg flex items-center transition-colors">
              <Save size={16} className="mr-2" /> {isSaving ? 'Guardando...' : (esCrear ? 'Agendar' : 'Guardar')}
            </button>
          )}
      </div>
    </div>
  );
}
