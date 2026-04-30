'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, ArrowLeft, CalendarDays } from 'lucide-react';
import ModalPlanificacion from './ModalPlanificacion';
import ModalDetalleCita from './ModalDetalleCita';

const HORARIOS = ['09:05', '10:00', '11:00', '12:00', '13:00', '14:00', '14:50', '15:40', '16:30', '17:20'];

interface VistaDiariaOficialProps {
  fechaSeleccionada: Date;
  onVolver: () => void;
}

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

export default function VistaDiariaOficial({ fechaSeleccionada, onVolver }: VistaDiariaOficialProps) {
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [citasAgendadas, setCitasAgendadas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modales
  const [isModalPlanificacionOpen, setIsModalPlanificacionOpen] = useState(false);
  const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false);
  const [slotData, setSlotData] = useState<any>(null);
  const [citaSeleccionada, setCitaSeleccionada] = useState<any>(null);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: profs } = await supabase.from('profesional').select('*').order('nombre');
    
    const inicioLocal = startOfDay(fechaSeleccionada);
    const finLocal = endOfDay(fechaSeleccionada);

    const { data: apps } = await supabase
      .from('cita')
      .select('*, paciente:paciente_id(id, nombre_completo, fecha_nacimiento), profesional:profesional_id(nombre, especialidad)')
      .gte('fecha_hora_inicio', inicioLocal.toISOString())
      .lte('fecha_hora_inicio', finLocal.toISOString())
      //.eq('estado', 'AGENDADA')
      .order('fecha_hora_inicio', { ascending: true });

    if (profs) setProfesionales(profs);
    if (apps) setCitasAgendadas(apps);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [fechaSeleccionada]);

  const handleSlotClick = (hora: string, profesional: any) => {
    if (hora === '13:00') return;
    const start = new Date(fechaSeleccionada);
    const [h, m] = hora.split(':').map(Number);
    start.setHours(h, m, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 45);

    setSlotData({ start, end, profesional });
    setIsModalPlanificacionOpen(true);
  };

  const handleCitaClick = (cita: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevenir propagación hacia el td
    setCitaSeleccionada(cita);
    setIsModalDetalleOpen(true);
  };

  return (
    <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 flex flex-col h-full overflow-hidden">
      <div className="bg-slate-950 p-4 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center space-x-4">
          <button onClick={onVolver} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="font-black text-slate-100 uppercase tracking-widest text-lg flex items-center">
              <CalendarDays className="mr-2 text-blue-400" size={20} />
              Planificación Detallada
            </h2>
            <div className="text-xs font-bold text-slate-400 capitalize">
              {format(fechaSeleccionada, "EEEE dd 'de' MMMM, yyyy", { locale: es })}
            </div>
          </div>
        </div>
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
              <th className="w-24 bg-slate-950 border-b border-r border-slate-800 p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0 left-0 z-30">Hora</th>
              {profesionales.map((p, index) => (
                <th key={p.id} className={`border-b border-r border-slate-800 p-3 min-w-[220px] sticky top-0 z-20 ${getFondoColumna(index)}`}>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{p.especialidad}</div>
                  <div className="text-sm font-black text-slate-200 uppercase">{p.nombre}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HORARIOS.map(hora => (
              <tr key={hora}>
                <td className="bg-slate-950 border-b border-r border-slate-800 p-2 text-center text-[11px] font-black text-slate-400 sticky left-0 z-10">
                  {hora === '13:00' ? <Clock size={14} className="mx-auto text-orange-500" /> : hora}
                </td>
                {profesionales.map((p, index) => {
                  const citaEnBloque = citasAgendadas.find(c => c.profesional_id === p.id && format(new Date(c.fecha_hora_inicio), 'HH:mm') === hora);
                  const esColacion = hora === '13:00';

                  return (
                    <td key={`${p.id}-${hora}`} className={`border-b border-r border-slate-800 p-1.5 align-top h-20 ${esColacion ? 'bg-slate-950 cursor-not-allowed' : getFondoColumna(index)}`}>
                      {esColacion ? (
                        <div className="h-full flex items-center justify-center text-[10px] font-black text-orange-500/50 uppercase tracking-widest">Colación</div>
                      ) : citaEnBloque ? (
                        <div 
                          onClick={(e) => handleCitaClick(citaEnBloque, e)}
                          className="p-2 h-full rounded-lg cursor-pointer bg-blue-900/60 border-l-4 border-blue-500 hover:bg-blue-800/80 transition-all shadow-sm flex flex-col justify-start"
                        >
                          <div className="text-xs font-black uppercase text-blue-100 truncate">
                            {citaEnBloque.paciente?.nombre_completo}
                          </div>
                          <div className="text-[9px] font-bold text-blue-400 uppercase mt-1">
                            {citaEnBloque.estado}
                          </div>
                          {citaEnBloque.observacion && (
                            <div className="text-[9px] text-slate-300 italic line-clamp-2 mt-1 leading-tight">
                              "{citaEnBloque.observacion}"
                            </div>
                          )}
                        </div>
                      ) : (
                        <div 
                          onClick={() => handleSlotClick(hora, p)}
                          className="h-full flex items-center justify-center border-2 border-dashed border-slate-800/50 rounded-lg cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">+ Fijar Bloque</span>
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

      <ModalPlanificacion 
        isOpen={isModalPlanificacionOpen}
        onClose={() => setIsModalPlanificacionOpen(false)}
        slotData={slotData}
        onSuccess={fetchData}
      />

      <ModalDetalleCita 
        isOpen={isModalDetalleOpen}
        onClose={() => setIsModalDetalleOpen(false)}
        cita={citaSeleccionada}
        onSuccess={fetchData}
      />
    </div>
  );
}