// Anmelden: E-Mail und Passwort. Konto anlegen geht einmal, danach bestätigt man die E-Mail-Adresse über den Link.
import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Banner, Button, Chip, T } from "../components/ui";
import { WEB_URL } from "../lib/feeds";
import { sb } from "../lib/supabase";
import { font, radius, space, useTheme } from "../lib/theme";

const MSG: [RegExp, string][] = [
  [/invalid login credentials/i, "E-Mail oder Passwort stimmt nicht."],
  [/email not confirmed/i, "Die E-Mail-Adresse ist noch nicht bestätigt. Bitte den Link in der Bestätigungs-E-Mail öffnen."],
  [/already registered/i, "Für diese E-Mail gibt es schon ein Konto. Bitte anmelden."],
  [/password should be at least|weak password/i, "Das Passwort ist zu kurz oder zu einfach: mindestens 8 Zeichen, besser 12 oder mehr."],
  [/rate limit|too many/i, "Gerade zu viele Versuche. Bitte in ein paar Minuten noch einmal."],
  [/network|fetch/i, "Keine Verbindung. Bitte Internet prüfen."],
];
const say = (e: any) => { const m = String(e?.message || e); return MSG.find(([re]) => re.test(m))?.[1] || `Das hat nicht geklappt (${m}).`; };

export default function Login({ gate }: { gate?: boolean } = {}) {
  const t = useTheme();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const input = { fontFamily: font.regular, fontSize: 16, color: t.ink, backgroundColor: t.card, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.rule, paddingHorizontal: 14, height: 48 } as const;

  const go = async () => {
    setErr(null); setOk(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr("Bitte eine gültige E-Mail-Adresse eingeben.");
    if (mode !== "reset" && pw.length < 8) return setErr("Das Passwort braucht mindestens 8 Zeichen.");
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) throw error;
        try { if (router.canGoBack()) router.back(); } catch { /* Anmeldebildschirm ohne Navigation: die Seite wechselt von selbst */ }
      } else if (mode === "up") {
        const { error } = await sb.auth.signUp({ email: email.trim(), password: pw, options: { emailRedirectTo: WEB_URL } });
        if (error) throw error;
        setOk("Fast geschafft: Wir haben dir eine E-Mail geschickt. Öffne den Link darin, dann kannst du dich hier anmelden.");
        setMode("in");
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: WEB_URL });
        if (error) throw error;
        setOk("Wenn es ein Konto mit dieser Adresse gibt, kommt gleich eine E-Mail mit einem Link zum Zurücksetzen.");
      }
    } catch (e) { setErr(say(e)); }
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ padding: space.l, gap: space.m, maxWidth: 480, width: "100%", alignSelf: "center" }} keyboardShouldPersistTaps="handled">
        {gate ? <View style={{ height: 48 }} /> : null}
        <T v={gate ? "display" : "title"}>Horn Lens</T>
        {gate ? <T v="caption">powered by <T v="caption" color={t.ink} style={{ fontWeight: "800", letterSpacing: 1 }}>BELES</T></T> : null}
        <T v="small">{gate ? "Diese Fassung von Horn Lens ist privat. Bitte mit deinem Konto anmelden." : "Die Anmeldung ist für den Betreiber. Nach der Anmeldung siehst du auch Meldungen zum Konflikt, Behauptungen, Tagesberichte und Internet-Messwerte."}</T>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Chip label="Anmelden" active={mode === "in"} onPress={() => setMode("in")} />
          {/* Konto anlegen nur in der Web-Fassung: die Handy-App bietet keine Registrierung (Store-Regeln zur Kontolöschung) */}
          {Platform.OS === "web" ? <Chip label="Konto anlegen" active={mode === "up"} onPress={() => setMode("up")} /> : null}
          <Chip label="Passwort vergessen" active={mode === "reset"} onPress={() => setMode("reset")} />
        </View>
        <TextInput style={input} value={email} onChangeText={setEmail} placeholder="E-Mail" placeholderTextColor={t.faint} autoCapitalize="none" autoComplete="email"
          keyboardType="email-address" textContentType="emailAddress" autoCorrect={false} accessibilityLabel="E-Mail" />
        {mode !== "reset" ? (
          <TextInput style={input} value={pw} onChangeText={setPw} placeholder="Passwort" placeholderTextColor={t.faint} secureTextEntry
            autoComplete={mode === "up" ? "new-password" : "current-password"} textContentType={mode === "up" ? "newPassword" : "password"} accessibilityLabel="Passwort"
            onSubmitEditing={go} />
        ) : null}
        {err ? <Banner icon="alert-circle-outline" tone="warn" text={err} /> : null}
        {ok ? <Banner icon="mail-outline" text={ok} /> : null}
        <Button label={busy ? "Bitte warten …" : mode === "in" ? "Anmelden" : mode === "up" ? "Konto anlegen" : "Link schicken"} onPress={go} disabled={busy} />
        <T v="caption">Deine E-Mail-Adresse wird nur für die Anmeldung gespeichert (bei Supabase, Rechenzentrum Frankfurt). Es gibt kein Tracking und keine Werbung.</T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
