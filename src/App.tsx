import { useEffect, useMemo, useState } from 'react';
import type {
  DatosClienteFactura,
  ItemCarrito,
  ItemCatalogo,
  MedioPago,
  TipoComprobante,
} from './types/pos';
import {
  cargarCatalogoInicial,
  guardarCatalogoLocal,
  restablecerCatalogoPorDefecto,
} from './services/catalogoService';
import {
  cargarHistorialInicial,
  guardarHistorialLocal,
  limpiarHistorialLocal,
  type VentaRegistrada,
} from './services/historialService';
import { TopBarPos } from './components/pos/TopBarPos';
import { ScannerBar } from './components/pos/ScannerBar';
import { QuickServices } from './components/pos/QuickServices';
import { CartTable } from './components/pos/CartTable';
import { SummaryPanel } from './components/pos/SummaryPanel';
import { CatalogoStockView } from './components/catalogo/CatalogoStockView';
import { HistorialVentasView } from './components/historial/HistorialVentasView';
import {
  ComprobanteA4Modal,
  type ComprobanteEmitido,
} from './components/ticket/ComprobanteA4Modal';

type VistaActiva = 'pos' | 'catalogo' | 'historial';

export default function App() {
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('pos');
  const [catalogo, setCatalogo] = useState<ItemCatalogo[]>(() => cargarCatalogoInicial());
  const [historial, setHistorial] = useState<VentaRegistrada[]>(() =>
    cargarHistorialInicial()
  );
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [ultimosItemsFactura, setUltimosItemsFactura] = useState<ItemCarrito[]>([]);
  const [medioPago, setMedioPago] = useState<MedioPago>('Efectivo');
  const [feedback, setFeedback] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null);
  const [ultimoComprobante, setUltimoComprobante] = useState<ComprobanteEmitido | null>(null);
  const [contadorTicket, setContadorTicket] = useState(1042);

  useEffect(() => {
    guardarCatalogoLocal(catalogo);
  }, [catalogo]);

  useEffect(() => {
    guardarHistorialLocal(historial);
  }, [historial]);

  const serviciosRapidos = useMemo(
    () => catalogo.filter((item) => item.tipo === 'servicio'),
    [catalogo]
  );

  const crearItemCatalogo = (nuevo: Omit<ItemCatalogo, 'id'> & { id?: string }) => {
    const prefijo = nuevo.tipo === 'servicio' ? 'srv' : 'art';
    const idGenerado =
      nuevo.id || `${prefijo}-${Date.now().toString().slice(-6)}`;

    if (catalogo.some((i) => i.id === idGenerado)) {
      setFeedback({
        texto: `Ya existe un ítem con el código "${idGenerado}".`,
        tipo: 'error',
      });
      return;
    }

    const itemCreado: ItemCatalogo = {
      ...nuevo,
      id: idGenerado,
    };

    setCatalogo((prev) => [itemCreado, ...prev]);
    setFeedback({
      texto: `"${itemCreado.nombre}" agregado al catálogo.`,
      tipo: 'ok',
    });
  };

  const actualizarItemCatalogo = (actualizado: ItemCatalogo) => {
    setCatalogo((prev) =>
      prev.map((item) => (item.id === actualizado.id ? actualizado : item))
    );
    setFeedback({
      texto: `"${actualizado.nombre}" actualizado.`,
      tipo: 'ok',
    });
  };

  const eliminarItemCatalogo = (id: string) => {
    setCatalogo((prev) => prev.filter((item) => item.id !== id));
    setCarrito((prev) => prev.filter((item) => item.id !== id));
    setFeedback({
      texto: 'Ítem eliminado del catálogo.',
      tipo: 'ok',
    });
  };

  const handleRestablecerCatalogo = () => {
    const restaurado = restablecerCatalogoPorDefecto();
    setCatalogo(restaurado);
    setFeedback({
      texto: 'Catálogo restablecido a los valores iniciales.',
      tipo: 'ok',
    });
  };

  const descontarStockVenta = (itemsVendidos: ItemCarrito[]) => {
    setCatalogo((prev) =>
      prev.map((item) => {
        if (item.tipo !== 'articulo' || typeof item.stock !== 'number') {
          return item;
        }
        const vendido = itemsVendidos.find((v) => v.id === item.id);
        if (!vendido) return item;
        return {
          ...item,
          stock: Math.max(0, item.stock - vendido.cantidad),
        };
      })
    );
  };

  const agregarItem = (item: ItemCatalogo) => {
    setCarrito((prev) => {
      const existente = prev.find((i) => i.id === item.id);
      if (existente) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [...prev, { ...item, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (id: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, cantidad: item.cantidad + delta } : item
        )
        .filter((item) => item.cantidad > 0)
    );
  };

  const quitarItem = (id: string) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const total = useMemo(
    () => carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0),
    [carrito]
  );

  const emitirDocumento = (
    tipoComprobante: TipoComprobante,
    datosCliente?: DatosClienteFactura
  ) => {
    if (carrito.length === 0) return;

    const fechaHora = new Date().toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const numeroActual = contadorTicket;

    const comprobanteGenerado: ComprobanteEmitido = {
      numero: numeroActual,
      fechaHora,
      cajero: 'Abel',
      tipoComprobante,
      datosCliente,
      items: carrito,
      total,
      medioPago,
    };

    const registroVenta: VentaRegistrada = {
      ...comprobanteGenerado,
      idRegistro: `venta-${Date.now()}-${numeroActual}`,
    };

    descontarStockVenta(carrito);
    setHistorial((prev) => [registroVenta, ...prev]);
    setContadorTicket((n) => n + 1);

    if (tipoComprobante === 'comprobante') {
      setUltimoComprobante(comprobanteGenerado);
      setFeedback({
        texto: `Comprobante #${numeroActual} emitido y guardado en el historial.`,
        tipo: 'ok',
      });
    } else {
      setUltimoComprobante(null);
      setUltimosItemsFactura(carrito);
      setFeedback({
        texto: `Factura C #${numeroActual} emitida y guardada en el historial (${
          datosCliente?.razonSocial || 'Consumidor Final'
        }).`,
        tipo: 'ok',
      });
    }

    setCarrito([]);
  };

  const handleLimpiarHistorial = () => {
    const vacio = limpiarHistorialLocal();
    setHistorial(vacio);
    setFeedback({
      texto: 'Historial de ventas limpiado.',
      tipo: 'ok',
    });
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#060b14] text-slate-100 print:min-h-0 print:bg-white">
      <div className="pointer-events-none fixed -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl print:hidden" />
      <div className="pointer-events-none fixed top-1/3 -right-32 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl print:hidden" />

      <main className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 print:hidden">
        <TopBarPos cajero="Abel" cajaAbierta={true} lectoraActiva={true} />

        {/* Navegación principal */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setVistaActiva('pos')}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                vistaActiva === 'pos'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              Caja / POS
            </button>
            <button
              type="button"
              onClick={() => setVistaActiva('catalogo')}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                vistaActiva === 'catalogo'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              Catálogo y Stock ({catalogo.length})
            </button>
            <button
              type="button"
              onClick={() => setVistaActiva('historial')}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                vistaActiva === 'historial'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              Historial de Ventas ({historial.length})
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`flex items-center justify-between rounded-xl border px-4 py-2 text-xs ${
              feedback.tipo === 'ok'
                ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200'
                : 'border-rose-400/30 bg-rose-500/10 text-rose-200'
            }`}
          >
            <span>{feedback.texto}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="ml-3 text-slate-300 hover:text-white"
            >
              Cerrar
            </button>
          </div>
        )}

        {vistaActiva === 'catalogo' ? (
          <CatalogoStockView
            items={catalogo}
            onCrearItem={crearItemCatalogo}
            onActualizarItem={actualizarItemCatalogo}
            onEliminarItem={eliminarItemCatalogo}
            onRestablecerCatalogo={handleRestablecerCatalogo}
            onVolverPos={() => setVistaActiva('pos')}
          />
        ) : vistaActiva === 'historial' ? (
          <HistorialVentasView
            ventas={historial}
            onReimprimirVenta={(venta) => setUltimoComprobante(venta)}
            onLimpiarHistorial={handleLimpiarHistorial}
            onVolverPos={() => setVistaActiva('pos')}
          />
        ) : (
          <>
            <ScannerBar
              catalogo={catalogo}
              onAgregarItem={agregarItem}
              onFeedback={(texto, tipo) => setFeedback({ texto, tipo })}
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <QuickServices
                  servicios={serviciosRapidos}
                  onSeleccionarServicio={agregarItem}
                />
              </div>

              <div className="lg:col-span-6">
                <CartTable
                  items={carrito}
                  onCambiarCantidad={cambiarCantidad}
                  onQuitarItem={quitarItem}
                />
              </div>

              <div className="lg:col-span-3">
                <SummaryPanel
                  total={total}
                  medioPago={medioPago}
                  items={carrito.length > 0 ? carrito : ultimosItemsFactura}
                  onCambiarMedioPago={setMedioPago}
                  onEmitir={emitirDocumento}
                  disabled={carrito.length === 0}
                />
              </div>
            </div>
          </>
        )}
      </main>

      <ComprobanteA4Modal
        comprobante={ultimoComprobante}
        onCerrar={() => setUltimoComprobante(null)}
      />
    </div>
  );
}