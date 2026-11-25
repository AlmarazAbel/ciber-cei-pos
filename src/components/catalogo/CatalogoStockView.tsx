import { useEffect, useMemo, useState } from 'react';
import type { ItemCatalogo, TipoItem } from '../../types/pos';

interface CatalogoStockViewProps {
  items: ItemCatalogo[];
  onCrearItem: (nuevo: Omit<ItemCatalogo, 'id'> & { id?: string }) => void;
  onActualizarItem: (item: ItemCatalogo) => void;
  onEliminarItem: (id: string) => void;
  onRestablecerCatalogo: () => void;
  onVolverPos: () => void;
}

interface FormState {
  id: string;
  nombre: string;
  codigoBarras: string;
  precio: string;
  precioCompra: string;
  tipo: TipoItem;
  stock: string;
  imagen: string;
}

const STOCK_BAJO_UMBRAL = 5;
const MAX_IMAGEN_BYTES = 700 * 1024; // ~700 KB para cuidar localStorage

const formVacio: FormState = {
  id: '',
  nombre: '',
  codigoBarras: '',
  precio: '',
  precioCompra: '',
  tipo: 'articulo',
  stock: '10',
  imagen: '',
};

const formatoMoneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});

function calcularMargenPct(precioVenta: number, precioCompra?: number): number | null {
  if (!precioCompra || precioCompra <= 0 || precioVenta <= 0) return null;
  return ((precioVenta - precioCompra) / precioCompra) * 100;
}

export function CatalogoStockView({
  items,
  onCrearItem,
  onActualizarItem,
  onEliminarItem,
  onRestablecerCatalogo,
  onVolverPos,
}: CatalogoStockViewProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoItem>('todos');
  const [soloStockBajo, setSoloStockBajo] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(formVacio);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const [imagenAmpliada, setImagenAmpliada] = useState<ItemCatalogo | null>(null);

  const [edicionRapidaId, setEdicionRapidaId] = useState<string | null>(null);
  const [rapidoPrecioCompra, setRapidoPrecioCompra] = useState('');
  const [rapidoPrecio, setRapidoPrecio] = useState('');
  const [rapidoStock, setRapidoStock] = useState('');

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

  const itemsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return items.filter((item) => {
      if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false;
      if (soloStockBajo) {
        if (item.tipo !== 'articulo') return false;
        const st = item.stock ?? 0;
        if (st > STOCK_BAJO_UMBRAL) return false;
      }
      if (!q) return true;
      return (
        item.nombre.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.codigoBarras ?? '').toLowerCase().includes(q)
      );
    });
  }, [items, busqueda, filtroTipo, soloStockBajo]);

  const resumen = useMemo(() => {
    const articulos = items.filter((i) => i.tipo === 'articulo');
    const servicios = items.filter((i) => i.tipo === 'servicio');
    const stockCritico = articulos.filter((i) => (i.stock ?? 0) <= STOCK_BAJO_UMBRAL);
    const valorInventarioCompra = articulos.reduce(
      (acc, i) => acc + (i.precioCompra ?? 0) * (i.stock ?? 0),
      0
    );
    return {
      totalArticulos: articulos.length,
      totalServicios: servicios.length,
      stockCriticoCount: stockCritico.length,
      valorInventarioCompra,
    };
  }, [items]);

  const abrirNuevoModal = () => {
    setEditandoId(null);
    setForm(formVacio);
    setErrorForm(null);
    setModalAbierto(true);
  };

  const abrirEditarModal = (item: ItemCatalogo) => {
    setEditandoId(item.id);
    setForm({
      id: item.id,
      nombre: item.nombre,
      codigoBarras: item.codigoBarras ?? '',
      precio: String(item.precio),
      precioCompra: item.precioCompra !== undefined ? String(item.precioCompra) : '',
      tipo: item.tipo,
      stock: item.tipo === 'articulo' ? String(item.stock ?? 0) : '0',
      imagen: item.imagen ?? '',
    });
    setErrorForm(null);
    setModalAbierto(true);
  };

  const handleArchivoImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    if (!archivo.type.startsWith('image/')) {
      setErrorForm('Seleccioná un archivo de imagen válido (JPG, PNG, WEBP).');
      return;
    }

    if (archivo.size > MAX_IMAGEN_BYTES) {
      setErrorForm('La imagen supera los 700 KB. Elegí una más liviana o usá una URL.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setErrorForm(null);
        setForm((f) => ({ ...f, imagen: reader.result as string }));
      }
    };
    reader.readAsDataURL(archivo);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const nombreLimpio = form.nombre.trim();
    const precioNum = Number(form.precio);
    const compraRaw = form.precioCompra.trim();
    const precioCompraNum =
      compraRaw !== '' && !Number.isNaN(Number(compraRaw)) && Number(compraRaw) >= 0
        ? Number(compraRaw)
        : undefined;
    const stockNum =
      form.tipo === 'articulo'
        ? Math.max(0, Math.floor(Number(form.stock) || 0))
        : undefined;

    if (!nombreLimpio) {
      setErrorForm('Ingresá el nombre del producto o servicio.');
      return;
    }
    if (Number.isNaN(precioNum) || precioNum <= 0) {
      setErrorForm('Ingresá un precio de venta mayor a 0.');
      return;
    }

    const codigoLimpio = form.codigoBarras.trim() || undefined;
    const idLimpio = form.id.trim();
    const imagenLimpia = form.imagen.trim() || undefined;

    if (editandoId) {
      onActualizarItem({
        id: editandoId,
        nombre: nombreLimpio,
        codigoBarras: codigoLimpio,
        precio: precioNum,
        precioCompra: precioCompraNum,
        tipo: form.tipo,
        stock: stockNum,
        imagen: imagenLimpia,
      });
    } else {
      onCrearItem({
        id: idLimpio || undefined,
        nombre: nombreLimpio,
        codigoBarras: codigoLimpio,
        precio: precioNum,
        precioCompra: precioCompraNum,
        tipo: form.tipo,
        stock: stockNum,
        imagen: imagenLimpia,
      });
    }

    setModalAbierto(false);
    setEditandoId(null);
    setForm(formVacio);
  };

  const iniciarEdicionRapida = (item: ItemCatalogo) => {
    setEdicionRapidaId(item.id);
    setRapidoPrecioCompra(
      item.precioCompra !== undefined ? String(item.precioCompra) : ''
    );
    setRapidoPrecio(String(item.precio));
    setRapidoStock(String(item.stock ?? 0));
  };

  const guardarEdicionRapida = (item: ItemCatalogo) => {
    const nuevoPrecio = Number(rapidoPrecio);
    if (Number.isNaN(nuevoPrecio) || nuevoPrecio <= 0) return;

    const compraTrim = rapidoPrecioCompra.trim();
    const nuevoPrecioCompra =
      compraTrim !== '' && !Number.isNaN(Number(compraTrim)) && Number(compraTrim) >= 0
        ? Number(compraTrim)
        : undefined;

    const nuevoStock =
      item.tipo === 'articulo'
        ? Math.max(0, Math.floor(Number(rapidoStock) || 0))
        : undefined;

    onActualizarItem({
      ...item,
      precioCompra: nuevoPrecioCompra,
      precio: nuevoPrecio,
      stock: nuevoStock,
    });
    setEdicionRapidaId(null);
  };

  const margenFormulario = calcularMargenPct(
    Number(form.precio),
    form.precioCompra.trim() !== '' ? Number(form.precioCompra) : undefined
  );

  return (
    <section className="flex flex-col gap-4">
      {/* Encabezado y acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/75 p-4 backdrop-blur-md">
        <div>
          <h1 className="text-lg font-bold text-white">
            Catálogo y Stock de Productos / Servicios
          </h1>
          <p className="text-xs text-slate-400">
            Gestión local ABM con costo de compra, imagen y stock (listo para conectar a tu backend).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={abrirNuevoModal}
            className="cursor-pointer rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            + Nuevo Ítem
          </button>
          <button
            type="button"
            onClick={onRestablecerCatalogo}
            className="cursor-pointer rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10"
          >
            Restablecer Inicial
          </button>
          <button
            type="button"
            onClick={onVolverPos}
            className="cursor-pointer rounded-xl bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Volver a Caja / POS
          </button>
        </div>
      </div>

      {/* Tarjetas métricas */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
          <span className="text-xs text-slate-400">Artículos con Stock</span>
          <p className="mt-1 text-xl font-bold text-white">{resumen.totalArticulos}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
          <span className="text-xs text-slate-400">Servicios Rápidos</span>
          <p className="mt-1 text-xl font-bold text-cyan-300">{resumen.totalServicios}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
          <span className="text-xs text-slate-400">
            Stock Bajo / Crítico (&le; {STOCK_BAJO_UMBRAL})
          </span>
          <p
            className={`mt-1 text-xl font-bold ${
              resumen.stockCriticoCount > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {resumen.stockCriticoCount}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
          <span className="text-xs text-slate-400">Stock Valorizado (Compra)</span>
          <p className="mt-1 font-mono text-xl font-bold text-slate-100">
            {formatoMoneda.format(resumen.valorInventarioCompra)}
          </p>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/60 p-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, código o código de barras..."
          className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-xs text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none sm:w-80"
        />

        <div className="flex flex-wrap items-center gap-2">
          {(['todos', 'articulo', 'servicio'] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setFiltroTipo(tipo)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filtroTipo === tipo
                  ? 'bg-cyan-500 text-slate-950'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {tipo === 'todos' ? 'Todos' : tipo === 'articulo' ? 'Artículos' : 'Servicios'}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setSoloStockBajo((prev) => !prev)}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              soloStockBajo
                ? 'bg-amber-500 text-slate-950'
                : 'border border-white/10 bg-white/5 text-amber-300 hover:bg-white/10'
            }`}
          >
            Solo stock bajo
          </button>
        </div>
      </div>

      {/* Tabla de catálogo */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/75 backdrop-blur-md">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-slate-950/60 text-slate-300">
              <th className="px-3 py-3 font-semibold">Img</th>
              <th className="px-3 py-3 font-semibold">Código / Barras</th>
              <th className="px-3 py-3 font-semibold">Nombre</th>
              <th className="px-3 py-3 font-semibold">Tipo</th>
              <th className="px-3 py-3 text-right font-semibold">P. Compra</th>
              <th className="px-3 py-3 text-right font-semibold">P. Venta</th>
              <th className="px-3 py-3 text-right font-semibold">Stock</th>
              <th className="px-3 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {itemsFiltrados.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  No hay productos o servicios que coincidan con el filtro.
                </td>
              </tr>
            ) : (
              itemsFiltrados.map((item) => {
                const enEdicionRapida = edicionRapidaId === item.id;
                const stockVal = item.stock ?? 0;
                const esStockBajo = item.tipo === 'articulo' && stockVal <= STOCK_BAJO_UMBRAL;
                const margen = calcularMargenPct(item.precio, item.precioCompra);

                return (
                  <tr
                    key={item.id}
                    className="border-b border-white/5 transition hover:bg-white/3 last:border-b-0"
                  >
                    <td className="px-3 py-2">
                      {item.imagen ? (
                        <button
                          type="button"
                          onClick={() => setImagenAmpliada(item)}
                          title={`Ver imagen ampliada de ${item.nombre}`}
                          className="group relative block h-10 w-10 cursor-pointer overflow-hidden rounded-lg border border-white/15 bg-slate-950 transition hover:border-cyan-400/70"
                        >
                          <img
                            src={item.imagen}
                            alt={item.nombre}
                            className="h-full w-full object-cover transition duration-150 group-hover:scale-105"
                          />
                        </button>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-white/15 bg-slate-950/60 text-[10px] font-semibold text-slate-500">
                          SIN IMG
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2.5 font-mono text-[11px]">
                      <div className="text-slate-400">{item.id}</div>
                      {item.codigoBarras && (
                        <div className="text-cyan-300/90">{item.codigoBarras}</div>
                      )}
                    </td>

                    <td className="px-3 py-2.5 font-medium text-white">
                      <div>{item.nombre}</div>
                      {margen !== null && (
                        <div
                          className={`text-[10px] font-mono ${
                            margen >= 0 ? 'text-emerald-400/90' : 'text-rose-400'
                          }`}
                        >
                          Margen: {margen >= 0 ? '+' : ''}
                          {margen.toFixed(0)}%
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          item.tipo === 'articulo'
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'bg-cyan-500/20 text-cyan-300'
                        }`}
                      >
                        {item.tipo === 'articulo' ? 'Artículo' : 'Servicio'}
                      </span>
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                      {enEdicionRapida ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={rapidoPrecioCompra}
                          onChange={(e) => setRapidoPrecioCompra(e.target.value)}
                          placeholder="0.00"
                          className="w-24 rounded border border-cyan-400 bg-slate-950 px-2 py-1 text-right text-xs text-white focus:outline-none"
                        />
                      ) : item.precioCompra !== undefined ? (
                        formatoMoneda.format(item.precioCompra)
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-emerald-300">
                      {enEdicionRapida ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={rapidoPrecio}
                          onChange={(e) => setRapidoPrecio(e.target.value)}
                          className="w-24 rounded border border-cyan-400 bg-slate-950 px-2 py-1 text-right text-xs text-white focus:outline-none"
                        />
                      ) : (
                        formatoMoneda.format(item.precio)
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-right font-mono">
                      {item.tipo === 'servicio' ? (
                        <span className="text-slate-500">N/A</span>
                      ) : enEdicionRapida ? (
                        <input
                          type="number"
                          min="0"
                          value={rapidoStock}
                          onChange={(e) => setRapidoStock(e.target.value)}
                          className="w-20 rounded border border-cyan-400 bg-slate-950 px-2 py-1 text-right text-xs text-white focus:outline-none"
                        />
                      ) : (
                        <span
                          className={`rounded-md px-2 py-0.5 font-semibold ${
                            esStockBajo
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-white/5 text-slate-200'
                          }`}
                        >
                          {stockVal}
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {enEdicionRapida ? (
                          <>
                            <button
                              type="button"
                              onClick={() => guardarEdicionRapida(item)}
                              className="cursor-pointer rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-slate-950 hover:bg-emerald-400"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEdicionRapidaId(null)}
                              className="cursor-pointer rounded-md border border-white/15 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => iniciarEdicionRapida(item)}
                              className="cursor-pointer rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-200 hover:bg-cyan-500/20"
                            >
                              Precios/Stock
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirEditarModal(item)}
                              className="cursor-pointer rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-medium text-white hover:bg-white/15"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => onEliminarItem(item.id)}
                              className="cursor-pointer rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20"
                            >
                              Borrar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
                    ? `Código de barras: ${imagenAmpliada.codigoBarras}`
                    : `ID: ${imagenAmpliada.id}`}{' '}
                  · Venta:{' '}
                  <span className="font-semibold text-emerald-300">
                    {formatoMoneda.format(imagenAmpliada.precio)}
                  </span>
                  {imagenAmpliada.precioCompra !== undefined && (
                    <>
                      {' '}
                      · Compra:{' '}
                      <span className="font-semibold text-slate-200">
                        {formatoMoneda.format(imagenAmpliada.precioCompra)}
                      </span>
                    </>
                  )}
                  {imagenAmpliada.tipo === 'articulo' && (
                    <> · Stock: {imagenAmpliada.stock ?? 0}</>
                  )}
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

      {/* Modal Alta / Edición completa */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="my-4 w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-5 text-slate-100 shadow-2xl">
            <h2 className="text-base font-bold text-white">
              {editandoId ? 'Editar Producto / Servicio' : 'Nuevo Producto / Servicio'}
            </h2>

            <form onSubmit={handleSubmitForm} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-medium text-slate-300">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['articulo', 'servicio'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={Boolean(editandoId)}
                      onClick={() => setForm((f) => ({ ...f, tipo: t }))}
                      className={`cursor-pointer rounded-lg border py-2 font-semibold transition disabled:opacity-50 ${
                        form.tipo === t
                          ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                          : 'border-white/10 bg-slate-950/50 text-slate-400'
                      }`}
                    >
                      {t === 'articulo' ? 'Artículo (con stock)' : 'Servicio rápido'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium text-slate-300">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Pendrive Kingston 64GB"
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-slate-300">
                    Código interno (opcional)
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(editandoId)}
                    value={form.id}
                    onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                    placeholder="Ej: art-10"
                    className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 font-mono text-white disabled:opacity-50 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-300">
                    Código de barras
                  </label>
                  <input
                    type="text"
                    value={form.codigoBarras}
                    onChange={(e) => setForm((f) => ({ ...f, codigoBarras: e.target.value }))}
                    placeholder="Escaneá o escribí"
                    className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-slate-300">
                    Precio de compra ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.precioCompra}
                    onChange={(e) => setForm((f) => ({ ...f, precioCompra: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-medium text-slate-300">
                    Precio de venta ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.precio}
                    onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Margen estimado:</span>
                <span
                  className={`font-mono font-semibold ${
                    margenFormulario === null
                      ? 'text-slate-500'
                      : margenFormulario >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {margenFormulario === null
                    ? 'Cargá precio de compra y venta'
                    : `${margenFormulario >= 0 ? '+' : ''}${margenFormulario.toFixed(1)}%`}
                </span>
              </div>

              {form.tipo === 'articulo' && (
                <div>
                  <label className="mb-1 block font-medium text-slate-300">
                    Stock inicial
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              )}

              {/* Imagen del ítem */}
              <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950/50 p-3">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-slate-300">
                    Imagen del producto / servicio
                  </label>
                  {form.imagen && (
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, imagen: '' }))}
                      className="cursor-pointer text-[11px] text-rose-300 hover:underline"
                    >
                      Quitar imagen
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleArchivoImagen}
                  className="block w-full text-[11px] text-slate-300 file:mr-2.5 file:cursor-pointer file:rounded-lg file:border-0 file:bg-cyan-500/20 file:px-2.5 file:py-1.5 file:font-semibold file:text-cyan-200 hover:file:bg-cyan-500/30"
                />

                <input
                  type="text"
                  value={form.imagen.startsWith('data:') ? '' : form.imagen}
                  onChange={(e) => setForm((f) => ({ ...f, imagen: e.target.value }))}
                  placeholder="O pegá una URL de imagen (https://...)"
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-1.5 text-[11px] text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />

                {form.imagen && (
                  <div className="pt-1">
                    <img
                      src={form.imagen}
                      alt="Vista previa"
                      className="h-20 w-20 rounded-lg border border-white/15 object-cover bg-slate-900"
                    />
                  </div>
                )}
              </div>

              {errorForm && (
                <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-rose-200">
                  {errorForm}
                </p>
              )}

              <div className="mt-4 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="cursor-pointer rounded-lg border border-white/15 px-3.5 py-2 font-medium text-slate-300 hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  {editandoId ? 'Guardar Cambios' : 'Crear Ítem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}