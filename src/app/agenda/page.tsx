'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { format, addDays, startOfWeek, subWeeks, addWeeks, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ChevronDown, CalendarDays, Filter, FileText, FileSpreadsheet, RefreshCw, Clock } from 'lucide-react';
import ModalGestionarCita from '@/components/ModalGestionarCita';
import { useAuth } from '@/lib/auth';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const HORARIOS = ['09:05', '10:00', '11:00', '12:00', '14:00', '14:50', '15:40', '16:30', '17:20'];
const DIAS_SEMANA = [1, 2, 3, 4, 5];

const getFondoColumna = (index: number) => {
  const fondos = [
    'bg-amber-900/20 hover:bg-amber-900/40', 'bg-emerald-900/20 hover:bg-emerald-900/40',
    'bg-blue-900/20 hover:bg-blue-900/40', 'bg-orange-900/20 hover:bg-orange-900/40',
    'bg-red-900/20 hover:bg-red-900/40',
  ];
  return fondos[index % fondos.length];
};

const getEstilosEstado = (estado: string) => {
  switch (estado) {
    case 'CONFIRMADA': return 'border-l-4 border-blue-500 bg-blue-900/60 text-blue-100';
    case 'ASISTE': return 'border-l-4 border-emerald-500 bg-emerald-900/60 text-emerald-100';
    case 'NO_ASISTE': return 'border-l-4 border-red-500 bg-red-900/60 text-red-100';
    case 'CANCELADA': return 'border-l-4 border-slate-500 bg-slate-800/60 text-slate-400 opacity-60';
    default: return 'border-l-4 border-amber-500 bg-amber-900/40 text-amber-100';
  }
};

export default function AgendaOuter() {
  return (
    <Suspense fallback={<div className="h-40 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>}>
      <AgendaInner />
    </Suspense>
  );
}

function AgendaInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { rol, profesionalId } = useAuth();

  const [fechaBase, setFechaBase] = useState(() => {
    const p = searchParams.get('semana');
    if (p) { const d = new Date(p + 'T12:00:00'); return isNaN(d.getTime()) ? new Date() : d; }
    return new Date();
  });

  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [profesionalSel, setProfesionalSel] = useState<string>('');
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [citas, setCitas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState<any>(null);
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState<{ dia: Date; hora: string; profesionalId: string; profesionalNombre: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [vistaDiaria, setVistaDiaria] = useState(false);
  const [fechaDiaria, setFechaDiaria] = useState(() => {
    const p = searchParams.get('fecha');
    if (p) { const d = new Date(p + 'T12:00:00'); return isNaN(d.getTime()) ? new Date() : d; }
    return new Date();
  });
  const [fechaTexto, setFechaTexto] = useState(format(new Date(), 'dd/MM/yyyy'));

  const fetchCitas = useCallback(async () => {
    setIsLoading(true);
    const inicio = vistaDiaria ? startOfDay(fechaDiaria) : startOfWeek(fechaBase, { weekStartsOn: 1 });
    const fin = vistaDiaria ? endOfDay(fechaDiaria) : addDays(startOfWeek(fechaBase, { weekStartsOn: 1 }), 5);

    let query = supabase.from('cita').select(`
      id, fecha_hora_inicio, fecha_hora_fin, estado, observacion, es_recuperacion,
      paciente_id, profesional_id,
      paciente:paciente_id(nombre_completo, fecha_nacimiento, nombre_apoderado, tokens_disponibles),
      profesional:profesional_id(nombre, especialidad)
    `).gte('fecha_hora_inicio', inicio.toISOString())
      .lt('fecha_hora_inicio', fin.toISOString());

    if (!mostrarTodos && profesionalSel) query = query.eq('profesional_id', profesionalSel);

    const { data } = await query;
    if (data) setCitas(data);

    // Monthly stats
    const im = startOfMonth(fechaBase).toISOString();
    const fm = endOfMonth(fechaBase).toISOString();
    const { data: mData } = await supabase.from('cita')
      .select('id, estado, profesional_id, es_recuperacion, paciente:paciente_id(nombre_completo, tokens_disponibles)')
      .gte('fecha_hora_inicio', im).lte('fecha_hora_inicio', fm);
    setMonthlyData(mData || []);

    setIsLoading(false);
  }, [fechaBase, profesionalSel, mostrarTodos, vistaDiaria, fechaDiaria]);

  useEffect(() => {
    supabase.from('profesional').select('*').order('nombre').then(({ data }) => {
      if (data) {
        const orden = ['Rosa', 'Valentina', 'Karina'];
        let filtered = data;
        if (rol === 'profesional' && profesionalId) filtered = data.filter((p: any) => p.id === profesionalId);
        filtered.sort((a: any, b: any) => {
          const ia = orden.findIndex((n: string) => (a.nombre || '').toLowerCase().startsWith(n.toLowerCase()));
          const ib = orden.findIndex((n: string) => (b.nombre || '').toLowerCase().startsWith(n.toLowerCase()));
          if (ia >= 0 && ib >= 0) return ia - ib;
          if (ia >= 0) return -1; if (ib >= 0) return 1;
          return (a.nombre || '').localeCompare(b.nombre || '');
        });
        setProfesionales(filtered);
        if (filtered.length > 0 && !mostrarTodos) setProfesionalSel(filtered[0].id);
        else setIsLoading(false);
      } else setIsLoading(false);
    });
  }, []);

  useEffect(() => { fetchCitas(); }, [fetchCitas]);
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (vistaDiaria) {
      params.set('fecha', format(fechaDiaria, 'yyyy-MM-dd'));
      params.delete('semana');
    } else {
      params.set('semana', format(fechaBase, 'yyyy-MM-dd'));
      params.delete('fecha');
    }
    router.replace('?' + params.toString(), { scroll: false });
  }, [fechaBase, fechaDiaria, vistaDiaria]);

  const inicioSemana = startOfWeek(fechaBase, { weekStartsOn: 1 });
  const diasRender = DIAS_SEMANA.map(o => addDays(inicioSemana, o - 1));
  const profsRender = mostrarTodos ? profesionales : profesionales.filter(p => p.id === profesionalSel);

  const getCitaEnBloque = (dia: Date, horaStr: string, profId: string) => {
    const [h, m] = horaStr.split(':').map(Number);
    const fb = new Date(dia); fb.setHours(h, m, 0, 0);
    return citas.filter(c =>
      c.profesional_id === profId &&
      Math.abs(new Date(c.fecha_hora_inicio).getTime() - fb.getTime()) < 300000
    );
  };

  const avanzarDia = (n: number) => { const d = new Date(fechaDiaria); d.setDate(d.getDate() + n); setFechaDiaria(d); setFechaTexto(format(d, 'dd/MM/yyyy')); };

  const parsearFechaManual = (val: string) => {
    setFechaTexto(val);
    const match = val.replace(/\s/g, '').match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (match) {
      let year = parseInt(match[3]); if (year < 100) year += 2000;
      const d = new Date(year, parseInt(match[2]) - 1, parseInt(match[1]), 12);
      if (!isNaN(d.getTime())) { setFechaDiaria(d); setFechaTexto(format(d, 'dd/MM/yyyy')); }
    }
  };

  const openSlot = (dia: Date, hora: string, prof: any) => {
    setBloqueSeleccionado({ dia, hora, profesionalId: prof.id, profesionalNombre: prof.nombre });
    setCitaSeleccionada(null);
    setIsModalOpen(true);
  };

  const openCita = (cita: any) => {
    setCitaSeleccionada(cita);
    setBloqueSeleccionado(null);
    setIsModalOpen(true);
  };

  // Export
  const rowsParaReporte = () => {
    const rows: any[] = [];
    HORARIOS.forEach(hora => {
      profsRender.forEach((p: any) => {
        const items = getCitaEnBloque(new Date(), hora, p.id);
        items.forEach((c: any) => {
          rows.push({ hora, profesional: p.nombre, especialidad: p.especialidad,
            paciente: c.paciente?.nombre_completo || '—', estado: c.estado,
            observacion: c.observacion || '', tokens: c.paciente?.tokens_disponibles ?? '—',
            recuperacion: c.es_recuperacion ? 'Sí' : 'No',
            apoderado: c.paciente?.nombre_apoderado || '—',
            agenda: format(new Date(c.fecha_hora_inicio), 'dd/MM HH:mm') });
        });
      });
    });
    return rows;
  };

  const exportarPDF = () => {
    setIsExporting(true);
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Informe de Agenda — ' + format(fechaBase, 'dd/MM/yyyy'), 14, 15);
    doc.setFontSize(9); doc.text('Centro Comunícame', 14, 22);

    const rows = rowsParaReporte();
    autoTable(doc, {
      startY: 28,
      head: [['Hora', 'Prof.', 'Esp.', 'Paciente', 'Estado', 'Obs.', 'Tokens', 'Recup.', 'Apo.', 'Agenda']],
      body: rows.map((r: any) => [r.hora, r.profesional, r.especialidad, r.paciente, r.estado, r.observacion, String(r.tokens), r.recuperacion, r.apoderado, r.agenda]),
      styles: { fontSize: 6, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [243, 244, 246] },
    });
    let y = (doc as any).lastAutoTable.finalY + 8;

    const m = monthlyData;
    const asiste = m.filter((b: any) => b.estado === 'ASISTE').length;
    const noAsiste = m.filter((b: any) => b.estado === 'NO_ASISTE').length;
    const total = m.length;
    const rec = m.filter((b: any) => b.es_recuperacion).length;
    const unicos = new Set(m.map((b: any) => b.paciente?.nombre_completo).filter(Boolean)).size;
    const pct = (n: number) => total > 0 ? ((n / total) * 100).toFixed(1) + '%' : '0%';
    const resumen = [
      ['Total sesiones', String(total)], ['Asistencias', `${asiste} (${pct(asiste)})`],
      ['Inasistencias', `${noAsiste} (${pct(noAsiste)})`], ['Recuperaciones', `${rec} (${pct(rec)})`],
      ['Pacientes únicos', String(unicos)], ['Profesionales', String(profsRender.length)],
    ];
    const porProf = profsRender.map((p: any) => {
      const c = m.filter((b: any) => b.profesional_id === p.id);
      return [p.nombre, String(c.length), String(c.filter((b: any) => b.estado === 'ASISTE').length),
        String(c.filter((b: any) => b.estado === 'NO_ASISTE').length)];
    });

    autoTable(doc, { startY: y, head: [['Resumen del mes'], []] as any, body: resumen, styles: { fontSize: 7 }, headStyles: { fillColor: [59, 130, 246], textColor: 255 } });
    y = (doc as any).lastAutoTable.finalY + 8;
    autoTable(doc, { startY: y, head: [['Profesional', 'Total', 'Asiste', 'No Asiste']], body: porProf, styles: { fontSize: 7 }, headStyles: { fillColor: [16, 185, 129], textColor: 255 } });

    doc.save('agenda_' + format(fechaBase, 'yyyy-MM-dd') + '.pdf');
    setIsExporting(false);
  };

  const exportarExcel = () => {
    setIsExporting(true);
    const ws = XLSX.utils.json_to_sheet(rowsParaReporte());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Agenda');
    XLSX.writeFile(wb, 'agenda_' + format(fechaBase, 'yyyy-MM-dd') + '.xlsx');
    setIsExporting(false);
  };

  const CitaCard = ({ cita, onClick }: { cita: any; onClick: () => void }) => (
    <div onClick={onClick} className={`p-2 rounded-lg cursor-pointer transition-colors shadow-sm flex flex-col ${getEstilosEstado(cita.estado)}`}>
      <div className="flex justify-between items-start mb-1">
        <span className="text-[11px] font-black uppercase leading-tight truncate">{cita.paciente?.nombre_completo}</span>
        <span className="text-[9px] font-bold opacity-80 whitespace-nowrap">{cita.paciente?.fecha_nacimiento ? (() => { const h = new Date(); const c = new Date(cita.paciente.fecha_nacimiento); let e = h.getFullYear() - c.getFullYear(); if (h.getMonth() < c.getMonth() || (h.getMonth() === c.getMonth() && h.getDate() < c.getDate())) e--; return e + 'a'; })() : ''}</span>
      </div>
      <div className="flex items-center gap-1 flex-wrap mb-1">
        <span className="text-[9px] font-black uppercase opacity-70">{cita.estado}</span>
        {cita.es_recuperacion && <span className="bg-purple-900/40 text-purple-400 text-[7px] font-black px-1 py-0.5 rounded border border-purple-500/30 uppercase">Recuperación</span>}
        {cita.referencia_cita_id && <span className="bg-amber-900/40 text-amber-400 text-[7px] font-black px-1 py-0.5 rounded border border-amber-500/30 uppercase">Vinculada</span>}
        <span className={`text-[7px] font-black px-1 py-0.5 rounded border ${(cita.paciente?.tokens_disponibles ?? 0) > 0 ? 'bg-blue-900/40 text-blue-400 border-blue-500/30' : 'bg-red-900/40 text-red-400 border-red-500/30'}`}>
          {(cita.paciente?.tokens_disponibles ?? 0) > 0 ? cita.paciente.tokens_disponibles + ' Tokens' : 'Deuda: ' + Math.abs(cita.paciente?.tokens_disponibles ?? 0)}
        </span>
      </div>
      {cita.observacion && <div className="text-[8px] text-slate-400 italic leading-tight line-clamp-2 mt-0.5">{cita.observacion}</div>}
    </div>
  );

  return (
    <main className="p-4 md:p-8 space-y-6 h-[calc(100vh-2rem)] flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-100 uppercase tracking-tighter">Agenda</h1>
          <p className="text-sm font-bold text-slate-400 mt-1">Planificación y asistencia diaria</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button onClick={() => setVistaDiaria(false)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest ${!vistaDiaria ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Semanal</button>
            <button onClick={() => setVistaDiaria(true)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest ${vistaDiaria ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Diario</button>
          </div>
          {!vistaDiaria && (
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <button onClick={() => setFechaBase(subWeeks(fechaBase, 1))} className="p-1.5 hover:bg-slate-800 rounded-lg"><ChevronLeft size={18} className="text-slate-400" /></button>
              <span className="text-sm font-black text-slate-200 min-w-[180px] text-center">{format(inicioSemana, "dd MMM", { locale: es })} — {format(addDays(inicioSemana, 4), "dd MMM yyyy", { locale: es })}</span>
              <button onClick={() => setFechaBase(addWeeks(fechaBase, 1))} className="p-1.5 hover:bg-slate-800 rounded-lg"><ChevronRight size={18} className="text-slate-400" /></button>
            </div>
          )}
          {vistaDiaria && (
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <button onClick={() => avanzarDia(-1)} className="p-1.5 hover:bg-slate-800 rounded-lg"><ChevronLeft size={18} className="text-slate-400" /></button>
              <span className="text-xs font-bold text-slate-400">{format(fechaDiaria, "EEEE", { locale: es })}</span>
              <input type="text" className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-200 outline-none focus:border-blue-500 text-center w-[100px]"
                value={fechaTexto} onChange={(e) => parsearFechaManual(e.target.value)}
                onBlur={() => setFechaTexto(format(fechaDiaria, 'dd/MM/yyyy'))} placeholder="DD/MM/AAAA" />
              <button onClick={() => avanzarDia(1)} className="p-1.5 hover:bg-slate-800 rounded-lg"><ChevronRight size={18} className="text-slate-400" /></button>
            </div>
          )}
          <div className="flex bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <button onClick={() => setMostrarTodos(false)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest ${!mostrarTodos ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Individual</button>
            <button onClick={() => setMostrarTodos(true)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest ${mostrarTodos ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Todos</button>
          </div>
          {!mostrarTodos && (
            <div className="relative">
              <select className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-slate-200 outline-none appearance-none pr-8 cursor-pointer"
                value={profesionalSel} onChange={(e) => setProfesionalSel(e.target.value)}>
                {profesionales.map((p: any) => <option key={p.id} value={p.id}>{p.especialidad} — {p.nombre}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          )}
          <button onClick={exportarPDF} disabled={isExporting} className="bg-red-600 hover:bg-red-500 disabled:bg-red-900/50 text-white px-3 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest"><FileText size={14} className="mr-1" /> PDF</button>
          <button onClick={exportarExcel} disabled={isExporting} className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/50 text-white px-3 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest"><FileSpreadsheet size={14} className="mr-1" /> Excel</button>
        </div>
      </header>

      <section className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col">
        {isLoading && <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="min-w-full border-collapse table-fixed h-full">
            {!vistaDiaria ? (
              <>
                <thead>
                  <tr>
                    <th className="w-24 bg-slate-950 border-b border-r border-slate-800 p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0 left-0 z-30">Hora</th>
                    {diasRender.map((d, i) => (
                      <th key={d.toISOString()} className={`border-b border-r border-slate-800 p-3 min-w-[240px] sticky top-0 z-20 ${getFondoColumna(i)}`}>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(d, 'EEEE', { locale: es })}</div>
                        <div className="text-2xl font-black text-slate-100 leading-none mt-1">{format(d, 'dd')}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HORARIOS.map(hora => (
                    <tr key={hora}>
                      <td className="bg-slate-950 border-b border-r border-slate-800 p-2 text-center text-[11px] font-black text-slate-400 sticky left-0 z-10">{hora}</td>
                      {diasRender.map((dia, di) => (
                        <td key={`${dia.getTime()}-${hora}`} className={`border-b border-r border-slate-800 p-1.5 align-top min-h-[6rem] ${getFondoColumna(di)}`}>
                          <div className="flex flex-col gap-1 h-full min-h-[5rem]">
                            {profsRender.map((prof: any) => {
                              const items = getCitaEnBloque(dia, hora, prof.id);
                              return items.length > 0 ? items.map((cita: any) => (<CitaCard key={cita.id} cita={cita} onClick={() => openCita(cita)} />)) : null;
                            })}
                            <div onClick={() => { const p = profsRender[0]; if (p) openSlot(dia, hora, p); }}
                              className="flex items-center justify-center border-2 border-dashed border-slate-800/50 rounded-lg cursor-pointer opacity-0 hover:opacity-100 flex-1">
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">+ Agendar</span>
                            </div>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr>
                    <th className="w-24 bg-slate-950 border-b border-r border-slate-800 p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0 left-0 z-30">Hora</th>
                    {profsRender.map((p: any, i: number) => (
                      <th key={p.id} className={`border-b border-r border-slate-800 p-3 min-w-[240px] sticky top-0 z-20 ${getFondoColumna(i)}`}>
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
                      {profsRender.map((p: any, i: number) => {
                        const items = getCitaEnBloque(new Date(fechaDiaria.getFullYear(), fechaDiaria.getMonth(), fechaDiaria.getDate()), hora, p.id);
  const CitaCard = ({ cita, onClick }: { cita: any; onClick: () => void }) => (
    <div onClick={onClick} className={`p-2 rounded-lg cursor-pointer transition-colors shadow-sm flex flex-col ${getEstilosEstado(cita.estado)}`}>
      <div className="flex justify-between items-start mb-1">
        <span className="text-[11px] font-black uppercase leading-tight truncate">{cita.paciente?.nombre_completo}</span>
        <span className="text-[9px] font-bold opacity-80 whitespace-nowrap">{cita.paciente?.fecha_nacimiento ? (() => { const h = new Date(); const c = new Date(cita.paciente.fecha_nacimiento); let e = h.getFullYear() - c.getFullYear(); if (h.getMonth() < c.getMonth() || (h.getMonth() === c.getMonth() && h.getDate() < c.getDate())) e--; return e + 'a'; })() : ''}</span>
      </div>
      <div className="flex items-center gap-1 flex-wrap mb-1">
        <span className="text-[9px] font-black uppercase opacity-70">{cita.estado}</span>
        {cita.es_recuperacion && <span className="bg-purple-900/40 text-purple-400 text-[7px] font-black px-1 py-0.5 rounded border border-purple-500/30 uppercase">Recuperación</span>}
        {cita.referencia_cita_id && <span className="bg-amber-900/40 text-amber-400 text-[7px] font-black px-1 py-0.5 rounded border border-amber-500/30 uppercase">Vinculada</span>}
        <span className={`text-[7px] font-black px-1 py-0.5 rounded border ${(cita.paciente?.tokens_disponibles ?? 0) > 0 ? 'bg-blue-900/40 text-blue-400 border-blue-500/30' : 'bg-red-900/40 text-red-400 border-red-500/30'}`}>
          {(cita.paciente?.tokens_disponibles ?? 0) > 0 ? cita.paciente.tokens_disponibles + ' Tokens' : 'Deuda: ' + Math.abs(cita.paciente?.tokens_disponibles ?? 0)}
        </span>
      </div>
      {cita.observacion && <div className="text-[8px] text-slate-400 italic leading-tight line-clamp-2 mt-0.5">{cita.observacion}</div>}
    </div>
  );

  return (
                          <td key={`${p.id}-${hora}`} className={`border-b border-r border-slate-800 p-1.5 align-top min-h-[6rem] ${hora === '13:00' ? 'bg-slate-950' : getFondoColumna(i)}`}>
                            <div className="flex flex-col gap-1 h-full min-h-[5rem]">
                              {hora === '13:00' ? (
                                <div className="h-full flex items-center justify-center text-[10px] font-black text-orange-500/50 uppercase tracking-widest">Colación</div>
                              ) : (
                                <>
                                  {items.length > 0 ? items.map((cita: any) => (<CitaCard key={cita.id} cita={cita} onClick={() => openCita(cita)} />)) : (
                                    <div onClick={() => openSlot(new Date(fechaDiaria.getFullYear(), fechaDiaria.getMonth(), fechaDiaria.getDate()), hora, p)}
                                      className="flex items-center justify-center border-2 border-dashed border-slate-800/50 rounded-lg cursor-pointer opacity-0 hover:opacity-100 flex-1">
                                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">+ Agendar</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </>
            )}
          </table>
        </div>
      </section>

      {isModalOpen && (
        <ModalGestionarCita
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setCitaSeleccionada(null); setBloqueSeleccionado(null); }}
          dia={citaSeleccionada ? new Date(citaSeleccionada.fecha_hora_inicio) : (bloqueSeleccionado?.dia || new Date())}
          hora={citaSeleccionada ? format(new Date(citaSeleccionada.fecha_hora_inicio), 'HH:mm') : (bloqueSeleccionado?.hora || '09:05')}
          profesionalId={citaSeleccionada?.profesional_id || bloqueSeleccionado?.profesionalId || ''}
          profesionalNombre={citaSeleccionada?.profesional?.nombre || bloqueSeleccionado?.profesionalNombre || ''}
          citaExistente={citaSeleccionada}
          onSuccess={fetchCitas}
        />
      )}
    </main>
  );
}
