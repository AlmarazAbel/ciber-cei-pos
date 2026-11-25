import type { MedioPago } from '../types/pos';
import { authHeaders } from './authService';

const API_BASE_URL =
  (import.meta.env?.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ||
  'http://localhost:4000/api';

export type TipoMovimientoCaja = 'ingreso' | 'egreso';

export interface MovimientoCaja {
  id: string;
  fechaHora: string;
  tipo: TipoMovimientoCaja;
  concepto: string;
  monto: number;
  medioPago: MedioPago;
}

export interface CierreCajaRegistrado {
  id: string;
  fechaHora: string;
  cajero: string;
  fondoInicial: number;
  ventasEfectivo: number;
  ventasTransferencia: number;
  ventasTarjeta: number;
  ingresosManuales: number;
  egresosManuales: number;
  efectivoTeorico: number;
  efectivoContado: number;
  diferencia: number;
  observacion?: string;
}

export interface EstadoArqueoStorage {
  fondoInicial: number;
  movimientos: MovimientoCaja[];
  cierres: CierreCajaRegistrado[];
}

const STORAGE_KEY_ARQUEO = 'ciber_cei_arqueo_caja_v1';

const estadoPorDefecto: EstadoArqueoStorage = {
  fondoInicial: 0,
  movimientos: [],
  cierres: [],
};

function normalizarMovimiento(raw: Record<string, unknown>): MovimientoCaja {
  return {
    id: String(raw.id ?? raw._id ?? `mov-${Date.now()}`),
    fechaHora: String(raw.fechaHora ?? ''),
    tipo: raw.tipo === 'egreso' ? 'egreso' : 'ingreso',
    concepto: String(raw.concepto ?? ''),
    monto: Number(raw.monto ?? 0),
    medioPago: (raw.medioPago ?? 'Efectivo') as MedioPago,
  };
}

function normalizarCierre(raw: Record<string, unknown>): CierreCajaRegistrado {
  return {
    id: String(raw.id ?? raw._id ?? `cierre-${Date.now()}`),
    fechaHora: String(raw.fechaHora ?? ''),
    cajero: String(raw.cajero ?? ''),
    fondoInicial: Number(raw.fondoInicial ?? 0),
    ventasEfectivo: Number(raw.ventasEfectivo ?? 0),
    ventasTransferencia: Number(raw.ventasTransferencia ?? 0),
    ventasTarjeta: Number(raw.ventasTarjeta ?? 0),
    ingresosManuales: Number(raw.ingresosManuales ?? 0),
    egresosManuales: Number(raw.egresosManuales ?? 0),
    efectivoTeorico: Number(raw.efectivoTeorico ?? 0),
    efectivoContado: Number(raw.efectivoContado ?? 0),
    diferencia: Number(raw.diferencia ?? 0),
    observacion:
      typeof raw.observacion === 'string' ? raw.observacion : undefined,
  };
}

export function cargarEstadoArqueo(): EstadoArqueoStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ARQUEO);
    if (!raw) return estadoPorDefecto;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      fondoInicial:
        typeof parsed.fondoInicial === 'number' ? parsed.fondoInicial : 0,
      movimientos: Array.isArray(parsed.movimientos)
        ? parsed.movimientos.map((m) =>
            normalizarMovimiento((m ?? {}) as Record<string, unknown>)
          )
        : [],
      cierres: Array.isArray(parsed.cierres)
        ? parsed.cierres.map((c) =>
            normalizarCierre((c ?? {}) as Record<string, unknown>)
          )
        : [],
    };
  } catch (error) {
    console.error('Error al leer arqueo de caja desde localStorage:', error);
    return estadoPorDefecto;
  }
}

export function guardarEstadoArqueo(estado: EstadoArqueoStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY_ARQUEO, JSON.stringify(estado));
  } catch (error) {
    console.error('Error al guardar arqueo de caja en localStorage:', error);
  }
}

export async function obtenerArqueoBackend(): Promise<EstadoArqueoStorage> {
  try {
    const response = await fetch(`${API_BASE_URL}/arqueo`, {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as Record<string, unknown>;
    const estado: EstadoArqueoStorage = {
      fondoInicial: Number(data.fondoInicial ?? 0),
      movimientos: Array.isArray(data.movimientos)
        ? data.movimientos.map((m) =>
            normalizarMovimiento((m ?? {}) as Record<string, unknown>)
          )
        : [],
      cierres: Array.isArray(data.cierres)
        ? data.cierres.map((c) =>
            normalizarCierre((c ?? {}) as Record<string, unknown>)
          )
        : [],
    };
    guardarEstadoArqueo(estado);
    return estado;
  } catch (error) {
    console.error('Error al obtener arqueo desde el backend:', error);
    return cargarEstadoArqueo();
  }
}

export async function actualizarFondoInicialBackend(
  fondoInicial: number
): Promise<{ ok: true; fondoInicial: number } | { ok: false; error: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/arqueo/fondo`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ fondoInicial }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error:
          data?.error ||
          data?.message ||
          'No se pudo actualizar el fondo inicial.',
      };
    }

    return {
      ok: true,
      fondoInicial: Number(data?.fondoInicial ?? fondoInicial),
    };
  } catch (error) {
    console.error('Error al actualizar fondo inicial en /api/arqueo/fondo:', error);
    return {
      ok: false,
      error: 'Error de conexión al actualizar el fondo inicial.',
    };
  }
}

export async function agregarMovimientoCajaBackend(
  mov: Omit<MovimientoCaja, 'id' | 'fechaHora'>
): Promise<
  { ok: true; movimiento: MovimientoCaja } | { ok: false; error: string }
> {
  try {
    const response = await fetch(`${API_BASE_URL}/arqueo/movimientos`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(mov),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error:
          data?.error ||
          data?.message ||
          'No se pudo registrar el movimiento de caja.',
      };
    }

    return {
      ok: true,
      movimiento: normalizarMovimiento(
        (data?.movimiento ?? data ?? {}) as Record<string, unknown>
      ),
    };
  } catch (error) {
    console.error(
      'Error al registrar movimiento en /api/arqueo/movimientos:',
      error
    );
    return {
      ok: false,
      error: 'Error de conexión al guardar el movimiento de caja.',
    };
  }
}

export async function eliminarMovimientoCajaBackend(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/arqueo/movimientos/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: authHeaders(),
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error:
          data?.error ||
          data?.message ||
          'No se pudo eliminar el movimiento de caja.',
      };
    }

    return { ok: true };
  } catch (error) {
    console.error(
      'Error al eliminar movimiento en /api/arqueo/movimientos/:id:',
      error
    );
    return {
      ok: false,
      error: 'Error de conexión al eliminar el movimiento de caja.',
    };
  }
}

export async function registrarCierreCajaBackend(
  cierre: Omit<CierreCajaRegistrado, 'id' | 'fechaHora'>
): Promise<{ ok: true; cierre: CierreCajaRegistrado } | { ok: false; error: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/arqueo/cierres`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(cierre),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error:
          data?.error || data?.message || 'No se pudo registrar el cierre de caja.',
      };
    }

    return {
      ok: true,
      cierre: normalizarCierre(
        (data?.cierre ?? data ?? {}) as Record<string, unknown>
      ),
    };
  } catch (error) {
    console.error('Error al registrar cierre en /api/arqueo/cierres:', error);
    return {
      ok: false,
      error: 'Error de conexión al guardar el cierre de caja.',
    };
  }
}