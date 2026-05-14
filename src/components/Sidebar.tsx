'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  CalendarDays, 
  CalendarClock,
  FileText, 
  ActivitySquare, 
  PackageSearch, 
  Settings,
  LogOut,
  Users,
  Shield
} from 'lucide-react';
import ThemeSelector from './ThemeSelector';
import { useAuth } from '@/lib/auth';

export default function Sidebar() {
  const pathname = usePathname();
  const { rol, user, signOut } = useAuth();

  const adminItems = [
    { name: 'Dashboard General', icon: LayoutDashboard, href: '/' },
    { name: 'Agenda Oficial (Semanal)', icon: CalendarDays, href: '/planificacion' },
    { name: 'Asistencia Diaria', icon: CalendarClock, href: '/asistencia' },
    { name: 'Pacientes / Historial', icon: Users, href: '/pacientes' },
    { name: 'Informes Solicitados', icon: FileText, href: '/informes' },
    { name: 'Citaciones ADOS-2', icon: ActivitySquare, href: '/ados2' },
    { name: 'Inventario', icon: PackageSearch, href: '/inventario' },
    { name: 'Configuración', icon: Settings, href: '/config' },
  ];

  const profItems = [
    { name: 'Mi Agenda Diaria', icon: CalendarClock, href: '/asistencia' },
  ];

  const menuItems = rol === 'profesional' ? profItems : adminItems;

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-screen sticky top-0 transition-colors duration-300">
      <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white">
          CC
        </div>
        <span className="font-black text-slate-100 tracking-wider text-sm uppercase">Comunícame</span>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 mt-2 px-2">
          {rol === 'profesional' ? 'Mi Panel' : 'Módulos Operativos'}
        </div>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-all font-bold text-sm ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-3">
        {user && (
          <div className="flex items-center gap-2 px-2 py-1 text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">
            <Shield size={12} className={rol === 'admin' ? 'text-blue-400' : 'text-emerald-400'} />
            <span>{rol === 'admin' ? 'Administrador' : 'Profesional'}</span>
          </div>
        )}
        <ThemeSelector />
        <button 
          onClick={signOut}
          className="flex items-center space-x-3 px-4 py-2 w-full text-slate-500 hover:text-red-500 transition-colors font-bold text-sm"
        >
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}