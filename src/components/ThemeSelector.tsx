'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, Sparkles } from 'lucide-react';

export default function ThemeSelector() {
  const [theme, setTheme] = useState<'dark' | 'pastel'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Revisar si ya había un tema guardado
    const savedTheme = localStorage.getItem('app-theme') as 'dark' | 'pastel';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'pastel' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  if (!mounted) return null;

  return (
    <button 
      onClick={toggleTheme}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-bold text-sm ${
        theme === 'pastel' 
          ? 'bg-orange-100 text-orange-800 border border-orange-200' 
          : 'bg-slate-900 text-blue-400 border border-slate-800'
      }`}
    >
      <div className="flex items-center space-x-3">
        {theme === 'pastel' ? <Sparkles size={18} /> : <Moon size={18} />}
        <span>{theme === 'pastel' ? 'Modo Calma (Pastel)' : 'Modo Noche (Oscuro)'}</span>
      </div>
    </button>
  );
}