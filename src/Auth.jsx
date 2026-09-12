import React, { useState } from "react";
import { Wind } from "lucide-react";
import { supabase } from "./supabaseClient";

export default function Auth() {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setInfo("Cuenta creada. Si tu proyecto de Supabase pide confirmación por correo, revisa tu bandeja de entrada antes de iniciar sesión.");
    }
    setBusy(false);
  }

  return (
    <div className="min-h-[600px] flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200">
      <div className="w-full max-w-sm p-6">
        <div className="flex items-center gap-2 justify-center mb-6">
          <div className="w-9 h-9 rounded-lg bg-cyan-600/10 flex items-center justify-center">
            <Wind className="text-cyan-600" size={20} />
          </div>
          <span className="font-semibold text-slate-900">Frío &amp; Gestión</span>
        </div>

        <form onSubmit={submit} className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h2>

          <label className="block mb-3">
            <span className="block text-xs font-medium text-slate-500 mb-1">Correo</span>
            <input
              type="email"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="block mb-4">
            <span className="block text-xs font-medium text-slate-500 mb-1">Contraseña</span>
            <input
              type="password"
              required
              minLength={6}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
          {info && <p className="text-sm text-emerald-600 mb-3">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-cyan-600 text-white rounded-md py-2 text-sm font-medium hover:bg-cyan-700 disabled:opacity-50"
          >
            {busy ? "Un momento…" : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>

          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setInfo(""); }}
            className="w-full text-xs text-slate-500 hover:text-slate-700 mt-3"
          >
            {mode === "login" ? "¿No tienes cuenta? Créala aquí" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-4">
          Usa el mismo correo y contraseña desde tu celular y tu computador para ver siempre la misma información.
        </p>
      </div>
    </div>
  );
}
