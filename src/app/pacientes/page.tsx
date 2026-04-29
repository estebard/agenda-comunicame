'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Search, 
  History, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export default function HistorialPacientesPage() {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Cargar lista de pacientes
  useEffect(() => {
    async function fetchPacientes() {
      const { data } = await supabase
        .from('vw_control_panel_agendamiento')
        .select('*')
        .order('nombre_completo');
      if (data) setPacientes(data);
    }
    fetchPacientes();
  }, []);

  // 2. Cargar historial cuando se selecciona un paciente
  useEffect(() => {
    if (pacienteSeleccionado) {
      async function fetchHistorial() {
        setIsLoading(true);
        const { data } = await supabase
          .from('cita')
          .select('*, profesional(nombre, especialidad)')
          .eq('paciente_id', pacienteSeleccionado.paciente_id)
          .order('fecha_hora_inicio', { ascending: false });
        if (data) setHistorial(data);
        setIsLoading(false);
      }
      fetchHistorial();
    }
  }, [pacienteSeleccionado]);

  const filteredPacientes = pacientes.filter(p => 
    p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="p-4 md:p-8 flex flex-col md:flex-row gap-6 h-[calc(100vh-2rem)]">
      
      {/* COLUMNA IZQUIERDA: Buscador de Niños */}
      <section className="w-full md:w-80 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar niño/a..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 pl-10 text-sm font-bold outline-none focus:border-blue-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-y-auto shadow-inner">
          <div className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
            Nómina de Pacientes
          </div>
          {filteredPacientes.map(p => (
            <button
              key={p.paciente_id}
              onClick={() => setPacienteSeleccionado(p)}
              className={`w-full text-left p-4 border-b border-slate-800/50 transition-all flex items-center justify-between group ${
                pacienteSeleccionado?.paciente_id === p.paciente_id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <div>
                <div className="text-sm font-bold">{p.nombre_completo}</div>
                <div className={`text-[10px] font-black uppercase ${
                   pacienteSeleccionado?.paciente_id === p.paciente_id ? 'text-blue-200' : 'text-slate-500'
                }`}>
                  Saldo: {p.saldo_tokens} Tokens
                </div>
              </div>
              <ArrowRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                 pacienteSeleccionado?.paciente_id === p.paciente_id ? 'opacity-100' : ''
              }`} />
            </button>
          ))}
        </div>
      </section>

      {/* COLUMNA DERECHA: Ficha y Movimientos */}
      <section className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        {pacienteSeleccionado ? (
          <>
            {/* Cabecera de la Ficha */}
            <header className="p-6 bg-slate-950 border-b border-slate-800">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter">
                    {pacienteSeleccionado.nombre_completo}
                  </h2>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center text-xs font-bold text-slate-400">
                      <CalendarIcon size={14} className="mr-1 text-blue-500" /> 
                      Ingreso: {new Date(pacienteSeleccionado.proxima_fecha_corte).toLocaleDateString()}
                    </span>
                    <span className="flex items-center text-xs font-bold text-slate-400">
                      <TrendingUp size={14} className="mr-1 text-green-500" /> 
                      Estado: {pacienteSeleccionado.estado_operativo}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-900 px-6 py-3 rounded-2xl border border-slate-800 text-center">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo Actual</div>
                  <div className={`text-2xl font-black ${pacienteSeleccionado.saldo_tokens >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pacienteSeleccionado.saldo_tokens} <span className="text-xs uppercase">Tokens</span>
                  </div>
                </div>
              </div>
            </header>

            {/* Listado de Movimientos */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <h3 className="flex items-center text-sm font-black text-blue-400 uppercase tracking-widest">
                <History className="mr-2" size={18} /> Mapa de Movimientos / Historial
              </h3>

              {isLoading ? (
                <div className="h-40 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : historial.length === 0 ? (
                <div className="text-center py-20 text-slate-600 font-bold uppercase text-xs tracking-widest border-2 border-dashed border-slate-800 rounded-3xl">
                  Sin registros previos en el sistema
                </div>
              ) : (
                <div className="space-y-3">
                  {historial.map((cita) => (
                    <div key={cita.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-start gap-4 hover:border-slate-700 transition-all group">
                      <div className={`mt-1 p-2 rounded-lg ${
                        cita.estado === 'ASISTE' ? 'bg-green-900/30 text-green-500' : 
                        cita.estado === 'NO_ASISTE' ? 'bg-red-900/30 text-red-500' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {cita.estado === 'ASISTE' ? <CheckCircle2 size={20} /> : 
                         cita.estado === 'NO_ASISTE' ? <XCircle size={20} /> : <AlertCircle size={20} />}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-black text-slate-200 uppercase">
                              {format(new Date(cita.fecha_hora_inicio), "EEEE dd 'de' MMMM, yyyy", { locale: es })}
                            </div>
                            <div className="text-xs font-bold text-blue-400 uppercase mt-0.5">
                              {cita.profesional?.especialidad} — {cita.profesional?.nombre} ({format(new Date(cita.fecha_hora_inicio), "HH:mm")} hrs)
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                              cita.estado === 'ASISTE' ? 'bg-green-900/50 text-green-400' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {cita.estado}
                            </span>
                            {cita.es_recuperacion && (
                              <span className="bg-orange-900/50 text-orange-400 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                                Recuperación
                              </span>
                            )}
                          </div>
                        </div>

                        {cita.observacion && (
                          <div className="mt-3 p-3 bg-slate-900/50 border-l-2 border-slate-700 text-xs text-slate-400 italic rounded-r-lg">
                            "{cita.observacion}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-700">
            <History size={64} className="mb-4 opacity-20" />
            <p className="font-black uppercase text-sm tracking-tighter">Selecciona un niño/a para ver su historial clínico</p>
          </div>
        )}
      </section>
    </main>
  );
}