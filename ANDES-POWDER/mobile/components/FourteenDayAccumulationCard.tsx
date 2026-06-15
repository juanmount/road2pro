import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import api from '../config/api';

export type ElevationBand = 'base' | 'mid' | 'summit';

type AccumDay = {
  date: string;
  predicted_cm: number;
  run_timestamp: string | null;
  is_past: boolean;
};

type AccumResponse = {
  resort: { id: string; name: string; slug: string };
  elevation: string;
  timezone: string;
  todayIndex: number;
  totals: { last7Days: number; next7Days: number };
  days: AccumDay[];
};

type Props = {
  resortSlug: string;
  elevation: ElevationBand | string;
};

export default function FourteenDayAccumulationCard({ resortSlug, elevation }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AccumResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setData(null);
    (async () => {
      try {
        const resp = await api.get<AccumResponse>(`/resorts/${encodeURIComponent(resortSlug)}/accumulation`, {
          params: { elevation, days: 14 },
        });
        setData(resp.data);
      } catch (e) {
        try {
          const d = await api.get<any[]>(`/resorts/${encodeURIComponent(resortSlug)}/forecast/daily`, {
            params: { elevation, days: 7 },
          });
          const next = (d.data || []).map((row: any) => ({
            date: row.date,
            predicted_cm: Number(row.snowfall || 0),
            run_timestamp: null,
            is_past: false,
          }));
          const now = new Date();
          const padPast: AccumDay[] = Array.from({ length: 7 }).map((_, i) => {
            const dt = new Date(now.getTime() - (7 - i) * 24 * 3600 * 1000);
            const ds = dt.toISOString().slice(0, 10);
            return { date: ds, predicted_cm: 0, run_timestamp: null, is_past: true };
          });
          const fallback: AccumResponse = {
            resort: { id: resortSlug, name: resortSlug, slug: resortSlug },
            elevation: String(elevation),
            timezone: 'America/Argentina/Buenos_Aires',
            todayIndex: 7,
            totals: { last7Days: 0, next7Days: Math.round(next.reduce((s: number, r: any) => s + (r.predicted_cm || 0), 0) * 10) / 10 },
            days: [...padPast, ...next],
          };
          setData(fallback);
        } catch (e2) {
          setError('No se pudo cargar el acumulado.');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [resortSlug, elevation]);

  const maxVal = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...data.days.map(d => d.predicted_cm || 0));
  }, [data]);

  const totals = useMemo(() => {
    if (!data) return { last: 0, next: 0 };
    return { last: data.totals.last7Days, next: data.totals.next7Days };
  }, [data]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ACUMULADO 14 DÍAS</Text>
        <View style={styles.elevBadge}><Text style={styles.elevBadgeText}>{String(elevation).toUpperCase()}</Text></View>
      </View>

      <View style={styles.totalsRow}>
        <View style={styles.totalBox}><Text style={styles.totalLabel}>Últimos 7</Text><Text style={styles.totalValue}>{totals.last.toFixed(totals.last < 1 && totals.last > 0 ? 1 : 0)}</Text><Text style={styles.totalUnit}>cm</Text></View>
        <View style={styles.totalBox}><Text style={styles.totalLabel}>Próximos 7</Text><Text style={styles.totalValue}>{totals.next.toFixed(totals.next < 1 && totals.next > 0 ? 1 : 0)}</Text><Text style={styles.totalUnit}>cm</Text></View>
      </View>

      {loading && (
        <View style={styles.center}><ActivityIndicator size="small" color="#0ea5e9" /></View>
      )}
      {error && (
        <View style={styles.center}><Text style={styles.errorTxt}>{error}</Text></View>
      )}

      {!!data && (
        <View style={styles.listWrap}>
          <FlatList
            horizontal
            data={data.days}
            keyExtractor={(item) => item.date}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => {
              const h = Math.max(3, (item.predicted_cm / maxVal) * 90);
              const isTodaySep = index === data.todayIndex;
              return (
                <View style={styles.dayCol}>
                  <View style={[styles.barWrap, isTodaySep && styles.todaySep]}>
                    {item.predicted_cm > 0 && (
                      <Text style={[styles.barVal, item.is_past ? styles.barValPast : styles.barValFuture]}>
                        {item.predicted_cm < 1 && item.predicted_cm > 0 ? item.predicted_cm.toFixed(1) : Math.round(item.predicted_cm)}
                      </Text>
                    )}
                    <View style={[styles.bar, { height: h }, item.is_past ? styles.barPast : styles.barFuture, item.predicted_cm === 0 && styles.barEmpty]} />
                  </View>
                  <Text style={styles.dayLabel}>{new Date(item.date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase()}</Text>
                </View>
              );
            }}
          />
          <View pointerEvents="none" style={styles.todayMarkerWrap}>
            <View style={styles.todayMarker}/>
            <Text style={styles.todayMarkerText}>HOY</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, marginHorizontal: 16, marginBottom: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 12 },
  title: { fontSize: 15, fontWeight: '700', color: '#0f172a', letterSpacing: 0.3 },
  elevBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  elevBadgeText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  totalBox: { alignItems: 'center' },
  totalLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  totalValue: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  totalUnit: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  center: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  errorTxt: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  listWrap: { position: 'relative' },
  listContent: { padding: 16, gap: 10 },
  dayCol: { width: 40, alignItems: 'center' },
  barWrap: { alignItems: 'center', justifyContent: 'flex-end', height: 110, marginBottom: 6 },
  barVal: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
  barValPast: { color: '#0ea5e9' },
  barValFuture: { color: '#10b981' },
  bar: { width: 22, borderRadius: 4 },
  barPast: { backgroundColor: '#93c5fd' },
  barFuture: { backgroundColor: '#86efac' },
  barEmpty: { backgroundColor: '#e2e8f0' },
  dayLabel: { fontSize: 10, fontWeight: '600', color: '#94a3b8' },
  todaySep: { borderRightWidth: 1, borderRightColor: '#e5e7eb' },
  todayMarkerWrap: { position: 'absolute', left: '50%', top: 8, bottom: 24, width: 0, alignItems: 'center' },
  todayMarker: { position: 'absolute', left: -1, top: 0, bottom: 0, width: 2, backgroundColor: '#e5e7eb' },
  todayMarkerText: { position: 'absolute', top: -6, left: -14, fontSize: 10, fontWeight: '700', color: '#94a3b8', backgroundColor: '#fff', paddingHorizontal: 2 },
});
