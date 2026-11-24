import { useMemo, useState } from 'react';
import { ARTICULOS_INICIALES, SERVICIOS_RAPIDOS } from './data/catalogMock';
import type {
  DatosClienteFactura,
  ItemCarrito,
  ItemCatalogo,
  MedioPago,
  TipoComprobante,
} from './types/pos';
import { TopBarPos } from './components/pos/TopBarPos';
import { ScannerBar } from './components/pos/ScannerBar';
import { QuickServices } from './components/pos/QuickServices';
import { CartTable } from './components/pos/CartTable';
import { SummaryPanel } from './components/pos/SummaryPanel';
import {
  ComprobanteA4Modal,
  type ComprobanteEmitido,
} from './components/ticket/ComprobanteA4Modal';

export default function App() {
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [ultimosItemsFactura, setUltimosItemsFactura] = useState<ItemCarrito[]>([]);
  const [medioPago, setMedioPago] = useState<MedioPago>('Efectivo');
  const [feedback, setFeedback] = useState<{ texto: string; tipo: 'ok' | 'error' } | null>(null);
  const [ultimoComprobante, setUltimoComprobante] = useState<ComprobanteEmitido | null>(null);
  const [contadorTicket, setContadorTicket] = useState(1042);

  const catalogoCompleto = useMemo(
    () => [...ARTICULOS_INICIALES, ...SERVICIOS_RAPIDOS],
    []
  );

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

    if (tipoComprobante === 'comprobante') {
      setUltimoComprobante({
        numero: contadorTicket,
        fechaHora,
        cajero: 'Abel',
        tipoComprobante,
        datosCliente,
        items: carrito,
        total,
        medioPago,
      });
      setContadorTicket((n) => n + 1);
      setFeedback({
        texto: `Comprobante #${contadorTicket} listo para imprimir en A4.`,
        tipo: 'ok',
      });
    } else {
      setUltimoComprobante(null);
      setUltimosItemsFactura(carrito);
      setFeedback({
        texto: `Factura C emitida en ARCA (${datosCliente?.razonSocial || 'Consumidor Final'}).`,
        tipo: 'ok',
      });
    }

    setCarrito([]);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#060b14] text-slate-100 print:min-h-0 print:bg-white">
      <div className="pointer-events-none fixed -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl print:hidden" />
      <div className="pointer-events-none fixed top-1/3 -right-32 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl print:hidden" />

      <main className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 print:hidden">
        <TopBarPos cajero="Abel" cajaAbierta={true} lectoraActiva={true} />

        <ScannerBar
          catalogo={catalogoCompleto}
          onAgregarItem={agregarItem}
          onFeedback={(texto, tipo) => setFeedback({ texto, tipo })}
        />

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
              className="text-slate-300 hover:text-white ml-3"
            >
              Cerrar
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <QuickServices servicios={SERVICIOS_RAPIDOS} onSeleccionarServicio={agregarItem} />
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
      </main>

      <ComprobanteA4Modal
        comprobante={ultimoComprobante}
        onCerrar={() => setUltimoComprobante(null)}
      />
    </div>
  );
}