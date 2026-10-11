import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

// Öffentliche Adresse und öffentlicher Lese-Schlüssel (darf in der App stehen; Schreiben und private Daten nur nach Anmeldung)
export const SUPABASE_URL = "https://mkcaioabbzccawjmtndw.supabase.co";
export const SUPABASE_KEY = "sb_publishable_ueWHQ3ZQGEeuw41kuTe-PQ_DPEX6iRh";

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
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
