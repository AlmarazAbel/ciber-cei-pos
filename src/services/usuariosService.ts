import {
  authHeaders,
  cargarUsuariosLocales,
  guardarUsuariosLocales,
  type RolUsuarioPos,
  type UsuarioPos,
} from './authService';

const API_BASE_URL =
  (import.meta.env?.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ||
  'http://localhost:4000/api';

type UsuarioApi = Partial<UsuarioPos> & {
  _id?: string;
  id?: string;
  activo?: boolean | string;
};

interface UsuariosApiResponse {
  usuarios?: UsuarioApi[];
  users?: UsuarioApi[];
  items?: UsuarioApi[];
  data?:
    | UsuarioApi[]
    | { usuarios?: UsuarioApi[]; users?: UsuarioApi[]; items?: UsuarioApi[] };
}

function normalizarRolUsuario(rol?: string): RolUsuarioPos {
  return rol?.toLowerCase() === 'admin' ? 'Admin' : 'Empleado';
}

function normalizarActivoUsuario(activo?: boolean | string): boolean {
  if (typeof activo === 'boolean') return activo;
  if (typeof activo === 'string') {
    const limpio = activo.trim().toLowerCase();
    if (limpio === 'false' || limpio === '0' || limpio === 'inactivo') {
      return false;
    }
    if (limpio === 'true' || limpio === '1' || limpio === 'activo') {
      return true;
    }
  }
  return true;
}

function normalizarUsuario(raw: UsuarioApi): UsuarioPos {
  return {
    id: String(raw.id ?? raw._id ?? `usr-${Date.now()}`),
    nombre: String(raw.nombre ?? ''),
    usuario: String(raw.usuario ?? '').toLowerCase(),
    rol: normalizarRolUsuario(raw.rol),
    activo: normalizarActivoUsuario(raw.activo),
  };
}

function extraerListaUsuarios(
  data: UsuariosApiResponse | UsuarioApi[]
): UsuarioPos[] {
  if (Array.isArray(data)) {
    return data.map(normalizarUsuario);
  }
  const lista =
    data.usuarios ??
    data.users ??
    data.items ??
    (Array.isArray(data.data)
      ? data.data
      : data.data?.usuarios ?? data.data?.users ?? data.data?.items ?? []);
  return lista.map(normalizarUsuario);
}

export async function obtenerUsuariosBackend(): Promise<UsuarioPos[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/usuarios`, {
      method: 'GET',
      headers: authHeaders(),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as
      | UsuariosApiResponse
      | UsuarioApi[];
    const usuarios = extraerListaUsuarios(data);
    if (usuarios.length > 0) {
      guardarUsuariosLocales(usuarios);
      return usuarios;
    }
    return cargarUsuariosLocales();
  } catch (error) {
    console.error('Error al obtener usuarios desde /api/usuarios:', error);
    return cargarUsuariosLocales();
  }
}

export async function crearUsuarioBackend(nuevo: {
  nombre: string;
  usuario: string;
  password?: string;
  rol: RolUsuarioPos;
}): Promise<{ ok: true; usuario: UsuarioPos } | { ok: false; error: string }> {
  const payload = {
    ...nuevo,
    password:
      nuevo.password && nuevo.password.trim().length > 0
        ? nuevo.password.trim()
        : '123456',
  };

  try {
    const response = await fetch(`${API_BASE_URL}/usuarios`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error:
          data?.error || data?.message || 'No se pudo crear el usuario.',
      };
    }

    const rawUser = (data?.usuario ??
      data?.user ??
      data?.data ??
      data) as UsuarioApi;
    return { ok: true, usuario: normalizarUsuario(rawUser) };
  } catch (error) {
    console.error('Error al crear usuario en /api/usuarios:', error);
    return {
      ok: false,
      error: 'Error de conexión al crear el usuario en el servidor.',
    };
  }
}

export async function actualizarUsuarioBackend(
  id: string,
  cambios: Partial<
    Pick<UsuarioPos, 'nombre' | 'usuario' | 'rol' | 'activo' | 'password'>
  >
): Promise<{ ok: true; usuario: UsuarioPos } | { ok: false; error: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/usuarios/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(cambios),
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error:
          data?.error || data?.message || 'No se pudo actualizar el usuario.',
      };
    }

    const rawUser = (data?.usuario ??
      data?.user ??
      data?.data ??
      data) as UsuarioApi;
    return { ok: true, usuario: normalizarUsuario(rawUser) };
  } catch (error) {
    console.error('Error al actualizar usuario en /api/usuarios/:id:', error);
    return {
      ok: false,
      error: 'Error de conexión al actualizar el usuario en el servidor.',
    };
  }
}

export async function eliminarUsuarioBackend(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/usuarios/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: authHeaders(),
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        error:
          data?.error || data?.message || 'No se pudo eliminar el usuario.',
      };
    }

    return { ok: true };
  } catch (error) {
    console.error('Error al eliminar usuario en /api/usuarios/:id:', error);
    return {
      ok: false,
      error: 'Error de conexión al eliminar el usuario en el servidor.',
    };
  }
}