import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from "react-native";

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>👕 Mi Tienda</Text>
        <Text style={styles.subtitle}>Mapa, búsqueda y escaneo de productos</Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("Map")}>
          <View style={styles.cardIcon}>🗺️</View>
          <Text style={styles.cardTitle}>Mapa de la tienda</Text>
          <Text style={styles.cardText}>Ver dónde está cada producto</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("Scanner")}>
          <View style={styles.cardIcon}>📷</View>
          <Text style={styles.cardTitle}>Escanear producto</Text>
          <Text style={styles.cardText}>Usa la cámara para leer el código</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("Search")}>
          <View style={styles.cardIcon}>🔍</View>
          <Text style={styles.cardTitle}>Buscar producto</Text>
          <Text style={styles.cardText}>Por código, nombre o categoría</Text>
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
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 32,
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
  cardIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
  },
  cardText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
});
