'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { UserPlus, Search, Trash2, GraduationCap, Baby } from 'lucide-react';

export default function ConfigPage() {
  const [activeTab, setActiveTab] = useState<'profs' | 'pacientes'>('profs');
  const [profs, setProfs] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newProf, setNewProf] = useState({ nombre: '', especialidad: 'TO' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    if (activeTab === 'profs') {
      const { data } = await supabase.from('profesional').select('*').order('nombre');
      if (data) setProfs(data);
    } else {
      const { data } = await supabase.from('paciente').select('*').order('nombre_completo');
      if (data) setPacientes(data);
    }
  }

  const filteredPacientes = pacientes.filter(p => 
    p.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  async function handleAddProf() {
    if (!newProf.nombre) return;
    await supabase.from('profesional').insert([newProf]);
    setNewProf({ nombre: '', especialidad: 'TO' });
    fetchData();
  }

  return (
    <main className="p-8 max-w-6xl mx-auto text-slate-100">
      <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-blue-400 uppercase tracking-tighter">Panel de Maestros</h1>
          <p className="text-slate-400 font-medium">Configuración de {activeTab === 'profs' ? 'Terapeutas' : 'Nómina de Niños'}</p>
        </div>
        <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
          <button 
            onClick={() => setActiveTab('profs')}
            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase transition-all ${activeTab === 'profs' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >Terapeutas</button>
          <button 
            onClick={() => setActiveTab('pacientes')}
            className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase transition-all ${activeTab === 'pacientes' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >Pacientes</button>
        </div>
      </header>

      {activeTab === 'profs' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl mb-8">
            <h3 className="flex items-center text-sm font-black mb-6 text-blue-400 uppercase tracking-widest">
              <GraduationCap className="mr-2" size={18} /> Registrar Nuevo Profesional
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input 
                type="text" 
                placeholder="Nombre del Terapeuta"
                className="bg-slate-950 border-slate-800 rounded-xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={newProf.nombre}
                onChange={e => setNewProf({...newProf, nombre: e.target.value})}
              />
              <select 
                className="bg-slate-950 border-slate-800 rounded-xl p-4 text-sm font-bold outline-none"
                value={newProf.especialidad}
                onChange={e => setNewProf({...newProf, especialidad: e.target.value})}
              >
                <option value="TO">Terapeuta Ocupacional</option>
                <option value="FONO">Fonoaudiólogo/a</option>
                <option value="PSICOPEDAGOGO">Psicopedagogo/a</option>
              </select>
              <button 
                onClick={handleAddProf}
                className="bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl uppercase text-xs tracking-widest shadow-lg shadow-blue-900/40 transition-all"
              >Guardar Profesional</button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950">
                  <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Profesional</th>
                  <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Especialidad</th>
                  <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {profs.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="p-5 font-bold text-slate-200">{p.nombre}</td>
                    <td className="p-5">
                      <span className="bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black border border-blue-800/50 uppercase">
                        {p.especialidad}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <button className="text-slate-600 hover:text-red-400 p-2 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="text" 
                placeholder="Buscar paciente en la nómina real..."
                className="w-full bg-slate-900 border-slate-800 rounded-2xl p-4 pl-12 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="bg-slate-900 border border-slate-800 px-6 py-4 rounded-2xl flex items-center">
              <Baby className="text-blue-400 mr-3" size={20} />
              <span className="text-xs font-black uppercase text-slate-400">Total: {pacientes.length} Niños</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950">
                  <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre Completo</th>
                  <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ingreso al Centro</th>
                  <th className="p-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredPacientes.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-5 font-bold text-slate-200">{p.nombre_completo}</td>
                    <td className="p-5 text-slate-500 text-sm font-medium">
                      {new Date(p.fecha_ingreso).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </td>
                    <td className="p-5 text-center">
                      <button className="text-slate-600 hover:text-red-400 p-2 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}