export type TipoItem = 'articulo' | 'servicio';
export type MedioPago = 'Efectivo' | 'Transferencia' | 'Tarjeta';
export type TipoComprobante = 'comprobante' | 'factura_arca';
export type CondicionFiscal =
  | 'Consumidor Final'
  | 'Monotributo'
  | 'Responsable Inscripto'
  | 'Exento';

export interface DatosClienteFactura {
  cuitDni: string;
  razonSocial: string;
  condicionFiscal: CondicionFiscal;
}

export interface ItemCatalogo {
  id: string;
  codigoBarras?: string;
  nombre: string;
  precio: number;
  tipo: TipoItem;
  stock?: number;
  imagen?: string;
}

export interface ItemCarrito extends ItemCatalogo {
  cantidad: number;
}