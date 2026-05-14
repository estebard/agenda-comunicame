'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { LogIn, User, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LOGIN] Form enviado, email:', email);
    setError('');
    setSubmitting(true);

    try {
      const { error: err } = await signIn(email, password);
      console.log('[LOGIN] signIn result:', err || 'OK - redirigiendo...');
      if (err) {
        setError(err);
      }
    } catch (err: any) {
      console.error('[LOGIN] Error capturado:', err);
      setError(err.message || 'Error inesperado');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-white text-xl mx-auto mb-4 shadow-lg shadow-blue-600/30">
            CC
          </div>
          <h1 className="text-2xl font-black text-slate-100 uppercase tracking-tighter">
            Centro Comunícame
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Ingresá al sistema</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
          {error && (
            <div className="bg-red-900/20 border border-red-900/50 text-red-400 text-xs font-bold p-3 rounded-xl text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm font-bold text-slate-200 outline-none focus:border-blue-500 transition-colors"
              placeholder="correo@centro.cl"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 pr-10 text-sm font-bold text-slate-200 outline-none focus:border-blue-500 transition-colors"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/50 text-white font-black py-3.5 rounded-xl shadow-lg transition-all uppercase text-xs tracking-widest flex items-center justify-center"
          >
            <LogIn size={18} className="mr-2" />
            {submitting ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
