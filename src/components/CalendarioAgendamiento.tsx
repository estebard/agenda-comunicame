'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format, addDays, startOfWeek, subWeeks, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, UserPlus, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import ModalAgendar from './ModalAgendar';

const HORARIOS_BASE = ['09:05', '10:00', '11:00', '12:00', '14:00', '14:50', '15:40', '16:30', '17:20'];
const DIAS_SEMANA = [1, 2, 3, 4, 5];

export default function CalendarioAgendamiento() {
  const [fechaBase, setFechaBase] = useState(new Date());
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<string>('');
  const [citas, setCitas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Estados del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState<{dia: Date, hora: string} | null>(null);

  const fetchCitasSemana = useCallback(async () => {
    if (!profesionalSeleccionado) return;
    setIsLoading(true);
    const inicioSemana = startOfWeek(fechaBase, { weekStartsOn: 1 });
    const finSemana = addDays(inicioSemana, 5);

    try {
      const { data, error } = await supabase
        .from('cita')
        .select(`id, fecha_hora_inicio, fecha_hora_fin, estado, es_recuperacion, paciente:paciente_id (nombre_completo)`)
        .eq('profesional_id', profesionalSeleccionado)
        .gte('fecha_hora_inicio', inicioSemana.toISOString())
        .lt('fecha_hora_inicio', finSemana.toISOString())
        .neq('estado', 'CANCELADA');
      if (data) setCitas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [fechaBase, profesionalSeleccionado]);

  useEffect(() => {
    async function fetchProfesionales() {
      const { data } = await supabase.from('profesional').select('*').order('nombre');
      if (data && data.length > 0) {
        setProfesionales(data);
        setProfesionalSeleccionado(data[0].id);
      } else {
        setIsLoading(false);
      }
    }
    fetchProfesionales();
  }, []);

  useEffect(() => {
    fetchCitasSemana();
  }, [fetchCitasSemana]);

  const inicioSemana = startOfWeek(fechaBase, { weekStartsOn: 1 });
  const diasRender = DIAS_SEMANA.map(offset => addDays(inicioSemana, offset - 1));

  const obtenerCitaEnBloque = (dia: Date, horaStr: string) => {
    const [hora, minuto] = horaStr.split(':').map(Number);
    const fechaBloque = new Date(dia);
    fechaBloque.setHours(hora, minuto, 0, 0);
    return citas.find(c => Math.abs(new Date(c.fecha_hora_inicio).getTime() - fechaBloque.getTime()) < 300000);
  };

  const handleOpenModal = (dia: Date, hora: string, citaExistente: any) => {
    if (citaExistente) {
      // Por ahora solo agendamos. En el futuro aquí abriremos el modal de edición/cancelación.
      return;
    }
    setBloqueSeleccionado({ dia, hora });
    setIsModalOpen(true);
  };

  return (
    <div className="bg-gray-100 rounded-xl shadow-lg border border-gray-300 mt-6 overflow-hidden">
      <div className="p-4 border-b border-gray-300 flex justify-between items-center bg-white">
        <div className="flex items-center space-x-2">
          <button onClick={() => setFechaBase(subWeeks(fechaBase, 1))} className="p-2 hover:bg-gray-100 rounded-full border border-gray-200 shadow-sm transition-all">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div className="px-4 py-1 bg-blue-50 text-blue-700 rounded-full font-bold text-sm uppercase">
            {format(inicioSemana, 'MMMM yyyy', { locale: es })}
          </div>
          <button onClick={() => setFechaBase(addWeeks(fechaBase, 1))} className="p-2 hover:bg-gray-100 rounded-full border border-gray-200 shadow-sm transition-all">
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>

        <select 
          className="border-2 border-gray-200 rounded-lg p-2 font-bold text-gray-700 outline-none focus:border-blue-500 transition-all cursor-pointer"
          value={profesionalSeleccionado}
          onChange={(e) => setProfesionalSeleccionado(e.target.value)}
        >
          {profesionales.map(p => (
            <option key={p.id} value={p.id}>{p.especialidad.toUpperCase()} — {p.nombre}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto relative">
        {isLoading && (
           <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-10">
               <div className="flex flex-col items-center">
                 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                 <span className="mt-2 text-sm font-bold text-blue-600">Actualizando Agenda...</span>
               </div>
           </div>
        )}
        
        <table className="min-w-full border-collapse table-fixed bg-gray-200">
          <thead>
            <tr>
              <th className="w-24 border-b-2 border-r-2 border-gray-300 bg-gray-100 p-3 text-xs font-black text-gray-500 uppercase">Hora</th>
              {diasRender.map(dia => (
                <th key={dia.toISOString()} className="border-b-2 border-r-2 border-gray-300 bg-white p-3">
                  <div className="text-[10px] uppercase font-black text-blue-400 tracking-tighter">
                    {format(dia, 'EEEE', { locale: es })}
                  </div>
                  <div className="text-2xl font-black text-gray-800 leading-none">
                    {format(dia, 'dd')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HORARIOS_BASE.map(hora => (
              <tr key={hora}>
                <td className="border-b-2 border-r-2 border-gray-300 text-center p-2 text-xs font-black text-gray-700 bg-gray-100">
                  {hora}
                </td>
                {diasRender.map(dia => {
                  const cita = obtenerCitaEnBloque(dia, hora);
                  return (
                    <td 
                      key={`${dia.getTime()}-${hora}`} 
                      className={`border-b-2 border-r-2 border-gray-300 p-1 h-24 transition-all cursor-pointer
                        ${cita ? 'bg-blue-50 shadow-inner' : 'bg-white hover:bg-green-50'}`}
                      onClick={() => handleOpenModal(dia, hora, cita)}
                    >
                      {cita ? (
                        <div className="h-full border-l-4 border-blue-600 bg-white p-2 rounded-r shadow-sm flex flex-col justify-between">
                          <span className="text-[11px] font-black text-gray-900 leading-tight uppercase overflow-hidden">
                            {cita.paciente?.nombre_completo}
                          </span>
                          <div className="flex flex-col">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded w-fit ${
                              cita.es_recuperacion ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {cita.es_recuperacion ? 'RECUPERACIÓN' : 'SESIÓN BASE'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group">
                           <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black border border-green-200">
                             + AGENDAR
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

      {bloqueSeleccionado && (
        <ModalAgendar 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          dia={bloqueSeleccionado.dia}
          hora={bloqueSeleccionado.hora}
          profesionalId={profesionalSeleccionado}
          onSuccess={fetchCitasSemana}
        />
      )}
    </div>
  );
}