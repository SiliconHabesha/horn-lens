// Rücksprung nach der Anmeldung bei Google/Apple, falls das Handy die App über diese Adresse öffnet
import * as Linking from "expo-linking";
import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { finishFromUrl } from "../lib/auth";

export default function AuthCallback() {
  const url = Linking.useURL();
  const [done, setDone] = useState(false);
  useEffect(() => { if (url) finishFromUrl(url).finally(() => setDone(true)); else setDone(true); }, [url]);
  return done ? <Redirect href="/" /> : null;
}
