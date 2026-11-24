import type {
  DatosClienteFactura,
  ItemCarrito,
  MedioPago,
  TipoComprobante,
} from '../../types/pos';

export interface ComprobanteEmitido {
  numero: number;
  fechaHora: string;
  cajero: string;
  tipoComprobante: TipoComprobante;
  datosCliente?: DatosClienteFactura;
  items: ItemCarrito[];
  total: number;
  medioPago: MedioPago;
  cae?: string;
  vencimientoCae?: string;
  puntoVenta?: number;
}

interface ComprobanteA4ModalProps {
  comprobante: ComprobanteEmitido | null;
  onCerrar: () => void;
}

const formatoARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function ComprobanteA4Modal({ comprobante, onCerrar }: ComprobanteA4ModalProps) {
  if (!comprobante) return null;

  const esFacturaArca = comprobante.tipoComprobante === 'factura_arca';

  return (
    <div className="comprobante-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm print:static print:block print:bg-white print:p-0">
      <div
        id="comprobante-a4-print"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-300 bg-white p-6 sm:p-8 text-slate-900 shadow-2xl"
      >
        {/* Encabezado A4 */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
              CIBER CEI
            </h2>
            <p className="text-xs text-slate-600">
              Ventas Informáticas · Insumos · Impresiones y Servicios
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Cajero / Mostrador: {comprobante.cajero}
            </p>
          </div>

          <div className="sm:text-right">
            <span className="inline-block rounded border border-slate-900 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
              {esFacturaArca ? 'Factura ARCA (A4)' : 'Comprobante de Venta (A4)'}
            </span>
            <p className="mt-1.5 text-sm font-bold">
              {comprobante.puntoVenta
                ? `PV ${String(comprobante.puntoVenta).padStart(4, '0')} · `
                : ''}
              N° {String(comprobante.numero).padStart(8, '0')}
            </p>
            <p className="text-xs text-slate-600">{comprobante.fechaHora}</p>
          </div>
        </div>

        {/* Datos del cliente / facturación */}
        <div className="mt-4 rounded-lg border border-slate-300 bg-slate-50/70 p-3 text-xs">
          {esFacturaArca && comprobante.datosCliente ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <span className="font-semibold text-slate-600 block">Cliente / Razón Social</span>
                <span className="font-bold text-slate-900">
                  {comprobante.datosCliente.razonSocial}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-600 block">CUIT / CUIL / DNI</span>
                <span className="font-bold text-slate-900">
                  {comprobante.datosCliente.cuitDni}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-600 block">Condición Fiscal</span>
                <span className="font-bold text-slate-900">
                  {comprobante.datosCliente.condicionFiscal}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-between gap-2">
              <span>
                <strong className="text-slate-700">Cliente:</strong> Consumidor Final
              </span>
              <span>
                <strong className="text-slate-700">Medio de pago:</strong> {comprobante.medioPago}
              </span>
            </div>
          )}
        </div>

        {/* Detalle de ítems */}
        <table className="mt-5 w-full border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b-2 border-slate-800 text-left text-slate-800">
              <th className="py-2 pr-2 font-bold">Descripción</th>
              <th className="py-2 px-2 font-bold text-center">Cant.</th>
              <th className="py-2 px-2 font-bold text-right">P. Unitario</th>
              <th className="py-2 pl-2 font-bold text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {comprobante.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2.5 pr-2">
                  <span className="font-medium text-slate-900">{item.nombre}</span>
                  <span className="ml-2 text-[11px] text-slate-500 uppercase">
                    ({item.tipo === 'servicio' ? 'Servicio' : item.codigoBarras ? 'Artículo' : 'Suelto'})
                  </span>
                </td>
                <td className="py-2.5 px-2 text-center font-medium">{item.cantidad}</td>
                <td className="py-2.5 px-2 text-right text-slate-700">
                  {formatoARS.format(item.precio)}
                </td>
                <td className="py-2.5 pl-2 text-right font-semibold text-slate-900">
                  {formatoARS.format(item.precio * item.cantidad)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales, CAE y cierre */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-t-2 border-slate-900 pt-4">
          <div className="text-xs text-slate-600 space-y-1">
            {esFacturaArca && (
              <>
                <p>
                  <strong className="text-slate-800">Pago:</strong> {comprobante.medioPago}
                </p>
                {comprobante.cae && (
                  <p>
                    <strong className="text-slate-800">CAE:</strong> {comprobante.cae}
                    {comprobante.vencimientoCae
                      ? ` · Vto. CAE: ${comprobante.vencimientoCae}`
                      : ''}
                  </p>
                )}
              </>
            )}
            <p>Gracias por elegir Ciber Cei.</p>
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Total a pagar
            </p>
            <p className="text-2xl font-extrabold text-slate-950">
              {formatoARS.format(comprobante.total)}
            </p>
          </div>
        </div>

        {/* Acciones (ocultas al imprimir en A4) */}
        <div className="no-print mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
          >
            Imprimir en A4 (Epson)
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}