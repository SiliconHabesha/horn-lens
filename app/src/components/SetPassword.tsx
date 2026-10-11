// Neues Passwort setzen, nachdem man über den Link aus "Passwort vergessen" gekommen ist
import React, { useState } from "react";
import { ScrollView, StyleSheet, TextInput } from "react-native";
import { useData } from "../lib/data";
import { sb } from "../lib/supabase";
import { font, radius, space, useTheme } from "../lib/theme";
import { Banner, Button, T } from "./ui";

export default function SetPassword() {
  const t = useTheme();
  const { endRecovery } = useData();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setErr(null);
    if (pw.length < 8) return setErr("Das Passwort braucht mindestens 8 Zeichen.");
    setBusy(true);
    const { error } = await sb.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(/weak|short|at least/i.test(error.message) ? "Das Passwort ist zu kurz oder zu einfach: mindestens 8 Zeichen, besser 12 oder mehr." : /same|different/i.test(error.message) ? "Das neue Passwort muss sich vom alten unterscheiden." : "Das hat nicht geklappt. Bitte erneut versuchen.");
    endRecovery();
  };
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: space.l, gap: space.m, maxWidth: 480, width: "100%", alignSelf: "center", paddingTop: 64 }}>
      <T v="display">Neues Passwort</T>
      <T v="small">Wähle ein neues Passwort für Horn Lens. Mindestens 8 Zeichen, besser 12 oder mehr.</T>
      <TextInput value={pw} onChangeText={setPw} secureTextEntry autoComplete="new-password" textContentType="newPassword" placeholder="Neues Passwort" placeholderTextColor={t.faint}
        style={{ fontFamily: font.regular, fontSize: 16, color: t.ink, backgroundColor: t.card, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth, borderColor: t.rule, paddingHorizontal: 14, height: 48 }}
        onSubmitEditing={save} accessibilityLabel="Neues Passwort" />
      {err ? <Banner icon="alert-circle-outline" tone="warn" text={err} /> : null}
      <Button label={busy ? "Speichert …" : "Passwort speichern"} onPress={save} disabled={busy} />
      <Button label="Später" kind="secondary" onPress={endRecovery} disabled={busy} />
    </ScrollView>
  );
}
