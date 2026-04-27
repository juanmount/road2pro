import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import alertsService, { Alert } from '../services/alertsService';

export default function AlertsBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const slideAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (alerts.length > 0 && !dismissed) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    }
  }, [alerts, dismissed]);

  const loadAlerts = async () => {
    try {
      const data = await alertsService.getAllAlerts();
      setAlerts(data);
      if (data.length > 0) {
        setDismissed(false);
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setDismissed(true);
      setExpanded(false);
    });
  };

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  if (alerts.length === 0 || dismissed) {
    return null;
  }

  const primaryAlert = alerts[0];
  const severityColor = alertsService.getSeverityColor(primaryAlert.severity);
  
  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'wind': return 'flag';
      case 'rain': return 'rainy';
      case 'snow': return 'snow';
      case 'storm': return 'thunderstorm';
      default: return 'warning';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'low': return 'ALERTA AMARILLA';
      case 'moderate': return 'ALERTA NARANJA';
      case 'high': return 'ALERTA ROJA';
      case 'extreme': return 'ALERTA ROJA';
      default: return 'ALERTA';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'low': return '#fbbf24'; // Yellow
      case 'moderate': return '#f97316'; // Orange
      case 'high': return '#dc2626'; // Red
      case 'extreme': return '#991b1b'; // Dark red
      default: return '#6b7280';
    }
  };

  const getAlertMetrics = (alert: Alert): string | null => {
    // Extract specific metrics from description
    const desc = alert.description.toLowerCase();
    
    if (alert.type === 'wind') {
      // Extract wind speed from description
      const windMatch = desc.match(/(\d+)\s*km\/h/);
      const gustMatch = desc.match(/ráfagas de (\d+)\s*km\/h/);
      if (gustMatch) {
        return `Ráfagas: ${gustMatch[1]} km/h`;
      } else if (windMatch) {
        return `Viento: ${windMatch[1]} km/h`;
      }
    }
    
    if (alert.type === 'snow') {
      // Extract snow amount
      const snowMatch = desc.match(/(\d+)\s*cm/);
      if (snowMatch) {
        return `Acumulación: ${snowMatch[1]} cm`;
      }
    }
    
    if (alert.type === 'rain') {
      // Extract rain amount
      const rainMatch = desc.match(/(\d+)\s*mm/);
      if (rainMatch) {
        return `Precipitación: ${rainMatch[1]} mm`;
      }
    }
    
    return null;
  };

  const getAlertGradient = (type: string, severity: string) => {
    // Winter-themed gradients based on alert type
    switch (type) {
      case 'wind':
        // Steel blue to ice blue (viento invernal)
        return severity === 'extreme' 
          ? ['#1e3a5f', '#2563eb'] // Darker for extreme
          : ['#334155', '#475569']; // Steel gray-blue
      
      case 'snow':
        // Ice white to powder blue (nieve)
        return severity === 'high'
          ? ['#0c4a6e', '#0ea5e9'] // Deep ice blue
          : ['#1e40af', '#3b82f6']; // Powder blue
      
      case 'rain':
        // Storm gray to dark blue (lluvia/tormenta)
        return ['#1e293b', '#334155'];
      
      case 'storm':
        // Dark storm clouds (tormenta severa)
        return ['#0f172a', '#1e293b'];
      
      default:
        // Generic winter gray
        return ['#374151', '#4b5563'];
    }
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY }] }
      ]}
    >
      <TouchableOpacity
        style={styles.banner}
        onPress={toggleExpanded}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={getAlertGradient(primaryAlert.type, primaryAlert.severity)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <View style={styles.overlay}>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons 
                  name={getAlertIcon(primaryAlert.type) as any} 
                  size={24} 
                  color="#fff" 
                />
              </View>
              
              <View style={styles.content}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {primaryAlert.title.toUpperCase()}
                  </Text>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityBadgeColor(primaryAlert.severity) }]}>
                    <Text style={styles.severityText}>{getSeverityLabel(primaryAlert.severity)}</Text>
                  </View>
                </View>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {primaryAlert.affectedRegions.join(' • ')}
                </Text>
                {getAlertMetrics(primaryAlert) && (
                  <Text style={styles.metrics}>
                    {getAlertMetrics(primaryAlert)}
                  </Text>
                )}
              </View>

              {alerts.length > 1 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>+{alerts.length - 1}</Text>
                </View>
              )}

              <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>

            {expanded && (
              <View style={styles.expandedContent}>
                <View style={styles.divider} />
                <Text style={styles.description}>{primaryAlert.description}</Text>
                
                {alerts.length > 1 && (
                  <View style={styles.moreAlerts}>
                    <Text style={styles.moreAlertsTitle}>
                      ALERTAS ADICIONALES ({alerts.length - 1})
                    </Text>
                    {(alerts.length <= 3 ? alerts.slice(1) : alerts.slice(1, 3)).map((alert) => (
                      <View key={alert.id} style={styles.miniAlert}>
                        <Ionicons 
                          name={getAlertIcon(alert.type) as any} 
                          size={20} 
                          color="rgba(255,255,255,0.95)" 
                        />
                        <View style={styles.miniAlertContent}>
                          <Text style={styles.miniAlertText} numberOfLines={1}>
                            {alert.title}
                          </Text>
                          {getAlertMetrics(alert) && (
                            <Text style={styles.miniAlertMetrics}>
                              {getAlertMetrics(alert)}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                    {alerts.length > 3 && (
                      <Text style={styles.moreText}>
                        Ver todas en la pestaña Alertas
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  banner: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    borderRadius: 8,
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    marginBottom: 2,
  },
  metrics: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginTop: 2,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 12,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 19,
    fontWeight: '400',
  },
  moreAlerts: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  moreAlertsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  miniAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    marginBottom: 8,
  },
  miniAlertContent: {
    flex: 1,
    marginLeft: 10,
  },
  miniAlertText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
    marginBottom: 2,
  },
  miniAlertMetrics: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
  },
  moreText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    marginTop: 6,
    textAlign: 'center',
  },
});
