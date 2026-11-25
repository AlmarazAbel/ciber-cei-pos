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
  token?: string;
  loginAt: string;
}

interface LoginApiResponse {
  ok?: boolean;
  message?: string;
  error?: string;
  token?: string;
  data?: {
    token?: string;
    usuario?: Partial<UsuarioPos> & { _id?: string };
    user?: Partial<UsuarioPos> & { _id?: string };
  };
  usuario?: Partial<UsuarioPos> & { _id?: string };
  user?: Partial<UsuarioPos> & { _id?: string };
}

const API_BASE_URL =
  (import.meta.env?.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ||
  'http://localhost:4000/api';

const STORAGE_KEY_SESION = 'ciber_cei_sesion_pos_v1';
const STORAGE_KEY_USUARIOS = 'ciber_cei_usuarios_pos_v1';
const STORAGE_KEY_TOKEN = 'ciber_cei_token_pos_v1';

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

export function obtenerTokenAuth(): string | null {
  try {
    const tokenDirecto = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (tokenDirecto) return tokenDirecto;

    const sesion = cargarSesionInicial();
    return sesion?.token ?? null;
  } catch (error) {
    console.error('Error al leer token desde localStorage:', error);
    return null;
  }
}

export function guardarTokenAuth(token: string | null): void {
  try {
    if (!token) {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      return;
    }
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
  } catch (error) {
    console.error('Error al guardar token en localStorage:', error);
  }
}

export function authHeaders(extraHeaders: HeadersInit = {}): HeadersInit {
  const token = obtenerTokenAuth();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

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
      guardarTokenAuth(null);
      return;
    }
    localStorage.setItem(STORAGE_KEY_SESION, JSON.stringify(sesion));
    if (sesion.token) {
      guardarTokenAuth(sesion.token);
    }
  } catch (error) {
    console.error('Error al guardar sesión en localStorage:', error);
  }
}

function normalizarRol(rol?: string): RolUsuarioPos {
  return rol?.toLowerCase() === 'admin' ? 'Admin' : 'Empleado';
}

export async function autenticarConBackend(
  identificador: string,
  password: string
): Promise<{ ok: true; sesion: SesionPos } | { ok: false; error: string }> {
  const limpio = identificador.trim().toLowerCase();
  if (!limpio) {
    return { ok: false, error: 'Ingresá tu usuario.' };
  }
  if (!password) {
    return { ok: false, error: 'Ingresá tu contraseña.' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usuario: limpio,
        password,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as LoginApiResponse;

    if (!response.ok) {
      return {
        ok: false,
        error:
          data.error ||
          data.message ||
          'Usuario o contraseña incorrectos.',
      };
    }

    const rawUser = data.usuario ?? data.user ?? data.data?.usuario ?? data.data?.user;
    const token = data.token ?? data.data?.token;

    if (!token || !rawUser) {
      return {
        ok: false,
        error: 'Respuesta incompleta del servidor al iniciar sesión.',
      };
    }

    const usuarioActivo: Omit<UsuarioPos, 'password'> = {
      id: String(rawUser.id ?? rawUser._id ?? ''),
      nombre: String(rawUser.nombre ?? limpio),
      usuario: String(rawUser.usuario ?? limpio),
      rol: normalizarRol(rawUser.rol),
      activo: rawUser.activo ?? true,
    };

    const sesion: SesionPos = {
      usuario: usuarioActivo,
      token,
      loginAt: new Date().toLocaleString('es-AR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }),
    };

    guardarSesionLocal(sesion);
    return { ok: true, sesion };
  } catch (error) {
    console.error('Error de conexión con /api/auth/login:', error);
    return {
      ok: false,
      error:
        'No se pudo conectar con el servidor en http://localhost:4000. Verificá que el backend esté encendido.',
    };
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