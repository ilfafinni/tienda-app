import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
  Keyboard,
} from "react-native";

import { searchProducts } from "../api";

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchProductsFn = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await searchProducts(query);
      if (!res.ok) {
        throw new Error(res.error || "Error buscando productos");
      }
      setResults(res.data);
    } catch (err) {
      setError(err.message || "No se pudo conectar con el servidor.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(searchProductsFn, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Buscar producto</Text>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Código, nombre o categoría (ej: PNT-001, polera)"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="characters"
          clearButtonMode="while-editing"
          returnKeyType="search"
          onSubmitEditing={searchProductsFn}
        />
        <TouchableOpacity style={styles.clearButton} onPress={() => setQuery("")}>
          <Text style={styles.clearText}>✕</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        )}

        {!loading && results.length === 0 && query.trim() !== "" && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No se encontraron productos</Text>
          </View>
        )}

        {results.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={styles.productCard}
            onPress={() => showProduct(p)}
          >
            <View style={styles.productInfo}>
              <Text style={styles.productCode}>{p.code}</Text>
              <Text style={styles.productName}>{p.name}</Text>
              <Text style={styles.productDetail}>
                {p.category} • {p.size || "-"} • {p.color || "-"}
              </Text>
              <Text style={styles.productZone}>
                {p.zone_name ? `📍 ${p.zone_name} (${p.zone_type})` : "Sin zona asignada"}
              </Text>
            </View>
            <Text style={styles.productPrice}>
              ${p.price ? p.price.toLocaleString() : "-"}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );

  function showProduct(p) {
    if (!p.zone_id) {
      Alert.alert("Sin ubicación", "Este producto no tiene una zona asignada en el mapa.");
      return;
    }
    navigation.navigate("Map");
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    marginRight: 12,
  },
  backText: {
    color: "#3b82f6",
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    flex: 1,
  },
  searchBar: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1e293b",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    marginRight: 8,
  },
  clearButton: {
    padding: 10,
  },
  clearText: {
    fontSize: 18,
    color: "#94a3b8",
  },
  errorContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  center: {
    paddingVertical: 40,
  },
  empty: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 16,
  },
  productCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  productInfo: {
    flex: 1,
  },
  productCode: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#3b82f6",
  },
  productName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 4,
  },
  productDetail: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  productZone: {
    fontSize: 13,
    fontWeight: "600",
    color: "#10b981",
    marginTop: 6,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1e293b",
    marginLeft: 12,
  },
});
