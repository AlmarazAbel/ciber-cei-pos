import { useMemo, useState } from 'react';
import type { MedioPago } from '../../types/pos';
import type { VentaRegistrada } from '../../services/historialService';
import type {
  CierreCajaRegistrado,
  MovimientoCaja,
  TipoMovimientoCaja,
} from '../../services/arqueoService';

interface ArqueoCajaViewProps {
  cajero: string;
  ventas: VentaRegistrada[];
  fondoInicial: number;
  movimientos: MovimientoCaja[];
  cierres: CierreCajaRegistrado[];
  onCambiarFondoInicial: (monto: number) => void;
  onAgregarMovimiento: (mov: Omit<MovimientoCaja, 'id' | 'fechaHora'>) => void;
  onEliminarMovimiento: (id: string) => void;
  onRegistrarCierre: (cierre: Omit<CierreCajaRegistrado, 'id' | 'fechaHora'>) => void;
  onVolverPos: () => void;
}

const formatoARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function ArqueoCajaView({
  cajero,
  ventas,
  fondoInicial,
  movimientos,
  cierres,
  onCambiarFondoInicial,
  onAgregarMovimiento,
  onEliminarMovimiento,
  onRegistrarCierre,
  onVolverPos,
}: ArqueoCajaViewProps) {
  const [inputFondo, setInputFondo] = useState(String(fondoInicial));
  const [tipoMov, setTipoMov] = useState<TipoMovimientoCaja>('egreso');
  const [conceptoMov, setConceptoMov] = useState('');
  const [montoMov, setMontoMov] = useState('');
  const [medioMov, setMedioMov] = useState<MedioPago>('Efectivo');
  const [errorMov, setErrorMov] = useState<string | null>(null);

  const [efectivoContadoInput, setEfectivoContadoInput] = useState('');
  const [observacionCierre, setObservacionCierre] = useState('');
  const [mensajeCierre, setMensajeCierre] = useState<string | null>(null);

  const resumenVentas = useMemo(() => {
    let efectivo = 0;
    let transferencia = 0;
    let tarjeta = 0;

    for (const v of ventas) {
      if (v.medioPago === 'Efectivo') efectivo += v.total;
      else if (v.medioPago === 'Transferencia') transferencia += v.total;
      else if (v.medioPago === 'Tarjeta') tarjeta += v.total;
    }

    return {
      efectivo,
      transferencia,
      tarjeta,
      totalVentas: efectivo + transferencia + tarjeta,
    };
  }, [ventas]);

  const resumenMovimientos = useMemo(() => {
    let ingresosEfectivo = 0;
    let egresosEfectivo = 0;
    let ingresosTotal = 0;
    let egresosTotal = 0;

    for (const m of movimientos) {
      if (m.tipo === 'ingreso') {
        ingresosTotal += m.monto;
        if (m.medioPago === 'Efectivo') ingresosEfectivo += m.monto;
      } else {
        egresosTotal += m.monto;
        if (m.medioPago === 'Efectivo') egresosEfectivo += m.monto;
      }
    }

    return {
      ingresosEfectivo,
      egresosEfectivo,
      ingresosTotal,
      egresosTotal,
    };
  }, [movimientos]);

  const efectivoTeorico =
    fondoInicial +
    resumenVentas.efectivo +
    resumenMovimientos.ingresosEfectivo -
    resumenMovimientos.egresosEfectivo;

  const efectivoContadoNum =
    efectivoContadoInput.trim() === ''
      ? efectivoTeorico
      : Math.max(0, Number(efectivoContadoInput) || 0);

  const diferencia = efectivoContadoNum - efectivoTeorico;

  const handleGuardarFondo = (e: React.FormEvent) => {
    e.preventDefault();
    const valor = Math.max(0, Number(inputFondo) || 0);
    onCambiarFondoInicial(valor);
    setInputFondo(String(valor));
  };

  const handleSubmitMovimiento = (e: React.FormEvent) => {
    e.preventDefault();
    const conceptoLimpio = conceptoMov.trim();
    const montoNum = Number(montoMov);

    if (!conceptoLimpio) {
      setErrorMov('Ingresá un concepto para el movimiento.');
      return;
    }
    if (Number.isNaN(montoNum) || montoNum <= 0) {
      setErrorMov('Ingresá un monto mayor a 0.');
      return;
    }

    onAgregarMovimiento({
      tipo: tipoMov,
      concepto: conceptoLimpio,
      monto: montoNum,
      medioPago: medioMov,
    });

    setConceptoMov('');
    setMontoMov('');
    setErrorMov(null);
  };

  const handleConfirmarCierre = (e: React.FormEvent) => {
    e.preventDefault();
    onRegistrarCierre({
      cajero,
      fondoInicial,
      ventasEfectivo: resumenVentas.efectivo,
      ventasTransferencia: resumenVentas.transferencia,
      ventasTarjeta: resumenVentas.tarjeta,
      ingresosManuales: resumenMovimientos.ingresosTotal,
      egresosManuales: resumenMovimientos.egresosTotal,
      efectivoTeorico,
      efectivoContado: efectivoContadoNum,
      diferencia,
      observacion: observacionCierre.trim() || undefined,
    });
    setObservacionCierre('');
    setMensajeCierre('Cierre de caja registrado correctamente.');
  };

  return (
    <section className="flex flex-col gap-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/75 p-4 backdrop-blur-md">
        <div>
          <h1 className="text-lg font-bold text-white">Arqueo y Cierre de Caja</h1>
          <p className="text-xs text-slate-400">
            Control de efectivo, cobros digitales, movimientos manuales y cierre de turno ({cajero}).
          </p>
        </div>

        <button
          type="button"
          onClick={onVolverPos}
          className="cursor-pointer rounded-xl bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          Volver a Caja / POS
        </button>
      </div>

      {/* Tarjetas de resumen de ventas y caja */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
          <span className="text-xs text-slate-400">Ventas en Efectivo</span>
          <p className="mt-1 font-mono text-xl font-bold text-emerald-300">
            {formatoARS.format(resumenVentas.efectivo)}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
          <span className="text-xs text-slate-400">Transferencia</span>
          <p className="mt-1 font-mono text-xl font-bold text-cyan-300">
            {formatoARS.format(resumenVentas.transferencia)}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
          <span className="text-xs text-slate-400">Tarjeta</span>
          <p className="mt-1 font-mono text-xl font-bold text-indigo-300">
            {formatoARS.format(resumenVentas.tarjeta)}
          </p>
        </div>
        <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-3.5">
          <span className="text-xs text-cyan-200">Efectivo Teórico en Caja</span>
          <p className="mt-1 font-mono text-xl font-bold text-white">
            {formatoARS.format(efectivoTeorico)}
          </p>
          <span className="text-[11px] text-slate-300">
            Fondo {formatoARS.format(fondoInicial)} + Efec. {formatoARS.format(resumenVentas.efectivo)} + Ing.{' '}
            {formatoARS.format(resumenMovimientos.ingresosEfectivo)} - Egr.{' '}
            {formatoARS.format(resumenMovimientos.egresosEfectivo)}
          </span>
        </div>
      </div>

      {/* Fondo inicial + Movimientos manuales */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-6">
          {/* Fondo inicial */}
          <form
            onSubmit={handleGuardarFondo}
            className="rounded-2xl border border-white/10 bg-slate-900/75 p-4 text-xs"
          >
            <h2 className="text-sm font-bold text-white">Fondo Inicial de Caja</h2>
            <p className="mt-0.5 text-slate-400">
              Dinero en efectivo con el que arranca el turno para cambio.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="1"
                value={inputFondo}
                onChange={(e) => setInputFondo(e.target.value)}
                className="w-40 rounded-lg border border-white/15 bg-slate-950 px-3 py-2 font-mono text-white focus:border-cyan-400 focus:outline-none"
              />
              <button
                type="submit"
                className="cursor-pointer rounded-lg bg-cyan-500 px-3.5 py-2 font-semibold text-slate-950 hover:bg-cyan-400"
              >
                Actualizar Fondo
              </button>
            </div>
          </form>

          {/* Nuevo ingreso / egreso */}
          <form
            onSubmit={handleSubmitMovimiento}
            className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/75 p-4 text-xs"
          >
            <h2 className="text-sm font-bold text-white">Registrar Ingreso / Egreso</h2>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'egreso', label: 'Egreso / Gasto (-)' },
                  { id: 'ingreso', label: 'Ingreso Extra (+)' },
                ] as const
              ).map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setTipoMov(op.id)}
                  className={`cursor-pointer rounded-lg border py-2 font-semibold transition ${
                    tipoMov === op.id
                      ? op.id === 'egreso'
                        ? 'border-rose-400 bg-rose-500/20 text-rose-200'
                        : 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : 'border-white/10 bg-slate-950/50 text-slate-400'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-slate-300">Concepto *</label>
                <input
                  type="text"
                  value={conceptoMov}
                  onChange={(e) => setConceptoMov(e.target.value)}
                  placeholder="Ej: Resma A4, café, pago proveedor"
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-slate-300">Medio</label>
                <select
                  value={medioMov}
                  onChange={(e) => setMedioMov(e.target.value as MedioPago)}
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-2.5 py-2 text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </div>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-slate-300">Monto ($) *</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={montoMov}
                  onChange={(e) => setMontoMov(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 font-mono text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="cursor-pointer rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Agregar
              </button>
            </div>

            {errorMov && (
              <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-rose-200">
                {errorMov}
              </p>
            )}
          </form>
        </div>

        {/* Conteo físico y cierre de turno */}
        <form
          onSubmit={handleConfirmarCierre}
          className="flex flex-col justify-between space-y-3 rounded-2xl border border-white/10 bg-slate-900/75 p-4 text-xs lg:col-span-6"
        >
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white">Conteo Físico y Cierre de Turno</h2>

            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Total Ventas (todos los medios):</span>
                <span className="font-mono font-semibold text-white">
                  {formatoARS.format(resumenVentas.totalVentas)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Ingresos manuales:</span>
                <span className="font-mono text-emerald-300">
                  +{formatoARS.format(resumenMovimientos.ingresosTotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Egresos manuales:</span>
                <span className="font-mono text-rose-300">
                  -{formatoARS.format(resumenMovimientos.egresosTotal)}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-1.5 text-sm font-bold text-cyan-300">
                <span>Efectivo esperado en cajón:</span>
                <span className="font-mono">{formatoARS.format(efectivoTeorico)}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-300">
                Efectivo contado en cajón ($)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={efectivoContadoInput}
                onChange={(e) => setEfectivoContadoInput(e.target.value)}
                placeholder={String(efectivoTeorico)}
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 font-mono text-sm text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5">
              <span className="font-medium text-slate-300">Diferencia de arqueo:</span>
              <span
                className={`font-mono text-sm font-bold ${
                  diferencia === 0
                    ? 'text-emerald-300'
                    : diferencia > 0
                    ? 'text-cyan-300'
                    : 'text-rose-300'
                }`}
              >
                {diferencia > 0 ? '+' : ''}
                {formatoARS.format(diferencia)}{' '}
                {diferencia === 0
                  ? '(Caja exacta)'
                  : diferencia > 0
                  ? '(Sobrante)'
                  : '(Faltante)'}
              </span>
            </div>

            <div>
              <label className="mb-1 block text-slate-300">Observación (opcional)</label>
              <input
                type="text"
                value={observacionCierre}
                onChange={(e) => setObservacionCierre(e.target.value)}
                placeholder="Ej: Sin novedades, cambio separado"
                className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {mensajeCierre && (
              <p className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-emerald-200">
                {mensajeCierre}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="mt-2 w-full cursor-pointer rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110"
          >
            Guardar Cierre de Caja
          </button>
        </form>
      </div>

      {/* Movimientos manuales registrados */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/75 p-4 text-xs backdrop-blur-md">
        <h2 className="mb-3 text-sm font-bold text-white">
          Movimientos Manuales del Turno ({movimientos.length})
        </h2>
        {movimientos.length === 0 ? (
          <p className="py-4 text-center text-slate-400">
            No hay ingresos o egresos manuales cargados todavía.
          </p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-2 pr-2">Hora</th>
                <th className="py-2 px-2">Tipo</th>
                <th className="py-2 px-2">Concepto</th>
                <th className="py-2 px-2">Medio</th>
                <th className="py-2 px-2 text-right">Monto</th>
                <th className="py-2 pl-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {movimientos.map((m) => (
                <tr key={m.id}>
                  <td className="py-2 pr-2 text-slate-300">{m.fechaHora}</td>
                  <td className="py-2 px-2">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                        m.tipo === 'ingreso'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                    </span>
                  </td>
                  <td className="py-2 px-2 font-medium text-white">{m.concepto}</td>
                  <td className="py-2 px-2 text-slate-300">{m.medioPago}</td>
                  <td
                    className={`py-2 px-2 text-right font-mono font-semibold ${
                      m.tipo === 'ingreso' ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {m.tipo === 'ingreso' ? '+' : '-'}
                    {formatoARS.format(m.monto)}
                  </td>
                  <td className="py-2 pl-2 text-right">
                    <button
                      type="button"
                      onClick={() => onEliminarMovimiento(m.id)}
                      className="cursor-pointer rounded px-2 py-0.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Historial de cierres guardados */}
      {cierres.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/75 p-4 text-xs backdrop-blur-md">
          <h2 className="mb-3 text-sm font-bold text-white">
            Cierres de Caja Guardados ({cierres.length})
          </h2>
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-2 pr-2">Fecha / Hora</th>
                <th className="py-2 px-2">Cajero</th>
                <th className="py-2 px-2 text-right">Efec. Teórico</th>
                <th className="py-2 px-2 text-right">Efec. Contado</th>
                <th className="py-2 px-2 text-right">Diferencia</th>
                <th className="py-2 pl-2">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cierres.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 pr-2 text-slate-300">{c.fechaHora}</td>
                  <td className="py-2 px-2 text-white">{c.cajero}</td>
                  <td className="py-2 px-2 text-right font-mono text-slate-200">
                    {formatoARS.format(c.efectivoTeorico)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-semibold text-white">
                    {formatoARS.format(c.efectivoContado)}
                  </td>
                  <td
                    className={`py-2 px-2 text-right font-mono font-semibold ${
                      c.diferencia === 0
                        ? 'text-emerald-300'
                        : c.diferencia > 0
                        ? 'text-cyan-300'
                        : 'text-rose-300'
                    }`}
                  >
                    {c.diferencia > 0 ? '+' : ''}
                    {formatoARS.format(c.diferencia)}
                  </td>
                  <td className="py-2 pl-2 text-slate-400">{c.observacion || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}