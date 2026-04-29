import { supabase } from '@/lib/supabaseClient';
import { PacienteControl } from '@/types';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

export const revalidate = 0; // Fuerza renderizado dinámico para evitar caché obsoleta

export default async function Dashboard() {
  const { data: pacientes, error } = await supabase
    .from('vw_control_panel_agendamiento')
    .select('*')
    .order('saldo_tokens', { ascending: false });

  if (error) {
    return <div className="p-8 text-red-500">Error de conexión a la base de datos: {error.message}</div>;
  }

  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Panel de Control de Agendamiento</h1>
        <p className="text-sm text-gray-500 mt-2">Gestión algorítmica de sesiones mediante sistema de tokens</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Métricas omitidas por brevedad, irían aquí */}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Algorítmico</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Tokens</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Próximo Ciclo</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pacientes?.map((p: PacienteControl) => (
              <tr key={p.paciente_id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {p.nombre_completo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {p.estado_operativo === 'AL_DIA' && (
                    <span className="inline-flex items-center text-green-700 bg-green-50 px-2 py-1 rounded-md">
                      <CheckCircle className="w-4 h-4 mr-2" /> Cumplimiento Exacto
                    </span>
                  )}
                  {p.estado_operativo === 'REQUIERE_AGENDAMIENTO' && (
                    <span className="inline-flex items-center text-yellow-700 bg-yellow-50 px-2 py-1 rounded-md">
                      <AlertCircle className="w-4 h-4 mr-2" /> Déficit (Agendar)
                    </span>
                  )}
                  {p.estado_operativo === 'SESIONES_ADELANTADAS' && (
                    <span className="inline-flex items-center text-orange-700 bg-orange-50 px-2 py-1 rounded-md">
                      <Clock className="w-4 h-4 mr-2" /> Sobregiro Controlado
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">
                  {p.saldo_tokens}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(p.proxima_fecha_corte).toLocaleDateString('es-ES')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}