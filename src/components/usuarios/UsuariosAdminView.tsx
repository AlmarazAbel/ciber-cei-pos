import { useState } from 'react';
import type { RolUsuarioPos, UsuarioPos } from '../../services/authService';

interface UsuariosAdminViewProps {
  usuarios: UsuarioPos[];
  usuarioActualId: string;
  onCrearUsuario: (nuevo: {
    nombre: string;
    usuario: string;
    password?: string;
    rol: RolUsuarioPos;
  }) => void;
  onCambiarRol: (id: string, nuevoRol: RolUsuarioPos) => void;
  onToggleActivo: (id: string) => void;
  onEliminarUsuario: (id: string) => void;
  onVolverPos: () => void;
}

export function UsuariosAdminView({
  usuarios,
  usuarioActualId,
  onCrearUsuario,
  onCambiarRol,
  onToggleActivo,
  onEliminarUsuario,
  onVolverPos,
}: UsuariosAdminViewProps) {
  const [nombre, setNombre] = useState('');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<RolUsuarioPos>('Empleado');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    const usuarioLimpio = usuario.trim().toLowerCase().replace(/\s+/g, '');

    if (!nombreLimpio || !usuarioLimpio) {
      setError('Completá nombre y usuario.');
      return;
    }

    if (usuarios.some((u) => u.usuario.toLowerCase() === usuarioLimpio)) {
      setError(`El usuario "${usuarioLimpio}" ya existe.`);
      return;
    }

    onCrearUsuario({
      nombre: nombreLimpio,
      usuario: usuarioLimpio,
      password: password.trim() || undefined,
      rol,
    });

    setNombre('');
    setUsuario('');
    setPassword('');
    setRol('Empleado');
    setError(null);
  };

  return (
    <section className="flex flex-col gap-4">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/75 p-4 backdrop-blur-md">
        <div>
          <h1 className="text-lg font-bold text-white">
            Administración de Usuarios y Permisos
          </h1>
          <p className="text-xs text-slate-400">
            Creá operadores para el negocio, asigná rol <strong>Admin</strong> (acceso total) o{' '}
            <strong>Empleado</strong> (solo caja/POS) y controlá su estado.
          </p>
        </div>

        <button
          type="button"
          onClick={onVolverPos}
          className="cursor-pointer rounded-xl bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          Volver a Caja / POS
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Formulario alta de usuario */}
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/75 p-4 text-xs backdrop-blur-md lg:col-span-5"
        >
          <h2 className="text-sm font-bold text-white">Nuevo Usuario</h2>

          <div>
            <label className="mb-1 block text-slate-300">Nombre visible *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Lucas (Turno Tarde)"
              className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-slate-300">Usuario de login *</label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Ej: lucas"
              className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 font-mono text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-slate-300">
              Contraseña (opcional en modo local)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-slate-300">Rol / Permisos</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as RolUsuarioPos)}
              className="w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="Empleado">Empleado (Solo Caja / POS y ventas)</option>
              <option value="Admin">Admin (Acceso total: catálogo, historial, arqueo, gráficos, usuarios)</option>
            </select>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110"
          >
            Crear Usuario
          </button>
        </form>

        {/* Listado de usuarios */}
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/75 p-4 text-xs backdrop-blur-md lg:col-span-7">
          <h2 className="mb-3 text-sm font-bold text-white">
            Usuarios Registrados ({usuarios.length})
          </h2>

          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 text-slate-400">
                <th className="py-2 pr-2">Nombre / Usuario</th>
                <th className="py-2 px-2">Rol</th>
                <th className="py-2 px-2">Estado</th>
                <th className="py-2 pl-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {usuarios.map((u) => {
                const esYo = u.id === usuarioActualId;
                return (
                  <tr key={u.id}>
                    <td className="py-2.5 pr-2">
                      <div className="font-semibold text-white">
                        {u.nombre}{' '}
                        {esYo && (
                          <span className="ml-1 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] text-cyan-300">
                            Vos
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        @{u.usuario}
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <select
                        value={u.rol}
                        disabled={esYo}
                        onChange={(e) =>
                          onCambiarRol(u.id, e.target.value as RolUsuarioPos)
                        }
                        aria-label={`Rol de ${u.nombre}`}
                        className="rounded-lg border border-white/15 bg-slate-950 px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-60 focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="Empleado">Empleado</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-2">
                      <button
                        type="button"
                        disabled={esYo}
                        onClick={() => onToggleActivo(u.id)}
                        className={`cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
                          u.activo
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="py-2.5 pl-2 text-right">
                      {!esYo && (
                        <button
                          type="button"
                          onClick={() => onEliminarUsuario(u.id)}
                          className="cursor-pointer rounded-md border border-rose-400/25 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200 hover:bg-rose-500/20"
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}