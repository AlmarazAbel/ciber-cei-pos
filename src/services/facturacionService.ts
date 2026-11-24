export interface EmitirFacturaCPayload {
  importeTotal: number;
  concepto?: 1 | 2 | 3;
  docTipo?: number;
  docNro?: number;
  condicionIvaReceptorId?: number;
}

export interface FacturaCResponseData {
  cae: string;
  caeFchVto: string;
  cbteNro: number;
  ptoVta: number;
  cbteTipo: number;
  impTotal: number;
  resultado: string;
  observaciones: string[];
  qrPayloadBase64: string;
}

interface ApiFacturaCResponse {
  ok: boolean;
  data?: FacturaCResponseData;
  error?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function emitirFacturaCDesdePos(
  payload: EmitirFacturaCPayload
): Promise<FacturaCResponseData> {
  const res = await fetch(`${API_BASE_URL}/api/facturacion/arca`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = (await res.json()) as ApiFacturaCResponse;

  if (!res.ok || !json.ok || !json.data) {
    throw new Error(json.error || "No se pudo emitir la Factura C");
  }

  return json.data;
}

export function buildArcaQrUrl(qrPayloadBase64: string): string {
  return `https://www.arca.gob.ar/fe/qr/?p=${encodeURIComponent(qrPayloadBase64)}`;
}