import React, { useState } from 'react';
import { supabase } from '../config/supabase';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setLoading(true);
    try {
      // Si el usuario no escribe un arroba, asumimos que es el usuario corporativo corto
      let loginEmail = email.trim();
      if (!loginEmail.includes('@')) {
        loginEmail = `${loginEmail}@crm.local`;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      });

      if (authError) throw authError;

      navigate('/');
    } catch (err: any) {
      console.error("Login error detail:", err);
      setError(`Error: ${err.message || 'Credenciales incorrectas'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor, ingresa tu usuario o correo electrónico primero.');
      return;
    }
    if (!email.includes('@')) {
      setError('Si usas un Usuario Corporativo corto, no puedes recuperar tu contraseña automáticamente. Pídele al Propietario que la resetee.');
      return;
    }
    setError('');
    setMsg('');
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
      if (resetError) throw resetError;
      setMsg('Te hemos enviado un enlace para recuperar tu contraseña.');
    } catch (err: any) {
      setError('Error al intentar enviar el correo. Verifica que el email sea correcto.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Error Google Auth:', err);
      setError(`Error iniciando con Google: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="slds-grid slds-grid_align-center slds-grid_vertical-align-center" style={{ minHeight: '100vh', backgroundColor: '#F4F6F9' }}>
      <div className="slds-box slds-theme_default slds-p-around_x-large" style={{ width: '100%', maxWidth: '400px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: 'none' }}>
        
        <div className="slds-text-align_center slds-m-bottom_large">
          <div className="slds-m-bottom_small">
            {/* Logo placeholder - Usando el color primary corporativo */}
            <div style={{ width: '64px', height: '64px', backgroundColor: '#0176D3', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <span style={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}>C</span>
            </div>
          </div>
          <h1 className="slds-text-heading_large slds-m-bottom_xx-small" style={{ fontWeight: 700, color: '#1E293B' }}>CRM Inmobiliario</h1>
          <p className="slds-text-color_weak">Ingresa con tu cuenta</p>
        </div>

        <form onSubmit={handleLogin} className="slds-form">
          <div className="slds-form-element slds-m-bottom_medium">
            <label className="slds-form-element__label">
              <abbr className="slds-required" title="required">* </abbr>Usuario o Email
            </label>
            <div className="slds-form-element__control">
              <input
                type="text"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="slds-input"
                placeholder="Ej. nombredeusuario"
              />
            </div>
          </div>

          <div className="slds-form-element slds-m-bottom_large">
            <div className="slds-grid slds-grid_align-spread slds-m-bottom_xxx-small">
              <label className="slds-form-element__label" style={{ margin: 0 }}>
                <abbr className="slds-required" title="required">* </abbr>Contraseña
              </label>
              <button
                type="button"
                onClick={handleResetPassword}
                className="slds-button slds-button_base slds-text-color_weak hover:slds-text-color_default"
                style={{ fontSize: '12px' }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="slds-form-element__control">
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="slds-input"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="slds-notify slds-notify_alert slds-alert_error slds-m-bottom_medium" role="alert">
              <span className="slds-assistive-text">Error</span>
              <h2>{error}</h2>
            </div>
          )}

          {msg && (
            <div className="slds-notify slds-notify_alert slds-alert_success slds-m-bottom_medium" role="alert">
              <span className="slds-assistive-text">Éxito</span>
              <h2>{msg}</h2>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="slds-button slds-button_brand slds-button_stretch"
            style={{ padding: '12px 0', fontSize: '14px' }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="slds-grid slds-grid_vertical-align-center slds-m-vertical_medium">
          <div className="slds-col" style={{ height: '1px', backgroundColor: '#DDDBDA' }}></div>
          <span className="slds-m-horizontal_small slds-text-color_weak" style={{ fontSize: '12px' }}>O</span>
          <div className="slds-col" style={{ height: '1px', backgroundColor: '#DDDBDA' }}></div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleLogin}
          className="slds-button slds-button_outline-brand slds-button_stretch"
          style={{ padding: '10px 0', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', marginRight: '8px' }}>
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continuar con Google
        </button>
      </div>
    </div>
  );
}