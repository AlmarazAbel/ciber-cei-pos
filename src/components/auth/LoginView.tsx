import { useMemo, useState } from 'react';
import {
  autenticarLocal,
  type SesionPos,
  type UsuarioPos,
} from '../../services/authService';

interface LoginViewProps {
  usuarios: UsuarioPos[];
  onLoginSuccess: (sesion: SesionPos) => void;
}

export function LoginView({ usuarios, onLoginSuccess }: LoginViewProps) {
  const usuariosActivos = useMemo(
    () => usuarios.filter((u) => u.activo),
    [usuarios]
  );

  const [identificador, setIdentificador] = useState(
    usuariosActivos[0]?.usuario ?? 'abel'
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resultado = autenticarLocal(identificador, password, usuarios);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    setError(null);
    onLoginSuccess(resultado.sesion);
  };

  const handleAccesoRapido = (usuarioDemo: string) => {
    setIdentificador(usuarioDemo);
    const resultado = autenticarLocal(usuarioDemo, '', usuarios);
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    setError(null);
    onLoginSuccess(resultado.sesion);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-[#060b14] px-4 py-8 text-slate-100">
      <div className="pointer-events-none fixed -top-32 -left-32 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none fixed top-1/3 -right-32 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl" />

      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
        <div className="mb-5 border-b border-white/10 pb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            CIBER CEI · POS
          </div>
          <h1 className="mt-2.5 text-xl font-extrabold tracking-tight text-white">
            Iniciar Sesión en Caja
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Ingresá con tu usuario de operador para registrar ventas, arqueos y comprobantes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label
              htmlFor="login-usuario"
              className="mb-1 block font-medium text-slate-300"
            >
              Usuario o Operador
            </label>
            <input
              id="login-usuario"
              type="text"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="Ej: abel"
              className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1 block font-medium text-slate-300"
            >
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/15 bg-slate-950/80 px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-1 w-full cursor-pointer rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110"
          >
            Entrar al POS
          </button>
        </form>

        {/* Acceso rápido local */}
        {usuariosActivos.length > 0 && (
          <div className="mt-5 border-t border-white/10 pt-4 text-xs">
            <span className="block text-[11px] font-medium text-slate-400">
              Acceso rápido local (operadores activos):
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {usuariosActivos.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleAccesoRapido(u.usuario)}
                  className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-200"
                >
                  {u.nombre} ({u.rol})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}