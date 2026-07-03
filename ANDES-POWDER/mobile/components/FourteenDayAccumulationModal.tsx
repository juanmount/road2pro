import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import api from '../config/api';

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
  visible: boolean;
  onClose: () => void;
  resortSlug: string;
  elevation: 'base' | 'mid' | 'summit';
};

export default function FourteenDayAccumulationModal({ visible, onClose, resortSlug, elevation }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AccumResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snowDepthCm, setSnowDepthCm] = useState<number>(0);
  const listRef = useRef<FlatList<AccumDay>>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    (async () => {
      try {
        const resp = await api.get<AccumResponse>(`/resorts/${encodeURIComponent(resortSlug)}/accumulation`, {
          params: { elevation, days: 14 },
        });
        if (cancelled) return;
        setData(resp.data);

        try {
          const depth = await api.get<any>(`/resorts/${encodeURIComponent(resortSlug)}/snow-depth`);
          if (cancelled) return;
          const list = Array.isArray(depth.data?.snowDepth) ? depth.data.snowDepth : [];
          const byBand = list.find((d: any) => d.elevation === elevation);
          setSnowDepthCm(Number(byBand?.snowDepthCm || 0));
        } catch {}
      } catch (e) {
        if (cancelled) return;
        try {
          const d = await api.get<any[]>(`/resorts/${encodeURIComponent(resortSlug)}/forecast/daily`, {
            params: { elevation, days: 7 },
          });
          if (cancelled) return;
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
            elevation,
            timezone: 'America/Argentina/Buenos_Aires',
            todayIndex: 7,
            totals: { last7Days: 0, next7Days: Math.round(next.reduce((s: number, r: any) => s + (r.predicted_cm || 0), 0) * 10) / 10 },
            days: [...padPast, ...next],
          };
          setData(fallback);

          try {
            const depth = await api.get<any>(`/resorts/${encodeURIComponent(resortSlug)}/snow-depth`);
            if (cancelled) return;
            const list = Array.isArray(depth.data?.snowDepth) ? depth.data.snowDepth : [];
            const byBand = list.find((dd: any) => dd.elevation === elevation);
            setSnowDepthCm(Number(byBand?.snowDepthCm || 0));
          } catch {}
        } catch (e2) {
          if (!cancelled) setError('No se pudo cargar el acumulado.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [visible, resortSlug, elevation]);

  const totals = useMemo(() => {
    if (!data) return { last: snowDepthCm || 0, next: 0 };
    return { last: snowDepthCm || 0, next: data.totals.next7Days };
  }, [data, snowDepthCm]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Acumulado 14 días</Text>
              <Text style={styles.subtitle}>{elevation.toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeTxt}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.totalsRow}>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Nieve en el suelo</Text>
              <Text style={styles.totalValue}>{totals.last.toFixed(totals.last < 1 && totals.last > 0 ? 1 : 0)}</Text>
              <Text style={styles.totalUnit}>cm</Text>
            </View>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Próximos 7</Text>
              <Text style={styles.totalValue}>{totals.next.toFixed(totals.next < 1 && totals.next > 0 ? 1 : 0)}</Text>
              <Text style={styles.totalUnit}>cm</Text>
            </View>
          </View>

          {loading && (
            <View style={styles.center}>
              <ActivityIndicator size="small" color="#0ea5e9" />
            </View>
          )}
          {error && (
            <View style={styles.center}>
              <Text style={styles.errorTxt}>{error}</Text>
            </View>
          )}

          {!!data && (
            <FlatList
              horizontal
              data={data.days}
              keyExtractor={(item) => item.date}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              initialScrollIndex={data.todayIndex}
              getItemLayout={(_, index) => {
                // Item width and spacing must match styles.dayCol width and listContent padding/gap
                const ITEM_WIDTH = 40; // styles.dayCol.width
                const ITEM_SPACING = 10; // styles.listContent.gap
                const CONTAINER_PADDING = 16; // styles.listContent.padding
                const length = ITEM_WIDTH + ITEM_SPACING;
                const offset = CONTAINER_PADDING + length * index;
                return { length, offset, index };
              }}
              ref={listRef}
              onScrollToIndexFailed={(info) => {
                // Fallback: wait for layout then retry
                setTimeout(() => {
                  listRef.current?.scrollToIndex({ index: info.index, animated: false, viewPosition: 0 });
                }, 50);
              }}
              renderItem={({ item, index }) => {
                const allVals = data.days.map((d) => d.predicted_cm || 0);
                const max = Math.max(1, ...allVals);
                const value = item.predicted_cm || 0;
                const h = Math.max(3, (value / max) * 90);
                const isToday = index === data.todayIndex;
                const label = isToday
                  ? 'HOY'
                  : new Date(item.date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase();
                return (
                  <View style={styles.dayCol}>
                    {isToday && <Text style={styles.todayLabel}>↓</Text>}
                    <View style={[styles.barWrap, isToday && styles.todaySep]}>
                      {value > 0 && (
                        <Text style={[styles.barVal, item.is_past ? styles.barValPast : styles.barValFuture]}>
                          {value < 1 && value > 0 ? value.toFixed(1) : Math.round(value)}
                        </Text>
                      )}
                      <View
                        style={[
                          styles.bar,
                          { height: h },
                          item.is_past ? styles.barPast : styles.barFuture,
                          value === 0 && styles.barEmpty,
                        ]}
                      />
                    </View>
                    <Text style={[styles.dayLabel, isToday && styles.todayDayLabel]}>{label}</Text>
                  </View>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  container: { backgroundColor: '#fff', borderRadius: 16, width: '92%', maxWidth: 520, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 12, fontWeight: '700', color: '#64748b', marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 22, color: '#64748b' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  totalBox: { alignItems: 'center' },
  totalLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8' },
  totalValue: { fontSize: 26, fontWeight: '800', color: '#0f172a' },
  totalUnit: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  center: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  errorTxt: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
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
  dayLabel: { fontSize: 10, fontWeight: '600', color: '#64748b' },
  todaySep: { borderRightWidth: 1, borderRightColor: '#e5e7eb' },
  todayLabel: { fontSize: 10, fontWeight: '800', color: '#0ea5e9', textAlign: 'center', marginBottom: 2 },
  todayDayLabel: { color: '#0ea5e9', fontWeight: '800' },
});
