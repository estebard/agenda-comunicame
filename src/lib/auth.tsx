'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from './supabaseClient';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  rol: 'admin' | 'profesional' | null;
  profesionalId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  rol: null,
  profesionalId: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [rol, setRol] = useState<'admin' | 'profesional' | null>(null);
  const [profesionalId, setProfesionalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Guard de autenticación client-side
  useEffect(() => {
    if (loading) return;
    if (!user && pathname !== '/login') {
      router.push('/login');
    }
    if (user && pathname === '/login') {
      router.push('/');
    }
  }, [user, loading, pathname]);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('rol, profesional_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      setRol(data.rol as 'admin' | 'profesional');
      setProfesionalId(data.profesional_id || null);
    } else {
      setRol(null);
      setProfesionalId(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      } else {
        setRol(null);
        setProfesionalId(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('[LOGIN] Iniciando signIn para:', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log('[LOGIN] signInWithPassword:', error ? 'ERROR: ' + error.message : 'OK', '| user.id:', data?.user?.id);
    if (error) return { error: error.message };
    if (!data?.user) return { error: 'No se recibió sesión del servidor.' };

    try {
      const userId = data.user.id;
      console.log('[LOGIN] Consultando user_roles para:', userId);
      const { data: roleData, error: roleErr } = await supabase
        .from('user_roles')
        .select('rol')
        .eq('user_id', userId)
        .maybeSingle();
      console.log('[LOGIN] user_roles respuesta:', roleData, roleErr ? 'ERROR: ' + roleErr.message : 'OK');

      if (!roleData) {
        console.log('[LOGIN] Sin rol -> cerrando sesión');
        await supabase.auth.signOut();
        return { error: 'Tu cuenta no tiene permisos asignados. Contacta al administrador.' };
      }

      console.log('[LOGIN] Rol encontrado:', roleData.rol);
      await fetchRole(userId);

      const destino = roleData.rol === 'profesional' ? '/asistencia' : '/';
      console.log('[LOGIN] Redirigiendo a:', destino);
      router.push(destino);
    } catch (err: any) {
      console.error('[LOGIN] Error inesperado:', err);
      router.push('/');
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRol(null);
    setProfesionalId(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ session, user, rol, profesionalId, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
