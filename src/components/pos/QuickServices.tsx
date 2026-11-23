import type { ItemCatalogo } from '../../types/pos';

interface QuickServicesProps {
  servicios: ItemCatalogo[];
  onSeleccionarServicio: (servicio: ItemCatalogo) => void;
}

const formatoARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function QuickServices({ servicios, onSeleccionarServicio }: QuickServicesProps) {
  return (
    <aside className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4 backdrop-blur-xl flex flex-col gap-3">
      <h2 className="text-xs font-bold tracking-widest text-slate-300 uppercase">
        Servicios Rápidos
      </h2>

      <div className="flex flex-col gap-2">
        {servicios.map((srv) => (
          <button
            key={srv.id}
            type="button"
            onClick={() => onSeleccionarServicio(srv)}
            className="group flex items-center justify-between rounded-xl border border-slate-700/70 bg-slate-800/60 px-3.5 py-2.5 text-left text-xs sm:text-sm text-slate-200 transition hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-white active:scale-[0.99]"
          >
            <span className="font-medium truncate pr-2">{srv.nombre}</span>
            <span className="shrink-0 font-semibold text-cyan-300 group-hover:text-cyan-200">
              {formatoARS.format(srv.precio)}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
