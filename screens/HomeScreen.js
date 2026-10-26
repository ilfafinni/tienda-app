import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";

import { checkServerHealth } from "../api";

export default function HomeScreen({ navigation }) {
  const [serverStatus, setServerStatus] = useState("checking"); // 'checking' | 'online' | 'offline'
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setChecking(true);
    const isOnline = await checkServerHealth();
    setServerStatus(isOnline ? "online" : "offline");
    setChecking(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Indicador de estado del servidor */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, serverStatus === "online" && styles.statusOnline, serverStatus === "offline" && styles.statusOffline]} />
        <Text style={styles.statusText}>
          {serverStatus === "online" ? "✓ Servidor conectado" : serverStatus === "offline" ? "✗ Servidor no disponible" : "Verificando conexión..."}
        </Text>
        {checking ? (
          <ActivityIndicator size="small" color="#3b82f6" style={styles.statusSpinner} />
        ) : (
          <TouchableOpacity style={styles.refreshButton} onPress={checkConnection}>
            <Text style={styles.refreshText}>↻</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>👕 Mi Tienda</Text>
        <Text style={styles.subtitle}>Mapa, búsqueda y escaneo de productos</Text>
      </View>

      <View style={styles.cards}>
        {serverStatus === "offline" && (
          <View style={styles.cardOffline}>
            <Text style={styles.cardOfflineTitle}>⚠ Servidor no disponible</Text>
            <Text style={styles.cardOfflineText}>
              No se puede conectar al servidor. Verifica tu conexión a internet o inténtalo de nuevo.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("Map")} disabled={serverStatus === "offline"}>
          <View style={[styles.cardIcon, serverStatus === "offline" && styles.cardDisabled]}>🗺️</View>
          <Text style={[styles.cardTitle, serverStatus === "offline" && styles.cardDisabledText]}>Mapa de la tienda</Text>
          <Text style={[styles.cardText, serverStatus === "offline" && styles.cardDisabledText]}>Ver dónde está cada producto</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("Scanner")} disabled={serverStatus === "offline"}>
          <View style={[styles.cardIcon, serverStatus === "offline" && styles.cardDisabled]}>📷</View>
          <Text style={[styles.cardTitle, serverStatus === "offline" && styles.cardDisabledText]}>Escanear producto</Text>
          <Text style={[styles.cardText, serverStatus === "offline" && styles.cardDisabledText]}>Usa la cámara para leer el código</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("Search")} disabled={serverStatus === "offline"}>
          <View style={[styles.cardIcon, serverStatus === "offline" && styles.cardDisabled]}>🔍</View>
          <Text style={[styles.cardTitle, serverStatus === "offline" && styles.cardDisabledText]}>Buscar producto</Text>
          <Text style={[styles.cardText, serverStatus === "offline" && styles.cardDisabledText]}>Por código, nombre o categoría</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingTop: 10,
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusOnline: {
    backgroundColor: "#10b981",
  },
  statusOffline: {
    backgroundColor: "#ef4444",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  statusSpinner: {
    marginLeft: 8,
  },
  refreshButton: {
    padding: 4,
  },
  refreshText: {
    fontSize: 16,
    color: "#3b82f6",
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1e293b",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 8,
    textAlign: "center",
  },
  cards: {
    gap: 16,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  cardDisabledText: {
    color: "#94a3b8",
  },
  cardText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  cardOffline: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  cardOfflineTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#dc2626",
    marginBottom: 4,
  },
  cardOfflineText: {
    fontSize: 14,
    color: "#7f1d1d",
  },
});
