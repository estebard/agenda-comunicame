'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Search, History, TrendingUp, Calendar as CalendarIcon, 
  CheckCircle2, XCircle, AlertCircle, ArrowRight, Wallet, PlusCircle, ArrowDownRight, ArrowUpRight, X, MinusCircle
} from 'lucide-react';

export default function HistorialPacientesPage() {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState<any>(null);
  
  // Estados de Dominio
  const [activeTab, setActiveTab] = useState<'clinico' | 'billetera'>('clinico');
  const [historial, setHistorial] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  
  // Estados de UI/UX
  const [isLoading, setIsLoading] = useState(false);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');
  const [adjustObservacion, setAdjustObservacion] = useState('');
  const [isProcessingAdjust, setIsProcessingAdjust] = useState(false);

  // 1. Carga Inicial de Pacientes
  const fetchPacientes = async () => {
    const { data } = await supabase
      .from('vw_control_panel_agendamiento')
      .select('*')
      .order('nombre_completo');
    if (data) setPacientes(data);
  };

  useEffect(() => { fetchPacientes(); }, []);

  // 2. Carga de Dominio Clínico
  useEffect(() => {
    if (pacienteSeleccionado && activeTab === 'clinico') {
      async function fetchHistorial() {
        setIsLoading(true);
        const { data } = await supabase
        .from('cita')
        .select(`
          *, 
          profesional:profesional_id(nombre, especialidad),
          asistencia:asistencia(id, fecha_hora_ejecucion, estado, observacion, profesional:profesional_id(nombre))
        `)
        .eq('paciente_id', pacienteSeleccionado.paciente_id)
        .order('fecha_hora_inicio', { ascending: false });
        if (data) setHistorial(data);
        setIsLoading(false);
      }
      fetchHistorial();
    }
  }, [pacienteSeleccionado, activeTab]);

  // 3. Carga de Dominio Transaccional (Ledger)
  useEffect(() => {
    if (pacienteSeleccionado && activeTab === 'billetera') {
      fetchLedger();
    }
  }, [pacienteSeleccionado, activeTab]);

  const fetchLedger = async () => {
    setIsLedgerLoading(true);
    const { data } = await supabase
      .from('paciente_token_ledger')
      .select('*')
      .eq('paciente_id', pacienteSeleccionado.paciente_id)
      .order('created_at', { ascending: false });
    if (data) setLedger(data);
    setIsLedgerLoading(false);
  };

  // 4. Mutación DML: Registro de Pago
  const handleRegistrarPago = async () => {
    if (!confirm(`¿Confirmar registro de pago para ${pacienteSeleccionado.nombre_completo}? Esto añadirá 4 tokens al saldo actual.`)) return;
    
    setIsProcessingPayment(true);
    try {
      const payload = {
        paciente_id: pacienteSeleccionado.paciente_id,
        tipo_operacion: 'PAGO_CICLO',
        cantidad: 4,
        observacion: 'Pago de ciclo mensual registrado manualmente.'
      };

      const { error } = await supabase.from('paciente_token_ledger').insert([payload]);
      if (error) throw error;

      // Sincronizar UI tras la mutación atómica
      await fetchPacientes();
      if (activeTab === 'billetera') await fetchLedger();
      
      // Actualizar el saldo en la vista actual del objeto seleccionado
      setPacienteSeleccionado((prev: any) => ({
        ...prev,
        saldo_tokens: (prev.saldo_tokens || 0) + 4
      }));

    } catch (err: any) {
      alert(`Error al procesar el pago: ${err.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleAjusteManual = async () => {
    const amount = parseInt(adjustAmount);
    if (!adjustAmount || isNaN(amount) || amount <= 0) {
      alert('Ingresa una cantidad válida mayor a 0.');
      return;
    }
    if (!adjustObservacion.trim()) {
      alert('Agrega una observación para registrar el motivo del ajuste.');
      return;
    }

    const cantidadFinal = adjustType === 'remove' ? -amount : amount;
    const tipoOperacion = adjustType === 'add' ? 'AJUSTE_MANUAL_AGREGAR' : 'AJUSTE_MANUAL_ELIMINAR';

    setIsProcessingAdjust(true);
    try {
      const payload = {
        paciente_id: pacienteSeleccionado.paciente_id,
        tipo_operacion: tipoOperacion,
        cantidad: cantidadFinal,
        observacion: adjustObservacion.trim()
      };

      const { error } = await supabase.from('paciente_token_ledger').insert([payload]);
      if (error) throw error;

      await fetchPacientes();
      if (activeTab === 'billetera') await fetchLedger();

      setPacienteSeleccionado((prev: any) => ({
        ...prev,
        saldo_tokens: (prev.saldo_tokens || 0) + cantidadFinal
      }));

      setShowAdjustModal(false);
      setAdjustAmount('');
      setAdjustObservacion('');
      setAdjustType('add');
    } catch (err: any) {
      alert(`Error al procesar el ajuste: ${err.message}`);
    } finally {
      setIsProcessingAdjust(false);
    }
  };

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
              onClick={() => {
                setPacienteSeleccionado(p);
                setActiveTab('clinico'); // Resetea a pestaña clínica al cambiar paciente
              }}
              className={`w-full text-left p-4 border-b border-slate-800/50 transition-all flex items-center justify-between group ${
                pacienteSeleccionado?.paciente_id === p.paciente_id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <div>
                <div className="text-sm font-bold">{p.nombre_completo}</div>
                <div className={`text-[10px] font-black uppercase mt-0.5 ${
                   pacienteSeleccionado?.paciente_id === p.paciente_id ? 'text-blue-200' : 'text-slate-500'
                }`}>
                  Saldo: {p.saldo_tokens || 0} Tokens
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
                      Ingreso: {pacienteSeleccionado.proxima_fecha_corte ? new Date(pacienteSeleccionado.proxima_fecha_corte).toLocaleDateString() : 'S/I'}
                    </span>
                    <span className="flex items-center text-xs font-bold text-slate-400">
                      <TrendingUp size={14} className="mr-1 text-green-500" /> 
                      Estado: {pacienteSeleccionado.estado_operativo || 'ACTIVO'}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-4 items-center">
                  <div className="bg-slate-900 px-6 py-2 rounded-2xl border border-slate-800 text-center">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo Actual</div>
                    <div className={`text-2xl font-black ${(pacienteSeleccionado.saldo_tokens || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pacienteSeleccionado.saldo_tokens || 0} <span className="text-xs uppercase">Tokens</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleRegistrarPago}
                    disabled={isProcessingPayment}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/50 text-white px-5 py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-colors shadow-lg flex items-center"
                  >
                    <PlusCircle size={18} className="mr-2" />
                    {isProcessingPayment ? 'Procesando...' : 'Registrar Pago'}
                  </button>

                  <button 
                    onClick={() => setShowAdjustModal(true)}
                    className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-colors shadow-lg flex items-center"
                  >
                    <MinusCircle size={18} className="mr-2" />
                    Ajustar Tokens
                  </button>
                </div>
              </div>
            </header>

            {/* Sistema de Pestañas */}
            <div className="flex bg-slate-950 border-b border-slate-800 px-6 pt-2 gap-2">
              <button 
                onClick={() => setActiveTab('clinico')}
                className={`px-4 py-3 text-xs font-black uppercase tracking-widest rounded-t-lg transition-colors flex items-center ${
                  activeTab === 'clinico' ? 'bg-slate-900 text-blue-400 border-t border-x border-slate-800' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <History size={14} className="mr-2" /> Historial Clínico
              </button>
              <button 
                onClick={() => setActiveTab('billetera')}
                className={`px-4 py-3 text-xs font-black uppercase tracking-widest rounded-t-lg transition-colors flex items-center ${
                  activeTab === 'billetera' ? 'bg-slate-900 text-green-400 border-t border-x border-slate-800' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Wallet size={14} className="mr-2" /> Billetera / Tokens
              </button>
            </div>

            {/* Contenedor de Vistas (Renderizado Condicional) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* VISTA 1: Historial Clínico */}
              {activeTab === 'clinico' && (
                <>
                  {isLoading ? (
                    <div className="h-40 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : historial.length === 0 ? (
                    <div className="text-center py-20 text-slate-600 font-bold uppercase text-xs tracking-widest border-2 border-dashed border-slate-800 rounded-3xl">
                      Sin registros clínicos previos
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {historial.map((cita) => (
                        <div key={cita.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-start gap-4 hover:border-slate-700 transition-all">
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
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                cita.estado === 'ASISTE' ? 'bg-green-900/50 text-green-400' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {cita.estado}
                              </span>
                            </div>

                            {cita.observacion && (
                              <div className="mt-3 p-3 bg-slate-900/50 border-l-2 border-slate-700 text-xs text-slate-400 italic rounded-r-lg">
                                "{cita.observacion}"
                              </div>
                            )}
                            {cita.asistencia && cita.asistencia.length > 0 && (
                              <div className="mt-3 p-3 bg-slate-900 border border-slate-700 rounded-lg space-y-2">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-1">
                                  Detalle de Ejecución Operativa
                                </div>
                                {cita.asistencia.map((asis: any) => (
                                  <div key={asis.id} className="flex justify-between items-center text-xs">
                                    <div>
                                      <span className="font-bold text-slate-300">
                                        {format(new Date(asis.fecha_hora_ejecucion), "HH:mm")} hrs
                                      </span>
                                      <span className="text-slate-500 mx-2">|</span>
                                      <span className="text-blue-400 font-bold uppercase">{asis.profesional?.nombre}</span>
                                    </div>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                      asis.estado === 'ASISTE' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                                    }`}>
                                      {asis.estado}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* VISTA 2: Ledger de Billetera/Tokens */}
              {activeTab === 'billetera' && (
                <>
                  {isLedgerLoading ? (
                    <div className="h-40 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                    </div>
                  ) : ledger.length === 0 ? (
                    <div className="text-center py-20 text-slate-600 font-bold uppercase text-xs tracking-widest border-2 border-dashed border-slate-800 rounded-3xl">
                      Sin movimientos financieros registrados
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ledger.map((mov) => {
                        const isIngreso = mov.cantidad > 0;
                        return (
                          <div key={mov.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-all">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-xl ${isIngreso ? 'bg-green-900/30 text-green-500' : 'bg-amber-900/30 text-amber-500'}`}>
                                {isIngreso ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                              </div>
                              <div>
                                <div className="text-xs font-black text-slate-200 uppercase tracking-widest">
                                  {mov.tipo_operacion.replace(/_/g, ' ')}
                                </div>
                                <div className="text-[10px] font-bold text-slate-500 mt-1">
                                  {format(new Date(mov.created_at), "dd/MM/yyyy HH:mm")}
                                  {mov.observacion && <span className="ml-2 italic">— "{mov.observacion}"</span>}
                                </div>
                              </div>
                            </div>
                            <div className={`text-lg font-black ${isIngreso ? 'text-green-400' : 'text-amber-400'}`}>
                              {isIngreso ? '+' : ''}{mov.cantidad}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-700">
            <History size={64} className="mb-4 opacity-20" />
            <p className="font-black uppercase text-sm tracking-tighter">Selecciona un niño/a para administrar su ficha</p>
          </div>
        )}
      </section>

      {/* Modal de Ajuste Manual de Tokens */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-black text-slate-100 uppercase tracking-widest text-sm">
                Ajuste Manual de Tokens
              </h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Paciente
                </label>
                <div className="text-sm font-bold text-slate-200 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  {pacienteSeleccionado.nombre_completo}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Saldo Actual
                </label>
                <div className={`text-lg font-black ${pacienteSeleccionado.saldo_tokens >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {pacienteSeleccionado.saldo_tokens} Tokens
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Tipo de Ajuste
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setAdjustType('add')}
                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-colors ${
                      adjustType === 'add'
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    Agregar
                  </button>
                  <button
                    onClick={() => setAdjustType('remove')}
                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-colors ${
                      adjustType === 'remove'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    Quitar
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Cantidad de Tokens
                </label>
                <input
                  type="number"
                  min="1"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="Ej: 2"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:border-blue-500 outline-none"
                />
                {adjustAmount && parseInt(adjustAmount) > 0 && (
                  <div className="mt-2 text-xs font-bold text-slate-400">
                    Saldo resultante: {
                      pacienteSeleccionado.saldo_tokens + (adjustType === 'remove' ? -parseInt(adjustAmount) : parseInt(adjustAmount))
                    } Tokens
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Observación
                </label>
                <textarea
                  value={adjustObservacion}
                  onChange={(e) => setAdjustObservacion(e.target.value)}
                  placeholder="Motivo del ajuste..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:border-blue-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center gap-4">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-[10px] font-black uppercase text-red-500 hover:text-red-400 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAjusteManual}
                disabled={isProcessingAdjust || !adjustAmount || !adjustObservacion.trim()}
                className={`text-xs font-black uppercase px-6 py-3 rounded-lg shadow-lg transition-colors ${
                  isProcessingAdjust || !adjustAmount || !adjustObservacion.trim()
                    ? 'bg-blue-900/50 text-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isProcessingAdjust ? 'Guardando...' : (adjustType === 'add' ? 'Agregar' : 'Quitar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}