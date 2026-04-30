import { supabase } from '@/lib/supabaseClient';
import { 
  Users, 
  CalendarClock, 
  TrendingUp, 
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function DashboardGeneral() {
  // 1. Definir rango de "Hoy"
  const hoy = new Date();
  // Para pruebas con tus datos inyectados, forzamos el 30 de Abril si lo deseas, 
  // pero usaremos la fecha real del sistema para producción:
  const inicioHoy = startOfDay(hoy).toISOString();
  const finHoy = endOfDay(hoy).toISOString();

  // 2. Traer citas de hoy
  const { data: citasHoy } = await supabase
    .from('cita')
    .select('*, profesional(nombre, especialidad)')
    .gte('fecha_hora_inicio', inicioHoy)
    .lte('fecha_hora_inicio', finHoy);

  // 3. Traer pacientes con tokens críticos (Saldo <= 2)
  const { data: pacientesCriticos } = await supabase
    .from('vw_control_panel_agendamiento')
    .select('*')
    .lte('saldo_tokens', 2)
    .order('saldo_tokens', { ascending: true })
    .limit(5);

  // Cálculos Rápidos
  const totalCitas = citasHoy?.length || 0;
  const asistencias = citasHoy?.filter(c => c.estado === 'ASISTE').length || 0;
  const inasistencias = citasHoy?.filter(c => c.estado === 'NO_ASISTE' || c.estado === 'CANCELADA').length || 0;
  const porAtender = citasHoy?.filter(c => c.estado === 'AGENDADA' || c.estado === 'CONFIRMADA').length || 0;

  // Agrupar por profesional
  const cargaPorProfesional = citasHoy?.reduce((acc: any, cita) => {
    const prof = cita.profesional?.nombre || 'Desconocido';
    if (!acc[prof]) acc[prof] = 0;
    acc[prof]++;
    return acc;
  }, {});

  return (
    <main className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter">
          Dashboard Ejecutivo
        </h1>
        <p className="text-sm font-bold text-slate-400 capitalize mt-1">
          {format(hoy, "EEEE dd 'de' MMMM, yyyy", { locale: es })}
        </p>
      </header>

      {/* METRICAS PRINCIPALES (Tarjetas) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><CalendarClock size={64} /></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Sesiones Hoy</span>
          <span className="text-5xl font-black text-blue-400">{totalCitas}</span>
        </div>

        <div className="bg-emerald-900/20 border border-emerald-900/50 p-6 rounded-3xl shadow-lg flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle2 size={64} /></div>
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Asistencias</span>
          <span className="text-5xl font-black text-emerald-500">{asistencias}</span>
        </div>

        <div className="bg-amber-900/20 border border-amber-900/50 p-6 rounded-3xl shadow-lg flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Clock size={64} /></div>
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Por Atender</span>
          <span className="text-5xl font-black text-amber-500">{porAtender}</span>
        </div>

        <div className="bg-red-900/20 border border-red-900/50 p-6 rounded-3xl shadow-lg flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><XCircle size={64} /></div>
          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Ausencias / Canceladas</span>
          <span className="text-5xl font-black text-red-500">{inasistencias}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CARGA POR PROFESIONAL */}
        <section className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 bg-slate-950">
            <h2 className="font-black text-slate-200 uppercase tracking-widest text-sm flex items-center">
              <TrendingUp className="mr-2 text-blue-400" size={18} /> Carga Operativa por Especialista (Hoy)
            </h2>
          </div>
          <div className="p-6 flex gap-4 overflow-x-auto">
            {Object.keys(cargaPorProfesional || {}).length === 0 ? (
               <p className="text-slate-500 text-sm font-bold w-full text-center py-8">No hay citas registradas para hoy.</p>
            ) : (
              Object.entries(cargaPorProfesional).map(([profesional, cantidad]) => (
                <div key={profesional} className="flex-1 bg-slate-950 border border-slate-800 p-6 rounded-2xl text-center min-w-[150px]">
                  <div className="text-4xl font-black text-slate-100 mb-2">{String(cantidad)}</div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{profesional}</div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ALERTAS DE TOKENS (Saldos) */}
        <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
            <h2 className="font-black text-slate-200 uppercase tracking-widest text-sm flex items-center">
              <AlertOctagon className="mr-2 text-red-400" size={18} /> Alertas de Tokens
            </h2>
          </div>
          <div className="divide-y divide-slate-800">
            {pacientesCriticos?.length === 0 ? (
               <p className="text-slate-500 text-sm font-bold text-center py-10">Todos los pacientes tienen saldo suficiente.</p>
            ) : (
              pacientesCriticos?.map((p: any) => (
                <div key={p.paciente_id} className="p-4 flex justify-between items-center hover:bg-slate-800/50 transition-colors">
                  <div>
                    <div className="text-sm font-black text-slate-200">{p.nombre_completo}</div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Corte: {new Date(p.proxima_fecha_corte).toLocaleDateString()}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${
                    p.saldo_tokens < 0 ? 'bg-red-900/30 text-red-500 border border-red-900/50' : 'bg-amber-900/30 text-amber-500 border border-amber-900/50'
                  }`}>
                    {p.saldo_tokens} Tokens
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </main>
  );
}