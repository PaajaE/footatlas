import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { lifeCardSentence, totals, type Totals } from "@footatlas/core";
import { healthSource } from "./src/health";

interface Result {
  totals: Totals;
  days: number;
  firstDay: string | null;
  history: boolean;
  tookMs: number;
}

const km = (m: number) => Math.round(m / 1000).toLocaleString("cs-CZ");

export default function App() {
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState("Připraveno");
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    try {
      setStatus("Kontrola dostupnosti");
      const availability = await healthSource.availability();
      if (availability !== "available") {
        setStatus(`Zdravotní data nejsou dostupná: ${availability}`);
        return;
      }
      setStatus("Žádost o oprávnění");
      const access = await healthSource.requestAccess();
      if (!access.read) {
        setStatus("Čtení nebylo povoleno");
        return;
      }
      setStatus("Čtení historie");
      const t0 = Date.now();
      const records = await healthSource.readDaily(new Date(2000, 0, 1), new Date());
      setResult({
        totals: totals(records),
        days: records.length,
        firstDay: records[0]?.date ?? null,
        history: access.history,
        tookMs: Date.now() - t0,
      });
      setStatus("Hotovo");
    } catch (e) {
      setStatus(`Chyba: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  const t = result?.totals;
  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.title}>FootAtlas, prototyp importu</Text>
      <Text style={s.muted}>{healthSource.platform} · {status}</Text>
      <Pressable style={[s.button, busy && s.disabled]} onPress={load} disabled={busy}>
        <Text style={s.buttonText}>Načíst historii</Text>
      </Pressable>
      {result && t && (
        <View style={s.card}>
          <Text style={s.big}>{km(t.totalM)} km</Text>
          <Text style={s.body}>{lifeCardSentence(t.totalM / 1000)}</Text>
          <Text style={s.cardMuted}>Ověřeno {km(t.byConfidence.verified)} km, odhad {km(t.byConfidence.estimated)} km</Text>
          <Text style={s.cardMuted}>Dnů se záznamem: {result.days}, první den: {result.firstDay ?? "žádný"}</Text>
          <Text style={s.cardMuted}>Oprávnění k historii: {result.history ? "ano" : "ne"} · {result.tookMs} ms</Text>
        </View>
      )}
      <StatusBar style="dark" />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: 24, paddingTop: 72, gap: 16, backgroundColor: "#F3F4EF", flexGrow: 1 },
  title: { fontSize: 24, fontWeight: "700", color: "#17302E" },
  muted: { color: "#5B6E6B", fontSize: 14 },
  cardMuted: { color: "#A9C2BC", fontSize: 14 },
  body: { color: "#F3F4EF", fontSize: 17 },
  big: { color: "#F3F4EF", fontSize: 48, fontWeight: "700" },
  button: { backgroundColor: "#C8431F", padding: 16, borderRadius: 14, alignItems: "center" },
  disabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 17 },
  card: { backgroundColor: "#17302E", padding: 20, borderRadius: 20, gap: 8 },
});
