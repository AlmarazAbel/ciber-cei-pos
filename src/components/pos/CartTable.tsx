import { useEffect, useState } from 'react';
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
  const [imagenAmpliada, setImagenAmpliada] = useState<ItemCarrito | null>(null);

  useEffect(() => {
    if (!imagenAmpliada) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setImagenAmpliada(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imagenAmpliada]);

  return (
    <>
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
                        <button
                          type="button"
                          onClick={() => setImagenAmpliada(item)}
                          title={`Ver imagen ampliada de ${item.nombre}`}
                          className="group relative block h-10 w-10 cursor-pointer overflow-hidden rounded-lg border border-slate-700/80 bg-slate-800 transition hover:border-cyan-400/70"
                        >
                          <img
                            src={item.imagen}
                            alt={item.nombre}
                            className="h-full w-full object-cover transition duration-150 group-hover:scale-105"
                          />
                        </button>
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

      {/* Modal de imagen ampliada */}
      {imagenAmpliada?.imagen && (
        <div
          onClick={() => setImagenAmpliada(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-slate-700/80 bg-slate-900 p-4 text-slate-100 shadow-2xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white sm:text-base">
                  {imagenAmpliada.nombre}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {imagenAmpliada.codigoBarras
                    ? `Código: ${imagenAmpliada.codigoBarras}`
                    : imagenAmpliada.tipo === 'articulo'
                    ? 'Artículo suelto'
                    : 'Servicio'}{' '}
                  · Unitario:{' '}
                  <span className="font-semibold text-cyan-300">
                    {formatoARS.format(imagenAmpliada.precio)}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImagenAmpliada(null)}
                aria-label="Cerrar vista ampliada"
                className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex max-h-[65vh] items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80 p-3">
              <img
                src={imagenAmpliada.imagen}
                alt={imagenAmpliada.nombre}
                className="max-h-[58vh] w-auto max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}