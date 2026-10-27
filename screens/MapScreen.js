import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native";
import { Svg, Rect, Text as SvgText, Circle, Path, G, Defs, Pattern } from "react-native-svg";

import {
  getZones,
  getProducts,
  createZone,
  updateZone,
  deleteZone,
  assignProductToZone,
} from "../api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAP_WIDTH = 1000;
const MAP_HEIGHT = 800;
const MAP_VIEWBOX = `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`;

const TYPE_LABELS = {
  floorstand: "Perchero / Floorstand",
  mesa: "Mesa",
  pared: "Pared",
  estante: "Estante",
  probadores: "Probadores",
  caja: "Caja",
  entrada: "Entrada",
};

const FLOOR_LABELS = {
  all: "Planta completa",
  1: "Piso 1",
  2: "Piso 2",
  3: "Piso 3",
};

export default function MapScreen({ navigation, route }) {
  const { initialZoneId, initialProductCode } = route.params || {};

  const [zones, setZones] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editMode, setEditMode] = useState("move"); // "move" | "draw"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeFloor, setActiveFloor] = useState("all");
  const [focusZoneId, setFocusZoneId] = useState(null);

  // Drawing state
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [drawCurrent, setDrawCurrent] = useState(null);

  // Modal: Add / Edit Zone
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [zoneFormData, setZoneFormData] = useState({
    id: null,
    name: "",
    type: "floorstand",
    x: 200,
    y: 200,
    w: 160,
    h: 120,
    color: "#3b82f6",
    floor: 1,
  });

  // Modal: Change Zone of Product
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignProductCode, setAssignProductCode] = useState("");
  const [assignToZoneId, setAssignToZoneId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [zRes, pRes] = await Promise.all([getZones(), getProducts()]);

      if (!zRes.ok || !pRes.ok) {
        throw new Error(zRes.error || pRes.error || "Error cargando datos del servidor");
      }

      setZones(zRes.data);
      setProducts(pRes.data);

      if (initialZoneId) {
        const zone = zRes.data.find((z) => z.id == initialZoneId);
        if (zone) {
          setSelectedZone(zone);
          setActiveFloor(zone.floor || 1);
          setFocusZoneId(zone.id);
        }
      } else if (initialProductCode) {
        const product = pRes.data.find((p) => p.code === initialProductCode);
        if (product && product.zone_id) {
          const zone = zRes.data.find((z) => z.id == product.zone_id);
          if (zone) {
            setSelectedZone(zone);
            setActiveFloor(zone.floor || 1);
            setFocusZoneId(zone.id);
          }
        }
      }
    } catch (err) {
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const visibleZones = activeFloor === "all"
    ? zones
    : zones.filter((z) => (z.floor || 1) === Number(activeFloor));

  const productsInZone = (zoneId) =>
    products.filter((p) => p.zone_id === zoneId);

  const zoneColor = (type) => {
    switch (type) {
      case "floorstand": return "#3b82f6";
      case "mesa": return "#10b981";
      case "pared": return "#6366f1";
      case "estante": return "#ef4444";
      case "probadores": return "#f59e0b";
      case "caja": return "#06b6d4";
      case "entrada": return "#94a3b8";
      default: return "#8b5cf6";
    }
  };

  // Convert touch event coordinates to SVG viewBox coords
  const screenToViewBox = useCallback((evt) => {
    const { locationX, locationY } = evt.nativeEvent;
    // Map container size
    const mapW = SCREEN_WIDTH;
    const mapH = SCREEN_HEIGHT * 0.65;
    const x = Math.max(0, Math.min(MAP_WIDTH, Math.round((locationX / mapW) * MAP_WIDTH)));
    const y = Math.max(0, Math.min(MAP_HEIGHT, Math.round((locationY / mapH) * MAP_HEIGHT)));
    return { x, y };
  }, []);

  const handleMapTouchStart = useCallback(
    (evt) => {
      if (!editing) return;
      const pt = screenToViewBox(evt);

      if (editMode === "draw") {
        setDrawing(true);
        setDrawStart(pt);
        setDrawCurrent(pt);
      }
    },
    [editing, editMode, screenToViewBox]
  );

  const handleMapTouchMove = useCallback(
    (evt) => {
      if (!editing || !drawing || editMode !== "draw") return;
      const pt = screenToViewBox(evt);
      setDrawCurrent(pt);
    },
    [editing, drawing, editMode, screenToViewBox]
  );

  const handleMapTouchEnd = useCallback(
    (evt) => {
      if (!editing || !drawing || editMode !== "draw" || !drawStart) {
        setDrawing(false);
        return;
      }

      const pt = screenToViewBox(evt);
      const x = Math.min(drawStart.x, pt.x);
      const y = Math.min(drawStart.y, pt.y);
      const w = Math.abs(pt.x - drawStart.x);
      const h = Math.abs(pt.y - drawStart.y);

      setDrawing(false);
      setDrawStart(null);
      setDrawCurrent(null);

      if (w >= 30 && h >= 30) {
        // Open modal to configure new zone with drawn dimensions
        setZoneFormData({
          id: null,
          name: "",
          type: "floorstand",
          x,
          y,
          w,
          h,
          color: "#3b82f6",
          floor: activeFloor === "all" ? 1 : Number(activeFloor),
        });
        setShowZoneModal(true);
      }
    },
    [editing, drawing, editMode, drawStart, activeFloor, screenToViewBox]
  );

  const handleZonePress = (zone) => {
    if (editing) {
      // Edit zone
      setZoneFormData({
        id: zone.id,
        name: zone.name,
        type: zone.type,
        x: zone.x,
        y: zone.y,
        w: zone.w,
        h: zone.h,
        color: zone.color || zoneColor(zone.type),
        floor: zone.floor || 1,
      });
      setShowZoneModal(true);
    } else {
      setSelectedZone(zone);
      setFocusZoneId(zone.id);
    }
  };

  const handleSaveZone = async () => {
    if (!zoneFormData.name.trim()) {
      Alert.alert("Campo requerido", "Por favor ingresa un nombre para el mueble.");
      return;
    }

    try {
      if (zoneFormData.id) {
        // Update
        const res = await updateZone(zoneFormData.id, zoneFormData);
        if (!res.ok) throw new Error(res.error || "Error al actualizar");
        setZones((prev) =>
          prev.map((z) => (z.id === zoneFormData.id ? { ...z, ...zoneFormData } : z))
        );
        if (selectedZone?.id === zoneFormData.id) {
          setSelectedZone({ ...selectedZone, ...zoneFormData });
        }
      } else {
        // Create
        const res = await createZone(zoneFormData);
        if (!res.ok) throw new Error(res.error || "Error al crear");
        const created = res.data || { ...zoneFormData, id: Date.now() };
        setZones((prev) => [...prev, created]);
        setSelectedZone(created);
        setFocusZoneId(created.id);
      }
      setShowZoneModal(false);
    } catch (err) {
      Alert.alert("Error", err.message || "No se pudo guardar el mueble.");
    }
  };

  const handleDeleteZone = () => {
    if (!zoneFormData.id) return;
    Alert.alert(
      "Eliminar mueble",
      `¿Deseas eliminar "${zoneFormData.name}"? Los productos quedarán desasignados.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deleteZone(zoneFormData.id);
              if (!res.ok) throw new Error(res.error || "Error al eliminar");
              setZones((prev) => prev.filter((z) => z.id !== zoneFormData.id));
              setProducts((prev) =>
                prev.map((p) => (p.zone_id === zoneFormData.id ? { ...p, zone_id: null } : p))
              );
              if (selectedZone?.id === zoneFormData.id) setSelectedZone(null);
              setShowZoneModal(false);
            } catch (err) {
              Alert.alert("Error", err.message || "No se pudo eliminar.");
            }
          },
        },
      ]
    );
  };

  const openAssignModal = (productCode, currentZoneId) => {
    setAssignProductCode(productCode);
    const otherZones = zones.filter((z) => z.id !== currentZoneId);
    setAssignToZoneId(otherZones.length > 0 ? otherZones[0].id : null);
    setShowAssignModal(true);
  };

  const confirmAssignProduct = async () => {
    if (!assignProductCode || assignToZoneId === null) return;
    try {
      const res = await assignProductToZone(assignProductCode, assignToZoneId);
      if (!res.ok) throw new Error(res.error || "Error al asignar producto");

      const targetZone = zones.find((z) => z.id === assignToZoneId);
      setProducts((prev) =>
        prev.map((p) =>
          p.code === assignProductCode
            ? {
                ...p,
                zone_id: assignToZoneId,
                zone_name: targetZone?.name || null,
                zone_type: targetZone?.type || null,
              }
            : p
        )
      );

      setShowAssignModal(false);
      setAssignProductCode("");
    } catch (err) {
      Alert.alert("Error", err.message || "No se pudo reasignar el producto.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Cargando mapa de tienda...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const selectedZoneProducts = selectedZone ? productsInZone(selectedZone.id) : [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.mapTitle}>Plano de la Tienda</Text>
        <TouchableOpacity
          style={editing ? styles.doneButton : styles.editButton}
          onPress={() => setEditing(!editing)}
        >
          <Text style={editing ? styles.doneText : styles.editText}>
            {editing ? "✓ Listo" : "✏ Editar"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* SELECTOR DE PISOS */}
      <View style={styles.floorBar}>
        {Object.entries(FLOOR_LABELS).map(([floor, label]) => (
          <TouchableOpacity
            key={floor}
            style={[styles.floorChip, activeFloor === floor && styles.floorChipActive]}
            onPress={() => setActiveFloor(floor)}
          >
            <Text
              style={[styles.floorChipText, activeFloor === floor && styles.floorChipTextActive]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* BARRA DE MODO EDICIÓN */}
      {editing && (
        <View style={styles.editToolbar}>
          <TouchableOpacity
            style={[styles.editToolBtn, editMode === "move" && styles.editToolBtnActive]}
            onPress={() => setEditMode("move")}
          >
            <Text style={styles.editToolBtnText}>✋ Tocar / Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editToolBtn, editMode === "draw" && styles.editToolBtnActive]}
            onPress={() => setEditMode("draw")}
          >
            <Text style={styles.editToolBtnText}>📐 Dibujar Cuadro</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.newZoneBtn}
            onPress={() => {
              setZoneFormData({
                id: null,
                name: "",
                type: "floorstand",
                x: 200,
                y: 200,
                w: 160,
                h: 120,
                color: "#3b82f6",
                floor: activeFloor === "all" ? 1 : Number(activeFloor),
              });
              setShowZoneModal(true);
            }}
          >
            <Text style={styles.newZoneBtnText}>➕ Crear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CONTENEDOR DEL MAPA (GRANDE, FLEX: 1) */}
      <View
        style={styles.mapContainer}
        onTouchStart={handleMapTouchStart}
        onTouchMove={handleMapTouchMove}
        onTouchEnd={handleMapTouchEnd}
      >
        <Svg width="100%" height="100%" viewBox={MAP_VIEWBOX} style={styles.svg}>
          <Defs>
            <Pattern id="storeGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <Path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.8" />
            </Pattern>
          </Defs>
          <Rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="url(#storeGrid)" />

          {/* Zonas y Muebles */}
          {visibleZones.map((zone) => {
            const isSelected = selectedZone?.id === zone.id;
            const isFocused = focusZoneId === zone.id;
            const zoneProds = productsInZone(zone.id);
            const fillCol = zone.color || zoneColor(zone.type);

            return (
              <G key={zone.id} onPress={() => handleZonePress(zone)}>
                {/* Resaltado cuando está seleccionado o enfocado desde el escáner */}
                {(isSelected || isFocused) && (
                  <Rect
                    x={zone.x - 6}
                    y={zone.y - 6}
                    width={zone.w + 12}
                    height={zone.h + 12}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={4}
                    rx={14}
                    ry={14}
                    strokeDasharray="6,4"
                  />
                )}

                <Rect
                  x={zone.x}
                  y={zone.y}
                  width={zone.w}
                  height={zone.h}
                  fill={fillCol}
                  opacity={isSelected ? 0.95 : 0.82}
                  stroke="#1e293b"
                  strokeWidth={isSelected ? 3 : 1.5}
                  rx={10}
                  ry={10}
                />

                <SvgText
                  x={zone.x + zone.w / 2}
                  y={zone.y + zone.h / 2 - 8}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontWeight="bold"
                  fontSize={13}
                >
                  {zone.name}
                </SvgText>

                <SvgText
                  x={zone.x + zone.w / 2}
                  y={zone.y + zone.h / 2 + 12}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={10}
                  opacity={0.9}
                >
                  {zoneProds.length} {zoneProds.length === 1 ? "prenda" : "prendas"}
                </SvgText>

                {/* Badge con piso si estamos en planta completa */}
                {activeFloor === "all" && zone.floor > 1 && (
                  <G>
                    <Rect
                      x={zone.x + 6}
                      y={zone.y + 6}
                      width={32}
                      height={18}
                      fill="#0f172a"
                      opacity={0.8}
                      rx={4}
                    />
                    <SvgText
                      x={zone.x + 22}
                      y={zone.y + 19}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize={9}
                      fontWeight="bold"
                    >
                      P{zone.floor}
                    </SvgText>
                  </G>
                )}
              </G>
            );
          })}

          {/* Preview del rectángulo dibujándose */}
          {drawing && drawStart && drawCurrent && (
            <Rect
              x={Math.min(drawStart.x, drawCurrent.x)}
              y={Math.min(drawStart.y, drawCurrent.y)}
              width={Math.abs(drawCurrent.x - drawStart.x)}
              height={Math.abs(drawCurrent.y - drawStart.y)}
              fill="rgba(168, 85, 247, 0.25)"
              stroke="#a855f7"
              strokeWidth={3}
              strokeDasharray="6,4"
              rx={8}
            />
          )}
        </Svg>
      </View>

      {/* PANEL INFERIOR: DETALLE DEL MUEBLE SELECCIONADO */}
      {selectedZone && (
        <View style={styles.bottomPanel}>
          <View style={styles.panelHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>{selectedZone.name}</Text>
              <Text style={styles.panelSubtitle}>
                {TYPE_LABELS[selectedZone.type] || selectedZone.type} • Piso {selectedZone.floor || 1} • {selectedZoneProducts.length} prenda(s)
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedZone(null)}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {selectedZoneProducts.length === 0 ? (
              <Text style={styles.emptyZone}>No hay productos asignados en este mueble.</Text>
            ) : (
              selectedZoneProducts.map((p) => (
                <View key={p.id} style={styles.productRow}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productCode}>{p.code}</Text>
                    <Text style={styles.productName}>{p.name}</Text>
                    <Text style={styles.productDetail}>
                      {p.category} • {p.size || "-"} • {p.color || "-"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.changeZoneButton}
                    onPress={() => openAssignModal(p.code, selectedZone.id)}
                  >
                    <Text style={styles.changeZoneButtonText}>Cambiar</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* MODAL: CAMBIAR MUEBLE A PRODUCTO */}
      <Modal visible={showAssignModal} transparent animationType="slide" onRequestClose={() => setShowAssignModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reasignar Mueble</Text>
            <Text style={styles.modalLabel}>Producto: {assignProductCode}</Text>
            <Text style={styles.modalLabelSmall}>Selecciona el nuevo mueble:</Text>

            <ScrollView style={{ maxHeight: 240, marginVertical: 8 }}>
              {zones.map((z) => (
                <TouchableOpacity
                  key={z.id}
                  style={[styles.typeChip, assignToZoneId === z.id && styles.typeChipActive]}
                  onPress={() => setAssignToZoneId(z.id)}
                >
                  <Text style={[styles.typeChipText, assignToZoneId === z.id && styles.typeChipTextActive]}>
                    {z.name} (Piso {z.floor || 1})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAssignModal(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={confirmAssignProduct}>
                <Text style={styles.modalSaveText}>Asignar Mueble</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: CREAR / EDITAR MUEBLE */}
      <Modal visible={showZoneModal} transparent animationType="slide" onRequestClose={() => setShowZoneModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {zoneFormData.id ? "Editar Mueble" : "Nuevo Mueble"}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabelSmall}>Nombre del Mueble</Text>
              <TextInput
                style={styles.modalInput}
                value={zoneFormData.name}
                onChangeText={(t) => setZoneFormData({ ...zoneFormData, name: t })}
                placeholder="Ej: Perchero Poleras"
              />

              <Text style={styles.modalLabelSmall}>Tipo de Mueble</Text>
              <View style={styles.typeSelector}>
                {Object.entries(TYPE_LABELS).map(([tKey, tLabel]) => (
                  <TouchableOpacity
                    key={tKey}
                    style={[styles.typeChip, zoneFormData.type === tKey && styles.typeChipActive]}
                    onPress={() => setZoneFormData({ ...zoneFormData, type: tKey })}
                  >
                    <Text style={[styles.typeChipText, zoneFormData.type === tKey && styles.typeChipTextActive]}>
                      {tLabel}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabelSmall}>Piso</Text>
              <View style={styles.floorRow}>
                {[1, 2, 3].map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.floorChip, zoneFormData.floor === f && styles.floorChipActive]}
                    onPress={() => setZoneFormData({ ...zoneFormData, floor: f })}
                  >
                    <Text style={[styles.floorChipText, zoneFormData.floor === f && styles.floorChipTextActive]}>
                      Piso {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              {zoneFormData.id && (
                <TouchableOpacity style={styles.modalDelete} onPress={handleDeleteZone}>
                  <Text style={styles.modalDeleteText}>Eliminar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowZoneModal(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveZone}>
                <Text style={styles.modalSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748b",
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
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    color: "#2563eb",
    fontSize: 15,
    fontWeight: "600",
  },
  mapTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#0f172a",
  },
  editButton: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  editText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 13,
  },
  doneButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  doneText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 13,
  },
  floorBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  floorChip: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
  },
  floorChipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  floorChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  floorChipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  editToolbar: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    padding: 8,
    gap: 8,
  },
  editToolBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
  },
  editToolBtnActive: {
    backgroundColor: "#f59e0b",
  },
  editToolBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  newZoneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#10b981",
  },
  newZoneBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
  mapContainer: {
    flex: 1,
    width: "100%",
    backgroundColor: "#f8fafc",
  },
  svg: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    maxHeight: "50%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
  },
  panelSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "bold",
  },
  scrollContent: {
    gap: 8,
    paddingBottom: 16,
  },
  emptyZone: {
    color: "#94a3b8",
    textAlign: "center",
    paddingVertical: 16,
    fontSize: 13,
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  productInfo: {
    flex: 1,
  },
  productCode: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2563eb",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  productDetail: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  changeZoneButton: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changeZoneButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  modalLabelSmall: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#f8fafc",
  },
  typeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 4,
  },
  typeChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  typeChipActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  typeChipTextActive: {
    color: "#ffffff",
  },
  floorRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  modalCancel: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalCancelText: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 14,
  },
  modalSave: {
    flex: 2,
    backgroundColor: "#10b981",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalSaveText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
  modalDelete: {
    backgroundColor: "#fee2e2",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  modalDeleteText: {
    color: "#ef4444",
    fontWeight: "700",
    fontSize: 14,
  },
});