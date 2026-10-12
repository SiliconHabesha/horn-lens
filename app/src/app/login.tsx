// Anmeldung nur für die Redaktion (Behauptungen pflegen, Tagesbericht lesen). Lesen geht ohne Konto.
// Neue Konten werden in der App nicht angelegt; die Redaktion bekommt ihren Zugang vom Betreiber.
import { router, Stack } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Mark } from "../components/Logo";
import { Banner, Button, Chip, openLink, T } from "../components/ui";
import { WEB_URL } from "../lib/feeds";
import { sb } from "../lib/supabase";
import { BRAND, font, radius, space, useTheme } from "../lib/theme";

const MSG: [RegExp, string][] = [
  [/invalid login credentials/i, "E-Mail oder Passwort stimmt nicht."],
  [/email not confirmed/i, "Die E-Mail-Adresse ist noch nicht bestätigt. Bitte den Link in der Bestätigungs-E-Mail öffnen."],
  [/rate limit|too many/i, "Gerade zu viele Versuche. Bitte in ein paar Minuten erneut versuchen."],
  [/network|fetch|abort/i, "Keine Verbindung. Bitte Internet prüfen."],
];
const say = (e: any) => { const m = String(e?.message || e); return MSG.find(([re]) => re.test(m))?.[1] || "Das hat nicht geklappt. Bitte gleich erneut versuchen."; };

const close = () => { try { if (router.canGoBack()) { router.back(); return; } } catch { /* ohne Verlauf */ } router.replace("/"); };

export default function Login() {
  const t = useTheme();
  const [mode, setMode] = useState<"in" | "reset">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const input = { fontFamily: font.regular, fontSize: 16, color: t.ink, backgroundColor: t.card, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.rule, paddingHorizontal: 14, height: 50 } as const;

  const go = async () => {
    setErr(null); setOk(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr("Bitte eine gültige E-Mail-Adresse eingeben.");
    if (mode === "in" && pw.length < 8) return setErr("Das Passwort hat mindestens 8 Zeichen.");
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) throw error;
        close();
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: WEB_URL });
        if (error) throw error;
        setOk("Wenn es einen Zugang mit dieser Adresse gibt, kommt gleich eine E-Mail mit einem Link zum Zurücksetzen.");
      }
    } catch (e) { setErr(say(e)); }
    setBusy(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Stack.Screen options={{ title: "Redaktion" }} />
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.m, maxWidth: 440, width: "100%", alignSelf: "center" }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", gap: 10, marginBottom: space.m }}>
          <View style={{ width: 64, height: 64, borderRadius: 15, backgroundColor: BRAND.ink, alignItems: "center", justifyContent: "center", borderWidth: t.dark ? 1 : 0, borderColor: t.rule }}>
            <Mark size={36} color={BRAND.paper} dot={BRAND.lagoonLight} />
          </View>
          <T v="title" style={{ textAlign: "center" }}>Anmeldung für die Redaktion</T>
          <T v="small" style={{ textAlign: "center" }}>Lesen geht ohne Konto. Die Anmeldung braucht nur, wer Behauptungen pflegt und den Tagesbericht liest.</T>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chip label="Anmelden" active={mode === "in"} onPress={() => setMode("in")} />
          <Chip label="Passwort vergessen" active={mode === "reset"} onPress={() => setMode("reset")} />
        </View>
        <TextInput style={input} value={email} onChangeText={setEmail} placeholder="E-Mail" placeholderTextColor={t.faint} autoCapitalize="none" autoComplete="email"
          keyboardType="email-address" textContentType="emailAddress" autoCorrect={false} accessibilityLabel="E-Mail" />
        {mode === "in" ? (
          <TextInput style={input} value={pw} onChangeText={setPw} placeholder="Passwort" placeholderTextColor={t.faint} secureTextEntry
            autoComplete="current-password" textContentType="password" accessibilityLabel="Passwort" onSubmitEditing={go} />
        ) : null}
        {err ? <Banner icon="alert-circle-outline" tone="warn" text={err} /> : null}
        {ok ? <Banner icon="mail-outline" text={ok} /> : null}
        <Button label={busy ? "Bitte warten …" : mode === "in" ? "Anmelden" : "Link schicken"} onPress={go} disabled={busy} />

        <View style={{ flexDirection: "row", justifyContent: "center", gap: space.xl, marginTop: space.l }}>
          {[["Impressum", "impressum"], ["Datenschutz", "datenschutz"]].map(([label, f]) => (
            <Pressable key={f} onPress={() => openLink(`${WEB_URL}/${f}.html`)} accessibilityRole="link" hitSlop={8} style={{ minHeight: 44, justifyContent: "center" }}>
              <T v="caption" color={t.muted} style={{ textDecorationLine: "underline" }}>{label}</T>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
