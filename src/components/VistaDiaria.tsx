'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, CheckCircle2, XCircle, AlertCircle, Lock, CalendarDays } from 'lucide-react';
import ModalGestionarBloque from './ModalGestionarBloque';

const HORARIOS = ['09:05', '10:00', '11:00', '12:00', '13:00', '14:00', '14:50', '15:40', '16:30', '17:20'];

export default function VistaDiaria() {
  const [fecha, setFecha] = useState(new Date());
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [citas, setCitas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: profs } = await supabase.from('profesional').select('*').order('nombre');
    const inicio = startOfDay(fecha);
    const fin = endOfDay(fecha);

    const { data: apps } = await supabase
      .from('cita')
      .select('*, paciente:paciente_id(nombre_completo)')
      .gte('fecha_hora_inicio', inicio.toISOString())
      .lte('fecha_hora_inicio', fin.toISOString());

    if (profs) setProfesionales(profs);
    if (apps) setCitas(apps);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [fecha]);

  const openModal = (hora: string, profesional: any, cita: any) => {
    if (hora === '13:00') return; 
    setModalData({ hora, profesional, cita });
    setIsModalOpen(true);
  };

  const getEstilosEstado = (estado: string) => {
    switch (estado) {
      case 'CONFIRMADA': return 'bg-blue-900/40 border-l-4 border-blue-500 text-blue-100 hover:bg-blue-800/60';
      case 'ASISTE': return 'bg-emerald-900/40 border-l-4 border-emerald-500 text-emerald-100 hover:bg-emerald-800/60';
      case 'NO_ASISTE': return 'bg-red-900/40 border-l-4 border-red-500 text-red-100 opacity-80 hover:opacity-100 hover:bg-red-800/60';
      case 'BLOQUEADO': return 'bg-slate-800/80 border-l-4 border-slate-500 text-slate-400 hover:bg-slate-700';
      case 'CANCELADA': return 'bg-slate-900 border-l-4 border-slate-700 text-slate-500 line-through';
      default: return 'bg-amber-900/20 border-l-4 border-amber-500 text-amber-100 hover:bg-amber-800/40'; 
    }
  };

  const getIconoEstado = (estado: string) => {
    switch (estado) {
      case 'CONFIRMADA': return <CheckCircle2 size={12} className="text-blue-400 mr-1" />;
      case 'ASISTE': return <CheckCircle2 size={12} className="text-emerald-400 mr-1" />;
      case 'NO_ASISTE': return <XCircle size={12} className="text-red-400 mr-1" />;
      case 'BLOQUEADO': return <Lock size={12} className="text-slate-400 mr-1" />;
      default: return <AlertCircle size={12} className="text-amber-400 mr-1" />;
    }
  };

  return (
    <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
      <div className="bg-slate-950 p-5 flex justify-between items-center border-b border-slate-800">
        <h2 className="font-black text-slate-100 uppercase tracking-widest flex items-center">
          <CalendarDays className="mr-3 text-orange-400" size={24} /> Asistencia y Novedades Diarias
        </h2>
        <input 
          type="date" 
          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-200 outline-none focus:border-blue-500 cursor-pointer"
          value={format(fecha, 'yyyy-MM-dd')}
          onChange={(e) => setFecha(new Date(e.target.value + 'T12:00:00'))}
        />
      </div>

      <div className="overflow-x-auto relative">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        <table className="min-w-full border-collapse table-fixed">
          <thead>
            <tr>
              <th className="w-24 bg-slate-950 border-b border-r border-slate-800 p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky left-0 z-20">Hora</th>
              {profesionales.map(p => (
                <th key={p.id} className="bg-slate-950 border-b border-r border-slate-800 p-4 min-w-[220px]">
                  <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{p.especialidad}</div>
                  <div className="text-sm font-black text-slate-200 uppercase">{p.nombre}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HORARIOS.map(hora => (
              <tr key={hora}>
                <td className="bg-slate-950 border-b border-r border-slate-800 p-3 text-center text-[11px] font-black text-slate-400 sticky left-0 z-10 shadow-r">
                  {hora === '13:00' ? <Clock size={14} className="mx-auto text-orange-500" /> : hora}
                </td>
                {profesionales.map(p => {
                  // CRÍTICO: Usamos .filter() en lugar de .find() para capturar MÚLTIPLES citas en el mismo bloque
                  const citasEnBloque = citas.filter(c => c.profesional_id === p.id && format(new Date(c.fecha_hora_inicio), 'HH:mm') === hora);
                  const esColacion = hora === '13:00';

                  return (
                    <td 
                      key={`${p.id}-${hora}`} 
                      className={`border-b border-r border-slate-800 p-1.5 align-top transition-all min-h-[6rem] ${esColacion ? 'bg-slate-950 cursor-not-allowed' : 'bg-slate-900'}`}
                    >
                      {esColacion ? (
                        <div className="h-full flex items-center justify-center text-[10px] font-black text-orange-500/50 uppercase tracking-widest mt-4">Colación</div>
                      ) : (
                        <div className="flex flex-col gap-1 h-full min-h-[5rem]">
                          
                          {/* Renderizamos TODAS las citas encontradas (Duplas) */}
                          {citasEnBloque.map(cita => (
                            <div 
                              key={cita.id}
                              onClick={() => openModal(hora, p, cita)}
                              className={`p-2 rounded-lg cursor-pointer transition-colors shadow-sm ${getEstilosEstado(cita.estado)}`}
                            >
                              <div>
                                <div className="text-[11px] font-black uppercase leading-tight mb-1 truncate">
                                  {cita.estado === 'BLOQUEADO' ? '🔒 BLOQUEO DE AGENDA' : cita.paciente?.nombre_completo}
                                </div>
                                {cita.observacion && (
                                  <div className="text-[9px] font-medium leading-tight opacity-80 line-clamp-2 italic">
                                    "{cita.observacion}"
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-between items-end mt-1">
                                <div className="flex items-center text-[9px] font-black uppercase tracking-wider">
                                  {getIconoEstado(cita.estado)} {cita.estado}
                                </div>
                                {cita.es_recuperacion && <span className="bg-orange-500/20 text-orange-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Recup</span>}
                              </div>
                            </div>
                          ))}

                          {/* Botón fantasma para agregar una nueva cita (Dupla) o Agendar si está vacío */}
                          <div 
                            onClick={() => openModal(hora, p, null)}
                            className={`flex items-center justify-center border-2 border-dashed border-slate-800 rounded-lg cursor-pointer transition-opacity ${
                              citasEnBloque.length > 0 ? 'opacity-0 hover:opacity-100 h-6 mt-1' : 'h-full opacity-0 hover:opacity-100 flex-1'
                            }`}
                          >
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                              + {citasEnBloque.length > 0 ? 'Agregar Dupla' : 'Agendar'}
                            </span>
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
          profesional={modalData.profesional}
          citaExistente={modalData.cita}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}