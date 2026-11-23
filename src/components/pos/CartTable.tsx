import type { ItemCarrito } from '../../types/pos';

interface CartTableProps {
  items: ItemCarrito[];
  onCambiarCantidad: (id: string, delta: number) => void;
  onQuitarItem: (id: string) => void;
}

const formatoARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function CartTable({ items, onCambiarCantidad, onQuitarItem }: CartTableProps) {
  return (
    <section className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 backdrop-blur-xl flex flex-col justify-between min-h-80">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-700/70 text-slate-400">
              <th className="py-2.5 pr-2 font-semibold">Imagen</th>
              <th className="py-2.5 px-2 font-semibold">Producto</th>
              <th className="py-2.5 px-2 font-semibold text-center">Cantidad</th>
              <th className="py-2.5 px-2 font-semibold text-right">Unitario</th>
              <th className="py-2.5 pl-2 font-semibold text-right">Total</th>
              <th className="py-2.5 pl-2 w-8 text-right" aria-label="Quitar" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  Escaneá un código de barras, tipeá el nombre o tocá un Servicio Rápido.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="text-slate-100 hover:bg-slate-800/40 transition">
                  <td className="py-2.5 pr-2">
                    {item.imagen ? (
                      <img
                        src={item.imagen}
                        alt={item.nombre}
                        className="h-10 w-10 rounded-lg object-cover border border-slate-700/80 bg-slate-800"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-[10px] font-bold text-cyan-300 uppercase">
                        {item.tipo === 'servicio' ? 'SRV' : 'ART'}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-2 font-medium">
                    <div className="truncate max-w-42.5 sm:max-w-55">{item.nombre}</div>
                    {!item.codigoBarras && item.tipo === 'articulo' && (
                      <span className="text-[11px] text-slate-400">Suelto</span>
                    )}
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onCambiarCantidad(item.id, -1)}
                        className="h-6 w-6 rounded-md border border-slate-600/70 bg-slate-800 text-slate-200 hover:border-cyan-400/50 hover:text-cyan-300"
                        aria-label={`Restar cantidad de ${item.nombre}`}
                      >
                        -
                      </button>
                      <span className="min-w-6 text-center font-semibold">
                        {item.cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => onCambiarCantidad(item.id, 1)}
                        className="h-6 w-6 rounded-md border border-slate-600/70 bg-slate-800 text-slate-200 hover:border-cyan-400/50 hover:text-cyan-300"
                        aria-label={`Sumar cantidad de ${item.nombre}`}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right text-slate-300">
                    {formatoARS.format(item.precio)}
                  </td>
                  <td className="py-2.5 pl-2 text-right font-semibold text-cyan-300">
                    {formatoARS.format(item.precio * item.cantidad)}
                  </td>
                  <td className="py-2.5 pl-2 text-right">
                    <button
                      type="button"
                      onClick={() => onQuitarItem(item.id)}
                      className="rounded-md px-1.5 py-0.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300 transition"
                      title="Quitar ítem"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}