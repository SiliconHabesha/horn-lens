// Gewählte Sprache: auf dem Gerät gespeichert, beim ersten Start nach der Gerätesprache vorgeschlagen.
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { deviceLang, lang as current, setLangNow, type Lang } from "./i18n";
import { pushLang } from "./push";

const KEY = "hl:lang";
type Ctx = { lang: Lang; ready: boolean; chosen: boolean; setLang: (l: Lang) => void };
const LangCtx = createContext<Ctx>({ lang: "de", ready: false, chosen: false, setLang: () => {} });

const applyWeb = (l: Lang) => {
  if (Platform.OS !== "web") return;
  try { document.documentElement.lang = l; } catch { /* egal */ }
};

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setState] = useState<Lang>(current());
  const [ready, setReady] = useState(false);
  const [chosen, setChosen] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      const l = (v === "de" || v === "en" || v === "ti" ? v : deviceLang()) as Lang;
      setChosen(!!v);
      setLangNow(l); applyWeb(l); setState(l); setReady(true);
    }).catch(() => { const l = deviceLang(); setLangNow(l); applyWeb(l); setState(l); setReady(true); });
  }, []);
  const setLang = useCallback((l: Lang) => {
    setLangNow(l); applyWeb(l); setState(l); setChosen(true);
    AsyncStorage.setItem(KEY, l).catch(() => {});
    pushLang().catch(() => {});
  }, []);
  return <LangCtx.Provider value={{ lang, ready, chosen, setLang }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);
