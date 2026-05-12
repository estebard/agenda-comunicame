'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { format, startOfDay, endOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, CheckCircle2, XCircle, AlertCircle, Lock, CalendarDays, RefreshCw, FileSpreadsheet, FileText } from 'lucide-react';
import ModalGestionarBloque from './ModalGestionarBloque';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const HORARIOS = ['09:05', '10:00', '11:00', '12:00', '13:00', '14:00', '14:50', '15:40', '16:30', '17:20'];

const calcularEdad = (fechaNacimiento: string | null): string => {
  if (!fechaNacimiento) return 'S/I';
  const hoy = new Date();
  const cumpleanos = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - cumpleanos.getFullYear();
  const m = hoy.getMonth() - cumpleanos.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) { edad--; }
  return `${edad}a`;
};

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

export default function VistaDiaria() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [fecha, setFecha] = useState(() => {
    const param = searchParams.get('fecha');
    if (param) {
      const d = new Date(param + 'T12:00:00');
      return isNaN(d.getTime()) ? new Date() : d;
    }
    return new Date();
  });
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [bloques, setBloques] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('fecha', format(fecha, 'yyyy-MM-dd'));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [fecha]);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: profs } = await supabase.from('profesional').select('*').order('nombre');
    
    const inicioStr = startOfDay(fecha).toISOString();
    const finStr = endOfDay(fecha).toISOString();

    // 1. Obtener Transacciones de Ejecución Activas
    const { data: asistencias, error: errAsistencias } = await supabase
      .from('asistencia')
      .select(`
        id, fecha_hora_ejecucion, estado, observacion, profesional_id,
        cita:cita_oficial_id (id, fecha_hora_inicio, es_recuperacion, paciente:paciente_id(id, nombre_completo, fecha_nacimiento, nombre_apoderado, tokens_disponibles))
      `)
      .gte('fecha_hora_ejecucion', inicioStr)
      .lte('fecha_hora_ejecucion', finStr);

    if (errAsistencias) console.error("Error DQL Asistencias:", errAsistencias);

    // 2. Obtener Planificación Oficial (Proyecciones de lectura)
    const { data: citas, error: errCitas } = await supabase
      .from('cita')
      .select('id, fecha_hora_inicio, estado, observacion, es_recuperacion, profesional_id, paciente:paciente_id(id, nombre_completo, fecha_nacimiento, nombre_apoderado, tokens_disponibles)').gte('fecha_hora_inicio', inicioStr)
      .lte('fecha_hora_inicio', finStr);

    if (errCitas) console.error("Error DQL Citas:", errCitas);

    // 3. Consolidación de Entidades (Deduplicación por Integridad Referencial)
    const citasConAsistencia = new Set(asistencias?.map((a: any) => a.cita?.id).filter(Boolean));

    const asistenciasMap = (asistencias || []).map((a: any) => ({
      isEjecucion: true,
      asistenciaId: a.id,
      citaOficialId: a.cita?.id,
      profesionalId: a.profesional_id,
      horaRender: format(new Date(a.fecha_hora_ejecucion), 'HH:mm'),
      fechaOficial: a.cita?.fecha_hora_inicio,
      esRecuperacion: a.cita?.es_recuperacion || false,
      paciente: a.cita?.paciente,
      estado: a.estado,
      observacion: a.observacion
    }));

    const citasMap = (citas || [])
      .filter((c: any) => !citasConAsistencia.has(c.id))
      .map((c: any) => ({
        isEjecucion: false,
        asistenciaId: null,
        citaOficialId: c.id,
        profesionalId: c.profesional_id,
        horaRender: format(new Date(c.fecha_hora_inicio), 'HH:mm'),
        fechaOficial: c.fecha_hora_inicio,
        esRecuperacion: c.es_recuperacion || false,
        paciente: c.paciente,
        estado: c.estado || 'AGENDADA',
        observacion: c.observacion
      }));

    if (profs) setProfesionales(profs);
    setBloques([...asistenciasMap, ...citasMap]);
    setIsLoading(false);
  };

  useEffect(() => { 
    fetchData(); 
  }, [fecha]);

  const openModal = (hora: string, profesional: any, bloque: any) => {
    if (hora === '13:00') return; 
    setModalData({ hora, profesional, bloque });
    setIsModalOpen(true);
  };

  const getEstilosEstado = (estado: string) => {
    switch (estado) {
      case 'CONFIRMADA': return 'bg-blue-900/60 border-l-4 border-blue-500 text-blue-100 hover:bg-blue-800/80';
      case 'ASISTE': return 'bg-emerald-900/60 border-l-4 border-emerald-500 text-emerald-100 hover:bg-emerald-800/80';
      case 'NO_ASISTE': return 'bg-red-900/60 border-l-4 border-red-500 text-red-100 opacity-90 hover:opacity-100 hover:bg-red-800/80';
      default: return 'bg-amber-900/40 border-l-4 border-amber-500 text-amber-100 hover:bg-amber-800/60'; 
    }
  };

  const getIconoEstado = (estado: string) => {
    switch (estado) {
      case 'CONFIRMADA': return <CheckCircle2 size={12} className="text-blue-400 mr-1" />;
      case 'ASISTE': return <CheckCircle2 size={12} className="text-emerald-400 mr-1" />;
      case 'NO_ASISTE': return <XCircle size={12} className="text-red-400 mr-1" />;
      default: return <AlertCircle size={12} className="text-amber-400 mr-1" />;
    }
  };

  const rowsParaReporte = () => {
    const rows: any[] = [];
    HORARIOS.forEach(hora => {
      profesionales.forEach(p => {
        const celdas = bloques.filter(b => b.profesionalId === p.id && b.horaRender === hora);
        if (celdas.length === 0) return;
        celdas.forEach(b => {
          rows.push({
            hora,
            profesional: p.nombre,
            especialidad: p.especialidad,
            paciente: b.paciente?.nombre_completo || '—',
            estado: b.estado,
            observacion: b.observacion || '',
            tokens: b.paciente?.tokens_disponibles ?? '—',
            recuperacion: b.esRecuperacion ? 'Sí' : 'No',
            agendaOficial: b.fechaOficial ? format(new Date(b.fechaOficial), 'dd/MM/yyyy HH:mm') : '—'
          });
        });
      });
    });
    return rows;
  };

  const exportarPDF = () => {
    setIsExporting(true);
    const doc = new jsPDF({ orientation: 'landscape' });
    const titulo = `Informe de Asistencia — ${format(fecha, "dd/MM/yyyy", { locale: es })}`;
    doc.setFontSize(14);
    doc.text(titulo, 14, 15);
    doc.setFontSize(10);
    doc.text(`Centro Comunícame — ${format(fecha, "EEEE dd 'de' MMMM, yyyy", { locale: es })}`, 14, 22);

    const rows = rowsParaReporte();
    (doc as any).autoTable({
      startY: 28,
      head: [['Hora', 'Profesional', 'Especialidad', 'Paciente', 'Estado', 'Observación', 'Tokens', 'Recup.', 'Agenda Oficial']],
      body: rows.map(r => [r.hora, r.profesional, r.especialidad, r.paciente, r.estado, r.observacion, String(r.tokens), r.recuperacion, r.agendaOficial]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [241, 245, 249] }
    });
    doc.save(`asistencia_${format(fecha, 'yyyy-MM-dd')}.pdf`);
    setIsExporting(false);
  };

  const exportarExcel = () => {
    setIsExporting(true);
    const rows = rowsParaReporte();
    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ['hora', 'profesional', 'especialidad', 'paciente', 'estado', 'observacion', 'tokens', 'recuperacion', 'agendaOficial']
    });
    ws['!cols'] = [
      { wch: 8 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 14 }, { wch: 35 }, { wch: 10 }, { wch: 8 }, { wch: 20 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
    XLSX.writeFile(wb, `asistencia_${format(fecha, 'yyyy-MM-dd')}.xlsx`);
    setIsExporting(false);
  };

  return (
    <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col h-[calc(100vh-2rem)]">
      <div className="bg-slate-950 p-5 flex justify-between items-center border-b border-slate-800">
        <h2 className="font-black text-slate-100 uppercase tracking-widest flex items-center text-lg">
          <CalendarDays className="mr-3 text-orange-400" size={24} /> Asistencia y Novedades Diarias
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 hidden md:inline">
            {format(fecha, "EEEE dd/MM/yyyy", { locale: es })}
          </span>
          <input 
            type="date" 
            className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm font-bold text-slate-200 outline-none focus:border-blue-500 cursor-pointer"
            value={format(fecha, 'yyyy-MM-dd')}
            onChange={(e) => setFecha(new Date(e.target.value + 'T12:00:00'))}
          />
          <button onClick={exportarPDF} disabled={isExporting} className="bg-red-600 hover:bg-red-500 disabled:bg-red-900/50 text-white px-3 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors flex items-center" title="Exportar PDF">
            <FileText size={14} className="mr-1" /> PDF
          </button>
          <button onClick={exportarExcel} disabled={isExporting} className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/50 text-white px-3 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-colors flex items-center" title="Exportar Excel">
            <FileSpreadsheet size={14} className="mr-1" /> Excel
          </button>
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
              <th className="w-24 bg-slate-950 border-b border-r border-slate-800 p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0 left-0 z-30 shadow-sm">Hora</th>
              {profesionales.map((p, index) => (
                <th key={p.id} className={`border-b border-r border-slate-800 p-4 min-w-[240px] sticky top-0 z-20 shadow-sm ${getFondoColumna(index)}`}>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{p.especialidad}</div>
                  <div className="text-sm font-black text-slate-200 uppercase">{p.nombre}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HORARIOS.map(hora => (
              <tr key={hora}>
                <td className="bg-slate-950 border-b border-r border-slate-800 p-3 text-center text-[11px] font-black text-slate-400 sticky left-0 z-10 shadow-sm">
                  {hora === '13:00' ? <Clock size={14} className="mx-auto text-orange-500" /> : hora}
                </td>
                {profesionales.map((p, index) => {
                  const bloquesCeldas = bloques.filter(b => b.profesionalId === p.id && b.horaRender === hora);
                  const esColacion = hora === '13:00';

                  return (
                    <td key={`${p.id}-${hora}`} className={`border-b border-r border-slate-800 p-1.5 align-top transition-all min-h-[7rem] ${esColacion ? 'bg-slate-950 cursor-not-allowed' : getFondoColumna(index)}`}>
                      {esColacion ? (
                        <div className="h-full flex items-center justify-center text-[10px] font-black text-orange-500/50 uppercase tracking-widest mt-4">Colación</div>
                      ) : (
                        <div className="flex flex-col gap-1 h-full min-h-[6rem]">
                          {bloquesCeldas.map(b => (
                            <div 
                              key={b.asistenciaId || b.citaOficialId}
                              onClick={() => openModal(hora, p, b)}
                              className={`p-2 rounded-lg cursor-pointer transition-colors shadow-sm flex flex-col justify-between ${getEstilosEstado(b.estado)}`}
                            >
                              <div>
                                <div className="flex justify-between items-start mb-1">
                                  <div className="text-[11px] font-black uppercase leading-tight truncate pr-1">
                                    {b.paciente?.nombre_completo}
                                  </div>
                                  <span className="text-[9px] font-bold opacity-80 whitespace-nowrap">
                                    {calcularEdad(b.paciente?.fecha_nacimiento)}
                                  </span>
                                </div>

                                <div className="flex gap-1 flex-wrap mb-1.5">
                                  {b.fechaOficial && (
                                    <div className="bg-amber-950/40 text-amber-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-amber-500/30 inline-block">
                                      Agenda: {format(new Date(b.fechaOficial), "dd MMM HH:mm", { locale: es })} hrs
                                    </div>
                                  )}

                                  {b.esRecuperacion && (
                                    <div className="bg-purple-900/40 text-purple-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-purple-500/30 inline-block flex items-center gap-0.5">
                                      <RefreshCw size={10} /> Recuperación
                                    </div>
                                  )}

                                  <div className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border inline-block ${
                                    (b.paciente?.tokens_disponibles || 0) > 0 
                                      ? 'bg-blue-900/40 text-blue-400 border-blue-500/30' 
                                      : 'bg-red-900/40 text-red-400 border-red-500/30'
                                  }`}>
                                    {(b.paciente?.tokens_disponibles || 0) > 0 
                                      ? `${b.paciente?.tokens_disponibles} Tokens` 
                                      : `Deuda: ${Math.abs(b.paciente?.tokens_disponibles || 0)} T`}
                                  </div>
                                </div>

                                {b.paciente?.nombre_apoderado && (
                                  <div className="text-[9px] font-bold text-slate-400 mb-1">
                                    Apod.: {b.paciente.nombre_apoderado}
                                  </div>
                                )}

                                {b.observacion && (
                                  <div className="text-[9px] font-medium leading-tight opacity-90 mb-1 italic line-clamp-2">
                                    "{b.observacion}"
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-between items-end mt-1 pt-1 border-t border-black/10">
                                <div className="flex items-center text-[9px] font-black uppercase tracking-wider">
                                  {getIconoEstado(b.estado)} {b.estado}
                                </div>
                              </div>
                            </div>
                          ))}

                          <div 
                            onClick={() => openModal(hora, p, null)}
                            className={`flex items-center justify-center border-2 border-dashed border-slate-800/50 rounded-lg cursor-pointer transition-opacity ${
                              bloquesCeldas.length > 0 ? 'opacity-0 hover:opacity-100 h-6 mt-1' : 'h-full opacity-0 hover:opacity-100 flex-1'
                            }`}
                          >
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">+ Referencia</span>
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

      {modalData && (
        <ModalGestionarBloque 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          dia={fecha}
          hora={modalData.hora}
          profesionalGrid={modalData.profesional}
          bloqueExistente={modalData.bloque}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}