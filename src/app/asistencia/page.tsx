import VistaDiaria from '@/components/VistaDiaria';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default function AgendaPage() {
  return (
    <main className="p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter">Control Operativo Diario</h1>
        <p className="text-sm text-slate-400 font-medium">Gestión de asistencia, bloqueos y observaciones clínicas</p>
      </header>
      
      <VistaDiaria />
    </main>
  );
}