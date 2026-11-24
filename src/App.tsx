import { useEffect, useMemo, useState } from 'react';
import type {
  DatosClienteFactura,
  ItemCarrito,
  ItemCatalogo,
  MedioPago,
  TipoComprobante,
} from './types/pos';
import {
  cargarSesionInicial,
  cargarUsuariosLocales,
  cerrarSesionLocal,
  guardarUsuariosLocales,
  type RolUsuarioPos,
  type SesionPos,
  type UsuarioPos,
} from './services/authService';
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
import {
  cargarEstadoArqueo,
  guardarEstadoArqueo,
  type CierreCajaRegistrado,
  type MovimientoCaja,
} from './services/arqueoService';
import { LoginView } from './components/auth/LoginView';
import { TopBarPos } from './components/pos/TopBarPos';
import { ScannerBar } from './components/pos/ScannerBar';
import { QuickServices } from './components/pos/QuickServices';
import { CartTable } from './components/pos/CartTable';
import { SummaryPanel } from './components/pos/SummaryPanel';
import { CatalogoStockView } from './components/catalogo/CatalogoStockView';
import { HistorialVentasView } from './components/historial/HistorialVentasView';
import { ArqueoCajaView } from './components/arqueo/ArqueoCajaView';
import { GraficoVentasView } from './components/reportes/GraficoVentasView';
import { UsuariosAdminView } from './components/usuarios/UsuariosAdminView';
import {
  ComprobanteA4Modal,
  type ComprobanteEmitido,
} from './components/ticket/ComprobanteA4Modal';

type VistaActiva =
  | 'pos'
  | 'catalogo'
  | 'historial'
  | 'arqueo'
  | 'grafico'
  | 'usuarios';

export default function App() {
  const [usuarios, setUsuarios] = useState<UsuarioPos[]>(() =>
    cargarUsuariosLocales()
  );
  const [sesion, setSesion] = useState<SesionPos | null>(() =>
    cargarSesionInicial()
  );
  const [vistaActiva, setVistaActiva] = useState<VistaActiva>('pos');
  const [catalogo, setCatalogo] = useState<ItemCatalogo[]>(() =>
    cargarCatalogoInicial()
  );
  const [historial, setHistorial] = useState<VentaRegistrada[]>(() =>
    cargarHistorialInicial()
  );

  const estadoArqueoInicial = useMemo(() => cargarEstadoArqueo(), []);
  const [fondoInicial, setFondoInicial] = useState<number>(
    estadoArqueoInicial.fondoInicial
  );
  const [movimientosCaja, setMovimientosCaja] = useState<MovimientoCaja[]>(
    estadoArqueoInicial.movimientos
  );
  const [cierresCaja, setCierresCaja] = useState<CierreCajaRegistrado[]>(
    estadoArqueoInicial.cierres
  );

  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [ultimosItemsFactura, setUltimosItemsFactura] = useState<ItemCarrito[]>([]);
  const [medioPago, setMedioPago] = useState<MedioPago>('Efectivo');
  const [feedback, setFeedback] = useState<{
    texto: string;
    tipo: 'ok' | 'error';
  } | null>(null);
  const [ultimoComprobante, setUltimoComprobante] =
    useState<ComprobanteEmitido | null>(null);
  const [contadorTicket, setContadorTicket] = useState(1042);

  const esAdmin = sesion?.usuario.rol === 'Admin';

  useEffect(() => {
    guardarUsuariosLocales(usuarios);
  }, [usuarios]);

  useEffect(() => {
    if (sesion && !esAdmin && vistaActiva !== 'pos') {
      setVistaActiva('pos');
    }
  }, [sesion, esAdmin, vistaActiva]);

  useEffect(() => {
    guardarCatalogoLocal(catalogo);
  }, [catalogo]);

  useEffect(() => {
    guardarHistorialLocal(historial);
  }, [historial]);

  useEffect(() => {
    guardarEstadoArqueo({
      fondoInicial,
      movimientos: movimientosCaja,
      cierres: cierresCaja,
    });
  }, [fondoInicial, movimientosCaja, cierresCaja]);

  const serviciosRapidos = useMemo(
    () => catalogo.filter((item) => item.tipo === 'servicio'),
    [catalogo]
  );

  if (!sesion) {
    return (
      <LoginView
        usuarios={usuarios}
        onLoginSuccess={(nuevaSesion) => {
          setSesion(nuevaSesion);
          setVistaActiva('pos');
          setFeedback(null);
        }}
      />
    );
  }

  const nombreCajero = sesion.usuario.nombre;

  const handleCerrarSesion = () => {
    cerrarSesionLocal();
    setSesion(null);
    setCarrito([]);
    setFeedback(null);
  };

  const handleCrearUsuario = (nuevo: {
    nombre: string;
    usuario: string;
    password?: string;
    rol: RolUsuarioPos;
  }) => {
    if (!esAdmin) return;
    const creado: UsuarioPos = {
      id: `usr-${Date.now().toString().slice(-6)}`,
      nombre: nuevo.nombre,
      usuario: nuevo.usuario,
      password: nuevo.password,
      rol: nuevo.rol,
      activo: true,
    };
    setUsuarios((prev) => [...prev, creado]);
    setFeedback({
      texto: `Usuario "${creado.nombre}" (@${creado.usuario}) creado con rol ${creado.rol}.`,
      tipo: 'ok',
    });
  };

  const handleCambiarRolUsuario = (id: string, nuevoRol: RolUsuarioPos) => {
    if (!esAdmin || id === sesion.usuario.id) return;
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, rol: nuevoRol } : u))
    );
    setFeedback({
      texto: 'Rol de usuario actualizado.',
      tipo: 'ok',
    });
  };

  const handleToggleActivoUsuario = (id: string) => {
    if (!esAdmin || id === sesion.usuario.id) return;
    setUsuarios((prev) =>
      prev.map((u) => (u.id === id ? { ...u, activo: !u.activo } : u))
    );
    setFeedback({
      texto: 'Estado de usuario actualizado.',
      tipo: 'ok',
    });
  };

  const handleEliminarUsuario = (id: string) => {
    if (!esAdmin || id === sesion.usuario.id) return;
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
    setFeedback({
      texto: 'Usuario eliminado.',
      tipo: 'ok',
    });
  };

  const crearItemCatalogo = (
    nuevo: Omit<ItemCatalogo, 'id'> & { id?: string }
  ) => {
    if (!esAdmin) return;
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
    if (!esAdmin) return;
    setCatalogo((prev) =>
      prev.map((item) => (item.id === actualizado.id ? actualizado : item))
    );
    setFeedback({
      texto: `"${actualizado.nombre}" actualizado.`,
      tipo: 'ok',
    });
  };

  const eliminarItemCatalogo = (id: string) => {
    if (!esAdmin) return;
    setCatalogo((prev) => prev.filter((item) => item.id !== id));
    setCarrito((prev) => prev.filter((item) => item.id !== id));
    setFeedback({
      texto: 'Ítem eliminado del catálogo.',
      tipo: 'ok',
    });
  };

  const handleRestablecerCatalogo = () => {
    if (!esAdmin) return;
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
      cajero: nombreCajero,
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
    if (!esAdmin) return;
    const vacio = limpiarHistorialLocal();
    setHistorial(vacio);
    setFeedback({
      texto: 'Historial de ventas limpiado.',
      tipo: 'ok',
    });
  };

  const handleAgregarMovimientoCaja = (
    mov: Omit<MovimientoCaja, 'id' | 'fechaHora'>
  ) => {
    if (!esAdmin) return;
    const fechaHora = new Date().toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    const nuevoMov: MovimientoCaja = {
      ...mov,
      id: `mov-${Date.now()}`,
      fechaHora,
    };
    setMovimientosCaja((prev) => [nuevoMov, ...prev]);
    setFeedback({
      texto: `${mov.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} "${mov.concepto}" registrado.`,
      tipo: 'ok',
    });
  };

  const handleEliminarMovimientoCaja = (id: string) => {
    if (!esAdmin) return;
    setMovimientosCaja((prev) => prev.filter((m) => m.id !== id));
  };

  const handleRegistrarCierreCaja = (
    cierre: Omit<CierreCajaRegistrado, 'id' | 'fechaHora'>
  ) => {
    if (!esAdmin) return;
    const fechaHora = new Date().toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
    const nuevoCierre: CierreCajaRegistrado = {
      ...cierre,
      id: `cierre-${Date.now()}`,
      fechaHora,
    };
    setCierresCaja((prev) => [nuevoCierre, ...prev]);
    setFeedback({
      texto: 'Cierre de caja guardado en el historial de cierres.',
      tipo: 'ok',
    });
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#060b14] text-slate-100 print:min-h-0 print:bg-white">
      <div className="pointer-events-none fixed -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl print:hidden" />
      <div className="pointer-events-none fixed top-1/3 -right-32 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl print:hidden" />

      <main className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 print:hidden">
        <TopBarPos
          cajero={nombreCajero}
          cajaAbierta={true}
          lectoraActiva={true}
        />

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

            {esAdmin && (
              <>
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
                <button
                  type="button"
                  onClick={() => setVistaActiva('arqueo')}
                  className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                    vistaActiva === 'arqueo'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  Arqueo de Caja
                </button>
                <button
                  type="button"
                  onClick={() => setVistaActiva('grafico')}
                  className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                    vistaActiva === 'grafico'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  Gráfico de Ventas
                </button>
                <button
                  type="button"
                  onClick={() => setVistaActiva('usuarios')}
                  className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                    vistaActiva === 'usuarios'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  Usuarios ({usuarios.length})
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleCerrarSesion}
            className="cursor-pointer rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
          >
            Cerrar sesión ({nombreCajero} · {sesion.usuario.rol})
          </button>
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

        {esAdmin && vistaActiva === 'catalogo' ? (
          <CatalogoStockView
            items={catalogo}
            onCrearItem={crearItemCatalogo}
            onActualizarItem={actualizarItemCatalogo}
            onEliminarItem={eliminarItemCatalogo}
            onRestablecerCatalogo={handleRestablecerCatalogo}
            onVolverPos={() => setVistaActiva('pos')}
          />
        ) : esAdmin && vistaActiva === 'historial' ? (
          <HistorialVentasView
            ventas={historial}
            onReimprimirVenta={(venta) => setUltimoComprobante(venta)}
            onLimpiarHistorial={handleLimpiarHistorial}
            onVolverPos={() => setVistaActiva('pos')}
          />
        ) : esAdmin && vistaActiva === 'arqueo' ? (
          <ArqueoCajaView
            cajero={nombreCajero}
            ventas={historial}
            fondoInicial={fondoInicial}
            movimientos={movimientosCaja}
            cierres={cierresCaja}
            onCambiarFondoInicial={(monto) => {
              if (!esAdmin) return;
              setFondoInicial(monto);
              setFeedback({
                texto: 'Fondo inicial de caja actualizado.',
                tipo: 'ok',
              });
            }}
            onAgregarMovimiento={handleAgregarMovimientoCaja}
            onEliminarMovimiento={handleEliminarMovimientoCaja}
            onRegistrarCierre={handleRegistrarCierreCaja}
            onVolverPos={() => setVistaActiva('pos')}
          />
        ) : esAdmin && vistaActiva === 'grafico' ? (
          <GraficoVentasView
            ventasReales={historial}
            onVolverPos={() => setVistaActiva('pos')}
          />
        ) : esAdmin && vistaActiva === 'usuarios' ? (
          <UsuariosAdminView
            usuarios={usuarios}
            usuarioActualId={sesion.usuario.id}
            onCrearUsuario={handleCrearUsuario}
            onCambiarRol={handleCambiarRolUsuario}
            onToggleActivo={handleToggleActivoUsuario}
            onEliminarUsuario={handleEliminarUsuario}
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