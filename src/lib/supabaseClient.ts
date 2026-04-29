import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Auditoría de consola para detectar el valor real capturado
console.log("Auditoría - URL:", supabaseUrl);
console.log("Auditoría - Key:", supabaseAnonKey ? "Cargada (Oculta)" : "NULA o UNDEFINED");

if (!supabaseUrl) {
  throw new Error("Fallo Crítico: NEXT_PUBLIC_SUPABASE_URL es undefined. Next.js no está leyendo el archivo .env.local.");
}

// Validación de sintaxis URL nativa
try {
  new URL(supabaseUrl);
} catch (e) {
  throw new Error(`Fallo Crítico: La URL proporcionada (${supabaseUrl}) no tiene un formato web válido. Asegúrese de incluir https://`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);