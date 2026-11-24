import type { ComprobanteEmitido } from '../components/ticket/ComprobanteA4Modal';

const STORAGE_KEY_HISTORIAL = 'ciber_cei_historial_ventas_v1';

export interface VentaRegistrada extends ComprobanteEmitido {
  idRegistro: string;
}

export function cargarHistorialInicial(): VentaRegistrada[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORIAL);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
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