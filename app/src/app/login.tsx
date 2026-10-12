// Anmelden: mit Apple, mit Google oder mit E-Mail und Passwort.
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Banner, Button, Chip, openLink, T, tap } from "../components/ui";
import { Provider, signInWith } from "../lib/auth";
import { WEB_URL } from "../lib/feeds";
import { sb } from "../lib/supabase";
import { BRAND, font, radius, space, useTheme } from "../lib/theme";
import { Mark } from "../components/Logo";

const MSG: [RegExp, string][] = [
  [/invalid login credentials/i, "E-Mail oder Passwort stimmt nicht."],
  [/email not confirmed/i, "Die E-Mail-Adresse ist noch nicht bestätigt. Bitte den Link in der Bestätigungs-E-Mail öffnen."],
  [/already registered/i, "Für diese E-Mail gibt es schon ein Konto. Bitte anmelden."],
  [/password should be at least|weak password/i, "Das Passwort ist zu kurz oder zu einfach: mindestens 8 Zeichen, besser 12 oder mehr."],
  [/rate limit|too many/i, "Gerade zu viele Versuche. Bitte in ein paar Minuten noch einmal."],
  [/network|fetch/i, "Keine Verbindung. Bitte Internet prüfen."],
];
const say = (e: any) => { const m = String(e?.message || e); return MSG.find(([re]) => re.test(m))?.[1] || "Das hat nicht geklappt. Bitte gleich noch einmal versuchen."; };

const close = () => { try { if (router.canGoBack()) router.back(); } catch { /* Anmeldebildschirm ohne Navigation: die Seite wechselt von selbst */ } };

function ProviderButton({ p, onPress, busy }: { p: Provider; onPress: () => void; busy: boolean }) {
  const t = useTheme();
  const apple = p === "apple";
  // Apple: schwarz (im dunklen Modus weiß), nach Apples Gestaltungsregeln; Google: hell mit Rand
  const bg = apple ? (t.dark ? "#FFFFFF" : "#000000") : t.card;
  const fg = apple ? (t.dark ? "#000000" : "#FFFFFF") : t.ink;
  return (
    <Pressable onPress={() => { tap(); onPress(); }} disabled={busy} accessibilityRole="button" accessibilityLabel={apple ? "Mit Apple anmelden" : "Mit Google anmelden"}
      style={({ pressed }) => ({ height: 52, borderRadius: radius.m, backgroundColor: bg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
        borderWidth: apple ? 0 : 1, borderColor: t.rule, opacity: busy ? 0.6 : pressed ? 0.8 : 1 })}>
      {busy ? <ActivityIndicator color={fg} /> : <Ionicons name={apple ? "logo-apple" : "logo-google"} size={20} color={apple ? fg : "#4285F4"} />}
      <T v="bodyStrong" color={fg}>{apple ? "Mit Apple anmelden" : "Mit Google anmelden"}</T>
    </Pressable>
  );
}

export default function Login({ gate }: { gate?: boolean } = {}) {
  const t = useTheme();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [showMail, setShowMail] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState<null | "mail" | Provider>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const input = { fontFamily: font.regular, fontSize: 16, color: t.ink, backgroundColor: t.card, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.rule, paddingHorizontal: 14, height: 50 } as const;

  const social = async (p: Provider) => {
    setErr(null); setOk(null); setBusy(p);
    const e = await signInWith(p);
    setBusy(null);
    if (e) setErr(e);
    else { const { data } = await sb.auth.getSession(); if (data.session) close(); }
  };

  const go = async () => {
    setErr(null); setOk(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr("Bitte eine gültige E-Mail-Adresse eingeben.");
    if (mode !== "reset" && pw.length < 8) return setErr("Das Passwort braucht mindestens 8 Zeichen.");
    setBusy("mail");
    try {
      if (mode === "in") {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) throw error;
        close();
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
    setBusy(null);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={{ padding: space.xl, gap: space.m, maxWidth: 440, width: "100%", alignSelf: "center", paddingTop: gate ? 72 : space.xl }}
        keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", gap: 10, marginBottom: space.l }}>
          {/* App-Symbol wie auf dem Startbildschirm des Handys */}
          <View style={{ width: 76, height: 76, borderRadius: 18, backgroundColor: BRAND.ink, alignItems: "center", justifyContent: "center",
            borderWidth: t.dark ? 1 : 0, borderColor: t.rule }}>
            <Mark size={44} color={BRAND.paper} dot={BRAND.lagoonLight} />
          </View>
          <T v="display" style={{ textAlign: "center" }}>Horn Lens</T>
          <T v="small" style={{ textAlign: "center" }}>Lagebild zum Horn von Afrika, Eritrea zuerst. Nachprüfbar, ruhig, ohne Werbung.</T>
          <T v="caption">powered by <T v="caption" color={t.ink} style={{ fontFamily: font.black, letterSpacing: 1 }}>BELES</T></T>
        </View>

        <ProviderButton p="apple" busy={busy === "apple"} onPress={() => social("apple")} />
        <ProviderButton p="google" busy={busy === "google"} onPress={() => social("google")} />

        {err ? <Banner icon="alert-circle-outline" tone="warn" text={err} /> : null}
        {ok ? <Banner icon="mail-outline" text={ok} /> : null}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginVertical: space.s }}>
          <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: t.rule }} />
          <Pressable onPress={() => { tap(); setShowMail(!showMail); }} accessibilityRole="button" accessibilityState={{ expanded: showMail }} hitSlop={8}>
            <T v="smallStrong" color={t.accent}>{showMail ? "E-Mail ausblenden" : "Mit E-Mail anmelden"}</T>
          </Pressable>
          <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: t.rule }} />
        </View>

        {showMail ? (
          <View style={{ gap: space.m }}>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Chip label="Anmelden" active={mode === "in"} onPress={() => setMode("in")} />
              {/* Konto mit E-Mail anlegen nur in der Web-Fassung; in der Handy-App entstehen Konten über Apple oder Google */}
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
            <Button label={busy === "mail" ? "Bitte warten …" : mode === "in" ? "Anmelden" : mode === "up" ? "Konto anlegen" : "Link schicken"} onPress={go} disabled={!!busy} />
          </View>
        ) : null}

        <T v="caption" style={{ textAlign: "center", marginTop: space.m }}>
          {gate ? "Diese Fassung ist privat. Voller Zugang nur für freigeschaltete Konten." : "Ohne Anmeldung siehst du die offene Ausgabe. Voller Zugang nur für freigeschaltete Konten."}
          {" "}Gespeichert wird nur, was für die Anmeldung nötig ist. Kein Tracking, keine Werbung.
        </T>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: space.xl }}>
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
