'use client';

import { useState, type FormEvent } from 'react';
import { isSupabaseConfigured, signInWithEmailPassword } from '@/lib/supabase';
import type { PerfilUsuario } from '@/types/caja';

interface Props {
  onAuthenticated: (user: PerfilUsuario) => void;
}

export function AuthScreen({ onAuthenticated }: Props) {
  const [email, setEmail] = useState('admin@gracapacitaciones.com.ar');
  const [password, setPassword] = useState('gra2026');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const supabaseActivo = isSupabaseConfigured();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const user = await signInWithEmailPassword(email, password);
      onAuthenticated(user);
    } catch (err) {
      setError((err as Error).message || 'No se pudo iniciar sesión.');
    } finally {
      setPending(false);
    }
  }

  async function loginDemoRapido(demoEmail: string) {
    setError(null);
    setPending(true);
    try {
      const user = await signInWithEmailPassword(demoEmail, 'gra2026');
      onAuthenticated(user);
    } catch (err) {
      setError((err as Error).message || 'No se pudo ingresar.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="auth">
      <div className="auth-card">
        <div className="auth-brand-row">
          <img src="/images/brand/gra-cube.png" alt="GRA" />
          <div>
            <strong>GRA Capacitaciones</strong>
            <span>Control de Caja Diaria</span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <label className="ds-field">
            <span>Email</span>
            <input
              className="ds-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="ds-field">
            <span>Contraseña</span>
            <input
              className="ds-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <p className="ds-form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="ds-btn"
            disabled={pending}
            style={{ width: '100%', minHeight: 38, marginTop: 4 }}
          >
            {pending ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        {!supabaseActivo && (
          <div className="auth-demo-box">
            <span style={{ color: '#686763', fontWeight: 500 }}>
              Accesos rápidos de prueba:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                type="button"
                className="ds-btn ds-btn-outline ds-btn-sm"
                onClick={() =>
                  loginDemoRapido('admin@gracapacitaciones.com.ar')
                }
              >
                Dirección · Carga + Indicadores
              </button>
              <button
                type="button"
                className="ds-btn ds-btn-outline ds-btn-sm"
                onClick={() => loginDemoRapido('caja@gracapacitaciones.com.ar')}
              >
                Administración · Solo Carga
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
