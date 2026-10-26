import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";

import {
  getProductByCode,
  registerScan,
} from "../api";

export default function ScannerScreen({ navigation }) {
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState(null);
  const [productResult, setProductResult] = useState(null);
  const [loadingResult, setLoadingResult] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") {
      setError("La cámara no está disponible en web.");
    }
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    setScanning(false);
    setScanned(true);
    setProductResult(null);
    setLoadingResult(true);

    try {
      // Buscar el producto por código en el servidor
      const res = await getProductByCode(data);
      if (!res.ok) {
        setError(`Producto "${data}" no encontrado en el sistema.`);
        setLoadingResult(false);
        return;
      }
      const product = res.data;
      setProductResult(product);

      // Registrar el escaneo en el servidor
      await registerScan(data, Platform.OS);
    } catch (err) {
      setError("Error al consultar el servidor.");
      console.error(err);
    } finally {
      setLoadingResult(false);
    }
  };

  const resumeScan = () => {
    setScanned(false);
    setScanning(true);
    setError(null);
    setProductResult(null);
  };

  const goToMap = () => {
    if (productResult?.zone_id != null) {
      navigation.navigate("Map");
    } else {
      Alert.alert("Sin ubicación", "Este producto no tiene zona asignada en el mapa.");
    }
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={resumeScan}>
            <Text style={styles.retryText}>Volver a escanear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Volver al menú</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (scanned && !loadingResult) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Producto escaneado</Text>
          {productResult ? (
            <View style={styles.productCard}>
              <Text style={styles.productCode}>{productResult.code}</Text>
              <Text style={styles.productName}>{productResult.name}</Text>
              <Text style={styles.productDetail}>
                {productResult.category} • {productResult.size || "-"} • {productResult.color || "-"}
              </Text>
              <Text style={styles.productZone}>
                📍 {productResult.zone_name || "Sin zona asignada"} ({productResult.zone_type || "-"})
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={goToMap}
                >
                  <Text style={styles.actionText}>Ver en mapa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={resumeScan}
                >
                  <Text style={styles.actionText}>Escanear otro</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.productCard}>
              <Text style={styles.productName}>Producto no registrado</Text>
              <TouchableOpacity style={styles.actionButton} onPress={resumeScan}>
                <Text style={styles.actionText}>Escanear otro</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (!scanning) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Preparando escáner...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.cameraContainer}>
        <BarCodeScanner
          onBarCodeScanned={scanning ? handleBarCodeScanned : undefined}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.overlay}>
          <View style={styles.frame}>
            <View style={styles.corner topLeft} />
            <View style={styles.corner topRight} />
            <View style={styles.corner bottomLeft} />
            <View style={styles.corner bottomRight} />
          </View>
          <Text style={styles.overlayText}>
            Apunta el código de barras o QR del producto
          </Text>
        </View>
        <TouchableOpacity style={styles.stopButton} onPress={() => setScanning(false)}>
          <Text style={styles.stopText}>Pausar escaneo</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  backButton: {
    marginTop: 8,
  },
  backText: {
    color: "#64748b",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#ffffff",
    fontSize: 16,
  },
  cameraContainer: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  frame: {
    width: 260,
    height: 200,
    borderWidth: 2,
    borderColor: "#3b82f6",
    borderRadius: 12,
  },
  corner: {
    position: "absolute",
    width: 36,
    height: 36,
    borderWidth: 4,
    borderColor: "#3b82f6",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  overlayText: {
    position: "absolute",
    bottom: 60,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  stopButton: {
    position: "absolute",
    bottom: 30,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  stopText: {
    color: "#ef4444",
    fontWeight: "bold",
    fontSize: 14,
  },
  resultContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 20,
  },
  productCard: {
    backgroundColor: "#ffffff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    width: "85%",
  },
  productCode: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3b82f6",
    marginBottom: 8,
  },
  productName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 8,
  },
  productDetail: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 12,
  },
  productZone: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10b981",
    textAlign: "center",
    marginBottom: 20,
  },
  actions: {
    gap: 12,
    width: "100%",
  },
  actionButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  actionText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 15,
  },
});
