import { useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import type { DatosClienteFactura, ItemCarrito } from "../../types/pos";
import {
  type FacturaCResponseData,
  buildArcaQrUrl,
} from "../../services/facturacionService";

type CopiaComprobante = "ORIGINAL" | "DUPLICADO" | "TRIPLICADO";

interface FacturaCA4OficialProps {
  factura: FacturaCResponseData;
  datosCliente?: DatosClienteFactura;
  items?: ItemCarrito[];
  medioPago?: string;
  onCerrar: () => void;
}

const COPIAS: CopiaComprobante[] = ["ORIGINAL", "DUPLICADO", "TRIPLICADO"];

function formatearVencimientoCae(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`;
}

function formatearFechaEmision(): string {
  return new Date().toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const formatoDecimal = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function FacturaCA4Oficial({
  factura,
  datosCliente,
  items = [],
  medioPago = "Contado",
  onCerrar,
}: FacturaCA4OficialProps) {
  const [copia, setCopia] = useState<CopiaComprobante>("ORIGINAL");

  const qrUrl = buildArcaQrUrl(factura.qrPayloadBase64);
  const ptoVtaFormateado = String(factura.ptoVta).padStart(5, "0");
  const cbteNroFormateado = String(factura.cbteNro).padStart(8, "0");
  const fechaEmision = formatearFechaEmision();
  const vtoCaeFormateado = formatearVencimientoCae(factura.caeFchVto);

  const handleImprimirA4 = () => {
    const styleId = "estilo-impresion-factura-a4-activo";
    document.getElementById(styleId)?.remove();

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        html, body {
          background: #ffffff !important;
          color: #111827 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          height: auto !important;
        }
        body * {
          visibility: hidden !important;
        }
        #factura-c-a4-hoja,
        #factura-c-a4-hoja * {
          visibility: visible !important;
        }
        #factura-c-a4-hoja {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 12px !important;
          border: 1.5px solid #111827 !important;
          box-shadow: none !important;
          background: #ffffff !important;
          color: #111827 !important;
          z-index: 999999 !important;
        }
      }
    `;
    document.head.appendChild(style);

    const limpiar = () => {
      document.getElementById(styleId)?.remove();
      window.removeEventListener("afterprint", limpiar);
    };

    window.addEventListener("afterprint", limpiar);

    setTimeout(() => {
      window.print();
      setTimeout(limpiar, 1500);
    }, 80);
  };

  const portalRoot =
    document.getElementById("arca-factura-a4-root") ??
    (() => {
      const el = document.createElement("div");
      el.id = "arca-factura-a4-root";
      document.body.appendChild(el);
      return el;
    })();

  const listaItems =
    items.length > 0
      ? items
      : [
          {
            id: "venta-pos",
            nombre: "Venta Mostrador Ciber Cei",
            precio: factura.impTotal,
            cantidad: 1,
            tipo: "servicio" as const,
          },
        ];

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="my-4 w-full max-w-4xl">
        {/* Barra superior de acciones */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/15 bg-slate-900/95 px-4 py-2.5 text-slate-100 shadow-lg">
          <div className="flex items-center gap-1.5">
            {COPIAS.map((itemCopia) => (
              <button
                key={itemCopia}
                type="button"
                onClick={() => setCopia(itemCopia)}
                className={`cursor-pointer rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  copia === itemCopia
                    ? "bg-cyan-500 text-slate-950"
                    : "border border-white/15 bg-white/5 text-slate-300 hover:bg-white/15"
                }`}
              >
                {itemCopia}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleImprimirA4}
              className="cursor-pointer rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Imprimir A4
            </button>
            <button
              type="button"
              onClick={onCerrar}
              className="cursor-pointer rounded-lg border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
            >
              Volver al Ticket
            </button>
          </div>
        </div>

        {/* Hoja A4 Factura C */}
        <div
          id="factura-c-a4-hoja"
          className="rounded-md border-2 border-slate-900 bg-white p-5 text-slate-900 shadow-2xl"
        >
          {/* Copia */}
          <div className="mb-2 border border-slate-900 py-1 text-center text-xs font-extrabold tracking-widest uppercase">
            {copia}
          </div>

          {/* Encabezado emisor / letra C / datos comprobante */}
          <div className="grid grid-cols-12 border border-slate-900">
            <div className="col-span-5 flex flex-col justify-between border-b border-slate-900 p-3 md:col-span-5 md:border-r md:border-b-0">
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-950">
                  ALMARAZ JESUS ABEL
                </h1>
                <p className="mt-0.5 text-[11px] font-semibold text-slate-700">
                  Ciber Cei · Ventas Informáticas e Impresiones
                </p>
              </div>
              <div className="mt-4 space-y-1 text-xs">
                <p>
                  <span className="font-bold">Domicilio Comercial:</span>{" "}
                  Eliseo Canton 104 - Lules, Tucumán
                </p>
                <p>
                  <span className="font-bold">Condición frente al IVA:</span>{" "}
                  Responsable Monotributo
                </p>
              </div>
            </div>

            <div className="col-span-2 flex flex-col items-center justify-start border-b border-slate-900 p-2 md:col-span-2 md:border-r md:border-b-0">
              <div className="flex h-12 w-12 items-center justify-center border-2 border-slate-900 text-3xl font-black leading-none">
                C
              </div>
              <span className="mt-1 text-[10px] font-bold tracking-wider">
                COD. 011
              </span>
            </div>

            <div className="col-span-5 flex flex-col justify-between p-3 md:col-span-5">
              <div>
                <h2 className="text-lg font-black tracking-wide text-slate-950">
                  FACTURA
                </h2>
                <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                  <p>
                    <span className="font-bold">Punto de Venta:</span>{" "}
                    <span className="font-mono">{ptoVtaFormateado}</span>
                  </p>
                  <p>
                    <span className="font-bold">Comp. Nro:</span>{" "}
                    <span className="font-mono">{cbteNroFormateado}</span>
                  </p>
                  <p className="col-span-2">
                    <span className="font-bold">Fecha de Emisión:</span>{" "}
                    {fechaEmision}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-0.5 text-xs">
                <p>
                  <span className="font-bold">CUIT:</span> 20375017912
                </p>
                <p>
                  <span className="font-bold">Ingresos Brutos:</span> 20375017912
                </p>
                <p>
                  <span className="font-bold">Fecha de Inicio de Actividades:</span>{" "}
                  17/04/2018
                </p>
              </div>
            </div>
          </div>

          {/* Datos del receptor */}
          <div className="mt-2 grid grid-cols-1 gap-2 border border-slate-900 p-3 text-xs sm:grid-cols-2">
            <div className="space-y-1">
              <p>
                <span className="font-bold">CUIT / DNI:</span>{" "}
                {datosCliente?.cuitDni || "Consumidor Final"}
              </p>
              <p>
                <span className="font-bold">Apellido y Nombre / Razón Social:</span>{" "}
                {datosCliente?.razonSocial || "Consumidor Final"}
              </p>
            </div>
            <div className="space-y-1">
              <p>
                <span className="font-bold">Condición frente al IVA:</span>{" "}
                {datosCliente?.condicionFiscal || "Consumidor Final"}
              </p>
              <p>
                <span className="font-bold">Condición de venta:</span> {medioPago}
              </p>
            </div>
          </div>

          {/* Detalle de ítems */}
          <div className="mt-2 overflow-x-auto border border-slate-900">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-100 font-bold text-slate-900">
                  <th className="px-2 py-1.5">Código</th>
                  <th className="px-2 py-1.5">Producto / Servicio</th>
                  <th className="px-2 py-1.5 text-right">Cantidad</th>
                  <th className="px-2 py-1.5">U. Medida</th>
                  <th className="px-2 py-1.5 text-right">Precio Unit.</th>
                  <th className="px-2 py-1.5 text-right">% Bonif</th>
                  <th className="px-2 py-1.5 text-right">Imp. Bonif.</th>
                  <th className="px-2 py-1.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {listaItems.map((item, index) => {
                  const subtotalItem = item.precio * item.cantidad;
                  return (
                    <tr
                      key={`${item.id}-${index}`}
                      className="border-b border-slate-300 last:border-b-0"
                    >
                      <td className="px-2 py-1.5 font-mono text-[11px]">
                        {item.id.slice(0, 8)}
                      </td>
                      <td className="px-2 py-1.5 font-medium">{item.nombre}</td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {formatoDecimal.format(item.cantidad)}
                      </td>
                      <td className="px-2 py-1.5">unidades</td>
                      <td className="px-2 py-1.5 text-right font-mono">
                        {formatoDecimal.format(item.precio)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono">0,00</td>
                      <td className="px-2 py-1.5 text-right font-mono">0,00</td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold">
                        {formatoDecimal.format(subtotalItem)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="mt-2 flex justify-end border border-slate-900 p-3 text-xs">
            <div className="w-full max-w-xs space-y-1">
              <div className="flex justify-between">
                <span className="font-bold">Subtotal:</span>
                <span className="font-mono">
                  $ {formatoDecimal.format(factura.impTotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Importe Otros Tributos:</span>
                <span className="font-mono">$ 0,00</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1 text-sm font-black">
                <span>Importe Total:</span>
                <span className="font-mono">
                  $ {formatoDecimal.format(factura.impTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Pie fiscal con QR y CAE */}
          <div className="mt-2 grid grid-cols-1 gap-3 border border-slate-900 p-3 text-xs sm:grid-cols-12">
            <div className="flex flex-col items-start gap-2 sm:col-span-6 sm:flex-row sm:items-center">
              <div className="shrink-0 rounded border border-slate-300 bg-white p-1.5">
                <QRCodeSVG value={qrUrl} size={96} level="M" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black tracking-tight text-slate-950">
                  ARCA
                </p>
                <p className="text-[10px] font-bold leading-tight text-slate-800">
                  AGENCIA DE RECAUDACIÓN Y CONTROL ADUANERO
                </p>
                <p className="text-[10px] italic text-slate-600">
                  Comprobante Autorizado
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-1.5 sm:col-span-6 sm:items-end sm:text-right">
              <p>
                <span className="font-bold">CAE N°:</span>{" "}
                <span className="font-mono font-bold">{factura.cae}</span>
              </p>
              <p>
                <span className="font-bold">Fecha de Vto. de CAE:</span>{" "}
                <span className="font-mono font-bold">{vtoCaeFormateado}</span>
              </p>
              <p className="pt-1 text-[10px] font-semibold text-slate-700">
                Pág. 1/1
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    portalRoot
  );
}