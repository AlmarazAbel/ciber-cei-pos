import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import type { DatosClienteFactura, ItemCarrito } from "../../types/pos";
import {
  type FacturaCResponseData,
  buildArcaQrUrl,
} from "../../services/facturacionService";
import { FacturaCA4Oficial } from "./FacturaCA4Oficial";

interface TicketFacturaCProps {
  factura: FacturaCResponseData;
  datosCliente?: DatosClienteFactura;
  items?: ItemCarrito[];
  medioPago?: string;
  onCerrar: () => void;
}

function formatearVencimientoCae(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(0, 4)}`;
}

export function TicketFacturaC({
  factura,
  datosCliente,
  items,
  medioPago,
  onCerrar,
}: TicketFacturaCProps) {
  const [verFormatoA4, setVerFormatoA4] = useState(false);

  const qrUrl = buildArcaQrUrl(factura.qrPayloadBase64);
  const comprobanteFormateado = `${String(factura.ptoVta).padStart(4, "0")}-${String(
    factura.cbteNro
  ).padStart(8, "0")}`;

  useEffect(() => {
    if (verFormatoA4) return;

    const styleEl = document.createElement("style");
    styleEl.setAttribute("data-print-ticket-arca", "true");
    styleEl.textContent = `
      @media print {
        body > *:not(#arca-ticket-print-root) {
          display: none !important;
        }
        html, body {
          background: #ffffff !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        #arca-ticket-print-root {
          position: static !important;
          display: flex !important;
          justify-content: center !important;
          align-items: flex-start !important;
          background: #ffffff !important;
          padding: 16px !important;
          backdrop-filter: none !important;
        }
        #ticket-factura-c-print {
          position: static !important;
          transform: none !important;
          width: 340px !important;
          max-width: 100% !important;
          background: #ffffff !important;
          color: #000000 !important;
          border: 1px solid #cbd5e1 !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }
        #ticket-factura-c-print * {
          color: #000000 !important;
          border-color: #cbd5e1 !important;
          background-color: transparent !important;
        }
        #ticket-factura-c-print .qr-box-blanco,
        #ticket-factura-c-print .qr-box-blanco * {
          background-color: #ffffff !important;
          color: #0f172a !important;
          border-color: #cbd5e1 !important;
        }
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      styleEl.remove();
    };
  }, [verFormatoA4]);

  const portalRoot =
    document.getElementById("arca-ticket-print-root") ??
    (() => {
      const el = document.createElement("div");
      el.id = "arca-ticket-print-root";
      document.body.appendChild(el);
      return el;
    })();

  if (verFormatoA4) {
    return (
      <FacturaCA4Oficial
        factura={factura}
        datosCliente={datosCliente}
        items={items}
        medioPago={medioPago}
        onCerrar={() => setVerFormatoA4(false)}
      />
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div
        id="ticket-factura-c-print"
        className="w-full max-w-sm rounded-2xl border border-white/20 bg-slate-900/90 p-6 text-slate-100 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-cyan-300/85">
              Comprobante Electrónico
            </p>
            <h2 className="text-lg font-bold text-white">Ciber Cei</h2>
            <p className="text-xs text-slate-300">
              CUIT: 20375017912 · Monotributo
            </p>
          </div>
          <span className="shrink-0 whitespace-nowrap rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-200">
            FACTURA C
          </span>
        </div>

        <div className="my-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Pto. Vta. / Nro.:</span>
            <span className="font-mono font-medium">{comprobanteFormateado}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Importe Total:</span>
            <span className="font-semibold text-emerald-300">
              ${factura.impTotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">CAE:</span>
            <span className="font-mono">{factura.cae}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Vto. CAE:</span>
            <span className="font-mono">{formatearVencimientoCae(factura.caeFchVto)}</span>
          </div>
        </div>

        <div className="qr-box-blanco mt-4 flex flex-col items-center justify-center rounded-xl border border-white/15 bg-white p-3">
          <QRCodeSVG value={qrUrl} size={136} level="M" />
          <span className="mt-1.5 text-[10px] font-medium text-slate-700">
            Verificá en ARCA · QR Oficial
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-2 print:hidden">
          <button
            type="button"
            onClick={() => setVerFormatoA4(true)}
            className="w-full cursor-pointer rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/25"
          >
            Ver formato A4
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 cursor-pointer rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Imprimir
            </button>
            <button
              type="button"
              onClick={onCerrar}
              className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalRoot
  );
}