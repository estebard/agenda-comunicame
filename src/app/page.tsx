import { supabase } from '@/lib/supabaseClient';
import { PacienteControl } from '@/types';
import { AlertCircle, CheckCircle, Clock, Calendar as CalendarIcon } from 'lucide-react';
import CalendarioAgendamiento from '@/components/CalendarioAgendamiento';

// Directivas críticas para que los datos se actualicen en tiempo real
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function Dashboard() {
  // 1. Obtenemos los datos de la vista algorítmica de tokens
  const { data: pacientes, error } = await supabase
    .from('vw_control_panel_agendamiento')
    .select('*')
    .order('saldo_tokens', { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-red-500 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="font-bold text-lg">Error de conexión con la base de datos</h2>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* SECCIÓN 1: CABECERA */}
      <header className="mb-8">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Gestor Centro Terapias</h1>
            <p className="text-sm text-gray-500 mt-1 italic">
              Sistema inteligente de tokens y agendamiento flexible
            </p>
          </div>
        </div>
      </header>

      {/* SECCIÓN 2: PANEL DE CONTROL DE TOKENS (SALDOS) */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Estado de Sesiones Mensuales</h2>
          <span className="text-xs font-semibold bg-gray-200 text-gray-600 px-2 py-1 rounded">
            TOTAL PACIENTES: {pacientes?.length || 0}
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Paciente</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Prioridad / Estado</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Tokens (Sesiones)</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Próximo Corte de Ciclo</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {pacientes?.map((p: PacienteControl) => (
                  <tr key={p.paciente_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {p.nombre_completo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {p.estado_operativo === 'AL_DIA' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1.5" /> Al día
                        </span>
                      )}
                      {p.estado_operativo === 'REQUIERE_AGENDAMIENTO' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertCircle className="w-3 h-3 mr-1.5" /> Pendiente agendar
                        </span>
                      )}
                      {p.estado_operativo === 'SESIONES_ADELANTADAS' && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          <Clock className="w-3 h-3 mr-1.5" /> Adelantando sesiones
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                        p.saldo_tokens > 0 ? 'bg-amber-50 text-amber-700' : 
                        p.saldo_tokens < 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-500'
                      }`}>
                        {p.saldo_tokens > 0 ? `+${p.saldo_tokens}` : p.saldo_tokens}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(p.proxima_fecha_corte).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECCIÓN 3: CALENDARIO OPERATIVO */}
      <section className="mt-12">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Agenda Semanal</h2>
          <p className="text-sm text-gray-500">Visualiza cupos libres y gestiona las sesiones de los terapeutas.</p>
        </div>
        
        <CalendarioAgendamiento />
      </section>

      <footer className="mt-16 py-8 border-t border-gray-200 text-center text-gray-400 text-xs">
        &copy; {new Date().getFullYear()} Centro Terapias Comunícame - Gestión Inteligente
      </footer>
    </main>
  );
}