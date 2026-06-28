import React, { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { X, AlertTriangle, Info, Clock, CheckCircle } from 'lucide-react';
import { type Broadcast } from '../services/saasService';
import { useCRM } from '../context/CRMContext';

export default function GlobalBroadcastListener() {
  const [activeBroadcast, setActiveBroadcast] = useState<Broadcast | null>(null);
  const { userProfile } = useCRM();

  useEffect(() => {
    // Si es dueño, ni siquiera abrimos la conexión de WebSockets para escuchar comunicados
    if (userProfile?.role === 'owner') return;

    // Escuchar INSERTs en la tabla saas_broadcasts
    const channel = supabase
      .channel('public:saas_broadcasts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'saas_broadcasts' },
        (payload) => {
          console.log('Nuevo comunicado recibido en vivo:', payload.new);
          setActiveBroadcast(payload.new as Broadcast);
          
          // Si no es crítico, auto-ocultar después de 10 segundos
          if (payload.new.severity?.toLowerCase() !== 'critical') {
            setTimeout(() => {
              setActiveBroadcast(null);
            }, 10000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.role]);

  // Doble validación: no renderizar si es owner o no hay comunicado activo
  if (!activeBroadcast || userProfile?.role === 'owner') return null;

  const getIconColor = () => {
    switch (activeBroadcast.severity?.toLowerCase()) {
      case 'critical': return '#ba0517'; // slds color-text-error
      case 'warning': return '#dd7a01'; // slds color-text-warning
      default: return '#2e844a'; // slds color-text-success
    }
  };

  const getIcon = () => {
    const color = getIconColor();
    switch (activeBroadcast.severity?.toLowerCase()) {
      case 'critical': return <AlertTriangle size={24} color={color} />;
      case 'warning': return <Clock size={24} color={color} />;
      default: return <CheckCircle size={24} color={color} />;
    }
  };

  return (
    <div className="slds-notify_container" style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999, width: '400px', maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div 
        className="slds-notify slds-notify_toast" 
        role="status" 
        style={{ 
          animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          background: '#ffffff',
          color: '#181818',
          boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
          border: '1px solid #e5e5e5',
          borderLeft: `4px solid ${getIconColor()}`
        }}
      >
        <span className="slds-assistive-text">{activeBroadcast.severity}</span>
        <span className="slds-icon_container slds-m-right_small slds-no-flex slds-align-top">
          {getIcon()}
        </span>
        <div className="slds-notify__content" style={{ color: '#181818' }}>
          <h2 className="slds-text-heading_small" style={{ fontWeight: '600', color: '#181818' }}>{activeBroadcast.title}</h2>
          <p style={{ color: '#444444', marginTop: '4px' }}>{activeBroadcast.content}</p>
        </div>
        <div className="slds-notify__close">
          <button 
            className="slds-button slds-button_icon" 
            style={{ color: '#747474' }}
            title="Cerrar"
            onClick={() => setActiveBroadcast(null)}
          >
            <X size={20} />
            <span className="slds-assistive-text">Cerrar</span>
          </button>
        </div>
      </div>
      <style>
        {`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}
