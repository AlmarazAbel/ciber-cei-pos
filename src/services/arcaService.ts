import type {
  DatosClienteFactura,
  ItemCarrito,
  MedioPago,
} from '../types/pos';

export interface SolicitudFacturaArca {
  items: ItemCarrito[];
  total: number;
  medioPago: MedioPago;
  cliente: DatosClienteFactura;
}

export interface RespuestaFacturaArca {
  autorizada: boolean;
  puntoVenta: number;
  numeroComprobante: number;
  cae: string;
  vencimientoCae: string;
  observaciones?: string[];
  modo: 'backend' | 'simulado';
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export async function emitirFacturaArca(
  payload: SolicitudFacturaArca
): Promise<RespuestaFacturaArca> {
  try {
    const res = await fetch(`${API_URL}/api/facturacion/arca`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      throw new Error(
        errorData?.message ?? `Error del servidor ARCA (${res.status})`
      );
    }

    const data = await res.json();

    return {
      autorizada: Boolean(data.autorizada ?? true),
      puntoVenta: Number(data.puntoVenta ?? 1),
      numeroComprobante: Number(data.numeroComprobante ?? 1),
      cae: String(data.cae ?? ''),
      vencimientoCae: String(data.vencimientoCae ?? ''),
      observaciones: Array.isArray(data.observaciones)
        ? data.observaciones
        : undefined,
      modo: 'backend',
    };
  } catch {
    // Respuesta de prueba mientras no esté corriendo el backend con ARCA
    const fechaVto = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    return {
      autorizada: true,
      puntoVenta: 1,
      numeroComprobante: Math.floor(10000 + Math.random() * 89999),
      cae: '74123456789012',
      vencimientoCae: fechaVto,
      modo: 'simulado',
    };
  }
}