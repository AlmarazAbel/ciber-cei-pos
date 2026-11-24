import type { MedioPago } from '../types/pos';

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

interface EstadoArqueoStorage {
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

export function cargarEstadoArqueo(): EstadoArqueoStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ARQUEO);
    if (!raw) return estadoPorDefecto;
    const parsed = JSON.parse(raw);
    return {
      fondoInicial: typeof parsed.fondoInicial === 'number' ? parsed.fondoInicial : 0,
      movimientos: Array.isArray(parsed.movimientos) ? parsed.movimientos : [],
      cierres: Array.isArray(parsed.cierres) ? parsed.cierres : [],
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