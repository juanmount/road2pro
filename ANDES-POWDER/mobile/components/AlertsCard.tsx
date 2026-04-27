import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import alertsService, { Alert } from '../services/alertsService';

export default function AlertsCard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAlerts = async () => {
    try {
      const data = await alertsService.getAllAlerts();
      setAlerts(data);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAlerts();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cargando alertas...</Text>
      </View>
    );
  }

  if (alerts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.noAlertsContainer}>
          <Text style={styles.noAlertsIcon}>✅</Text>
          <Text style={styles.noAlertsText}>No hay alertas activas</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🚨</Text>
        <Text style={styles.headerText}>Alertas Meteorológicas</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{alerts.length}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.alertsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {alerts.map((alert) => (
          <View
            key={alert.id}
            style={[
              styles.alertCard,
              { borderLeftColor: alertsService.getSeverityColor(alert.severity) }
            ]}
          >
            <View style={styles.alertHeader}>
              <Text style={styles.alertIcon}>
                {alertsService.getTypeIcon(alert.type)}
              </Text>
              <View style={styles.alertTitleContainer}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertRegions}>
                  {alert.affectedRegions.join(', ')}
                </Text>
              </View>
              <Text style={styles.severityIcon}>
                {alertsService.getSeverityIcon(alert.severity)}
              </Text>
            </View>

            <Text style={styles.alertDescription}>{alert.description}</Text>

            <View style={styles.alertFooter}>
              <Text style={styles.alertDate}>
                📅 {formatDate(alert.startDate)}
              </Text>
              {alert.endDate !== alert.startDate && (
                <Text style={styles.alertDate}>
                  → {formatDate(alert.endDate)}
                </Text>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  badge: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  alertsList: {
    maxHeight: 400,
  },
  alertCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  alertTitleContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  alertRegions: {
    fontSize: 12,
    color: '#666',
  },
  severityIcon: {
    fontSize: 20,
  },
  alertDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 8,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertDate: {
    fontSize: 12,
    color: '#888',
  },
  loadingText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
  },
  noAlertsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noAlertsIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  noAlertsText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '500',
  },
});
