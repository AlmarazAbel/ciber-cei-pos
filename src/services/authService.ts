export type RolUsuarioPos = 'Admin' | 'Empleado';

export interface UsuarioPos {
  id: string;
  nombre: string;
  usuario: string;
  rol: RolUsuarioPos;
  activo: boolean;
  password?: string;
}

export interface SesionPos {
  usuario: Omit<UsuarioPos, 'password'>;
  loginAt: string;
}

const STORAGE_KEY_SESION = 'ciber_cei_sesion_pos_v1';
const STORAGE_KEY_USUARIOS = 'ciber_cei_usuarios_pos_v1';

export const USUARIOS_LOCALES: UsuarioPos[] = [
  {
    id: 'usr-abel',
    nombre: 'Abel',
    usuario: 'abel',
    rol: 'Admin',
    activo: true,
  },
  {
    id: 'usr-empleado',
    nombre: 'Mostrador 1',
    usuario: 'caja1',
    rol: 'Empleado',
    activo: true,
  },
];

export function cargarUsuariosLocales(): UsuarioPos[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USUARIOS);
    if (!raw) return USUARIOS_LOCALES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (error) {
    console.error('Error al leer usuarios desde localStorage:', error);
  }
  return USUARIOS_LOCALES;
}

export function guardarUsuariosLocales(usuarios: UsuarioPos[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_USUARIOS, JSON.stringify(usuarios));
  } catch (error) {
    console.error('Error al guardar usuarios en localStorage:', error);
  }
}

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
  password: string,
  usuariosDisponibles: UsuarioPos[] = cargarUsuariosLocales()
): { ok: true; sesion: SesionPos } | { ok: false; error: string } {
  const limpio = identificador.trim().toLowerCase();
  if (!limpio) {
    return { ok: false, error: 'Ingresá tu usuario o nombre de operador.' };
  }

  const encontrado = usuariosDisponibles.find(
    (u) =>
      u.usuario.toLowerCase() === limpio ||
      u.nombre.toLowerCase() === limpio
  );

  if (encontrado && !encontrado.activo) {
    return {
      ok: false,
      error: `El usuario "${encontrado.usuario}" está desactivado.`,
    };
  }

  // Si el usuario tiene contraseña definida en modo local, la validamos si se ingresó algo distinto
  if (encontrado?.password && password && encontrado.password !== password) {
    return {
      ok: false,
      error: 'Contraseña incorrecta para este operador.',
    };
  }

  const usuarioActivo: Omit<UsuarioPos, 'password'> = encontrado
    ? {
        id: encontrado.id,
        nombre: encontrado.nombre,
        usuario: encontrado.usuario,
        rol: encontrado.rol,
        activo: encontrado.activo,
      }
    : {
        id: `usr-${Date.now()}`,
        nombre: identificador.trim(),
        usuario: limpio,
        rol: 'Empleado',
        activo: true,
      };

  const sesion: SesionPos = {
    usuario: usuarioActivo,
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