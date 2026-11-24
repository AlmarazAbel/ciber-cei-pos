export type RolUsuarioPos = 'Admin' | 'Empleado';

export interface UsuarioPos {
  id: string;
  nombre: string;
  usuario: string;
  rol: RolUsuarioPos;
}

export interface SesionPos {
  usuario: UsuarioPos;
  loginAt: string;
}

const STORAGE_KEY_SESION = 'ciber_cei_sesion_pos_v1';

export const USUARIOS_LOCALES: UsuarioPos[] = [
  {
    id: 'usr-abel',
    nombre: 'Abel',
    usuario: 'abel',
    rol: 'Admin',
  },
  {
    id: 'usr-empleado',
    nombre: 'Mostrador 1',
    usuario: 'caja1',
    rol: 'Empleado',
  },
];

export function cargarSesionInicial(): SesionPos | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SesionPos;
    if (
      parsed?.usuario?.nombre &&
      parsed?.usuario?.usuario &&
      (parsed.usuario.rol === 'Admin' || parsed.usuario.rol === 'Empleado')
    ) {
      return parsed;
    }
  } catch (error) {
    console.error('Error al leer sesión desde localStorage:', error);
  }
  return null;
}

export function guardarSesionLocal(sesion: SesionPos | null): void {
  try {
    if (!sesion) {
      localStorage.removeItem(STORAGE_KEY_SESION);
      return;
    }
    localStorage.setItem(STORAGE_KEY_SESION, JSON.stringify(sesion));
  } catch (error) {
    console.error('Error al guardar sesión en localStorage:', error);
  }
}

export function autenticarLocal(
  identificador: string,
  _password: string
): { ok: true; sesion: SesionPos } | { ok: false; error: string } {
  const limpio = identificador.trim().toLowerCase();
  if (!limpio) {
    return { ok: false, error: 'Ingresá tu usuario o nombre de operador.' };
  }

  const encontrado =
    USUARIOS_LOCALES.find(
      (u) =>
        u.usuario.toLowerCase() === limpio ||
        u.nombre.toLowerCase() === limpio
    ) ?? {
      id: `usr-${Date.now()}`,
      nombre: identificador.trim(),
      usuario: limpio,
      rol: 'Empleado' as const,
    };

  const sesion: SesionPos = {
    usuario: encontrado,
    loginAt: new Date().toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }),
  };

  guardarSesionLocal(sesion);
  return { ok: true, sesion };
}

export function cerrarSesionLocal(): void {
  guardarSesionLocal(null);
}