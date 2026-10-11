// Formular: Status ändern, Angaben berichtigen oder neue Behauptung anlegen. Die Regeln prüft zusätzlich die Datenbank.
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import { toast } from "../components/Toast";
import { Banner, Button, Chip, T, tap } from "../components/ui";
import { de, REGION_ORDER, REGIONS, STATUS, STATUS_ORDER, todayBerlin } from "../lib/de";
import { useData } from "../lib/data";
import { sb } from "../lib/supabase";
import { font, radius, space, useTheme } from "../lib/theme";
import { Skeleton } from "../components/Skeleton";

type Src = { title: string; url: string };
const validDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && new Date(s + "T12:00:00Z").toISOString().slice(0, 10) === s;
// Datum vor n Tagen (Berliner Kalender) als JJJJ-MM-TT
// „11.10.2026“ in JJJJ-MM-TT umwandeln, alles andere unverändert lassen
const toIso = (s: string) => { const m = s.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : s; };
const hostOf = (u: string) => u.replace(/^https?:\/\/(www\.)?/i, "").split(/[/:?#]/)[0].toLowerCase();
const dayMinus = (n: number) => { const [y, m, d] = todayBerlin().split("-").map(Number); return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10); };
// Außerhalb des Formulars, damit Eingabefelder beim Tippen nicht neu entstehen und den Fokus verlieren
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ gap: 6 }}><T v="smallStrong">{label}</T>{children}</View>;
}

export default function ClaimForm() {
  const t = useTheme();
  const p = useLocalSearchParams<{ mode?: string; id?: string; src_title?: string; src_url?: string; intent?: string }>();
  const mode = (p.mode === "edit" || p.mode === "status" ? p.mode : "add") as "add" | "edit" | "status";
  const { data, refresh } = useData();
  const claim = data?.claims.find((c) => String(c.id) === String(p.id));
  const snap = useRef<{ statement: string; claimant: string; disputed_by: string; raw: { statement: string; claimant: string; disputed_by: string | null } | undefined } | null>(null);
  if (!snap.current && claim) snap.current = { statement: claim.statement, claimant: claim.claimant, disputed_by: claim.disputed_by || "", raw: claim.raw };
  const init = snap.current || { statement: "", claimant: "", disputed_by: "", raw: undefined };
  const [statement, setStatement] = useState(init.statement);
  const [claimant, setClaimant] = useState(init.claimant);
  const [disputed, setDisputed] = useState(init.disputed_by);
  const [region, setRegion] = useState(claim?.region || "eritrea");
  const [first, setFirst] = useState(claim?.first_reported || todayBerlin());
  const [party, setParty] = useState(!!claim?.party_claim);
  const [status, setStatus] = useState(claim?.status || "unconfirmed");
  const [note, setNote] = useState("");
  // Aus einer Meldung angelegt: die Meldung ist schon als erste Quelle eingetragen
  const [sources, setSources] = useState<Src[]>([{ title: p.src_title || "", url: p.src_url || "" }, { title: "", url: "" }]);
  const [admission, setAdmission] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [unsure, setUnsure] = useState(false);
  const [busy, setBusy] = useState(false);
  // Wird die Seite direkt geöffnet, kommen die Daten erst nach dem ersten Zeichnen: dann einmal vorausfüllen
  const filled = useRef(!!claim);
  // Eingeständnis gilt nur für „Bestätigt“
  useEffect(() => { if (status !== "confirmed") setAdmission(false); }, [status]);
  useEffect(() => {
    if (filled.current || !claim) return;
    filled.current = true;
    setStatement(claim.statement); setClaimant(claim.claimant); setDisputed(claim.disputed_by || "");
    setRegion(claim.region); setFirst(claim.first_reported); setParty(!!claim.party_claim); setStatus(claim.status);
  }, [claim]);

  if (!data) return <View style={{ flex: 1, backgroundColor: t.bg, padding: space.l }}><Skeleton rows={5} /></View>;
  if (!data.owner) return <View style={{ flex: 1, backgroundColor: t.bg, padding: space.l }}><T>Nur für den Betreiber von Horn Lens.</T></View>;
  if (mode !== "add" && !claim) return <View style={{ flex: 1, backgroundColor: t.bg, padding: space.l }}><T>Diese Behauptung gibt es nicht mehr. Vielleicht wurde sie zusammengelegt oder entfernt.</T></View>;

  const input = { fontFamily: font.regular, fontSize: 15.5, color: t.ink, backgroundColor: t.card, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.rule, paddingHorizontal: 12, paddingVertical: 10 } as const;

  const submit = async () => {
    setErr(null); setUnsure(false);
    const src = sources.map((s) => ({ title: s.title.trim() || hostOf(s.url.trim()), url: s.url.trim() })).filter((s) => s.url || s.title);
    const day = toIso(first);
    if (mode !== "status" && !validDay(day)) return setErr("Bitte das Datum der ersten Meldung als Tag.Monat.Jahr schreiben, z. B. 11.10.2026.");
    if (mode !== "status" && day > todayBerlin()) return setErr("Das Datum der ersten Meldung liegt in der Zukunft.");
    if (src.some((s) => !/^https?:\/\/[^/\s?#]+\.[^/\s?#]+/.test(s.url))) return setErr("Jede Quelle braucht einen vollständigen Link, der mit https:// beginnt.");
    if (note.trim().length < 3) return setErr("Bitte eine kurze Notiz schreiben.");
    const hosts = new Set(src.map((s) => hostOf(s.url)));
    if (mode !== "edit" && status === "confirmed" && !admission && hosts.size < 2)
      return setErr("„Bestätigt“ braucht zwei unabhängige Quellen auf zwei verschiedenen Websites oder ein Eingeständnis der betroffenen Seite.");
    if (mode !== "edit" && status === "confirmed" && admission && !src.length) return setErr("Bitte verlinken, wo die betroffene Seite es eingeräumt hat.");
    if (mode === "add" && !src.length) return setErr("Eine neue Behauptung braucht mindestens eine Quelle.");
    if (mode !== "status" && (!statement.trim() || !claimant.trim())) return setErr("Bitte Aussage und „Wer sagt es“ ausfüllen.");
    // Was du nicht änderst, geht im Original zurück und gilt nicht als geändert
    const val = (v: string, key: "statement" | "claimant" | "disputed_by") => (v.trim() === init[key].trim() ? (init.raw?.[key] ?? init[key]) ?? "" : v.trim());
    let fn: string, payload: any;
    if (mode === "status") { fn = "app_claim_update"; payload = { id: claim!.id, status, note: note.trim(), sources: src, admission }; }
    else if (mode === "edit") {
      fn = "app_claim_edit";
      payload = { id: claim!.id, statement: val(statement, "statement"), claimant: val(claimant, "claimant"), disputed_by: val(disputed, "disputed_by"),
        first_reported: day, party, note: note.trim() };
    } else {
      fn = "app_claim_add";
      payload = { statement: statement.trim(), claimant: claimant.trim(), disputed_by: disputed.trim(), region, status, party, first_reported: day,
        note: note.trim(), sources: src, admission };
    }
    setBusy(true);
    try {
      const { error } = await sb.rpc(fn, { p: payload });
      if (error && /fetch|network|timeout|abort/i.test(String(error.message))) throw error;
      if (error) {
        const m = String(error.message || "").replace(/\.\s*$/, "");
        setErr(`Nicht gespeichert: ${de(m) || "die Datenbank hat es abgelehnt"}.`);
        setBusy(false);
        return;
      }
      await refresh();
      toast(mode === "add" ? "Behauptung angelegt" : mode === "status" ? (same ? "Beleg gespeichert" : "Stufe geändert") : "Berichtigung gespeichert");
      close();
    } catch {
      setErr("Die Verbindung ist abgebrochen. Vielleicht wurde gespeichert, vielleicht nicht. Bitte neu laden und nachsehen, bevor du noch einmal speicherst.");
      setUnsure(true); setBusy(false);
    }
  };

  const dirty = !!note.trim() || sources.some((x) => (x.url.trim() && x.url !== (p.src_url || "")) || (x.title.trim() && x.title !== (p.src_title || "")))
    || (mode !== "status" && (statement !== init.statement || claimant !== init.claimant || disputed !== init.disputed_by));
  const cancel = () => {
    if (!dirty || busy) return close();
    const text = "Deine Eingaben gehen verloren.";
    if (Platform.OS === "web") { if (window.confirm(`Verwerfen?\n\n${text}`)) close(); return; }
    Alert.alert("Verwerfen?", text, [{ text: "Weiter bearbeiten", style: "cancel" }, { text: "Verwerfen", style: "destructive", onPress: close }]);
  };
  const close = () => { try { if (router.canGoBack()) { router.back(); return; } } catch { /* ohne Verlauf */ } router.replace("/claims"); };
  const same = mode === "status" && claim && status === claim.status;
  const title = mode === "add" ? "Neue Behauptung" : mode === "edit" ? "Angaben berichtigen" : same ? "Beleg ergänzen" : "Stufe ändern";
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <Stack.Screen options={{ title, headerLeft: () => <Pressable onPress={cancel} hitSlop={10} accessibilityRole="button" style={{ paddingHorizontal: 16, minHeight: 44, justifyContent: "center" }}><T v="bodyStrong" color={t.accent}>Abbrechen</T></Pressable> }} />
      <ScrollView contentContainerStyle={{ padding: space.l, gap: space.l, paddingBottom: 80, maxWidth: 760, width: "100%", alignSelf: "center" }} keyboardShouldPersistTaps="handled">
        {claim && mode === "status" ? <T v="small">{claim.statement}</T> : null}
        {mode !== "status" ? (
          <>
            <Field label="Aussage"><TextInput style={[input, { minHeight: 80, textAlignVertical: "top" }]} multiline value={statement} onChangeText={setStatement} placeholder="Eine überprüfbare Aussage" placeholderTextColor={t.faint} /></Field>
            <Field label="Wer sagt es"><TextInput style={[input, { minHeight: 64, textAlignVertical: "top" }]} multiline value={claimant} onChangeText={setClaimant} placeholder="z. B. Regierung Äthiopiens" placeholderTextColor={t.faint} /></Field>
            <Field label="Wer bestreitet es (optional)"><TextInput style={[input, { minHeight: 80, textAlignVertical: "top" }]} multiline value={disputed} onChangeText={setDisputed} placeholder="z. B. Eritreas Informationsminister" placeholderTextColor={t.faint} /></Field>
            {mode === "add" ? (
              <Field label="Region">
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {REGION_ORDER.map((r) => <Chip key={r} label={REGIONS[r]} active={region === r} onPress={() => setRegion(r)} />)}
                </View>
              </Field>
            ) : null}
            <Field label="Zuerst gemeldet">
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {[0, 1, 2].map((n) => { const d = dayMinus(n); return <Chip key={n} label={n === 0 ? "Heute" : n === 1 ? "Gestern" : "Vorgestern"} active={first === d} onPress={() => setFirst(d)} />; })}
              </View>
              <TextInput style={input} value={validDay(first) ? first.split("-").reverse().join(".") : first} onChangeText={(v) => setFirst(toIso(v))}
                placeholder={todayBerlin().split("-").reverse().join(".")} placeholderTextColor={t.faint} autoCapitalize="none"
                accessibilityLabel="Datum der ersten Meldung, Tag.Monat.Jahr" keyboardType="numbers-and-punctuation" />
              {first && !validDay(first) ? <T v="caption" color={t.warn}>Bitte als Tag.Monat.Jahr schreiben, z. B. {todayBerlin().split("-").reverse().join(".")}.</T>
                : validDay(first) && first > todayBerlin() ? <T v="caption" color={t.warn}>Dieses Datum liegt in der Zukunft.</T> : null}
            </Field>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.m }}>
              <T v="body" style={{ flex: 1 }}>Von einer Konfliktpartei behauptet</T>
              <Switch value={party} onValueChange={(v) => { tap(); setParty(v); }} accessibilityLabel="Von einer Konfliktpartei behauptet" />
            </View>
          </>
        ) : null}
        {mode !== "edit" ? (
          <Field label={mode === "add" || same ? "Stufe" : "Neue Stufe"}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {STATUS_ORDER.map((k) => <Chip key={k} label={STATUS[k][0]} color={t.status[k]} active={status === k} onPress={() => setStatus(k)} />)}
            </View>
            <T v="caption">{same ? "Gleiche Stufe wie bisher: Es wird nur ein neuer Beleg eingetragen." : STATUS[status]?.[1]}</T>
          </Field>
        ) : null}
        <Field label="Notiz">
          <TextInput style={[input, { minHeight: 80, textAlignVertical: "top" }]} multiline value={note} onChangeText={setNote}
            placeholder={mode === "edit" ? "Was war falsch, und woher stammt die richtige Fassung?" : same ? "Was belegt dieser neue Beleg?" : "Was hat sich geändert, und warum diese Stufe?"} placeholderTextColor={t.faint} />
        </Field>
        {mode !== "edit" ? (
          <>
            {sources.map((s, i) => (
              <View key={i} style={{ gap: 6 }}>
                <T v="smallStrong">Quelle {i + 1}</T>
                <TextInput style={input} value={s.title} onChangeText={(v) => setSources(sources.map((x, j) => (j === i ? { ...x, title: v } : x)))}
                  placeholder="Medium und Datum, z. B. Reuters, 10. Okt. 2026" placeholderTextColor={t.faint} accessibilityLabel={`Quelle ${i + 1}: Medium und Datum`} />
                <TextInput style={input} value={s.url} onChangeText={(v) => setSources(sources.map((x, j) => (j === i ? { ...x, url: v } : x)))}
                  placeholder="https://…" placeholderTextColor={t.faint} autoCapitalize="none" keyboardType="url" autoCorrect={false} accessibilityLabel={`Quelle ${i + 1}: Link`} />
              </View>
            ))}
            <Pressable onPress={() => { tap(); setSources([...sources, { title: "", url: "" }]); }} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
              <T v="smallStrong" color={t.accent}>+ Weitere Quelle</T>
            </Pressable>
            {status === "confirmed" ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.m }}>
                  <T v="body" style={{ flex: 1 }}>Die betroffene Seite hat es eingeräumt</T>
                  <Switch value={admission} onValueChange={(v) => { tap(); setAdmission(v); }} accessibilityLabel="Die betroffene Seite hat es eingeräumt" />
                </View>
                <T v="caption">„Bestätigt“ braucht zwei unabhängige Quellen (eine übernommene Agenturmeldung zählt einmal) oder ein Eingeständnis der betroffenen Seite.</T>
              </>
            ) : null}
          </>
        ) : null}
        {err ? <Banner icon="alert-circle-outline" tone="warn" text={err} action={unsure ? "Erneut laden" : undefined} onAction={unsure ? () => { refresh(); close(); } : undefined} /> : null}
        <Button label={busy ? "Speichert …" : mode === "add" ? "Behauptung anlegen" : mode === "edit" ? "Berichtigung speichern" : same ? "Beleg speichern" : "Stufe speichern"} onPress={submit} disabled={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
