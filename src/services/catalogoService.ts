import { ARTICULOS_INICIALES, SERVICIOS_RAPIDOS } from '../data/catalogMock';
import type { ItemCatalogo } from '../types/pos';

const STORAGE_KEY_CATALOGO = 'ciber_cei_catalogo_v1';

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
      return parsed;
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