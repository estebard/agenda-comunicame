'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, CheckCircle2, XCircle, AlertCircle, Lock, CalendarDays } from 'lucide-react';
import ModalGestionarBloque from './ModalGestionarBloque';

const HORARIOS = ['09:05', '10:00', '11:00', '12:00', '13:00', '14:00', '14:50', '15:40', '16:30', '17:20'];

const calcularEdad = (fechaNacimiento: string | null): string => {
  if (!fechaNacimiento) return 'S/I';
  const hoy = new Date();
  const cumpleanos = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - cumpleanos.getFullYear();
  const m = hoy.getMonth() - cumpleanos.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) { edad--; }
  return `${edad}a`;
};

const getFondoColumna = (index: number) => {
  const fondos = [
    'bg-amber-900/20 hover:bg-amber-900/40',   
    'bg-emerald-900/20 hover:bg-emerald-900/40', 
    'bg-blue-900/20 hover:bg-blue-900/40',     
    'bg-orange-900/20 hover:bg-orange-900/40', 
    'bg-red-900/20 hover:bg-red-900/40',       
  ];
  return fondos[index % fondos.length];
};

export default function VistaDiaria() {
  const [fecha, setFecha] = useState(new Date());
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [bloques, setBloques] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: profs } = await supabase.from('profesional').select('*').order('nombre');
    
    const inicioStr = startOfDay(fecha).toISOString();
    const finStr = endOfDay(fecha).toISOString();

    // 1. Obtener Transacciones de Ejecución Activas
    const { data: asistencias, error: errAsistencias } = await supabase
      .from('asistencia')
      .select(`
        id, fecha_hora_ejecucion, estado, observacion, profesional_id,
        cita:cita_oficial_id (id, fecha_hora_inicio, paciente:paciente_id(id, nombre_completo, fecha_nacimiento, tokens_disponibles))
      `)
      .gte('fecha_hora_ejecucion', inicioStr)
      .lte('fecha_hora_ejecucion', finStr);

    if (errAsistencias) console.error("Error DQL Asistencias:", errAsistencias);

    // 2. Obtener Planificación Oficial (Proyecciones de lectura)
    const { data: citas, error: errCitas } = await supabase
      .from('cita')
      .select('id, fecha_hora_inicio, estado, observacion, profesional_id, paciente:paciente_id(id, nombre_completo, fecha_nacimiento, tokens_disponibles)').gte('fecha_hora_inicio', inicioStr)
      .lte('fecha_hora_inicio', finStr);

    if (errCitas) console.error("Error DQL Citas:", errCitas);

    // 3. Consolidación de Entidades (Deduplicación por Integridad Referencial)
    const citasConAsistencia = new Set(asistencias?.map((a: any) => a.cita?.id).filter(Boolean));

    const asistenciasMap = (asistencias || []).map((a: any) => ({
      isEjecucion: true,
      asistenciaId: a.id,
      citaOficialId: a.cita?.id,
      profesionalId: a.profesional_id,
      horaRender: format(new Date(a.fecha_hora_ejecucion), 'HH:mm'),
      fechaOficial: a.cita?.fecha_hora_inicio,
      paciente: a.cita?.paciente,
      estado: a.estado,
      observacion: a.observacion
    }));

    const citasMap = (citas || [])
      .filter((c: any) => !citasConAsistencia.has(c.id))
      .map((c: any) => ({
        isEjecucion: false,
        asistenciaId: null,
        citaOficialId: c.id,
        profesionalId: c.profesional_id,
        horaRender: format(new Date(c.fecha_hora_inicio), 'HH:mm'),
        fechaOficial: c.fecha_hora_inicio,
        paciente: c.paciente,
        estado: c.estado || 'AGENDADA',
        observacion: c.observacion
      }));

    if (profs) setProfesionales(profs);
    setBloques([...asistenciasMap, ...citasMap]);
    setIsLoading(false);
  };

  useEffect(() => { 
    fetchData(); 
  }, [fecha]);

  const openModal = (hora: string, profesional: any, bloque: any) => {
    if (hora === '13:00') return; 
    setModalData({ hora, profesional, bloque });
    setIsModalOpen(true);
  };

  const getEstilosEstado = (estado: string) => {
    switch (estado) {
      case 'CONFIRMADA': return 'bg-blue-900/60 border-l-4 border-blue-500 text-blue-100 hover:bg-blue-800/80';
      case 'ASISTE': return 'bg-emerald-900/60 border-l-4 border-emerald-500 text-emerald-100 hover:bg-emerald-800/80';
      case 'NO_ASISTE': return 'bg-red-900/60 border-l-4 border-red-500 text-red-100 opacity-90 hover:opacity-100 hover:bg-red-800/80';
      default: return 'bg-amber-900/40 border-l-4 border-amber-500 text-amber-100 hover:bg-amber-800/60'; 
    }
  };

  const getIconoEstado = (estado: string) => {
    switch (estado) {
      case 'CONFIRMADA': return <CheckCircle2 size={12} className="text-blue-400 mr-1" />;
      case 'ASISTE': return <CheckCircle2 size={12} className="text-emerald-400 mr-1" />;
      case 'NO_ASISTE': return <XCircle size={12} className="text-red-400 mr-1" />;
      default: return <AlertCircle size={12} className="text-amber-400 mr-1" />;
    }
  };

  return (
    <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col h-[calc(100vh-2rem)]">
      <div className="bg-slate-950 p-5 flex justify-between items-center border-b border-slate-800">
        <h2 className="font-black text-slate-100 uppercase tracking-widest flex items-center text-lg">
          <CalendarDays className="mr-3 text-orange-400" size={24} /> Asistencia y Novedades Diarias
        </h2>
        <input 
          type="date" 
          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-200 outline-none focus:border-blue-500 cursor-pointer"
          value={format(fecha, 'yyyy-MM-dd')}
          onChange={(e) => setFecha(new Date(e.target.value + 'T12:00:00'))}
        />
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto relative">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        <table className="min-w-full border-collapse table-fixed h-full">
          <thead>
            <tr>
              <th className="w-24 bg-slate-950 border-b border-r border-slate-800 p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0 left-0 z-30 shadow-sm">Hora</th>
              {profesionales.map((p, index) => (
                <th key={p.id} className={`border-b border-r border-slate-800 p-4 min-w-[240px] sticky top-0 z-20 shadow-sm ${getFondoColumna(index)}`}>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{p.especialidad}</div>
                  <div className="text-sm font-black text-slate-200 uppercase">{p.nombre}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HORARIOS.map(hora => (
              <tr key={hora}>
                <td className="bg-slate-950 border-b border-r border-slate-800 p-3 text-center text-[11px] font-black text-slate-400 sticky left-0 z-10 shadow-sm">
                  {hora === '13:00' ? <Clock size={14} className="mx-auto text-orange-500" /> : hora}
                </td>
                {profesionales.map((p, index) => {
                  const bloquesCeldas = bloques.filter(b => b.profesionalId === p.id && b.horaRender === hora);
                  const esColacion = hora === '13:00';

                  return (
                    <td key={`${p.id}-${hora}`} className={`border-b border-r border-slate-800 p-1.5 align-top transition-all min-h-[7rem] ${esColacion ? 'bg-slate-950 cursor-not-allowed' : getFondoColumna(index)}`}>
                      {esColacion ? (
                        <div className="h-full flex items-center justify-center text-[10px] font-black text-orange-500/50 uppercase tracking-widest mt-4">Colación</div>
                      ) : (
                        <div className="flex flex-col gap-1 h-full min-h-[6rem]">
                          {bloquesCeldas.map(b => (
                            <div 
                              key={b.asistenciaId || b.citaOficialId}
                              onClick={() => openModal(hora, p, b)}
                              className={`p-2 rounded-lg cursor-pointer transition-colors shadow-sm flex flex-col justify-between ${getEstilosEstado(b.estado)}`}
                            >
                              <div>
                                <div className="flex justify-between items-start mb-1">
                                  <div className="text-[11px] font-black uppercase leading-tight truncate pr-1">
                                    {b.paciente?.nombre_completo}
                                  </div>
                                  <span className="text-[9px] font-bold opacity-80 whitespace-nowrap">
                                    {calcularEdad(b.paciente?.fecha_nacimiento)}
                                  </span>
                                </div>

                                {/* Renderizado Visual de Tokens */}
                                <div className="flex gap-1 flex-wrap mb-1.5">
                                  {b.fechaOficial && (
                                    <div className="bg-amber-950/40 text-amber-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-amber-500/30 inline-block">
                                      Of: {format(new Date(b.fechaOficial), 'HH:mm')} hrs
                                    </div>
                                  )}
                                  
                                  {/* Distintivo de Tokenización Condicional */}
                                  <div className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border inline-block ${
                                    (b.paciente?.tokens_disponibles || 0) > 0 
                                      ? 'bg-blue-900/40 text-blue-400 border-blue-500/30' 
                                      : 'bg-red-900/40 text-red-400 border-red-500/30'
                                  }`}>
                                    {(b.paciente?.tokens_disponibles || 0) > 0 
                                      ? `${b.paciente?.tokens_disponibles} Tokens` 
                                      : `Deuda: ${Math.abs(b.paciente?.tokens_disponibles || 0)} T`}
                                  </div>
                                </div>

                                {b.observacion && (
                                  <div className="text-[9px] font-medium leading-tight opacity-90 mb-1 italic line-clamp-2">
                                    "{b.observacion}"
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-between items-end mt-1 pt-1 border-t border-black/10">
                                <div className="flex items-center text-[9px] font-black uppercase tracking-wider">
                                  {getIconoEstado(b.estado)} {b.estado}
                                </div>
                              </div>
                            </div>
                          ))}

                          <div 
                            onClick={() => openModal(hora, p, null)}
                            className={`flex items-center justify-center border-2 border-dashed border-slate-800/50 rounded-lg cursor-pointer transition-opacity ${
                              bloquesCeldas.length > 0 ? 'opacity-0 hover:opacity-100 h-6 mt-1' : 'h-full opacity-0 hover:opacity-100 flex-1'
                            }`}
                          >
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">+ Referencia</span>
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalData && (
        <ModalGestionarBloque 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          dia={fecha}
          hora={modalData.hora}
          profesionalGrid={modalData.profesional}
          bloqueExistente={modalData.bloque}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}