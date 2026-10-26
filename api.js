import { API_URL } from "./config";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1500; // ms

async function fetchWithRetry(endpoint, options = {}, retries = MAX_RETRIES) {
  const url = `${API_URL}${endpoint}`;
  const lastError = [];

  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      return { ok: true, data };
    } catch (err) {
      lastError.push(err.message);
      if (i < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY * (i + 1)));
      }
    }
  }

  return { ok: false, error: lastError.join("; ") };
}

// Comprobar si el servidor está disponible
export async function checkServerHealth() {
  const result = await fetchWithRetry("/api/health", {}, 1);
  return result.ok;
}

// Obtener todas las zonas
export async function getZones() {
  return fetchWithRetry("/api/zones");
}

// Obtener todos los productos
export async function getProducts() {
  return fetchWithRetry("/api/products");
}

// Buscar productos
export async function searchProducts(q) {
  return fetchWithRetry(`/api/products/search?q=${encodeURIComponent(q)}`);
}

// Obtener producto por código
export async function getProductByCode(code) {
  return fetchWithRetry(`/api/products/${code}`);
}

// Asignar producto a zona
export async function assignProductToZone(code, zoneId) {
  return fetchWithRetry(`/api/products/${code}/zone`, {
    method: "POST",
    body: JSON.stringify({ zone_id: zoneId }),
  });
}

// Crear zona
export async function createZone(zone) {
  return fetchWithRetry("/api/zones", {
    method: "POST",
    body: JSON.stringify(zone),
  });
}

// Actualizar zona
export async function updateZone(zoneId, updates) {
  return fetchWithRetry(`/api/zones/${zoneId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

// Eliminar zona
export async function deleteZone(zoneId) {
  return fetchWithRetry(`/api/zones/${zoneId}`, {
    method: "DELETE",
  });
}

// Registrar escaneo
export async function registerScan(productCode, device) {
  return fetchWithRetry("/api/scans", {
    method: "POST",
    body: JSON.stringify({ product_code: productCode, device }),
  });
}

// Obtener historial de escaneos
export async function getScans() {
  return fetchWithRetry("/api/scans");
}
