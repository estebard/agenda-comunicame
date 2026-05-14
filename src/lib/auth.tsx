'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    router.refresh();
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
