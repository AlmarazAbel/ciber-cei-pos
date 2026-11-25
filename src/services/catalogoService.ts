import { ARTICULOS_INICIALES, SERVICIOS_RAPIDOS } from '../data/catalogMock';
import type { ItemCatalogo } from '../types/pos';
import { authHeaders } from './authService';

const API_BASE_URL =
  (import.meta.env?.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ||
  'http://localhost:4000/api';

const STORAGE_KEY_CATALOGO = 'ciber_cei_catalogo_v1';

type ItemCatalogoApi = Partial<ItemCatalogo> & {
  _id?: string;
  id?: string;
  codigo?: string;
  imagenUrl?: string;
};

interface CatalogoApiResponse {
  items?: ItemCatalogoApi[];
  catalogo?: ItemCatalogoApi[];
  data?:
    | ItemCatalogoApi[]
    | { items?: ItemCatalogoApi[]; catalogo?: ItemCatalogoApi[] };
}

function normalizarItemCatalogo(raw: ItemCatalogoApi): ItemCatalogo {
  const idFinal = String(raw.id ?? raw.codigo ?? raw._id ?? `item-${Date.now()}`);
  const imagenFinal = raw.imagenUrl ?? raw.imagen;

  return {
    ...(raw as ItemCatalogo),
    id: idFinal,
    nombre: String(raw.nombre ?? 'Sin nombre'),
    precio: Number(raw.precio ?? 0),
    tipo: raw.tipo === 'servicio' ? 'servicio' : 'articulo',
    imagen: imagenFinal,
  };
}

function prepararPayloadBackend(
  item: Partial<ItemCatalogo> & { id?: string }
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    ...item,
    imagenUrl: item.imagen ?? undefined,
  };
  delete payload.imagen;
  return payload;
}

function extraerListaItems(
  data: CatalogoApiResponse | ItemCatalogoApi[]
): ItemCatalogo[] {
  if (Array.isArray(data)) {
    return data.map(normalizarItemCatalogo);
  }
  const lista =
    data.items ??
    data.catalogo ??
    (Array.isArray(data.data)
      ? data.data
      : data.data?.items ?? data.data?.catalogo ?? []);
  return lista.map(normalizarItemCatalogo);
}

export function cargarCatalogoInicial(): ItemCatalogo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATALOGO);
    if (!raw) {
      const inicial = [...ARTICULOS_INICIALES, ...SERVICIOS_RAPIDOS];
      localStorage.setItem(STORAGE_KEY_CATALOGO, JSON.stringify(inicial));
      return inicial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(normalizarItemCatalogo);
    }
  } catch (error) {
    console.error('Error al leer catálogo desde localStorage:', error);
  }
  return [...ARTICULOS_INICIALES, ...SERVICIOS_RAPIDOS];
}

export function guardarCatalogoLocal(items: ItemCatalogo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CATALOGO, JSON.stringify(items));
  } catch (error) {
    console.error('Error al guardar catálogo en localStorage:', error);
  }
}

export function restablecerCatalogoPorDefecto(): ItemCatalogo[] {
  const inicial = [...ARTICULOS_INICIALES, ...SERVICIOS_RAPIDOS];
  guardarCatalogoLocal(inicial);
  return inicial;
}

export async function obtenerCatalogoBackend(): Promise<ItemCatalogo[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/catalogo`, {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as
      | CatalogoApiResponse
      | ItemCatalogoApi[];
    const items = extraerListaItems(data);
    guardarCatalogoLocal(items);
    return items;
  } catch (error) {
    console.error('Error al obtener catálogo desde el backend:', error);
    return cargarCatalogoInicial();
  }
}

export async function crearItemCatalogoBackend(
  item: Omit<ItemCatalogo, 'id'> & { id?: string }
): Promise<{ ok: true; item: ItemCatalogo } | { ok: false; error: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/catalogo`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(prepararPayloadBackend(item)),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: data?.error || data?.message || 'No se pudo crear el ítem.',
      };
    }

    const rawItem = data?.item ?? data?.data ?? data;
    return { ok: true, item: normalizarItemCatalogo(rawItem) };
  } catch (error) {
    console.error('Error al crear ítem en /api/catalogo:', error);
    return {
      ok: false,
      error: 'Error de conexión al guardar el ítem en el servidor.',
    };
  }
}

export async function actualizarItemCatalogoBackend(
  item: ItemCatalogo
): Promise<{ ok: true; item: ItemCatalogo } | { ok: false; error: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/catalogo/${encodeURIComponent(item.id)}`,
      {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(prepararPayloadBackend(item)),
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: data?.error || data?.message || 'No se pudo actualizar el ítem.',
      };
    }

    const rawItem = data?.item ?? data?.data ?? data;
    return { ok: true, item: normalizarItemCatalogo(rawItem) };
  } catch (error) {
    console.error('Error al actualizar ítem en /api/catalogo:', error);
    return {
      ok: false,
      error: 'Error de conexión al actualizar el ítem en el servidor.',
    };
  }
}

export async function eliminarItemCatalogoBackend(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/catalogo/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: authHeaders(),
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error: data?.error || data?.message || 'No se pudo eliminar el ítem.',
      };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error al eliminar ítem en /api/catalogo:', error);
    return {
      ok: false,
      error: 'Error de conexión al eliminar el ítem en el servidor.',
    };
  }
}