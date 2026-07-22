import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, Image, ActivityIndicator, Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');

interface Camera {
  id: string;
  name: string;
  zone: string;
  type: 'image' | 'webview';
  imageUrl?: string;
  webUrl?: string;
  cleanPage?: boolean;
}

interface ResortConfig {
  cameras: Camera[];
}

const RESORT_CAMERAS: Record<string, ResortConfig> = {
  'cerro-catedral': {
    cameras: [
      { id: 'cam001', name: 'Punta Princesa', zone: 'Alta Montaña', type: 'webview', webUrl: 'https://g3.ipcamlive.com/player/player.php?alias=6a2c31a02eaf9&skin=white&autoplay=1&disabledownloadbutton=1' },
    ],
  },
  'cerro-castor': {
    cameras: [],
  },
  'cerro-chapelco': {
    cameras: [
      { id: 'cam016', name: 'Mocho Inferior',   zone: 'Base',         type: 'image', imageUrl: 'https://varitech.ar/cameras/cam016/latest.jpg' },
      { id: 'cam017', name: 'Lift Inferior',     zone: 'Base',         type: 'image', imageUrl: 'https://varitech.ar/cameras/cam017/latest.jpg' },
      { id: 'cam018', name: 'Rancho Superior',   zone: 'Alta Montaña', type: 'image', imageUrl: 'https://varitech.ar/cameras/cam018/latest.jpg' },
    ],
  },
  'las-lenas': {
    cameras: [
      { id: 'lenas', name: 'Cámaras en Vivo', zone: 'Montaña', type: 'webview', webUrl: 'https://laslenas.com/camara-en-vivo/', cleanPage: true },
    ],
  },
  'cerro-bayo': {
    cameras: [
      { id: 'bayo-web', name: 'Cámaras en Vivo', zone: 'Montaña', type: 'webview', webUrl: 'https://www.cerrobayo.com.ar/montana/camara/', cleanPage: true },
    ],
  },
  'la-hoya': {
    cameras: [
      { id: 'cam031', name: 'Sector Principiantes', zone: 'Base',         type: 'image', imageUrl: 'https://varitech.ar/cameras/cam031/latest.jpg' },
      { id: 'cam032', name: 'Plateau',              zone: 'Alta Montaña', type: 'image', imageUrl: 'https://varitech.ar/cameras/cam032/latest.jpg' },
    ],
  },
  'caviahue': {
    cameras: [
      { id: 'caviahue-web', name: 'Cámara en Vivo', zone: 'Montaña', type: 'webview', webUrl: 'https://www.caviahue.com/camara-web', cleanPage: true },
    ],
  },
};

const ZONE_COLORS: Record<string, string> = {
  'Alta Montaña':  '#8b5cf6',
  'Media Montaña': '#0ea5e9',
  'Base':          '#10b981',
  'Vistas':        '#f59e0b',
  'Montaña':       '#38bdf8',
};

function zoneColor(zone: string) {
  return ZONE_COLORS[zone] ?? '#38bdf8';
}

interface WebcamsModalProps {
  visible: boolean;
  onClose: () => void;
  resortName: string;
  resortSlug?: string;
}

const REFRESH_MS = 30_000;

const CLEAN_PAGE_JS = `
(function() {
  const s = document.createElement('style');
  s.textContent = [
    'header, nav, footer, .header, .footer, .navbar, .nav, .menu,',
    '#header, #footer, #nav, #menu, .site-header, .site-footer,',
    '.navigation, .main-navigation, .top-bar, .cookie-notice,',
    '[class*="cookie"], [class*="gdpr"], [class*="banner"],',
    '[class*="popup"], [id*="cookie"], [id*="gdpr"]',
    '{ display: none !important; }',
    'html, body { margin: 0 !important; padding: 0 !important; }',
    'main, .main, #main { margin-top: 0 !important; padding-top: 0 !important; }',
  ].join(' ');
  document.head.appendChild(s);
})();
true;
`;

export function WebcamsModal({ visible, onClose, resortName, resortSlug }: WebcamsModalProps) {
  const [selected, setSelected] = useState<Camera | null>(null);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [imgLoading, setImgLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const slug = resortSlug ?? 'cerro-catedral';
  const config: ResortConfig = RESORT_CAMERAS[slug] ?? RESORT_CAMERAS['cerro-catedral'];

  useEffect(() => {
    if (!visible) { setSelected(null); return; }
  }, [visible]);

  useEffect(() => {
    if (!visible || !selected || selected.type !== 'image') return;
    const id = setInterval(() => {
      setRefreshKey(Date.now());
      setLastUpdated(new Date());
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [visible, selected]);

  const selectCamera = (cam: Camera) => {
    setSelected(cam);
    setRefreshKey(Date.now());
    setImgLoading(true);
    setLastUpdated(new Date());
  };

  const manualRefresh = () => {
    setRefreshKey(Date.now());
    setImgLoading(true);
    setLastUpdated(new Date());
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={selected ? () => setSelected(null) : onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={selected ? () => setSelected(null) : onClose}
            >
              <Ionicons
                name={selected ? 'arrow-back' : 'close'}
                size={22}
                color="#cbd5e1"
              />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {selected ? selected.name : 'Webcams en Vivo'}
              </Text>
              <Text style={styles.headerSub}>{resortName}</Text>
            </View>

            {selected?.type === 'image' ? (
              <TouchableOpacity style={styles.headerBtn} onPress={manualRefresh}>
                <Ionicons name="refresh" size={22} color="#38bdf8" />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerBtn} />
            )}
          </View>

          {/* ── Camera View ── */}
          {selected ? (
            <View style={styles.cameraView}>
              {selected.type === 'image' ? (
                <>
                  <View style={styles.imgWrapper}>
                    <Image
                      key={refreshKey}
                      source={{ uri: `${selected.imageUrl}?t=${refreshKey}` }}
                      style={styles.camImage}
                      resizeMode="cover"
                      onLoadStart={() => setImgLoading(true)}
                      onLoadEnd={() => setImgLoading(false)}
                      onError={() => setImgLoading(false)}
                    />
                    {imgLoading && (
                      <View style={styles.imgOverlay}>
                        <ActivityIndicator size="large" color="#38bdf8" />
                        <Text style={styles.loadingTxt}>Cargando imagen...</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.imgFooter}>
                    <View style={styles.livePill}>
                      <View style={styles.liveDot} />
                      <Text style={styles.liveTxt}>EN VIVO</Text>
                    </View>
                    {lastUpdated && (
                      <Text style={styles.updatedTxt}>
                        Actualizado {formatTime(lastUpdated)} · cada 5 min
                      </Text>
                    )}
                  </View>
                </>
              ) : (
                <WebView
                  source={{ uri: selected.webUrl! }}
                  style={styles.webview}
                  startInLoadingState
                  injectedJavaScript={selected.cleanPage ? CLEAN_PAGE_JS : undefined}
                  renderLoading={() => (
                    <View style={styles.imgOverlay}>
                      <ActivityIndicator size="large" color="#38bdf8" />
                      <Text style={styles.loadingTxt}>Conectando cámara...</Text>
                    </View>
                  )}
                />
              )}
            </View>
          ) : (

          /* ── Camera List ── */
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>
              {config.cameras.length} CÁMARA{config.cameras.length !== 1 ? 'S' : ''} DISPONIBLE{config.cameras.length !== 1 ? 'S' : ''}
            </Text>
            <View style={styles.disclaimer}>
              <Ionicons name="alert-circle-outline" size={13} color="#f59e0b" />
              <Text style={styles.disclaimerTxt}>
                Algunas cámaras pueden no estar disponibles fuera de temporada o por condiciones climáticas
              </Text>
            </View>

            {config.cameras.map((cam) => {
              const color = zoneColor(cam.zone);
              return (
                <TouchableOpacity
                  key={cam.id}
                  style={styles.camCard}
                  onPress={() => selectCamera(cam)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.camIcon, { backgroundColor: `${color}22` }]}>
                    <Ionicons
                      name={cam.type === 'image' ? 'camera' : 'logo-youtube'}
                      size={22}
                      color={color}
                    />
                  </View>
                  <View style={styles.camInfo}>
                    <Text style={styles.camName}>{cam.name}</Text>
                    <View style={styles.camMeta}>
                      <View style={[styles.zonePill, { backgroundColor: `${color}22` }]}>
                        <Text style={[styles.zoneLabel, { color }]}>{cam.zone}</Text>
                      </View>
                      <Text style={styles.camType}>
                        {cam.type === 'image' ? '· cada 5 min' : '· stream'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.liveChip}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveTxt}>EN VIVO</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#475569" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              );
            })}

            <View style={styles.sourceRow}>
              <Ionicons name="information-circle-outline" size={14} color="#475569" />
              <Text style={styles.sourceTxt}>
                {slug === 'cerro-catedral'
                  ? 'Imágenes via Varitech · Bariloche'
                  : 'Cámaras oficiales del centro'}
              </Text>
            </View>
          </ScrollView>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 4,
    paddingBottom: 36,
    height: '85%',
    overflow: 'hidden',
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(56,189,248,0.12)',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },

  /* Camera view */
  cameraView: {
    flex: 1,
  },
  imgWrapper: {
    width: SCREEN_W,
    aspectRatio: 16 / 9,
    backgroundColor: '#1e293b',
  },
  camImage: {
    width: '100%',
    height: '100%',
  },
  imgOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.8)',
    gap: 12,
  },
  loadingTxt: {
    color: '#94a3b8',
    fontSize: 13,
  },
  imgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef444430',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
    borderColor: '#ef444460',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  liveTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ef4444',
    letterSpacing: 0.8,
  },
  updatedTxt: {
    fontSize: 12,
    color: '#64748b',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0f172a',
  },

  /* List */
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  camCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.08)',
  },
  camIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  camInfo: {
    flex: 1,
    gap: 5,
  },
  camName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  camMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zonePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  zoneLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  camType: {
    fontSize: 11,
    color: '#475569',
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef444420',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#ef444440',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  disclaimerTxt: {
    flex: 1,
    fontSize: 11,
    color: '#f59e0b',
    lineHeight: 16,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  sourceTxt: {
    fontSize: 11,
    color: '#475569',
  },
});
