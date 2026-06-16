import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import type { FlatList as FlatListType } from 'react-native';
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
  onOpenDetails?: () => void;
};

export default function FourteenDayAccumulationCard({ resortSlug, elevation, onOpenDetails }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AccumResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onGround7d, setOnGround7d] = useState<number>(0);
  const [snowDepthCm, setSnowDepthCm] = useState<number>(0);
  const [pastDailyIncrements, setPastDailyIncrements] = useState<Record<string, number>>({});
  const listRef = useRef<FlatListType<AccumDay>>(null);

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

        // Fetch snow depth series to compute on-ground accumulation for last 7 days
        try {
          const depth = await api.get<any>(`/resorts/${encodeURIComponent(resortSlug)}/snow-depth-series`, {
            params: { elevation, days: 7 },
          });
          const val = Number(depth.data?.accumulationOnGround7d || 0);
          setOnGround7d(Number.isFinite(val) ? val : 0);

          const series: Array<{ date: string; snowDepthCmMax: number }> = Array.isArray(depth.data?.days) ? depth.data.days : [];
          const incMap: Record<string, number> = {};
          const elevCap = String(elevation).toLowerCase() === 'base' ? 30 : String(elevation).toLowerCase() === 'mid' ? 40 : 50;
          for (let i = 1; i < series.length; i++) {
            const prev = series[i - 1].snowDepthCmMax || 0;
            const curr = series[i].snowDepthCmMax || 0;
            const inc = Math.max(0, curr - prev);
            incMap[series[i].date] = Math.min(elevCap, inc); // key by date string 'YYYY-MM-DD'
          }
          setPastDailyIncrements(incMap);
        } catch {}

        // Fetch current snow depth for subtitle (Ahora)
        try {
          const depthNow = await api.get<any>(`/resorts/${encodeURIComponent(resortSlug)}/snow-depth`);
          const list = Array.isArray(depthNow.data?.snowDepth) ? depthNow.data.snowDepth : [];
          const byBand = list.find((d: any) => d.elevation === elevation);
          setSnowDepthCm(Number(byBand?.snowDepthCm || 0));
        } catch {}
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

          // Attempt to fetch on-ground accumulation even in fallback
          try {
            const depth = await api.get<any>(`/resorts/${encodeURIComponent(resortSlug)}/snow-depth-series`, {
              params: { elevation, days: 7 },
            });
            const val = Number(depth.data?.accumulationOnGround7d || 0);
            setOnGround7d(Number.isFinite(val) ? val : 0);
            const series: Array<{ date: string; snowDepthCmMax: number }> = Array.isArray(depth.data?.days) ? depth.data.days : [];
            const incMap: Record<string, number> = {};
            const elevCap = String(elevation).toLowerCase() === 'base' ? 30 : String(elevation).toLowerCase() === 'mid' ? 40 : 50;
            for (let i = 1; i < series.length; i++) {
              const prev = series[i - 1].snowDepthCmMax || 0;
              const curr = series[i].snowDepthCmMax || 0;
              const inc = Math.max(0, curr - prev);
              incMap[series[i].date] = Math.min(elevCap, inc);
            }
            setPastDailyIncrements(incMap);
          } catch {}

          // Also attempt to fetch current snow depth in fallback
          try {
            const depthNow = await api.get<any>(`/resorts/${encodeURIComponent(resortSlug)}/snow-depth`);
            const list = Array.isArray(depthNow.data?.snowDepth) ? depthNow.data.snowDepth : [];
            const byBand = list.find((dd: any) => dd.elevation === elevation);
            setSnowDepthCm(Number(byBand?.snowDepthCm || 0));
          } catch {}
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
    const elev = String(elevation).toLowerCase();
    const cap = elev === 'base' ? 30 : elev === 'mid' ? 40 : 50;
    const vals = data.days.map(d => (d.is_past ? (pastDailyIncrements[d.date] || 0) : Math.min(cap, d.predicted_cm || 0)));
    return Math.max(1, ...vals);
  }, [data, pastDailyIncrements, elevation]);

  const totals = useMemo(() => {
    if (!data) return { last: onGround7d || 0, next: 0 };
    return { last: onGround7d || 0, next: data.totals.next7Days };
  }, [data, onGround7d]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ACUMULADO 14 DÍAS</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {!!onOpenDetails && (
            <TouchableOpacity onPress={onOpenDetails}>
              <Text style={styles.linkBtn}>Ver detalle</Text>
            </TouchableOpacity>
          )}
          <View style={styles.elevBadge}><Text style={styles.elevBadgeText}>{String(elevation).toUpperCase()}</Text></View>
        </View>
      </View>

      <View style={styles.totalsRow}>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Suelo últimos 7</Text>
          <Text style={styles.totalValue}>{totals.last.toFixed(totals.last < 1 && totals.last > 0 ? 1 : 0)}</Text>
          <Text style={styles.totalUnit}>cm</Text>
          {snowDepthCm > 0 && (
            <Text style={styles.subtleNote}>Ahora: {snowDepthCm < 1 && snowDepthCm > 0 ? snowDepthCm.toFixed(1) : Math.round(snowDepthCm)} cm</Text>
          )}
        </View>
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
            ref={listRef}
            data={data.days}
            keyExtractor={(item) => item.date}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            initialScrollIndex={Math.max(0, data.todayIndex - 2)}
            getItemLayout={(_, index) => ({
              length: 50,
              offset: 16 + 50 * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                listRef.current?.scrollToIndex({ index: Math.max(0, info.index - 2), animated: false, viewPosition: 0 });
              }, 50);
            }}
            renderItem={({ item, index }) => {
              const elev = String(elevation).toLowerCase();
              const cap = elev === 'base' ? 30 : elev === 'mid' ? 40 : 50;
              const value = item.is_past ? (pastDailyIncrements[item.date] || 0) : Math.min(cap, (item.predicted_cm || 0));
              const h = Math.max(3, (value / maxVal) * 90);
              const isTodaySep = index === data.todayIndex;
              return (
                <View style={styles.dayCol}>
                  <View style={[styles.barWrap, isTodaySep && styles.todaySep]}>
                    {isTodaySep && (
                      <Text style={styles.todayFlag}>HOY</Text>
                    )}
                    {value > 0 && (
                      <Text style={[styles.barVal, item.is_past ? styles.barValPast : styles.barValFuture]}>
                        {value < 1 && value > 0 ? value.toFixed(1) : Math.round(value)}
                      </Text>
                    )}
                    <View style={[styles.bar, { height: h }, item.is_past ? styles.barPast : styles.barFuture, value === 0 && styles.barEmpty]} />
                  </View>
                  <Text style={styles.dayLabel}>{new Date(item.date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase()}</Text>
                </View>
              );
            }}
          />
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
  linkBtn: { fontSize: 12, fontWeight: '700', color: '#0ea5e9' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  totalBox: { alignItems: 'center' },
  totalLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  totalValue: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  totalUnit: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  subtleNote: { fontSize: 10, fontWeight: '600', color: '#64748b', marginTop: 2 },
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
  todayFlag: { position: 'absolute', top: -10, fontSize: 10, fontWeight: '700', color: '#64748b', backgroundColor: '#fff', paddingHorizontal: 3, borderRadius: 3 },
});
