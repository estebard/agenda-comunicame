'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format, addDays, startOfWeek, subWeeks, addWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Filter } from 'lucide-react';
import ModalAgendar from '@/components/ModalAgendar';
import ModalDetalleCita from '@/components/ModalDetalleCita';

const HORARIOS = ['09:05', '10:00', '11:00', '12:00', '14:00', '14:50', '15:40', '16:30', '17:20'];
const DIAS_SEMANA = [1, 2, 3, 4, 5];

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

export default function PlanificacionMensualPage() {
  const [fechaBase, setFechaBase] = useState(new Date());
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<string>('');
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [citas, setCitas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modales
  const [isModalAgendarOpen, setIsModalAgendarOpen] = useState(false);
  const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false);
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState<{dia: Date, hora: string, profesionalId: string} | null>(null);
  const [citaSeleccionada, setCitaSeleccionada] = useState<any>(null);

  const fetchCitasSemana = useCallback(async () => {
    if (!profesionalSeleccionado && !mostrarTodos) return;
    setIsLoading(true);
    const inicioSemana = startOfWeek(fechaBase, { weekStartsOn: 1 });
    const finSemana = addDays(inicioSemana, 5);

    let query = supabase
      .from('cita')
      .select(`id, fecha_hora_inicio, fecha_hora_fin, estado, observacion, es_recuperacion, paciente_id, profesional_id, paciente:paciente_id(nombre_completo, fecha_nacimiento), profesional:profesional_id(nombre, especialidad)`)
      .gte('fecha_hora_inicio', inicioSemana.toISOString())
      .lt('fecha_hora_inicio', finSemana.toISOString())
      .neq('estado', 'CANCELADA');

    if (!mostrarTodos && profesionalSeleccionado) {
      query = query.eq('profesional_id', profesionalSeleccionado);
    }

    const { data, error } = await query;
    if (data) setCitas(data);
    setIsLoading(false);
  }, [fechaBase, profesionalSeleccionado, mostrarTodos]);

  useEffect(() => {
    async function fetchProfesionales() {
      const { data } = await supabase.from('profesional').select('*').order('nombre');
      if (data && data.length > 0) {
        setProfesionales(data);
        if (!mostrarTodos) {
          setProfesionalSeleccionado(data[0].id);
        }
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
  const profesionalesRender = mostrarTodos ? profesionales : profesionales.filter(p => p.id === profesionalSeleccionado);

  const obtenerCitaEnBloque = (dia: Date, horaStr: string, profesionalId: string) => {
    const [hora, minuto] = horaStr.split(':').map(Number);
    const fechaBloque = new Date(dia);
    fechaBloque.setHours(hora, minuto, 0, 0);
    return citas.find(c => 
      c.profesional_id === profesionalId && 
      Math.abs(new Date(c.fecha_hora_inicio).getTime() - fechaBloque.getTime()) < 300000
    );
  };

  const handleSlotClick = (dia: Date, hora: string, profesional: any, citaExistente: any) => {
    if (citaExistente) {
      setCitaSeleccionada(citaExistente);
      setIsModalDetalleOpen(true);
    } else {
      setBloqueSeleccionado({ dia, hora, profesionalId: profesional.id });
      setIsModalAgendarOpen(true);
    }
  };

  const getEstilosEstado = (estado: string) => {
    switch (estado) {
      case 'CONFIRMADA': return 'border-l-4 border-blue-500 bg-blue-900/60 text-blue-100 hover:bg-blue-800/80';
      case 'AGENDADA': return 'border-l-4 border-amber-500 bg-amber-900/40 text-amber-100 hover:bg-amber-800/60';
      default: return 'border-l-4 border-slate-500 bg-slate-800/60 text-slate-100 hover:bg-slate-700/80';
    }
  };

  return (
    <main className="p-4 md:p-8 space-y-6 h-[calc(100vh-2rem)] flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter">Agenda Oficial</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">Planificación semanal por profesional</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
            <button onClick={() => setFechaBase(subWeeks(fechaBase, 1))} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
              <ChevronLeft size={18} className="text-slate-400" />
            </button>
            <span className="text-sm font-black text-slate-200 min-w-[180px] text-center">
              {format(inicioSemana, "dd MMM", { locale: es })} — {format(addDays(inicioSemana, 4), "dd MMM yyyy", { locale: es })}
            </span>
            <button onClick={() => setFechaBase(addWeeks(fechaBase, 1))} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
              <ChevronRight size={18} className="text-slate-400" />
            </button>
          </div>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setMostrarTodos(false)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                !mostrarTodos ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Individual
            </button>
            <button
              onClick={() => setMostrarTodos(true)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                mostrarTodos ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todos
            </button>
          </div>

          {!mostrarTodos && (
            <div className="relative">
              <select
                className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-slate-200 outline-none appearance-none pr-8 cursor-pointer focus:border-blue-500 transition-colors"
                value={profesionalSeleccionado}
                onChange={(e) => setProfesionalSeleccionado(e.target.value)}
              >
                {profesionales.map(p => (
                  <option key={p.id} value={p.id}>{p.especialidad} — {p.nombre}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          )}
        </div>
      </header>

      <section className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="min-w-full border-collapse table-fixed h-full">
            <thead>
              <tr>
                <th className="w-24 bg-slate-950 border-b border-r border-slate-800 p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0 left-0 z-30 shadow-sm">Hora</th>
                {diasRender.map((dia, diaIndex) => (
                  <th key={dia.toISOString()} className={`border-b border-r border-slate-800 p-3 min-w-[220px] sticky top-0 z-20 ${getFondoColumna(diaIndex)}`}>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {format(dia, 'EEEE', { locale: es })}
                    </div>
                    <div className="text-2xl font-black text-slate-100 leading-none mt-1">
                      {format(dia, 'dd')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HORARIOS.map(hora => (
                <tr key={hora}>
                  <td className="bg-slate-950 border-b border-r border-slate-800 p-2 text-center text-[11px] font-black text-slate-400 sticky left-0 z-10 shadow-sm">
                    {hora}
                  </td>
                  {diasRender.map((dia, diaIndex) => {
                    const citasEnCelda = profesionalesRender
                      .map(p => ({
                        profesional: p,
                        cita: obtenerCitaEnBloque(dia, hora, p.id)
                      }))
                      .filter(item => item.cita);

                    return (
                      <td key={`${dia.getTime()}-${hora}`} className={`border-b border-r border-slate-800 p-1.5 align-top min-h-[6rem] ${getFondoColumna(diaIndex)}`}>
                        <div className="flex flex-col gap-1 h-full min-h-[5rem]">
                          {citasEnCelda.map(({ profesional, cita }) => (
                            <div
                              key={cita.id}
                              onClick={() => handleSlotClick(dia, hora, profesional, cita)}
                              className={`p-2 rounded-lg cursor-pointer transition-colors shadow-sm ${getEstilosEstado(cita.estado)}`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <div className="text-[11px] font-black uppercase leading-tight truncate pr-1">
                                  {cita.paciente?.nombre_completo}
                                </div>
                                {cita.fecha_nacimiento && (
                                  <span className="text-[9px] font-bold opacity-80 whitespace-nowrap">
                                    {(() => {
                                      const hoy = new Date();
                                      const cumple = new Date(cita.paciente.fecha_nacimiento);
                                      let edad = hoy.getFullYear() - cumple.getFullYear();
                                      const m = hoy.getMonth() - cumple.getMonth();
                                      if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
                                      return `${edad}a`;
                                    })()}
                                  </span>
                                )}
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-bold text-blue-300 uppercase">
                                  {cita.profesional?.nombre}
                                </span>
                                <span className="text-[9px] font-black uppercase opacity-70">
                                  {cita.estado}
                                </span>
                              </div>
                            </div>
                          ))}

                          {!mostrarTodos && (
                            <div
                              onClick={() => {
                                const prof = profesionalesRender[0];
                                if (prof) handleSlotClick(dia, hora, prof, null);
                              }}
                              className="flex items-center justify-center border-2 border-dashed border-slate-800/50 rounded-lg cursor-pointer transition-opacity opacity-0 hover:opacity-100 flex-1"
                            >
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">+ Agendar</span>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {bloqueSeleccionado && (
        <ModalAgendar
          isOpen={isModalAgendarOpen}
          onClose={() => setIsModalAgendarOpen(false)}
          dia={bloqueSeleccionado.dia}
          hora={bloqueSeleccionado.hora}
          profesionalId={bloqueSeleccionado.profesionalId}
          onSuccess={fetchCitasSemana}
        />
      )}

      <ModalDetalleCita
        isOpen={isModalDetalleOpen}
        onClose={() => setIsModalDetalleOpen(false)}
        cita={citaSeleccionada}
        onSuccess={fetchCitasSemana}
      />
    </main>
  );
}
