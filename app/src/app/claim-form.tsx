// Formular: Status ändern, Angaben berichtigen oder neue Behauptung anlegen. Die Regeln prüft zusätzlich die Datenbank.
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { toast } from "../components/Toast";
import { Banner, Button, Chip, T, tap, Toggle } from "../components/ui";
import { de, DIRECTION, REGION_ORDER, REGIONS, STATUS, STATUS_ORDER, todayBerlin } from "../lib/de";
import { useData } from "../lib/data";
import { t as tr } from "../lib/i18n";
import { sb } from "../lib/supabase";
import { font, radius, space, useTheme } from "../lib/theme";
import { Skeleton } from "../components/Skeleton";

type Src = { title: string; url: string };
const validDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && new Date(s + "T12:00:00Z").toISOString().slice(0, 10) === s;
// Datum vor n Tagen (Berliner Kalender) als JJJJ-MM-TT
// „11.10.2026“ in JJJJ-MM-TT umwandeln, alles andere unverändert lassen
const toIso = (s: string) => { const m = s.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : s.trim(); };
const isoToDe = (s: string) => (validDay(s) ? s.split("-").reverse().join(".") : s);
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
  // Was im Feld steht (Tag.Monat.Jahr), getrennt vom gespeicherten Wert, damit man mitten im Datum tippen kann
  const [firstText, setFirstText] = useState(() => isoToDe(claim?.first_reported || todayBerlin()));
  const pickFirst = (iso: string) => { setFirst(iso); setFirstText(isoToDe(iso)); };
  const [party, setParty] = useState(!!claim?.party_claim);
  const [status, setStatus] = useState(claim?.status || "unverified");
  // Prüfangaben: behaupteter Zeitpunkt, offene Fragen, Begründung der Stufe, Abhängigkeit der Quellen
  const [eventTime, setEventTime] = useState(claim?.event_time || "");
  const [openQ, setOpenQ] = useState(claim?.open_questions || "");
  const [rationale, setRationale] = useState(claim?.rationale || "");
  const [deps, setDeps] = useState(claim?.dependencies || "");
  const [direction, setDirection] = useState<"supports" | "contradicts" | "context">(p.intent === "contra" ? "contradicts" : "supports");
  const [note, setNote] = useState("");
  // Aus einer Meldung angelegt: die Meldung ist schon als erste Quelle eingetragen
  const [sources, setSources] = useState<Src[]>([{ title: p.src_title || "", url: p.src_url || "" }, { title: "", url: "" }]);
  const [admission, setAdmission] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [unsure, setUnsure] = useState(false);
  const [busy, setBusy] = useState(false);
  // Wird die Seite direkt geöffnet, kommen die Daten erst nach dem ersten Zeichnen: dann einmal vorausfüllen
  const filled = useRef(!!claim);
  // Eingeständnis gilt nur für „Durch unabhängige Quellen gestützt“
  useEffect(() => { if (status !== "supported") setAdmission(false); }, [status]);
  useEffect(() => {
    if (filled.current || !claim) return;
    filled.current = true;
    setStatement(claim.statement); setClaimant(claim.claimant); setDisputed(claim.disputed_by || "");
    setRegion(claim.region); pickFirst(claim.first_reported); setParty(!!claim.party_claim); setStatus(claim.status);
    setEventTime(claim.event_time || ""); setOpenQ(claim.open_questions || ""); setRationale(claim.rationale || ""); setDeps(claim.dependencies || "");
  }, [claim]);

  if (!data) return <View style={{ flex: 1, backgroundColor: t.bg, padding: space.l }}><Skeleton rows={5} /></View>;
  if (!data.owner) return <View style={{ flex: 1, backgroundColor: t.bg, padding: space.l }}><T>{tr("Nur für den Betreiber von Semay.")}</T></View>;
  if (mode !== "add" && !claim) return <View style={{ flex: 1, backgroundColor: t.bg, padding: space.l }}><T>{tr("Diese Behauptung gibt es nicht mehr. Vielleicht wurde sie zusammengelegt oder entfernt.")}</T></View>;

  const input = { fontFamily: font.regular, fontSize: 15.5, color: t.ink, backgroundColor: t.card, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.rule, paddingHorizontal: 12, paddingVertical: 10 } as const;

  const submit = async () => {
    setErr(null); setUnsure(false);
    const src = sources.map((s) => ({ title: s.title.trim() || hostOf(s.url.trim()), url: s.url.trim() })).filter((s) => s.url || s.title);
    const day = toIso(first);
    if (mode !== "status" && !validDay(day)) return setErr(tr("Bitte das Datum der ersten Meldung als Tag.Monat.Jahr schreiben, z. B. 11.10.2026."));
    if (mode !== "status" && day > todayBerlin()) return setErr(tr("Das Datum der ersten Meldung liegt in der Zukunft."));
    if (src.some((s) => !/^https?:\/\/[^/\s?#]+\.[^/\s?#]+/.test(s.url))) return setErr(tr("Jede Quelle braucht einen vollständigen Link, der mit https:// beginnt."));
    if (note.trim().length < 3) return setErr(tr("Bitte eine kurze Notiz schreiben."));
    const hosts = new Set(src.map((s) => hostOf(s.url)));
    if (mode !== "edit" && status === "supported" && !admission && hosts.size < 2)
      return setErr(tr("„Durch unabhängige Quellen gestützt“ braucht zwei unabhängige Quellen auf zwei verschiedenen Websites oder ein Eingeständnis der betroffenen Seite."));
    if (mode !== "edit" && status === "supported" && admission && !src.length) return setErr(tr("Bitte verlinken, wo die betroffene Seite es eingeräumt hat."));
    if (mode !== "edit" && status === "refuted" && claim?.status !== "refuted" && !src.length) return setErr(tr("„Widerlegt“ braucht mindestens einen Beleg, der es zeigt."));
    if (mode === "add" && !src.length) return setErr(tr("Eine neue Behauptung braucht mindestens eine Quelle."));
    if (mode !== "status" && (!statement.trim() || !claimant.trim())) return setErr(tr("Bitte Aussage und „Wer sagt es“ ausfüllen."));
    // Was du nicht änderst, geht im Original zurück und gilt nicht als geändert
    const val = (v: string, key: "statement" | "claimant" | "disputed_by") => (v.trim() === init[key].trim() ? (init.raw?.[key] ?? init[key]) ?? "" : v.trim());
    let fn: string, payload: any;
    if (mode === "status") { fn = "app_claim_update"; payload = { id: claim!.id, status, note: note.trim(), sources: src, admission, direction, rationale: rationale.trim(), open_questions: openQ.trim() }; }
    else if (mode === "edit") {
      fn = "app_claim_edit";
      payload = { id: claim!.id, statement: val(statement, "statement"), claimant: val(claimant, "claimant"), disputed_by: val(disputed, "disputed_by"),
        first_reported: day, party, note: note.trim(), event_time: eventTime.trim(), open_questions: openQ.trim(), rationale: rationale.trim(), dependencies: deps.trim() };
    } else {
      fn = "app_claim_add";
      payload = { statement: statement.trim(), claimant: claimant.trim(), disputed_by: disputed.trim(), region, status, party, first_reported: day,
        note: note.trim(), sources: src, admission, direction, event_time: eventTime.trim(), open_questions: openQ.trim(), rationale: rationale.trim(), dependencies: deps.trim() };
    }
    setBusy(true);
    try {
      const { error } = await sb.rpc(fn, { p: payload });
      if (error && /fetch|network|timeout|abort/i.test(String(error.message))) throw error;
      if (error) {
        const m = String(error.message || "").replace(/\.\s*$/, "");
        setErr(tr("Nicht gespeichert: {reason}.", { reason: de(m) || tr("die Datenbank hat es abgelehnt") }));
        setBusy(false);
        return;
      }
      await refresh();
      toast(mode === "add" ? tr("Behauptung angelegt") : mode === "status" ? (same ? tr("Beleg gespeichert") : tr("Stufe geändert")) : tr("Berichtigung gespeichert"));
      close();
    } catch {
      setErr(tr("Die Verbindung ist abgebrochen. Vielleicht wurde gespeichert, vielleicht nicht. Bitte neu laden und nachsehen, bevor du noch einmal speicherst."));
      setUnsure(true); setBusy(false);
    }
  };

  const dirty = !!note.trim() || sources.some((x) => (x.url.trim() && x.url !== (p.src_url || "")) || (x.title.trim() && x.title !== (p.src_title || "")))
    || (mode !== "status" && (statement !== init.statement || claimant !== init.claimant || disputed !== init.disputed_by))
    || eventTime !== (claim?.event_time || "") || openQ !== (claim?.open_questions || "") || rationale !== (claim?.rationale || "") || deps !== (claim?.dependencies || "");
  const cancel = () => {
    if (!dirty || busy) return close();
    const text = tr("Deine Eingaben gehen verloren.");
    if (Platform.OS === "web") { if (window.confirm(`${tr("Verwerfen?")}\n\n${text}`)) close(); return; }
    Alert.alert(tr("Verwerfen?"), text, [{ text: tr("Weiter bearbeiten"), style: "cancel" }, { text: tr("Verwerfen"), style: "destructive", onPress: close }]);
  };
  const close = () => { try { if (router.canGoBack()) { router.back(); return; } } catch { /* ohne Verlauf */ } router.replace("/archive"); };
  const same = mode === "status" && claim && status === claim.status;
  const title = mode === "add" ? tr("Neue Behauptung") : mode === "edit" ? tr("Angaben berichtigen") : same ? tr("Beleg ergänzen") : tr("Stufe ändern");
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <Stack.Screen options={{ title, headerLeft: () => <Pressable onPress={cancel} hitSlop={10} accessibilityRole="button" style={{ paddingHorizontal: 16, minHeight: 44, justifyContent: "center" }}><T v="bodyStrong" color={t.accent}>{tr("Abbrechen")}</T></Pressable> }} />
      <ScrollView contentContainerStyle={{ padding: space.l, gap: space.l, paddingBottom: 80, maxWidth: 760, width: "100%", alignSelf: "center" }} keyboardShouldPersistTaps="handled">
        {claim && mode === "status" ? <T v="small">{claim.statement}</T> : null}
        {mode !== "status" ? (
          <>
            <Field label={tr("Aussage")}><TextInput style={[input, { minHeight: 80, textAlignVertical: "top" }]} multiline value={statement} onChangeText={setStatement} placeholder={tr("Eine überprüfbare Aussage")} placeholderTextColor={t.faint} /></Field>
            <Field label={tr("Wer sagt es")}><TextInput style={[input, { minHeight: 64, textAlignVertical: "top" }]} multiline value={claimant} onChangeText={setClaimant} placeholder={tr("z. B. ein Ministerium, eine Agentur, Augenzeugen")} placeholderTextColor={t.faint} /></Field>
            <Field label={tr("Wer bestreitet es (optional)")}><TextInput style={[input, { minHeight: 80, textAlignVertical: "top" }]} multiline value={disputed} onChangeText={setDisputed} placeholder={tr("z. B. die betroffene Regierung oder Gruppe")} placeholderTextColor={t.faint} /></Field>
            {mode === "add" ? (
              <Field label={tr("Region")}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {REGION_ORDER.map((r) => <Chip key={r} label={REGIONS[r]} active={region === r} onPress={() => setRegion(r)} />)}
                </View>
              </Field>
            ) : null}
            <Field label={tr("Zuerst gemeldet")}>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {[0, 1, 2].map((n) => { const d = dayMinus(n); return <Chip key={n} label={n === 0 ? tr("Heute") : n === 1 ? tr("Gestern") : tr("Vorgestern")} active={first === d} onPress={() => pickFirst(d)} />; })}
              </View>
              <TextInput style={input} value={firstText} onChangeText={(v) => { setFirstText(v); setFirst(toIso(v)); }}
                placeholder={todayBerlin().split("-").reverse().join(".")} placeholderTextColor={t.faint} autoCapitalize="none"
                accessibilityLabel={tr("Datum der ersten Meldung, Tag.Monat.Jahr")} keyboardType="numbers-and-punctuation" />
              {first && !validDay(first) ? <T v="caption" color={t.warn}>{tr("Bitte als Tag.Monat.Jahr schreiben, z. B. {example}.", { example: todayBerlin().split("-").reverse().join(".") })}</T>
                : validDay(first) && first > todayBerlin() ? <T v="caption" color={t.warn}>{tr("Dieses Datum liegt in der Zukunft.")}</T> : null}
            </Field>
            <Field label={tr("Behaupteter Zeitpunkt des Ereignisses (optional)")}>
              <TextInput style={input} value={eventTime} onChangeText={setEventTime} placeholder={tr("So, wie die Quelle ihn nennt, z. B. „in der Nacht zum 9. Oktober“")} placeholderTextColor={t.faint} />
            </Field>
            <Field label={tr("Hängen die Quellen voneinander ab? (optional)")}>
              <TextInput style={[input, { minHeight: 64, textAlignVertical: "top" }]} multiline value={deps} onChangeText={setDeps} placeholder={tr("z. B. beide Berichte stützen sich auf dieselbe Regierungserklärung")} placeholderTextColor={t.faint} />
            </Field>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.m }}>
              <T v="body" style={{ flex: 1 }}>{tr("Von einer Konfliktpartei behauptet")}</T>
              <Toggle value={party} onValueChange={(v) => { tap(); setParty(v); }} accessibilityLabel={tr("Von einer Konfliktpartei behauptet")} />
            </View>
          </>
        ) : null}
        {mode !== "edit" ? (
          <Field label={mode === "add" || same ? tr("Stufe") : tr("Neue Stufe")}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {STATUS_ORDER.map((k) => <Chip key={k} label={STATUS[k][0]} color={t.status[k]} active={status === k} onPress={() => setStatus(k)} />)}
            </View>
            <T v="caption">{same ? tr("Gleiche Stufe wie bisher: Es wird nur ein neuer Beleg eingetragen.") : STATUS[status]?.[1]}</T>
          </Field>
        ) : null}
        <Field label={tr("Begründung der Stufe (optional, öffentlich)")}>
          <TextInput style={[input, { minHeight: 64, textAlignVertical: "top" }]} multiline value={rationale} onChangeText={setRationale} placeholder={tr("Warum diese Stufe, in ein bis zwei Sätzen")} placeholderTextColor={t.faint} />
        </Field>
        <Field label={tr("Offene Fragen (optional, öffentlich)")}>
          <TextInput style={[input, { minHeight: 64, textAlignVertical: "top" }]} multiline value={openQ} onChangeText={setOpenQ} placeholder={tr("Was fehlt, um weiter zu prüfen?")} placeholderTextColor={t.faint} />
        </Field>
        <Field label={tr("Notiz")}>
          <TextInput style={[input, { minHeight: 80, textAlignVertical: "top" }]} multiline value={note} onChangeText={setNote}
            placeholder={mode === "edit" ? tr("Was war falsch, und woher stammt die richtige Fassung?") : same ? tr("Was belegt dieser neue Beleg?") : tr("Was hat sich geändert, und warum diese Stufe?")} placeholderTextColor={t.faint} />
        </Field>
        {mode !== "edit" ? (
          <>
            {sources.map((s, i) => (
              <View key={i} style={{ gap: 6 }}>
                <T v="smallStrong">{tr("Quelle {n}", { n: i + 1 })}</T>
                <TextInput style={input} value={s.title} onChangeText={(v) => setSources(sources.map((x, j) => (j === i ? { ...x, title: v } : x)))}
                  placeholder={tr("Medium und Datum, z. B. Reuters, 10. Okt. 2026")} placeholderTextColor={t.faint} accessibilityLabel={tr("Quelle {n}: Medium und Datum", { n: i + 1 })} />
                <TextInput style={input} value={s.url} onChangeText={(v) => setSources(sources.map((x, j) => (j === i ? { ...x, url: v } : x)))}
                  placeholder="https://…" placeholderTextColor={t.faint} autoCapitalize="none" keyboardType="url" autoCorrect={false} accessibilityLabel={tr("Quelle {n}: Link", { n: i + 1 })} />
              </View>
            ))}
            <Pressable onPress={() => { tap(); setSources([...sources, { title: "", url: "" }]); }} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
              <T v="smallStrong" color={t.accent}>{tr("+ Weitere Quelle")}</T>
            </Pressable>
            <Field label={tr("Diese Quellen …")}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(["supports", "contradicts", "context"] as const).map((k) => <Chip key={k} label={DIRECTION[k]} active={direction === k} onPress={() => setDirection(k)} />)}
              </View>
              <T v="caption">{tr("… die Behauptung stützen, ihr widersprechen oder sie nur einordnen. Steht im Verlauf bei den Belegen.")}</T>
            </Field>
            {status === "supported" ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.m }}>
                  <T v="body" style={{ flex: 1 }}>{tr("Die betroffene Seite hat es eingeräumt")}</T>
                  <Toggle value={admission} onValueChange={(v) => { tap(); setAdmission(v); }} accessibilityLabel={tr("Die betroffene Seite hat es eingeräumt")} />
                </View>
                <T v="caption">{tr("„Durch unabhängige Quellen gestützt“ braucht zwei unabhängige Quellen (eine übernommene Agenturmeldung zählt einmal) oder ein Eingeständnis der betroffenen Seite.")}</T>
              </>
            ) : null}
          </>
        ) : null}
        {err ? <Banner icon="alert-circle-outline" tone="warn" text={err} action={unsure ? tr("Erneut laden") : undefined} onAction={unsure ? () => { refresh(); close(); } : undefined} /> : null}
        <Button label={busy ? tr("Speichert …") : mode === "add" ? tr("Behauptung anlegen") : mode === "edit" ? tr("Berichtigung speichern") : same ? tr("Beleg speichern") : tr("Stufe speichern")} onPress={submit} disabled={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
