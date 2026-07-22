import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import type { FlatList as FlatListType } from 'react-native';
import { resortsService } from '../services/resorts';

type Phase = 'snow' | 'rain' | 'mixed' | 'clear' | 'nodata';

type DayData = {
  date: string;
  dayLabel: string;
  dateLabel: string;
  isToday: boolean;
  isWeek2: boolean;
  summit: { snow: number; rain: number; phase: Phase };
  mid:    { snow: number; rain: number; phase: Phase };
  base:   { snow: number; rain: number; phase: Phase };
};

function getPhase(hours: any[]): Phase {
  const snowH = hours.filter((h: any) => h.phase === 'snow').length;
  const rainH = hours.filter((h: any) => h.phase === 'rain').length;
  const precip = hours.reduce((s: number, h: any) => s + (h.precipitation || 0), 0);
  if (snowH === 0 && rainH === 0 && precip < 0.3) return 'clear';
  if (snowH >= rainH * 2) return 'snow';
  if (rainH >= snowH * 2) return 'rain';
  if (snowH + rainH > 0) return 'mixed';
  return 'clear';
}

function buildAllElevationsDailyData(
  baseH: any[],
  midH: any[],
  summitH: any[]
): DayData[] {
  const group = (data: any[]) => {
    const m = new Map<string, any[]>();
    data.forEach((h) => {
      const d = new Date(h.time);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(h);
    });
    return m;
  };

  const baseMap = group(baseH);
  const midMap = group(midH);
  const summitMap = group(summitH);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const dayLabel = d
      .toLocaleDateString('es-AR', { weekday: 'short' })
      .slice(0, 2)
      .toUpperCase();
    const dateLabel = String(d.getDate());

    const makeBand = (map: Map<string, any[]>) => {
      const hours = map.get(key) || [];
      if (hours.length === 0) {
        return { snow: 0, rain: 0, phase: 'nodata' as Phase };
      }
      const snow = hours.reduce((s: number, h: any) => s + (h.snowfall || 0), 0);
      const precip = hours.reduce((s: number, h: any) => s + (h.precipitation || 0), 0);
      const phase = getPhase(hours);
      const rain = phase === 'rain' ? precip : phase === 'mixed' ? precip * 0.5 : 0;
      return {
        snow: Math.round(snow * 10) / 10,
        rain: Math.round(rain * 10) / 10,
        phase,
      };
    };

    return {
      date: key,
      dayLabel,
      dateLabel,
      isToday: i === 0,
      isWeek2: i >= 7,
      summit: makeBand(summitMap),
      mid: makeBand(midMap),
      base: makeBand(baseMap),
    };
  });
}

const SNOW_COLOR = '#f87171';
const RAIN_COLOR = '#38bdf8';
const NODATA_COLOR = '#e2e8f0';
const BAR_MAX_H = 64;
const CARD_W = 52;
const BAR_W = 10;
const BAR_GAP = 3;
const SCALE_MAX = 50;

type Props = { resortId: string };

export default function TwoWeekSnowGrid({ resortId }: Props) {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DayData[]>([]);
  const [error, setError] = useState(false);
  const listRef = useRef<FlatListType<DayData>>(null);
  const [barsTop, setBarsTop] = useState<number | null>(null);
  const [gridLeft, setGridLeft] = useState<number>(0);
  const listWrapperRef = useRef<View>(null);
  const barsRowRef = useRef<View>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    Promise.all([
      resortsService.getHourlyForecast(resortId, 'base', 336),
      resortsService.getHourlyForecast(resortId, 'mid', 336),
      resortsService.getHourlyForecast(resortId, 'summit', 336),
    ])
      .then(([baseH, midH, summitH]) => {
        if (cancelled) return;
        setDays(buildAllElevationsDailyData(baseH, midH, summitH));
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [resortId]);

  const maxVal = SCALE_MAX;

  const secondWeekEmpty = useMemo(
    () => days.length >= 14 && days.slice(7).every((d) => d.mid.phase === 'nodata'),
    [days]
  );

  const ScaleCard = () => {
    const ticks = [
      { cm: 50, h: BAR_MAX_H },
      { cm: 25, h: BAR_MAX_H / 2 },
      { cm: 10, h: (10 / SCALE_MAX) * BAR_MAX_H },
    ];

    return (
      <View
        style={styles.scaleCard}
        onLayout={(e) => {
          const { width } = e.nativeEvent.layout;
          setGridLeft(12 + width + 2);
        }}
      >
        <View style={[
          styles.scaleAxisArea,
          barsTop !== null ? { marginTop: barsTop } : { marginTop: 0 },
        ]}>
          {ticks.map(({ cm, h }) => (
            <View key={cm} style={[styles.scaleTick, { bottom: h }]}>
              <Text style={styles.scaleTickLabel}>{cm}cm</Text>
              <View style={styles.scaleTickLine} />
            </View>
          ))}
          {/* axis line */}
          <View style={styles.scaleAxis} />
        </View>
      </View>
    );
  };

  const renderBar = (band: DayData['summit'], isNodata: boolean) => {
    if (isNodata || band.phase === 'nodata') {
      return (
        <View style={[styles.barSlot]}>
          <View style={[styles.bar, { height: 6, backgroundColor: NODATA_COLOR, opacity: 0.5 }]} />
        </View>
      );
    }
    const snowH = Math.max(3, (band.snow / maxVal) * BAR_MAX_H);
    const rainH = band.rain > 0 ? Math.max(3, (band.rain * 0.3 / maxVal) * BAR_MAX_H) : 0;
    const totalH = snowH + rainH;

    if (band.phase === 'clear') {
      return (
        <View style={styles.barSlot}>
          <View style={[styles.bar, { height: 3, backgroundColor: '#e2e8f0' }]} />
        </View>
      );
    }

    return (
      <View style={[styles.barSlot, { height: totalH }]}>
        {rainH > 0 && (
          <View style={[styles.bar, { height: rainH, backgroundColor: RAIN_COLOR, borderRadius: 2 }]} />
        )}
        {band.snow > 0 && (
          <View style={[styles.bar, { height: snowH, backgroundColor: SNOW_COLOR, borderRadius: 2 }]} />
        )}
      </View>
    );
  };

  const renderDay = ({ item, index }: { item: DayData; index: number }) => {
    const isNodata = item.isWeek2 && secondWeekEmpty;
    return (
      <View style={[styles.dayCard, item.isToday && styles.dayCardToday, item.isWeek2 && !isNodata && styles.dayCardWeek2]}>
        {/* Week 2 separator with scale reference */}
        {index === 7 && (
          <View style={styles.weekSepLine}>
            <View style={[styles.weekSepTick, { bottom: BAR_MAX_H }]}>
              <Text style={styles.weekSepTickLbl}>{SCALE_MAX}cm</Text>
            </View>
            <View style={[styles.weekSepTick, { bottom: BAR_MAX_H / 2 }]}>
              <Text style={styles.weekSepTickLbl}>{SCALE_MAX / 2}cm</Text>
            </View>
            <View style={[styles.weekSepTick, { bottom: (10 / SCALE_MAX) * BAR_MAX_H }]}>
              <Text style={styles.weekSepTickLbl}>10cm</Text>
            </View>
          </View>
        )}

        {/* Date labels */}
        <Text style={[styles.dayLbl, item.isToday && styles.dayLblToday]}>{item.dayLabel}</Text>
        <Text style={[styles.dateLbl, item.isToday && styles.dateLblToday]}>{item.dateLabel}</Text>

        {/* 3 bars: summit / mid / base */}
        <View
          ref={index === 0 ? barsRowRef : undefined}
          style={styles.barsRow}
          onLayout={index === 0 ? () => {
            if (barsTop !== null || !barsRowRef.current || !listWrapperRef.current) return;
            barsRowRef.current.measureLayout(
              listWrapperRef.current as any,
              (_x: number, y: number) => setBarsTop(y),
              () => {}
            );
          } : undefined}
        >
          {renderBar(item.base, isNodata)}
          {renderBar(item.mid, isNodata)}
          {renderBar(item.summit, isNodata)}
        </View>

        {/* Elevation micro-labels */}
        <View style={styles.elevMicroRow}>
          <Text style={styles.elevMicro}>B</Text>
          <Text style={styles.elevMicro}>M</Text>
          <Text style={styles.elevMicro}>C</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>PRONÓSTICO 2 SEMANAS</Text>
        <View style={styles.legend}>
          <View style={[styles.legendBar, { backgroundColor: SNOW_COLOR }]} />
          <Text style={styles.legendText}>nieve</Text>
          <View style={[styles.legendBar, { backgroundColor: RAIN_COLOR }]} />
          <Text style={styles.legendText}>lluvia</Text>
        </View>
      </View>

      {/* Sub-labels row */}
      <View style={styles.weekLabelsRow}>
        <Text style={styles.weekLbl}>← SEM 1</Text>
        <Text style={styles.weekLbl}>SEM 2 →</Text>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={SNOW_COLOR} />
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>No se pudo cargar</Text>
        </View>
      )}

      {!loading && !error && days.length > 0 && (
        <View ref={listWrapperRef} style={{ position: 'relative' }}>
          {/* Continuous horizontal grid lines — rendered once as overlay */}
          {barsTop !== null && [
            { key: '50', bottom: BAR_MAX_H },
            { key: '25', bottom: BAR_MAX_H / 2 },
            { key: '10', bottom: (10 / SCALE_MAX) * BAR_MAX_H },
          ].map(({ key, bottom }) => (
            <View
              key={key}
              pointerEvents="none"
              style={[
                styles.gridLine,
                { top: barsTop + (BAR_MAX_H + 6) - bottom, left: gridLeft },
              ]}
            />
          ))}
          <FlatList
            ref={listRef}
            horizontal
            data={days}
            keyExtractor={(item) => item.date}
            renderItem={renderDay}
            ListHeaderComponent={<ScaleCard />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            getItemLayout={(_, i) => ({ length: CARD_W, offset: i * CARD_W, index: i })}
          />
        </View>
      )}

      {secondWeekEmpty && !loading && (
        <Text style={styles.noDataNote}>Sem 2 sin datos · backend actualizando a 14 días</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingTop: 16,
    paddingBottom: 12,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendBar: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    marginRight: 4,
  },
  weekLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  weekLbl: {
    fontSize: 9,
    fontWeight: '700',
    color: '#cbd5e1',
    letterSpacing: 0.5,
  },
  center: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  listContent: {
    paddingHorizontal: 12,
  },
  dayCard: {
    width: CARD_W,
    alignItems: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  dayCardToday: {
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
  },
  dayCardWeek2: {
    opacity: 1,
  },
  weekSepLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  weekSepTick: {
    position: 'absolute',
    left: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekSepTickLbl: {
    fontSize: 7,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  scaleCard: {
    width: 36,
    alignItems: 'flex-end',
    paddingVertical: 4,
    paddingRight: 4,
    marginRight: 2,
  },
  scaleAxisArea: {
    width: 34,
    height: BAR_MAX_H + 6,
    position: 'relative',
    marginBottom: 4,
  },
  scaleAxis: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  scaleTick: {
    position: 'absolute',
    right: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scaleTickLabel: {
    fontSize: 7,
    fontWeight: '700',
    color: '#94a3b8',
    textAlign: 'right',
  },
  scaleTickLine: {
    width: 4,
    height: 1,
    backgroundColor: '#cbd5e1',
    marginLeft: 2,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#dde3ea',
    zIndex: 1,
  },
  dayLbl: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 1,
  },
  dayLblToday: {
    color: '#3b82f6',
    fontWeight: '800',
  },
  dateLbl: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  dateLblToday: {
    color: '#1d4ed8',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_MAX_H + 6,
    gap: BAR_GAP,
    marginBottom: 4,
  },
  barSlot: {
    width: BAR_W,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: BAR_W,
  },
  elevMicroRow: {
    flexDirection: 'row',
    gap: BAR_GAP,
  },
  elevMicro: {
    width: BAR_W,
    textAlign: 'center',
    fontSize: 7,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  noDataNote: {
    fontSize: 9,
    color: '#cbd5e1',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
  },
});
