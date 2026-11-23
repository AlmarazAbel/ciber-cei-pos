interface TopBarPosProps {
  cajero: string;
  cajaAbierta: boolean;
  lectoraActiva: boolean;
}

export function TopBarPos({ cajero, cajaAbierta, lectoraActiva }: TopBarPosProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/25 bg-slate-900/75 px-5 py-3.5 backdrop-blur-xl shadow-[0_0_30px_rgba(34,211,238,0.08)]">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />
        <h1 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase">
          CIBER CEI <span className="text-cyan-400 mx-1.5">·</span> MOSTRADOR POS
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 text-xs">
        <span
          className={`rounded-full border px-3 py-1 font-medium ${
            cajaAbierta
              ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-400/30 bg-rose-500/10 text-rose-300'
          }`}
        >
          {cajaAbierta ? 'Caja Abierta' : 'Caja Cerrada'} · {cajero}
        </span>

        <span
          className={`rounded-full border px-3 py-1 font-medium ${
            lectoraActiva
              ? 'border-cyan-400/35 bg-cyan-500/10 text-cyan-300'
              : 'border-slate-600/40 bg-slate-800/60 text-slate-400'
          }`}
        >
          Lectora de Código de Barras: {lectoraActiva ? 'Conectada' : 'En espera'}
        </span>
      </div>
    </header>
  );
}