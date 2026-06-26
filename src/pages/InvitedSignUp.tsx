import React, { useState } from 'react';
import { supabase } from '../config/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function InvitedSignUp() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="slds-grid slds-grid_align-center slds-grid_vertical-align-center" style={{ minHeight: '100vh', backgroundColor: '#F4F6F9' }}>
        <div className="slds-box slds-theme_default slds-p-around_x-large slds-text-align_center">
          <h2 className="slds-text-heading_medium slds-text-color_error slds-m-bottom_medium">Enlace Inválido o Privado</h2>
          <p>No se encontró un token de invitación válido. Esta plataforma es exclusiva para uso corporativo B2B.</p>
          <button onClick={() => navigate('/login')} className="slds-button slds-button_brand slds-m-top_large">Volver al Login</button>
        </div>
      </div>
    );
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            invitation_token: token
          }
        }
      });

      if (signUpError) throw signUpError;
      
      alert('Registro completado exitosamente. Ya puedes iniciar sesión con tu nueva cuenta.');
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al completar el registro. Verifica que el correo coincida exactamente con la invitación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="slds-grid slds-grid_align-center slds-grid_vertical-align-center" style={{ minHeight: '100vh', backgroundColor: '#F4F6F9' }}>
      <div className="slds-box slds-theme_default slds-p-around_x-large" style={{ width: '100%', maxWidth: '400px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: 'none' }}>
        
        <div className="slds-text-align_center slds-m-bottom_large">
          <div className="slds-m-bottom_small">
            <div style={{ width: '64px', height: '64px', backgroundColor: '#0176D3', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <span style={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}>C</span>
            </div>
          </div>
          <h1 className="slds-text-heading_large slds-m-bottom_xx-small" style={{ fontWeight: 700, color: '#1E293B' }}>Crear tu Cuenta</h1>
          <p className="slds-text-color_weak">Estás a un paso de acceder a tu CRM</p>
        </div>

        <form onSubmit={handleSignUp} className="slds-form">
          <div className="slds-form-element slds-m-bottom_medium">
            <label className="slds-form-element__label">
              <abbr className="slds-required" title="required">* </abbr>Nombre Completo
            </label>
            <div className="slds-form-element__control">
              <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="slds-input" placeholder="Ej. Juan Pérez" />
            </div>
          </div>
          
          <div className="slds-form-element slds-m-bottom_medium">
            <label className="slds-form-element__label">
              <abbr className="slds-required" title="required">* </abbr>Correo Electrónico
            </label>
            <div className="slds-form-element__control">
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="slds-input" placeholder="El correo donde recibiste la invitación" />
            </div>
          </div>

          <div className="slds-form-element slds-m-bottom_large">
            <label className="slds-form-element__label">
              <abbr className="slds-required" title="required">* </abbr>Crear Contraseña
            </label>
            <div className="slds-form-element__control">
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="slds-input" placeholder="••••••••" minLength={6} />
            </div>
          </div>

          {error && (
            <div className="slds-notify slds-notify_alert slds-alert_error slds-m-bottom_medium" role="alert" style={{ fontSize: '12px' }}>
              <h2>{error}</h2>
            </div>
          )}

          <button type="submit" disabled={loading} className="slds-button slds-button_brand slds-button_stretch" style={{ padding: '12px 0', fontSize: '14px' }}>
            {loading ? 'Procesando...' : 'Completar Registro'}
          </button>
        </form>
      </div>
    </div>
  );
}
