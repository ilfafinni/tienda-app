import React, { useState, useEffect, useCallback } from "react";
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
  Keyboard,
} from "react-native";
import { Svg, Rect, Text as SvgText, Circle, Path } from "react-native-svg";

import {
  getZones,
  getProducts,
  createZone,
  updateZone,
  deleteZone,
  assignProductToZone,
} from "../api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const MAP_VIEWBOX = "0 0 1000 1000";

const TYPE_LABELS = {
  floorstand: "Floorstand",
  mesa: "Mesa",
  pared: "Pared",
  estante: "Estante",
  entrada: "Entrada",
};

const FLOOR_LABELS = {
  1: "Piso 1",
  2: "Piso 2",
  3: "Piso 3",
  4: "Piso 4",
  "all": "Planta completa",
};

export default function MapScreen({ navigation, route }) {
  const {
    initialZoneId,
    initialProductCode,
  } = route.params || {};

  const [zones, setZones] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newZone, setNewZone] = useState({
    name: "",
    type: "floorstand",
    x: 150,
    y: 150,
    w: 120,
    h: 100,
    color: "#3b82f6",
    floor: 1,
  });

  const [activeFloor, setActiveFloor] = useState("all"); // "all" | number
  const [focusZoneId, setFocusZoneId] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null); // {x, y} en viewBox coords
  const [drawCurrent, setDrawCurrent] = useState(null); // {x, y} en viewBox coords

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [zRes, pRes] = await Promise.all([getZones(), getProducts()]);

      if (!zRes.ok || !pRes.ok) {
        throw new Error(
          zRes.error || pRes.error || "Error cargando datos"
        );
      }

      setZones(zRes.data);
      setProducts(pRes.data);

      // Si hay initialZoneId, seleccionar esa zona después de cargar datos
      if (initialZoneId) {
        const zone = zRes.data.find((z) => z.id == initialZoneId);
        if (zone) {
          setSelectedZone(zone);
          setActiveFloor(zone.floor);
          setFocusZoneId(zone.id);
        }
      }

      // Si hay initialProductCode pero no zone_id, buscar la zona del producto
      if (initialProductCode && !initialZoneId) {
        const product = pRes.data.find((p) => p.code === initialProductCode);
        if (product && product.zone_id) {
          const zone = zRes.data.find((z) => z.id == product.zone_id);
          if (zone) {
            setSelectedZone(zone);
            setActiveFloor(zone.floor);
            setFocusZoneId(zone.id);
          }
        }
      }
    } catch (err) {
      setError(
        err.message || "No se pudo conectar con el servidor. ¿Está en línea?"
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar zonas por piso activo
  const visibleZones = activeFloor === "all"
    ? zones
    : zones.filter((z) => z.floor === Number(activeFloor));

  // Productos en zona visible
  const productsInZone = (zoneId) =>
    products.filter((p) => p.zone_id === zoneId);

  const zoneColor = (type) => {
    const map = {
      floorstand: "#3b82f6",
      mesa: "#10b981",
      pared: "#6366f1",
      estante: "#8b5cf6",
      entrada: "#94a3b8",
    };
    return map[type] || "#94a3b8";
  };

  // Convertir coordenadas de pantalla a viewBox (aproximado)
  const screenToViewBox = useCallback(
    (screenX, screenY) => {
      // Área del mapa: el SVG está en mapContainer con margin y el contenedor padre
      // viewBox es 1000x1000, pantalla completa menos header/bottom panel
      // Aproximado: mapeamos pantalla a viewBox restando offsets conocidos
      const mapLeft = 12; // margin horizontal del mapContainer
      const mapTop = 12; // margen superior (StatusBar + header)
      const mapWidth = SCREEN_WIDTH - 24;
      const mapHeight = SCREEN_HEIGHT - 160; // dejar espacio para bottom panel approx

      // Si el SVG tiene width/height 100% y viewBox 1000x1000
      const ratioX = 1000 / mapWidth;
      const ratioY = 1000 / mapHeight;

      const vbX = (screenX - mapLeft) * ratioX;
      const vbY = (screenY - mapTop) * ratioY;

      // Clamping a viewBox
      const clampedX = Math.max(0, Math.min(1000, vbX));
      const clampedY = Math.max(0, Math.min(1000, vbY));

      return { x: clampedX, y: clampedY };
    },
    [SCREEN_WIDTH, SCREEN_HEIGHT]
  );

  const productsInZoneSelected = selectedZone
    ? productsInZone(selectedZone.id)
    : [];

  // Handler de toque en el SVG para seleccionar zona o iniciar dibujo
  const handleMapPress = useCallback(
    (event) => {
      if (drawing && drawStart) {
        // Modo dibujo: actualizar punto current mientras arrastramos
        const pt = screenToViewBox(
          event.nativeEvent?.location?.x ?? event.nativeEvent?.x ?? 0,
          event.nativeEvent?.location?.y ?? event.nativeEvent?.y ?? 0
        );
        setDrawCurrent(pt);
      } else {
        // Modo normal: intentar seleccionar una zona tocada
        const touchLoc = screenToViewBox(
          event.nativeEvent?.location?.x ?? event.nativeEvent?.x ?? 0,
          event.nativeEvent?.location?.y ?? event.nativeEvent?.y ?? 0
        );

        const hitZone = visibleZones.find((z) => {
          return (
            touchLoc.x >= z.x &&
            touchLoc.x <= z.x + z.w &&
            touchLoc.y >= z.y &&
            touchLoc.y <= z.y + z.h
          );
        });

        if (hitZone) {
          setSelectedZone(hitZone);
          setFocusZoneId(hitZone.id);
          setActiveFloor(hitZone.floor);
        } else {
          // Tocar en área vacía - iniciar modo dibujo
          setDrawing(true);
          setDrawStart(touchLoc);
        }
      }
    },
    [drawing, drawStart, visibleZones, screenToViewBox]
  );

  // Cuando el usuario suelta el toque después de iniciar dibujo
  const handleMapRelease = useCallback(
    () => {
      if (drawing && drawStart) {
        // Cerrar dibujo y crear zona con las coordenadas
        const x1 = drawStart.x;
        const y1 = drawStart.y;
        const x2 = drawCurrent?.x ?? drawStart.x;
        const y2 = drawCurrent?.y ?? drawStart.y;

        const newX = Math.min(x1, x2);
        const newY = Math.min(y1, y2);
        const newW = Math.max(Math.abs(x1 - x2), 50); // mínimo 50
        const newH = Math.max(Math.abs(y1 - y2), 50); // mínimo 50

        setNewZone({
          name: "Nuevo mueble",
          type: "floorstand",
          x: newX,
          y: newY,
          w: newW,
          h: newH,
          color: "#3b82f6",
          floor: Number(activeFloor) || 1,
        });
        setShowAddModal(true);
        setDrawing(false);
        setDrawStart(null);
        setDrawCurrent(null);
      } else {
        setDrawing(false);
        setDrawStart(null);
        setDrawCurrent(null);
      }
    },
    [drawing, drawStart, drawCurrent, activeFloor, setNewZone, setShowAddModal]
  );

  // Limpiar drawCurrent al salir del modal o cancelar
  useEffect(() => {
    if (!showAddModal) {
      setDrawing(false);
      setDrawStart(null);
      setDrawCurrent(null);
    }
  }, [showAddModal]);

  // Actualizar zona cuando se guarda un nuevo mueble
  const handleZoneSave = async (zoneData) => {
    try {
      const res = await createZone(zoneData);
      if (!res.ok) throw new Error(res.error || "Error creando mueble");

      setZones((prev) => [...prev, res.data]);
      setShowAddModal(false);
      setNewZone({
        name: "",
        type: "floorstand",
        x: 150,
        y: 150,
        w: 120,
        h: 100,
        color: "#3b82f6",
        floor: 1,
      });
    } catch (err) {
      Alert.alert("Error", err.message || "No se pudo crear el mueble");
    }
  };

  // Actualizar zona existente
  const handleZoneUpdate = async (zoneId, updates) => {
    try {
      const res = await updateZone(zoneId, updates);
      if (!res.ok) throw new Error(res.error || "Error actualizando mueble");

      setZones((prev) =>
        prev.map((z) => (z.id === zone.id ? res.data : z))
      );
      if (selectedZone?.id === zoneId) setSelectedZone(res.data);
    } catch (err) {
      Alert.alert("Error", err.message || "No se pudo actualizar el mueble");
    }
  };

  // Eliminar zona
  const handleZoneDelete = async (zone) => {
    const confirm = await Alert.alert(
      "Eliminar mueble",
      `¿Eliminar "${zone.name}"? Los productos de esta zona se desasignarán.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deleteZone(zone.id);
              if (!res.ok) throw new Error(res.error || "Error eliminando");

              setZones((prev) => prev.filter((z) => z.id !== zone.id));
              if (selectedZone?.id === zone.id) setSelectedZone(null);
              setFocusZoneId(null);
            } catch (err) {
              Alert.alert("Error", err.message || "No se pudo eliminar");
            }
          },
        },
      ]
    );
  };

  // Abrir modal para cambiar mueble de un producto
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignProductCode, setAssignProductCode] = useState("");
  const [assignToZoneId, setAssignToZoneId] = useState(null);

  const openAssignModal = (productCode, currentZoneId) => {
    setAssignProductCode(productCode);
    // Cargar todas las zonas excepto la actual
    const otherZones = zones.filter((z) => z.id !== currentZoneId);
    if (otherZones.length > 0) {
      setAssignToZoneId(otherZones[0].id);
    } else {
      setAssignToZoneId(null);
    }
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setAssignProductCode("");
    setAssignToZoneId(null);
  };

  const confirmAssignProduct = async () => {
    if (!assignProductCode || assignToZoneId === null) return;
    try {
      const res = await assignProductToZone(assignProductCode, assignToZoneId);
      if (!res.ok) throw new Error(res.error || "Error asignando producto");

      // Actualizar productos localmente
      setProducts((prev) =>
        prev.map((p) =>
          p.code === assignProductCode
            ? { ...p, zone_id: assignToZoneId, zone_name: zones.find(z => z.id === assignToZoneId)?.name || null, zone_type: zones.find(z => z.id === assignToZoneId)?.type || null }
            : p
        )
      );

      closeAssignModal();
    } catch (err) {
      Alert.alert("Error", err.message || "No se pudo asignar el producto");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Cargando mapa...</Text>
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

  const productsInZoneSelected = selectedZone
    ? productsInZone(selectedZone.id)
    : [];

  // Determinar si estamos enfocados en un producto específico
  const isProductFocus = !!initialProductCode && !initialZoneId;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.mapTitle}>Mapa de la tienda</Text>
        {editing ? (
          <TouchableOpacity style={styles.doneButton} onPress={toggleEditing}>
            <Text style={styles.doneText}>✓ Listo</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.editButton} onPress={toggleEditing}>
            <Text style={styles.editText}>✏ Editar muebles</Text>
          </TouchableOpacity>
        )}
        {/* selector de pisos */}
        {visibleZones.length > 1 && (
          <View style={styles.floorSelector}>
            {Object.entries(FLOOR_LABELS).map(([floor, label]) => (
              <TouchableOpacity
                key={floor}
                style={[
                  styles.floorChip,
                  activeFloor == floor && styles.floorChipActive,
                ]}
                onPress={() => setActiveFloor(floor)}
              >
                <Text style={styles.floorChipText}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.mapContainer}>
        <Svg
          width="100%"
          height="100%"
          viewBox={MAP_VIEWBOX}
          style={styles.svg}
          onTouch={handleMapPress}
          onTouchEnd={handleMapRelease}
        >
          {/* Dibujar zona de selección mientras se dibuja */}
          {drawing && drawStart && (
            <Rect
              x={drawStart.x}
              y={drawStart.y}
              width={drawCurrent?.x > drawStart.x ? drawCurrent.x - drawStart.x : drawStart.x - drawCurrent.x}
              height={drawCurrent?.y > drawStart.y ? drawCurrent.y - drawStart.y : drawStart.y - drawCurrent.y}
              fill="rgba(168, 85, 247, 0.3)"
              stroke="#a855f7"
              strokeWidth={2}
            />
          )}

          {/* Resaltar la zona focus (producto escaneado/buscado) */}
          {focusZoneId && (
            <Rect
              x={zones.find(z) => z.id == focusZoneId}.x - 10}
              y={zones.find(z) => z.id == focusZoneId}.y - 10}
              width={zones.find(z) => z.id == focusZoneId}.w + 20}
              height={zones.find(z) => z.id == focusZoneId}.h + 20}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={3}
              strokeDasharray="5, 5"
            />
          )}

          {visibleZones.map((zone) => {
            const isSelected = selectedZone?.id === zone.id;
            const zoneProds = productsInZone(zone.id);

            return (
              <TouchableOpacity
                key={zone.id}
                onPress={() => setSelectedZone(zone)}
                hitSlop={15}
              >
                <Rect
                  x={zone.x}
                  y={zone.y}
                  width={zone.w}
                  height={zone.h}
                  fill={isSelected ? zoneColor(zone.type) : zone.color}
                  opacity={isSelected ? 0.95 : 0.7}
                  stroke="#1e293b"
                  strokeWidth={isSelected || editing ? 3 : 2}
                  rx={8}
                  ry={8}
                />
                <SvgText
                  x={zone.x + zone.w / 2}
                  y={zone.y + zone.h / 2 - 8}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontWeight="bold"
                  fontSize={11}
                  pointerEvents="none"
                >
                  {zone.name}
                </SvgText>
                <SvgText
                  x={zone.x + zone.w / 2}
                  y={zone.y + zone.h / 2 + 10}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={9}
                  opacity={0.9}
                  pointerEvents="none"
                >
                  {TYPE_LABELS[zone.type] || zone.type}
                </SvgText>
                {zoneProds.length > 0 && (
                  <Circle
                    cx={zone.x + zone.w - 14}
                    cy={zone.y + zone.h - 14}
                    r={11}
                    fill="#ef4444"
                    pointerEvents="none"
                  />
                )}
                {editing && (
                  <Circle
                    cx={zone.x + zone.w - 10}
                    cy={zone.y + 10}
                    r={9}
                    fill="#ffffff"
                    stroke="#ef4444"
                    strokeWidth={2}
                    pointerEvents="none"
                  />
                )}
              </TouchableOpacity>
            );
          })}

          {/* Modo dibujo: mostrar rectángulo preview */}
          {drawing && drawStart && drawCurrent && (
            <Path
              d={`
                M ${drawStart.x} ${drawStart.y}
                L ${drawCurrent.x} ${drawStart.y}
                L ${drawCurrent.x} ${drawCurrent.y}
                L ${drawStart.x} ${drawCurrent.y}
                Z
              `}
              fill="rgba(168, 85, 247, 0.3)"
              stroke="#a855f7"
              strokeWidth={2}
            />
          )}
        </Svg>

        <View style={styles.legend}>
          {Object.entries(TYPE_LABELS).map(([type, label]) => (
            <View key={type} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: zoneColor(type) },
                ]}
              />
              <Text style={styles.legendText}>{label}</Text>
            </View>
          ))}
          {/* Agregar entrada para piso actual */}
          {activeFloor !== "all" && (
            <View key="floor-active" style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: zoneColor("floorstand") },
                ]}
              />
              <Text style={styles.legendText}>{FLOOR_LABELS[activeFloor]}</Text>
            </View>
          ))}
        </View>

        {editing && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setNewZone({
                name: "",
                type: "floorstand",
                x: 200,
                y: 200,
                w: 120,
                h: 100,
                color: "#3b82f6",
                floor: Number(activeFloor) || 1,
              });
              setShowAddModal(true);
            }}
          >
            <Text style={styles.addButtonText}>+ Nuevo mueble</Text>
          </TouchableOpacity>
        )}

        {/* Panel inferior: zona seleccionada */}
        {selectedZone && (
          <View style={styles.bottomPanel}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedZone(null)}>
              <Text style={styles.closeText}>✕ Cerrar</Text>
            </TouchableOpacity>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>
                {selectedZone.name}
              </Text>
              <Text style={styles.panelSubtitle}>
                {TYPE_LABELS[selectedZone.type] || selectedZone.type} •
                {zoneProducts.length} producto(s)
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {zoneProducts.length === 0 ? (
                <Text style={styles.emptyZone}>No hay productos asignados en este mueble.</Text>
              ) : (
                zoneProducts.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.productRow}
                  >
                    <View style={styles.productInfo}>
                      <Text style={styles.productCode}>{p.code}</Text>
                      <Text style={styles.productName}>{p.name}</Text>
                      <Text style={styles.productDetail}>
                        {p.category} • {p.size || "-"} • {p.color || "-"}
                      </Text>
                    </View>
                    <Text style={styles.productPrice}>
                      ${p.price ? p.price.toLocaleString() : "-"}
                    </Text>
                    {/* Botón "Cambiar mueble" en cada producto */}
                    {zoneProducts.length > 0 && (
                      <TouchableOpacity
                        style={styles.changeZoneButton}
                        onPress={() => openAssignModal(p.code, selectedZone.id)}
                      >
                        <Text style={styles.changeZoneButtonText}>
                          Cambiar mueble
                        </Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Modal para cambiar mueble de producto */}
            {showAssignModal && (
              <Modal
                visible={showAssignModal}
                transparent={true}
                onRequestClose={closeAssignModal}
              >
                <View style={styles.modalBackdrop} onTouchEnd={closeAssignModal}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Cambiar mueble</Text>
                    <Text style={styles.modalLabel}>Producto</Text>
                    <Text style={styles.modalInputSmall} readOnly>
                      {assignProductCode}
                    </Text>
                    <Text style={styles.modalLabel}>Nueva ubicación</Text>
                    <View style={styles.typeSelector}>
                      {zones.map((z) => (
                        <TouchableOpacity
                          key={z.id}
                          style={[
                            styles.typeChip,
                            assignToZoneId === z.id && styles.typeChipActive,
                          ]}
                          onPress={() => setAssignToZoneId(z.id)}
                        >
                          <Text style={[
                            styles.typeChipText,
                            assignToZoneId === z.id && styles.typeChipTextActive,
                          ]}>
                            {z.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.modalCancel} onPress={closeAssignModal}>
                        <Text style={styles.modalCancelText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalSave} onPress={confirmAssignProduct}>
                        <Text style={styles.modalSaveText}>Asignar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            )}

            {/* Modal para añadir nuevo mueble (reutilizado) */}
            {showAddModal && (
              <Modal
                visible={showAddModal}
                transparent={true}
                onRequestClose={() => setShowAddModal(false)}
              >
                <View style={styles.modalBackdrop} onTouchEnd={() => setShowAddModal(false)}>
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Nuevo mueble</Text>
                    <ScrollView contentContainerStyle={styles.modalScroll}>
                      <Text style={styles.modalLabel}>Nombre</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={newZone.name}
                        onChangeText={(t) =>
                          setNewZone({ ...newZone, name: t })
                        }
                        placeholder="Ej: Floorstand B"
                      />
                      <Text style={styles.modalLabel}>Tipo</Text>
                      <View style={styles.typeSelector}>
                        {Object.entries(TYPE_LABELS).map(([type, label]) => (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.typeChip,
                              newZone.type === type && styles.typeChipActive,
                            ]}
                            onPress={() => setNewZone({ ...newZone, type })}
                          >
                            <Text style={[styles.typeChipText, newZone.type === type && styles.typeChipTextActive]}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={styles.modalLabel}>Color</Text>
                      <View style={styles.colorSelector}>
                        {["#3b82f6", "#10b981", "#6366f1", "#8b5cf6", "#ef4444", "#f59e0b", "#94a3b8"].map(
                          (color) => (
                            <TouchableOpacity
                              key={color}
                              style={[
                                styles.colorChip,
                                newZone.color === color && styles.colorChipActive,
                                { backgroundColor: color },
                              ]}
                              onPress={() => setNewZone({ ...newZone, color })}
                            />
                          )
                        )}
                      </View>
                      <View style={styles.modalFields}>
                        <View style={styles.modalField}>
                          <Text style={styles.modalLabelSmall}>X</Text>
                          <TextInput
                            style={styles.modalInputSmall}
                            value={String(newZone.x)}
                            onChangeText={(t) =>
                              setNewZone({ ...newZone, x: parseInt(t) || 0 })
                            }
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.modalField}>
                          <Text style={styles.modalLabelSmall}>Y</Text>
                          <TextInput
                            style={styles.modalInputSmall}
                            value={String(newZone.y)}
                            onChangeText={(t) =>
                              setNewZone({ ...newZone, y: parseInt(t) || 0 })
                            }
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.modalField}>
                          <Text style={styles.modalLabelSmall}>Ancho</Text>
                          <TextInput
                            style={styles.modalInputSmall}
                            value={String(newZone.w)}
                            onChangeText={(t) =>
                              setNewZone({ ...newZone, w: parseInt(t) || 50 })
                            }
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.modalField}>
                          <Text style={styles.modalLabelSmall}>Alto</Text>
                          <TextInput
                            style={styles.modalInputSmall}
                            value={String(newZone.h)}
                            onChangeText={(t) =>
                              setNewZone({ ...newZone, h: parseInt(t) || 50 })
                            }
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    </ScrollView>
                    <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddModal(false)}>
                        <Text style={styles.modalCancelText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalSave} onPress={() => handleZoneSave(newZone)}>
                        <Text style={styles.modalSaveText}>Guardar mueble</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            )}
          </View>
        )}

        {/* Si hay producto focalizado pero no hay zona seleccionada, mostrar info */}
        {!selectedZone && initialProductCode && (
          <View style={styles.noZoneInfo}>
            <Text style={styles.noZoneText}>
              El producto {initialProductCode} no tiene zona asignada en el mapa
            </Text>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
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
    backgroundColor: "#3b82f6",
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 8,
  },
  backButton: {
    marginRight: 8,
  },
  backText: {
    color: "#3b82f6",
    fontSize: 16,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    flex: 1,
  },
  editButton: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 14,
    paddingVertical: 7,
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
    backgroundColor: "#3b82f6",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  doneText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 13,
  },
  mapContainer: {
    flex: 1,
    margin: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  svg: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: "#475569",
  },
  addButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: "55%",
  },
  closeButton: {
    alignSelf: "flex-end",
    marginBottom: 8,
  },
  closeText: {
    color: "#64748b",
    fontSize: 14,
  },
  panelHeader: {
    marginBottom: 12,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
  },
  panelSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 16,
    gap: 8,
  },
  emptyZone: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 16,
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  productInfo: {
    flex: 1,
  },
  productCode: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#3b82f6",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  productDetail: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#10b981",
    marginLeft: 12,
  },
  editingBadge: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: "center",
  },
  editingText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    width: "100%",
    maxHeight: "90%",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 16,
  },
  modalScroll: {
    gap: 16,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  modalInput: {
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
    color: "#1e293b",
  },
  typeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeChip: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  typeChipActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  typeChipText: {
    fontSize: 13,
    color: "#475569",
  },
  typeChipTextActive: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  colorSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  colorChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  colorChipActive: {
    borderWidth: 3,
    borderColor: "#1e293b",
    transform: [{ scale: 1.1 }],
  },
  modalFields: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  modalField: {
    flex: 1,
    minWidth: 70,
  },
  modalLabelSmall: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 4,
  },
  modalInputSmall: {
    backgroundColor: "#f1f5f9",
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    color: "#1e293b",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 8,
  },
  modalCancel: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  modalCancelText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 13,
  },
  modalSave: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
  },
  modalSaveText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 13,
  },
  noZoneInfo: {
    padding: 20,
    alignItems: "center",
    marginTop: 40,
  },
  noZoneText: {
    color: "#64748b",
    fontSize: 16,
    textAlign: "center",
  },
  floorSelector: {
    flexDirection: "row",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  floorChip: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  floorChipActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  floorChipText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  changeZoneButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    marginTop: 6,
  },
  changeZoneButtonText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
});