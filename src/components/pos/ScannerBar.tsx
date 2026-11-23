import { useEffect, useMemo, useRef, useState } from 'react';
import type { ItemCatalogo } from '../../types/pos';

interface ScannerBarProps {
  catalogo: ItemCatalogo[];
  onAgregarItem: (item: ItemCatalogo) => void;
  onFeedback?: (mensaje: string, tipo: 'ok' | 'error') => void;
}

const formatoARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function ScannerBar({ catalogo, onAgregarItem, onFeedback }: ScannerBarProps) {
  const [query, setQuery] = useState('');
  const [abierto, setAbierto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickFuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  const sugerencias = useMemo(() => {
    const limpio = query.trim().toLowerCase();
    if (!limpio) return [];

    return catalogo.filter(
      (item) =>
        item.nombre.toLowerCase().includes(limpio) ||
        (item.codigoBarras && item.codigoBarras.toLowerCase().includes(limpio))
    );
  }, [catalogo, query]);

  const seleccionarItem = (item: ItemCatalogo) => {
    onAgregarItem(item);
    onFeedback?.(`Agregado: ${item.nombre}`, 'ok');
    setQuery('');
    setAbierto(false);
    inputRef.current?.focus();
  };

  const handleEnter = () => {
    const limpio = query.trim();
    if (!limpio) return;

    const porCodigo = catalogo.find(
      (item) => item.codigoBarras?.toLowerCase() === limpio.toLowerCase()
    );
    if (porCodigo) {
      seleccionarItem(porCodigo);
      return;
    }

    if (sugerencias.length === 1) {
      seleccionarItem(sugerencias[0]);
      return;
    }

    if (sugerencias.length > 1) {
      setAbierto(true);
      onFeedback?.(`Elegí el artículo de la lista (${sugerencias.length} coincidencias).`, 'ok');
      return;
    }

    onFeedback?.(`No se encontró ningún artículo ni código "${limpio}".`, 'error');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEnter();
    } else if (e.key === 'Escape') {
      setAbierto(false);
    }
  };

  return (
    <div ref={contenedorRef} className="relative">
      <div className="rounded-2xl border border-cyan-400/35 bg-slate-900/70 p-3.5 backdrop-blur-xl shadow-[0_0_25px_rgba(34,211,238,0.12)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-1 items-center gap-3">
            <span className="rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-2.5 py-1.5 font-mono text-xs font-semibold text-cyan-300">
              [||||]
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setAbierto(true);
              }}
              onFocus={() => {
                if (query.trim()) setAbierto(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Escanear código o tipear nombre (ej. Cable SATA Datos, Logitech)..."
              className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <span className="self-start sm:self-auto rounded-full border border-cyan-400/25 bg-slate-800/80 px-3 py-1 text-xs font-medium text-cyan-300">
            Escaneo y búsqueda activos
          </span>
        </div>
      </div>

      {abierto && query.trim().length > 0 && (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-cyan-400/30 bg-slate-900/95 p-2 backdrop-blur-xl shadow-2xl">
          {sugerencias.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-slate-400">
              Sin resultados para &ldquo;{query.trim()}&rdquo;.
            </p>
          ) : (
            sugerencias.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => seleccionarItem(item)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs sm:text-sm text-slate-100 transition hover:bg-cyan-500/15"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.imagen ? (
                    <img
                      src={item.imagen}
                      alt={item.nombre}
                      className="h-9 w-9 shrink-0 rounded-lg object-cover border border-slate-700"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-[10px] font-bold text-cyan-300 uppercase">
                      SRV
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{item.nombre}</p>
                    <p className="text-[11px] text-slate-400">
                      {item.codigoBarras ? `Cód: ${item.codigoBarras}` : 'Artículo suelto / sin código'}
                    </p>
                  </div>
                </div>

                <span className="shrink-0 font-semibold text-cyan-300">
                  {formatoARS.format(item.precio)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}