// Rücksprung nach der Anmeldung bei Google/Apple, falls das Handy die App über diese Adresse öffnet
import * as Linking from "expo-linking";
import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { T } from "../components/ui";
import { t as tr } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import { finishFromUrl } from "../lib/auth";

export default function AuthCallback() {
  const t = useTheme();
  const url = Linking.useURL();
  const [done, setDone] = useState(false);
  useEffect(() => { if (url) finishFromUrl(url).finally(() => setDone(true)); else setDone(true); }, [url]);
  return done ? <Redirect href="/" /> : (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <ActivityIndicator color={t.muted} />
      <T v="small">{tr("Anmeldung wird abgeschlossen …")}</T>
    </View>
  );
}
