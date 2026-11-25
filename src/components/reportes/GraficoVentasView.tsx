import { useEffect, useMemo, useState } from 'react';
import type { VentaRegistrada } from '../../services/historialService';

interface GraficoVentasViewProps {
  ventasReales: VentaRegistrada[];
  onVolverPos: () => void;
}

interface PuntoDia {
  dia: number;
  mesActual: number;
  mesAnterior: number;
}

interface PorcionTorta {
  id: string;
  label: string;
  valor: number;
  color: string;
}

const formatoARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

function parsearFechaVenta(fechaHora: string): Date | null {
  if (!fechaHora || typeof fechaHora !== 'string') return null;

  const limpia = fechaHora.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const [parteFecha] = limpia.split(' ');
  if (!parteFecha) return null;

  const partes = parteFecha.split('/');
  if (partes.length === 3) {
    const dia = Number(partes[0]);
    const mes = Number(partes[1]) - 1;
    let anio = Number(partes[2]);

    if (!Number.isNaN(anio) && anio >= 0 && anio < 100) {
      anio += 2000;
    }

    if (
      !Number.isNaN(dia) &&
      !Number.isNaN(mes) &&
      !Number.isNaN(anio) &&
      dia >= 1 &&
      dia <= 31 &&
      mes >= 0 &&
      mes <= 11
    ) {
      return new Date(anio, mes, dia);
    }
  }

  const fallback = new Date(fechaHora);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function esMismaFechaCalendario(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function polarACartesiano(
  cx: number,
  cy: number,
  radio: number,
  anguloGrados: number
) {
  const rad = ((anguloGrados - 90) * Math.PI) / 180;
  return {
    x: cx + radio * Math.cos(rad),
    y: cy + radio * Math.sin(rad),
  };
}

function describirSectorTorta(
  cx: number,
  cy: number,
  radio: number,
  anguloInicio: number,
  anguloFin: number
): string {
  const inicio = polarACartesiano(cx, cy, radio, anguloFin);
  const fin = polarACartesiano(cx, cy, radio, anguloInicio);
  const arcoMayor = anguloFin - anguloInicio > 180 ? 1 : 0;

  return [
    `M ${cx} ${cy}`,
    `L ${fin.x} ${fin.y}`,
    `A ${radio} ${radio} 0 ${arcoMayor} 1 ${inicio.x} ${inicio.y}`,
    'Z',
  ].join(' ');
}

function generarSerieEjemplo(): PuntoDia[] {
  const serie: PuntoDia[] = [];
  for (let dia = 1; dia <= 30; dia++) {
    const baseAnterior =
      14000 + ((dia * 3700) % 26000) + (dia % 7 === 0 ? 18000 : 0);
    const baseActual =
      16500 + ((dia * 4300) % 31000) + (dia % 6 === 0 ? 22000 : 0);
    serie.push({
      dia,
      mesActual: Math.round(baseActual),
      mesAnterior: Math.round(baseAnterior),
    });
  }
  return serie;
}

export function GraficoVentasView({
  ventasReales,
  onVolverPos,
}: GraficoVentasViewProps) {
  const [usarEjemplo, setUsarEjemplo] = useState(ventasReales.length === 0);
  const [diaSeleccionado, setDiaSeleccionado] = useState<number | null>(null);
  const [porcionActivaId, setPorcionActivaId] = useState<string | null>(null);

  useEffect(() => {
    if (ventasReales.length > 0) {
      setUsarEjemplo(false);
    }
  }, [ventasReales.length]);

  const serieDias = useMemo<PuntoDia[]>(() => {
    if (usarEjemplo) {
      return generarSerieEjemplo();
    }

    const ahora = new Date();
    const mesActualIdx = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    const fechaMesAnterior = new Date(anioActual, mesActualIdx - 1, 1);
    const mesAnteriorIdx = fechaMesAnterior.getMonth();
    const anioAnterior = fechaMesAnterior.getFullYear();

    const mapaActual = new Map<number, number>();
    const mapaAnterior = new Map<number, number>();

    for (const venta of ventasReales) {
      const fecha = parsearFechaVenta(venta.fechaHora);
      if (!fecha) continue;

      const dia = fecha.getDate();
      const mes = fecha.getMonth();
      const anio = fecha.getFullYear();
      const monto = Number(venta.total) || 0;

      if (anio === anioActual && mes === mesActualIdx) {
        mapaActual.set(dia, (mapaActual.get(dia) ?? 0) + monto);
      } else if (anio === anioAnterior && mes === mesAnteriorIdx) {
        mapaAnterior.set(dia, (mapaAnterior.get(dia) ?? 0) + monto);
      }
    }

    const diasEnMes = new Date(anioActual, mesActualIdx + 1, 0).getDate();
    const puntos: PuntoDia[] = [];

    for (let dia = 1; dia <= diasEnMes; dia++) {
      puntos.push({
        dia,
        mesActual: mapaActual.get(dia) ?? 0,
        mesAnterior: mapaAnterior.get(dia) ?? 0,
      });
    }

    return puntos;
  }, [ventasReales, usarEjemplo]);

  const totales = useMemo(() => {
    const actual = serieDias.reduce((acc, p) => acc + p.mesActual, 0);
    const anterior = serieDias.reduce((acc, p) => acc + p.mesAnterior, 0);
    const diferencia = actual - anterior;
    const variacionPct =
      anterior > 0
        ? ((actual - anterior) / anterior) * 100
        : actual > 0
          ? 100
          : 0;

    return {
      actual,
      anterior,
      diferencia,
      variacionPct,
    };
  }, [serieDias]);

  const maximoValor = useMemo(() => {
    const max = Math.max(
      1,
      ...serieDias.map((p) => Math.max(p.mesActual, p.mesAnterior))
    );
    return max;
  }, [serieDias]);

  const detalleDia = useMemo(() => {
    if (!diaSeleccionado) return null;
    return serieDias.find((p) => p.dia === diaSeleccionado) ?? null;
  }, [diaSeleccionado, serieDias]);

  // Utilidad del día restando precioCompra
  const utilidadHoy = useMemo(() => {
    if (usarEjemplo) {
      const utilidad = 70500;
      const costoTotal = 66500;
      const total = utilidad + costoTotal;
      return {
        ventasDiaTotal: 137000,
        costoTotal,
        utilidadTotal: utilidad,
        porciones: [
          {
            id: 'utilidad',
            label: 'Utilidad (precio - precioCompra)',
            valor: utilidad,
            color: '#10b981',
          },
          {
            id: 'costo',
            label: 'Costo (precioCompra)',
            valor: costoTotal,
            color: '#f59e0b',
          },
        ].map((p) => ({
          ...p,
          porcentaje: total > 0 ? (p.valor / total) * 100 : 0,
        })),
      };
    }

    const hoy = new Date();
    const ventasDeHoy = ventasReales.filter((venta) => {
      const f = parsearFechaVenta(venta.fechaHora);
      return f ? esMismaFechaCalendario(f, hoy) : false;
    });

    let ventasDiaTotal = 0;
    let costoAcumulado = 0;
    let utilidadAcumulada = 0;

    for (const venta of ventasDeHoy) {
      const totalVenta = Number(venta.total) || 0;
      ventasDiaTotal += totalVenta;

      if (Array.isArray(venta.items) && venta.items.length > 0) {
        for (const item of venta.items) {
          const cantidad = Number(item.cantidad) || 1;
          const precio = Number(item.precio) || 0;
          const costoUnitario = Number(item.precioCompra) || 0;

          const costoItem = costoUnitario * cantidad;
          const utilidadItem = (precio - costoUnitario) * cantidad;

          costoAcumulado += costoItem;
          utilidadAcumulada += utilidadItem;
        }
      } else {
        utilidadAcumulada += totalVenta;
      }
    }

    const utilidadFinal = Math.round(utilidadAcumulada);
    const costoFinal = Math.max(0, Math.round(costoAcumulado));
    const baseTorta = Math.max(0, utilidadFinal) + costoFinal;

    const rawPorciones: PorcionTorta[] = [];
    if (utilidadFinal > 0) {
      rawPorciones.push({
        id: 'utilidad',
        label: 'Utilidad (precio - precioCompra)',
        valor: utilidadFinal,
        color: '#10b981',
      });
    }
    if (costoFinal > 0) {
      rawPorciones.push({
        id: 'costo',
        label: 'Costo (precioCompra)',
        valor: costoFinal,
        color: '#f59e0b',
      });
    }

    const porciones = rawPorciones.map((p) => ({
      ...p,
      porcentaje: baseTorta > 0 ? (p.valor / baseTorta) * 100 : 0,
    }));

    return {
      ventasDiaTotal,
      costoTotal: costoFinal,
      utilidadTotal: utilidadFinal,
      porciones,
    };
  }, [ventasReales, usarEjemplo]);

  const porcionSeleccionada = useMemo(() => {
    if (porcionActivaId) {
      return (
        utilidadHoy.porciones.find((p) => p.id === porcionActivaId) ?? null
      );
    }
    return utilidadHoy.porciones[0] ?? null;
  }, [porcionActivaId, utilidadHoy.porciones]);

  const width = 820;
  const height = 280;
  const padLeft = 64;
  const padRight = 20;
  const padTop = 24;
  const padBottom = 38;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const stepX = serieDias.length > 0 ? plotWidth / serieDias.length : 20;
  const barWidth = Math.max(3, Math.min(10, stepX * 0.34));

  let anguloAcumulado = 0;

  return (
    <section className="flex flex-col gap-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/75 p-4 backdrop-blur-md">
        <div>
          <h1 className="text-lg font-bold text-white">
            Gráfico Comparativo de Ventas
          </h1>
          <p className="text-xs text-slate-400">
            Comparación día por día entre el mes actual y el mes anterior, más utilidad del día.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setUsarEjemplo(false)}
            className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold transition ${
              !usarEjemplo
                ? 'bg-emerald-500 text-slate-950'
                : 'border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            Ventas Reales ({ventasReales.length})
          </button>
          <button
            type="button"
            onClick={() => setUsarEjemplo(true)}
            className={`cursor-pointer rounded-xl px-3 py-2 text-xs font-semibold transition ${
              usarEjemplo
                ? 'bg-indigo-500 text-white'
                : 'border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            Datos de Ejemplo
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

      {/* Tarjetas comparativas */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
          <span className="text-xs text-slate-400">Mes Actual</span>
          <p className="mt-1 font-mono text-xl font-bold text-cyan-300">
            {formatoARS.format(totales.actual)}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
          <span className="text-xs text-slate-400">Mes Anterior</span>
          <p className="mt-1 font-mono text-xl font-bold text-slate-200">
            {formatoARS.format(totales.anterior)}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3.5">
          <span className="text-xs text-slate-400">
            Variación vs. Mes Anterior
          </span>
          <p
            className={`mt-1 font-mono text-xl font-bold ${
              totales.diferencia >= 0 ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            {totales.variacionPct >= 0 ? '+' : ''}
            {totales.variacionPct.toFixed(1)}%
          </p>
          <span className="text-[11px] text-slate-400">
            {totales.diferencia >= 0 ? '+' : ''}
            {formatoARS.format(totales.diferencia)}
          </span>
        </div>
      </div>

      {/* Gráfico SVG de barras */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-4 backdrop-blur-md">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-slate-200">
              <span className="h-3 w-3 rounded-sm bg-cyan-400" />
              Mes Actual
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-400">
              <span className="h-3 w-3 rounded-sm bg-slate-500" />
              Mes Anterior
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            Tocá o pasá por una columna para ver el detalle del día
          </span>
        </div>

        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-64 w-full min-w-[600px] select-none"
            role="img"
            aria-label="Gráfico comparativo de ventas mes actual vs mes anterior"
          >
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padTop + plotHeight - ratio * plotHeight;
              const valorEtiqueta = Math.round(maximoValor * ratio);
              return (
                <g key={ratio}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={width - padRight}
                    y2={y}
                    stroke="rgba(148, 163, 184, 0.15)"
                    strokeDasharray={ratio === 0 ? undefined : '4 4'}
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {valorEtiqueta >= 1000
                      ? `$${Math.round(valorEtiqueta / 1000)}k`
                      : `$${valorEtiqueta}`}
                  </text>
                </g>
              );
            })}

            {serieDias.map((punto, idx) => {
              const grupoX = padLeft + idx * stepX + stepX / 2;

              const hAnterior = (punto.mesAnterior / maximoValor) * plotHeight;
              const yAnterior = padTop + plotHeight - hAnterior;

              const hActual = (punto.mesActual / maximoValor) * plotHeight;
              const yActual = padTop + plotHeight - hActual;

              const seleccionado = diaSeleccionado === punto.dia;

              return (
                <g
                  key={punto.dia}
                  className="cursor-pointer"
                  onMouseEnter={() => setDiaSeleccionado(punto.dia)}
                  onClick={() => setDiaSeleccionado(punto.dia)}
                >
                  <rect
                    x={padLeft + idx * stepX}
                    y={padTop}
                    width={stepX}
                    height={plotHeight}
                    fill={
                      seleccionado ? 'rgba(34, 211, 238, 0.08)' : 'transparent'
                    }
                  />

                  <rect
                    x={grupoX - barWidth - 1}
                    y={yAnterior}
                    width={barWidth}
                    height={Math.max(0, hAnterior)}
                    rx={2}
                    fill="#64748b"
                    opacity={0.85}
                  />

                  <rect
                    x={grupoX + 1}
                    y={yActual}
                    width={barWidth}
                    height={Math.max(0, hActual)}
                    rx={2}
                    fill="#22d3ee"
                  />

                  {(punto.dia === 1 ||
                    punto.dia % 5 === 0 ||
                    punto.dia === serieDias.length) && (
                    <text
                      x={grupoX}
                      y={height - 12}
                      textAnchor="middle"
                      fill={seleccionado ? '#22d3ee' : '#94a3b8'}
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {punto.dia}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {detalleDia && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-2.5 text-xs">
            <span className="font-semibold text-white">
              Día {detalleDia.dia}
            </span>
            <div className="flex flex-wrap items-center gap-4 font-mono">
              <span className="text-cyan-300">
                Mes actual: {formatoARS.format(detalleDia.mesActual)}
              </span>
              <span className="text-slate-300">
                Mes anterior: {formatoARS.format(detalleDia.mesAnterior)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Gráfico de torta: Utilidad del Día */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-4 backdrop-blur-md">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">Utilidad del Día</h2>
            <p className="text-xs text-slate-400">
              Ventas del día: {formatoARS.format(utilidadHoy.ventasDiaTotal)} · Costo (precioCompra): {formatoARS.format(utilidadHoy.costoTotal)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-12">
          <div className="flex justify-center md:col-span-5">
            {utilidadHoy.porciones.length > 0 ? (
              <svg
                viewBox="0 0 220 220"
                className="h-52 w-52 select-none"
                role="img"
                aria-label="Gráfico de torta de utilidad del día"
              >
                {utilidadHoy.porciones.map((porcion) => {
                  const anguloSector = (porcion.porcentaje / 100) * 360;
                  const inicio = anguloAcumulado;
                  const fin = anguloAcumulado + anguloSector;
                  anguloAcumulado = fin;

                  const esActiva = porcionSeleccionada?.id === porcion.id;

                  if (utilidadHoy.porciones.length === 1) {
                    return (
                      <circle
                        key={porcion.id}
                        cx={110}
                        cy={110}
                        r={82}
                        fill={porcion.color}
                        className="cursor-pointer transition-opacity"
                        opacity={esActiva ? 1 : 0.9}
                        onMouseEnter={() => setPorcionActivaId(porcion.id)}
                        onClick={() => setPorcionActivaId(porcion.id)}
                      />
                    );
                  }

                  return (
                    <path
                      key={porcion.id}
                      d={describirSectorTorta(110, 110, 82, inicio, fin)}
                      fill={porcion.color}
                      stroke="#0f172a"
                      strokeWidth={2}
                      className="cursor-pointer transition-opacity"
                      opacity={esActiva ? 1 : 0.82}
                      onMouseEnter={() => setPorcionActivaId(porcion.id)}
                      onClick={() => setPorcionActivaId(porcion.id)}
                    />
                  );
                })}
                <circle cx={110} cy={110} r={44} fill="#0f172a" />
                <text
                  x={110}
                  y={106}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
                >
                  Utilidad hoy
                </text>
                <text
                  x={110}
                  y={121}
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {formatoARS.format(utilidadHoy.utilidadTotal)}
                </text>
              </svg>
            ) : (
              <div className="flex h-52 w-52 items-center justify-center rounded-full border border-dashed border-white/15 bg-slate-950/50 p-4 text-center text-xs text-slate-400">
                Sin ventas registradas hoy
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 md:col-span-7">
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3.5">
              <span className="text-xs text-slate-400">
                Utilidad del Día (Precio de venta - Precio de compra)
              </span>
              <p className="mt-1 font-mono text-2xl font-bold text-emerald-300">
                {formatoARS.format(utilidadHoy.utilidadTotal)}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {utilidadHoy.porciones.map((p) => {
                const activa = porcionSeleccionada?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onMouseEnter={() => setPorcionActivaId(p.id)}
                    onClick={() => setPorcionActivaId(p.id)}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs transition ${
                      activa
                        ? 'border-cyan-400/40 bg-slate-950'
                        : 'border-white/10 bg-slate-950/50 hover:bg-slate-950/80'
                    }`}
                  >
                    <span className="flex items-center gap-2 font-medium text-slate-200">
                      <span
                        className="h-3 w-3 rounded-sm"
                        style={{ backgroundColor: p.color }}
                      />
                      {p.label}
                    </span>
                    <span className="font-mono font-semibold text-white">
                      {formatoARS.format(p.valor)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}