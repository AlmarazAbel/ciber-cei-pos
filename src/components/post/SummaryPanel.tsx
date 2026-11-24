import { useState } from 'react';
import type {
  CondicionFiscal,
  DatosClienteFactura,
  ItemCarrito,
  MedioPago,
  TipoComprobante,
} from '../../types/pos';
import {
  type FacturaCResponseData,
  emitirFacturaCDesdePos,
} from '../../services/facturacionService';
import { TicketFacturaC } from '../ticket/TicketFacturaC';

interface SummaryPanelProps {
  total: number;
  medioPago: MedioPago;
  items?: ItemCarrito[];
  onCambiarMedioPago: (medio: MedioPago) => void;
  onEmitir: (tipo: TipoComprobante, datosCliente?: DatosClienteFactura) => void;
  disabled?: boolean;
}

const MEDIOS_PAGO: MedioPago[] = ['Efectivo', 'Transferencia', 'Tarjeta'];
const CONDICIONES_FISCALES: CondicionFiscal[] = [
  'Consumidor Final',
  'Monotributo',
  'Responsable Inscripto',
  'Exento',
];

const CONDICION_IVA_ID: Record<CondicionFiscal, number> = {
  'Consumidor Final': 5,
  Monotributo: 6,
  'Responsable Inscripto': 1,
  Exento: 4,
};

function parsearDocumentoReceptor(rawInput: string): { docTipo: number; docNro: number } {
  const soloDigitos = rawInput.replace(/\D/g, '');
  if (soloDigitos.length === 11) {
    return { docTipo: 80, docNro: Number(soloDigitos) };
  }
  if (soloDigitos.length >= 7 && soloDigitos.length <= 8) {
    return { docTipo: 96, docNro: Number(soloDigitos) };
  }
  return { docTipo: 99, docNro: 0 };
}

const formatoARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function SummaryPanel({
  total,
  medioPago,
  items = [],
  onCambiarMedioPago,
  onEmitir,
  disabled = false,
}: SummaryPanelProps) {
  const [modoFacturaArca, setModoFacturaArca] = useState(false);
  const [cuitDni, setCuitDni] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [condicionFiscal, setCondicionFiscal] =
    useState<CondicionFiscal>('Consumidor Final');
  const [ultimoDatosCliente, setUltimoDatosCliente] =
    useState<DatosClienteFactura | null>(null);

  const [facturaEmitida, setFacturaEmitida] = useState<FacturaCResponseData | null>(null);
  const [emitiendoArca, setEmitiendoArca] = useState(false);
  const [errorArca, setErrorArca] = useState<string | null>(null);

  const handleEmitirComprobante = () => {
    if (disabled) return;
    setErrorArca(null);
    setModoFacturaArca(false);
    onEmitir('comprobante');
  };

  const handleToggleFacturaArca = () => {
    if (disabled || emitiendoArca) return;
    setErrorArca(null);
    setModoFacturaArca((prev) => !prev);
  };

  const handleConfirmarFacturaArca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || emitiendoArca) return;

    if (total <= 0) {
      setErrorArca('El total debe ser mayor a $0 para emitir Factura C.');
      return;
    }

    const datosCliente: DatosClienteFactura = {
      cuitDni: cuitDni.trim() || 'S/D',
      razonSocial: razonSocial.trim() || 'Consumidor Final',
      condicionFiscal,
    };

    const { docTipo, docNro } = parsearDocumentoReceptor(cuitDni);
    const condicionIvaReceptorId = CONDICION_IVA_ID[condicionFiscal] ?? 5;

    setErrorArca(null);
    setEmitiendoArca(true);

    try {
      const data = await emitirFacturaCDesdePos({
        importeTotal: total,
        concepto: 1,
        docTipo,
        docNro,
        condicionIvaReceptorId,
      });

      setUltimoDatosCliente(datosCliente);
      setFacturaEmitida(data);
      setModoFacturaArca(false);
      onEmitir('factura_arca', datosCliente);
    } catch (err) {
      setErrorArca(
        err instanceof Error ? err.message : 'Error al emitir Factura C en ARCA'
      );
    } finally {
      setEmitiendoArca(false);
    }
  };

  return (
    <aside className="rounded-2xl border border-slate-700/60 bg-slate-900/75 p-5 backdrop-blur-xl flex flex-col justify-between gap-5">
      <div className="space-y-4">
        <h2 className="text-xs font-bold tracking-widest text-slate-300 uppercase">
          Resumen
        </h2>

        <div>
          <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            TOTAL:
          </p>
          <p className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {formatoARS.format(total)}
          </p>
        </div>

        <div className="pt-2 border-t border-slate-800">
          <p className="text-xs text-slate-400 mb-2">Pago:</p>
          <div className="flex flex-wrap gap-1.5">
            {MEDIOS_PAGO.map((medio) => {
              const activo = medioPago === medio;
              return (
                <button
                  key={medio}
                  type="button"
                  onClick={() => onCambiarMedioPago(medio)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition border ${
                    activo
                      ? 'border-cyan-400/60 bg-cyan-500/20 text-cyan-200'
                      : 'border-slate-700/70 bg-slate-800/60 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {medio}
                </button>
              );
            })}
          </div>
        </div>

        {modoFacturaArca && !disabled && (
          <form
            onSubmit={handleConfirmarFacturaArca}
            className="space-y-2.5 rounded-xl border border-amber-400/35 bg-slate-950/80 p-3 text-xs"
          >
            <p className="font-semibold text-amber-300 uppercase tracking-wider">
              Datos Factura ARCA
            </p>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                CUIT / CUIL / DNI
              </label>
              <input
                type="text"
                value={cuitDni}
                onChange={(e) => setCuitDni(e.target.value)}
                placeholder="Ej. 20-34567890-1 o 34567890"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-slate-100 placeholder-slate-500 focus:border-amber-400/60 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Nombre o Razón Social
              </label>
              <input
                type="text"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                placeholder="Ej. Juan Pérez o Comercio SRL"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-slate-100 placeholder-slate-500 focus:border-amber-400/60 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Condición Fiscal
              </label>
              <select
                value={condicionFiscal}
                onChange={(e) => setCondicionFiscal(e.target.value as CondicionFiscal)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-slate-100 focus:border-amber-400/60 focus:outline-none"
              >
                {CONDICIONES_FISCALES.map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={emitiendoArca}
              className="w-full rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
            >
              {emitiendoArca ? 'Emitiendo en ARCA...' : 'Generar Factura ARCA'}
            </button>
          </form>
        )}

        {errorArca && (
          <p className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
            {errorArca}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <button
          type="button"
          disabled={disabled || emitiendoArca}
          onClick={handleEmitirComprobante}
          className="w-full rounded-xl bg-linear-to-r from-indigo-500 via-purple-500 to-cyan-500 px-4 py-3 text-xs sm:text-sm font-bold tracking-wider text-white uppercase shadow-[0_0_25px_rgba(99,102,241,0.35)] transition hover:brightness-110 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
        >
          Emitir Comprobante e Imprimir
        </button>

        <button
          type="button"
          disabled={disabled || emitiendoArca}
          onClick={handleToggleFacturaArca}
          className={`w-full rounded-xl border px-4 py-2.5 text-xs font-bold tracking-wider uppercase transition disabled:opacity-40 disabled:pointer-events-none ${
            modoFacturaArca
              ? 'border-amber-400 bg-amber-500/20 text-amber-200'
              : 'border-amber-400/45 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
          }`}
        >
          {modoFacturaArca ? 'Cancelar Factura ARCA' : 'Factura ARCA'}
        </button>
      </div>

      {facturaEmitida && (
        <TicketFacturaC
          factura={facturaEmitida}
          datosCliente={ultimoDatosCliente ?? undefined}
          items={items}
          medioPago={medioPago}
          onCerrar={() => setFacturaEmitida(null)}
        />
      )}
    </aside>
  );
}