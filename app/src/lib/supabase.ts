import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

// Öffentliche Adresse und öffentlicher Lese-Schlüssel (darf in der App stehen; Schreiben und private Daten nur nach Anmeldung)
export const SUPABASE_URL = "https://mkcaioabbzccawjmtndw.supabase.co";
export const SUPABASE_KEY = "sb_publishable_ueWHQ3ZQGEeuw41kuTe-PQ_DPEX6iRh";

// Jede Anfrage bricht nach 20 Sekunden ab: bei schlechtem Netz hängt sonst das Laden für immer
const timedFetch: typeof fetch = (input, init) => {
  if (init?.signal) return fetch(input, init);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  return fetch(input, { ...init, signal: ctl.signal }).finally(() => clearTimeout(timer));
};

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: { fetch: timedFetch },
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web",
  },
});

// Auf dem Handy die Anmeldung nur erneuern, solange die App im Vordergrund ist
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (s) => {
    if (s === "active") sb.auth.startAutoRefresh(); else sb.auth.stopAutoRefresh();
  });
}
