import type { ItemCatalogo } from '../types/pos';

export const SERVICIOS_RAPIDOS: ItemCatalogo[] = [
  { id: 'srv-bn', nombre: 'Impresión B/N', precio: 150, tipo: 'servicio' },
  { id: 'srv-color', nombre: 'Impresión Color', precio: 350, tipo: 'servicio' },
  { id: 'srv-tipeo', nombre: 'Tipeo de Texto', precio: 1500, tipo: 'servicio' },
  { id: 'srv-excel', nombre: 'Planilla Excel', precio: 2500, tipo: 'servicio' },
  { id: 'srv-tec', nombre: 'Servicio Técnico', precio: 8000, tipo: 'servicio' },
  { id: 'srv-tramite', nombre: 'Escaneo / Trámites', precio: 300, tipo: 'servicio' },
];

export const ARTICULOS_INICIALES: ItemCatalogo[] = [
  {
    id: 'art-1',
    codigoBarras: '7791234567890',
    nombre: 'Mouse Logitech G203',
    precio: 24000,
    tipo: 'articulo',
    stock: 8,
    imagen: 'https://placehold.co/80x80/0f172a/22d3ee?text=Mouse',
  },
  {
    id: 'art-2',
    codigoBarras: '7791234567891',
    nombre: 'Cable HDMI 1.5m',
    precio: 4500,
    tipo: 'articulo',
    stock: 15,
    imagen: 'https://placehold.co/80x80/0f172a/38bdf8?text=HDMI',
  },
  {
    id: 'art-3',
    nombre: 'Cable SATA Datos',
    precio: 2200,
    tipo: 'articulo',
    stock: 20,
    imagen: 'https://placehold.co/80x80/0f172a/a855f7?text=SATA',
  },
  {
    id: 'art-4',
    codigoBarras: '7791234567892',
    nombre: 'Pendrive Kingston 64GB',
    precio: 12500,
    tipo: 'articulo',
    stock: 10,
    imagen: 'https://placehold.co/80x80/0f172a/22d3ee?text=USB',
  },
];