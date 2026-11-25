import type { ComprobanteEmitido } from '../components/ticket/ComprobanteA4Modal';
import { authHeaders } from './authService';

const API_BASE_URL =
  (import.meta.env?.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ||
  'http://localhost:4000/api';

const STORAGE_KEY_HISTORIAL = 'ciber_cei_historial_ventas_v1';

export type TipoComprobanteVenta = 'comprobante' | 'factura_arca';

export interface VentaRegistrada extends Omit<ComprobanteEmitido, 'tipoComprobante'> {
  idRegistro: string;
  tipoComprobante: TipoComprobanteVenta;
}

type VentaApi = Partial<VentaRegistrada> & {
  _id?: string;
  id?: string;
  idRegistro?: string;
  tipoComprobante?: string;
};

interface HistorialApiResponse {
  ventas?: VentaApi[];
  historial?: VentaApi[];
  items?: VentaApi[];
  data?:
    | VentaApi[]
    | { ventas?: VentaApi[]; historial?: VentaApi[]; items?: VentaApi[] };
}

function normalizarTipoComprobante(tipo?: string): TipoComprobanteVenta {
  if (tipo === 'factura_arca' || tipo === 'factura') {
    return 'factura_arca';
  }
  return 'comprobante';
}

function normalizarVenta(raw: VentaApi): VentaRegistrada {
  const idFinal = String(
    raw.idRegistro ?? raw.id ?? raw._id ?? `venta-${Date.now()}`
  );
  return {
    ...(raw as VentaRegistrada),
    idRegistro: idFinal,
    numero: Number(raw.numero ?? 0),
    fechaHora: String(raw.fechaHora ?? ''),
    cajero: String(raw.cajero ?? ''),
    tipoComprobante: normalizarTipoComprobante(raw.tipoComprobante),
    items: Array.isArray(raw.items) ? raw.items : [],
    total: Number(raw.total ?? 0),
    medioPago: (raw.medioPago ?? 'Efectivo') as VentaRegistrada['medioPago'],
  };
}

function extraerListaVentas(
  data: HistorialApiResponse | VentaApi[]
): VentaRegistrada[] {
  if (Array.isArray(data)) {
    return data.map(normalizarVenta);
  }
  const lista =
    data.ventas ??
    data.historial ??
    data.items ??
    (Array.isArray(data.data)
      ? data.data
      : data.data?.ventas ?? data.data?.historial ?? data.data?.items ?? []);
  return lista.map(normalizarVenta);
}

export function cargarHistorialInicial(): VentaRegistrada[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORIAL);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(normalizarVenta);
    }
  } catch (error) {
    console.error('Error al leer historial de ventas desde localStorage:', error);
  }
  return [];
}

export function guardarHistorialLocal(ventas: VentaRegistrada[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_HISTORIAL, JSON.stringify(ventas));
  } catch (error) {
    console.error('Error al guardar historial de ventas en localStorage:', error);
  }
}

export function limpiarHistorialLocal(): VentaRegistrada[] {
  guardarHistorialLocal([]);
  return [];
}

export async function obtenerHistorialBackend(): Promise<VentaRegistrada[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/ventas`, {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as
      | HistorialApiResponse
      | VentaApi[];
    const ventas = extraerListaVentas(data);
    guardarHistorialLocal(ventas);
    return ventas;
  } catch (error) {
    console.error('Error al obtener historial desde el backend:', error);
    return cargarHistorialInicial();
  }
}

export async function registrarVentaBackend(
  venta: VentaRegistrada
): Promise<{ ok: true; venta: VentaRegistrada } | { ok: false; error: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/ventas`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(venta),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: data?.error || data?.message || 'No se pudo registrar la venta.',
      };
    }

    const rawVenta = data?.venta ?? data?.item ?? data?.data ?? data;
    return { ok: true, venta: normalizarVenta(rawVenta) };
  } catch (error) {
    console.error('Error al registrar venta en /api/ventas:', error);
    return {
      ok: false,
      error: 'Error de conexión al guardar la venta en el servidor.',
    };
  }
}

export async function limpiarHistorialBackend(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const response = await fetch(`${API_BASE_URL}/ventas`, {
      method: 'DELETE',
      headers: authHeaders(),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: data?.error || data?.message || 'No se pudo limpiar el historial.',
      };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error al limpiar historial en /api/ventas:', error);
    return {
      ok: false,
      error: 'Error de conexión al limpiar el historial en el servidor.',
    };
  }
}