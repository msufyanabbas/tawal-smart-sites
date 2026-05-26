import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy-gradient px-4 py-10">
    {/* Decorative brand glow — soft orange/cyan blooms behind the card. */}
    <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" />
    <div
      className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full blur-3xl"
      style={{ backgroundColor: 'rgba(46,181,227,0.25)' }}
    />

    <div className="relative w-full max-w-md">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex items-center gap-4">
          <img
            src="/brand/smartlife-logo.png"
            alt="Smart Life"
            className="h-10 w-auto"
          />
          <span className="select-none text-2xl font-light text-white/60">×</span>
          <img
            src="/brand/tawal-logo.svg"
            alt="Tawal"
            className="h-10 w-auto logo-invert"
          />
        </div>
        <p className="text-xs uppercase tracking-[0.25em] text-white/60">
          Smart Sites Platform
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white shadow-2xl">
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  </div>
);
