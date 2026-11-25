import { useMemo, useState } from 'react';
import type { MedioPago, TipoComprobante } from '../../types/pos';
import type { VentaRegistrada } from '../../services/historialService';

interface HistorialVentasViewProps {
  ventas: VentaRegistrada[];
  onReimprimirVenta: (venta: VentaRegistrada) => void;
  onLimpiarHistorial: () => void;
  onVolverPos: () => void;
}

const formatoARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function HistorialVentasView({
  ventas,
  onReimprimirVenta,
  onLimpiarHistorial,
  onVolverPos,
}: HistorialVentasViewProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoComprobante>('todos');
  const [filtroPago, setFiltroPago] = useState<'Todos' | MedioPago>('Todos');

  const ventasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return ventas.filter((v) => {
      if (filtroTipo !== 'todos' && v.tipoComprobante !== filtroTipo) return false;
      if (filtroPago !== 'Todos' && v.medioPago !== filtroPago) return false;
      if (!q) return true;

      const matchNumero = String(v.numero).includes(q);
      const matchCliente = (v.datosCliente?.razonSocial || 'consumidor final')
        .toLowerCase()
        .includes(q);
      const matchCuit = (v.datosCliente?.cuitDni || '').toLowerCase().includes(q);
      const matchItems = v.items.some((item) =>
        item.nombre.toLowerCase().includes(q)
      );

      return matchNumero || matchCliente || matchCuit || matchItems;
    });
  }, [ventas, busqueda, filtroTipo, filtroPago]);

  const resumen = useMemo(() => {
    const totalGeneral = ventasFiltradas.reduce((acc, v) => acc + v.total, 0);
    const totalEfectivo = ventasFiltradas
      .filter((v) => v.medioPago === 'Efectivo')
      .reduce((acc, v) => acc + v.total, 0);
    const totalDigital = ventasFiltradas
      .filter((v) => v.medioPago !== 'Efectivo')
      .reduce((acc, v) => acc + v.total, 0);

    return {
      cantidad: ventasFiltradas.length,
      totalGeneral,
      totalEfectivo,
      totalDigital,
    };
  }, [ventasFiltradas]);

  return (
    <section className="flex flex-col gap-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/75 p-4 backdrop-blur-md">
        <div>
          <h1 className="text-lg font-bold text-white">
            Historial de Ventas y Comprobantes
          </h1>
          <p className="text-xs text-slate-400">
            Consultá ventas emitidas, filtrá por medio de pago y reimprimí comprobantes en A4.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ventas.length > 0 && (
            <button
              type="button"
              onClick={onLimpiarHistorial}
              className="cursor-pointer rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20"
            >
              Limpiar Historial
            </button>
          )}
          <button
            type="button"
            onClick={onVolverPos}
            className="cursor-pointer rounded-xl bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Volver a Caja / POS
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
          <span className="text-xs text-slate-400">Operaciones</span>
          <p className="mt-1 text-xl font-bold text-white">{resumen.cantidad}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
          <span className="text-xs text-slate-400">Total Filtrado</span>
          <p className="mt-1 font-mono text-xl font-bold text-emerald-300">
            {formatoARS.format(resumen.totalGeneral)}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
          <span className="text-xs text-slate-400">Efectivo</span>
          <p className="mt-1 font-mono text-xl font-bold text-cyan-300">
            {formatoARS.format(resumen.totalEfectivo)}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
          <span className="text-xs text-slate-400">Transferencia / Tarjeta</span>
          <p className="mt-1 font-mono text-xl font-bold text-indigo-300">
            {formatoARS.format(resumen.totalDigital)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por N°, cliente, CUIT o producto..."
          className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none sm:w-72"
        />

        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'todos', label: 'Todos' },
              { id: 'comprobante', label: 'Comprobante' },
              { id: 'factura_arca', label: 'Factura ARCA' },
            ] as const
          ).map((op) => (
            <button
              key={op.id}
              type="button"
              onClick={() => setFiltroTipo(op.id)}
              className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                filtroTipo === op.id
                  ? 'bg-cyan-500 text-slate-950'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {op.label}
            </button>
          ))}

          <select
            value={filtroPago}
            onChange={(e) => setFiltroPago(e.target.value as 'Todos' | MedioPago)}
            aria-label="Filtrar por medio de pago"
            className="rounded-lg border border-white/15 bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-200 focus:border-cyan-400 focus:outline-none"
          >
            <option value="Todos">Pago: Todos</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Tarjeta">Tarjeta</option>
          </select>
        </div>
      </div>

      {/* Tabla de ventas */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/75 backdrop-blur-md">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-slate-950/60 text-slate-300">
              <th className="px-3 py-3 font-semibold">N°</th>
              <th className="px-3 py-3 font-semibold">Fecha / Hora</th>
              <th className="px-3 py-3 font-semibold">Tipo</th>
              <th className="px-3 py-3 font-semibold">Cliente / Detalle</th>
              <th className="px-3 py-3 font-semibold">Pago</th>
              <th className="px-3 py-3 text-right font-semibold">Total</th>
              <th className="px-3 py-3 text-right font-semibold">Comprobante</th>
            </tr>
          </thead>
          <tbody>
            {ventasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No hay ventas registradas que coincidan con los filtros.
                </td>
              </tr>
            ) : (
              ventasFiltradas.map((venta) => {
                const esFactura = venta.tipoComprobante === 'factura_arca';
                const clienteTexto =
                  venta.datosCliente?.razonSocial || 'Consumidor Final';
                const resumenItems = venta.items
                  .map((i) => `${i.cantidad}x ${i.nombre}`)
                  .join(', ');

                return (
                  <tr
                    key={venta.idRegistro}
                    className="border-b border-white/5 transition hover:bg-white/3 last:border-b-0"
                  >
                    <td className="px-3 py-2.5 font-mono font-semibold text-cyan-300">
                      #{String(venta.numero).padStart(8, '0')}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300">{venta.fechaHora}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          esFactura
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-indigo-500/20 text-indigo-300'
                        }`}
                      >
                        {esFactura ? 'Factura ARCA' : 'Comprobante'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-white">{clienteTexto}</div>
                      <div className="max-w-xs truncate text-[11px] text-slate-400">
                        {resumenItems}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-200">{venta.medioPago}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-300">
                      {formatoARS.format(venta.total)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onReimprimirVenta(venta)}
                        className="cursor-pointer rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20"
                      >
                        Ver / Imprimir A4
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}