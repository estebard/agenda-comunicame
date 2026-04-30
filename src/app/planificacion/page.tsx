'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Filter } from 'lucide-react';
import VistaDiariaOficial from '@/components/VistaDiariaOficial';
import ModalDetalleCita from '@/components/ModalDetalleCita';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

export default function PlanificacionMensualPage() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [fechaActual, setFechaActual] = useState(new Date());
  const [vistaActual, setVistaActual] = useState<any>(Views.MONTH);

  // Estados Modal
  const [isModalDetalleOpen, setIsModalDetalleOpen] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState<any>(null);

  // Restricción de Viewport para Views.WEEK
  const { minTime, maxTime } = useMemo(() => {
    const min = new Date();
    min.setHours(9, 0, 0);
    const max = new Date();
    max.setHours(18, 0, 0);
    return { minTime: min, maxTime: max };
  }, []);

  useEffect(() => {
    if (vistaActual !== Views.DAY) {
      fetchCitasOficiales();
    }
  }, [vistaActual]);

  async function fetchCitasOficiales() {
    setIsLoading(true);
    const { data: citas, error } = await supabase
      .from('cita')
      .select('*, paciente:paciente_id(id, nombre_completo, fecha_nacimiento), profesional:profesional_id(nombre, especialidad)')
      //.eq('estado', 'AGENDADA'); 

    if (citas && !error) {
      const eventosFormateados = citas.map((cita) => ({
        id: cita.id,
        title: `[${cita.estado}] ${cita.paciente?.nombre_completo} (${cita.profesional?.nombre})`,
        start: new Date(cita.fecha_hora_inicio),
        end: new Date(cita.fecha_hora_fin),
        resource: cita,
      }));
      setEventos(eventosFormateados);
    }
    setIsLoading(false);
  }

  // Handler: Navegación de Fecha
  const handleSelectSlot = (slotInfo: any) => {
    if (vistaActual === Views.MONTH || vistaActual === Views.WEEK) {
      setFechaActual(slotInfo.start);
      setVistaActual(Views.DAY);
    }
  };

  // Handler: Intercepción de Cita (Evita drill-down, abre modal)
  const handleSelectEvent = (event: any) => {
    setCitaSeleccionada(event.resource);
    setIsModalDetalleOpen(true);
  };

  const eventStyleGetter = (event: any) => {
    const prof = event.resource?.profesional?.nombre;
    let backgroundColor = '#44403C';
    if (prof === 'Rosa') backgroundColor = '#3E635A'; 
    if (prof === 'Valentina') backgroundColor = '#9E362B'; 
    if (prof === 'Karina') backgroundColor = '#997404'; 

    return {
      style: {
        backgroundColor, borderRadius: '6px', opacity: 0.9, color: 'white',
        border: 'none', display: 'block', fontSize: '10px', padding: '2px 4px', fontWeight: 'bold'
      }
    };
  };

  if (vistaActual === Views.DAY) {
    return (
      <main className="p-4 md:p-8 h-[calc(100vh-2rem)]">
        <VistaDiariaOficial 
          fechaSeleccionada={fechaActual} 
          onVolver={() => setVistaActual(Views.MONTH)} 
        />
      </main>
    );
  }

  return (
    <main className="p-4 md:p-8 flex flex-col h-[calc(100vh-2rem)] space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter">Agenda Oficial</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">Malla de planificación mensual de terapias</p>
        </div>
        <div className="flex gap-2">
            <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-800 transition-colors">
                <Filter size={14} className="mr-2" /> Filtrar por Profesional
            </div>
        </div>
      </header>

      <section className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        <div className="h-full custom-calendar">
          <Calendar
            localizer={localizer}
            events={eventos}
            startAccessor="start"
            endAccessor="end"
            culture="es"
            min={minTime}
            max={maxTime}
            messages={{ next: "Sig.", previous: "Ant.", today: "Hoy", month: "Mes", week: "Semana", day: "Día" }}
            eventPropGetter={eventStyleGetter}
            views={[Views.MONTH, Views.WEEK]} 
            date={fechaActual}
            view={vistaActual}
            onNavigate={(date) => setFechaActual(date)}
            onView={(view) => setVistaActual(view)}
            selectable={true}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
          />
        </div>
      </section>

      <ModalDetalleCita 
        isOpen={isModalDetalleOpen}
        onClose={() => setIsModalDetalleOpen(false)}
        cita={citaSeleccionada}
        onSuccess={fetchCitasOficiales}
      />
    </main>
  );
}