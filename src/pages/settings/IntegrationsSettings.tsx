import React from 'react';
import { Copy, Facebook, MessageCircle } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';

export default function IntegrationsSettings() {
  const { tenantId } = useCRM();

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('URL del Webhook copiada al portapapeles');
  };

  const fbWebhookUrl = `https://api.tu-crm.com/webhook/fb/${tenantId}`;
  const wpWebhookUrl = `https://api.tu-crm.com/webhook/wp/${tenantId}`;

  return (
    <div>
      <div className="slds-m-bottom_large">
        <p className="slds-text-body_regular slds-text-color_weak">
          Genera y administra las URLs de Webhooks nativos para conectar tus campañas de marketing y canales de mensajería directamente con el CRM, sin necesidad de Zapier o herramientas de terceros.
        </p>
      </div>

      <div className="slds-grid slds-gutters slds-wrap">
        {/* FACEBOOK LEADS */}
        <div className="slds-col slds-size_1-of-2 slds-m-bottom_medium">
          <div className="slds-card slds-p-around_medium" style={{ height: '100%', borderTop: '4px solid #1877F2' }}>
            <div className="slds-media slds-media_center slds-m-bottom_medium">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-social" style={{ backgroundColor: '#1877F2', padding: '8px', borderRadius: '4px' }}>
                  <Facebook size={24} color="white" />
                </span>
              </div>
              <div className="slds-media__body">
                <h3 className="slds-text-heading_small slds-truncate">Facebook Lead Ads</h3>
                <p className="slds-text-body_small slds-text-color_weak">Recibe prospectos automáticamente de tus formularios de Meta.</p>
              </div>
            </div>

            <div className="slds-form-element">
              <label className="slds-form-element__label">URL del Webhook</label>
              <div className="slds-form-element__control" style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  readOnly 
                  className="slds-input" 
                  value={fbWebhookUrl} 
                />
                <button 
                  className="slds-button slds-button_icon slds-button_icon-border" 
                  title="Copiar URL"
                  onClick={() => handleCopy(fbWebhookUrl)}
                >
                  <Copy size={16} />
                </button>
              </div>
              <div className="slds-form-element__help">Copia esta URL y pégala en la configuración de Webhooks de Meta Business Suite.</div>
            </div>
          </div>
        </div>

        {/* WHATSAPP BUSINESS */}
        <div className="slds-col slds-size_1-of-2 slds-m-bottom_medium">
          <div className="slds-card slds-p-around_medium" style={{ height: '100%', borderTop: '4px solid #25D366' }}>
            <div className="slds-media slds-media_center slds-m-bottom_medium">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-social" style={{ backgroundColor: '#25D366', padding: '8px', borderRadius: '4px' }}>
                  <MessageCircle size={24} color="white" />
                </span>
              </div>
              <div className="slds-media__body">
                <h3 className="slds-text-heading_small slds-truncate">WhatsApp Business API</h3>
                <p className="slds-text-body_small slds-text-color_weak">Escucha mensajes entrantes y crea leads automáticamente.</p>
              </div>
            </div>

            <div className="slds-form-element">
              <label className="slds-form-element__label">URL del Webhook</label>
              <div className="slds-form-element__control" style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  readOnly 
                  className="slds-input" 
                  value={wpWebhookUrl} 
                />
                <button 
                  className="slds-button slds-button_icon slds-button_icon-border" 
                  title="Copiar URL"
                  onClick={() => handleCopy(wpWebhookUrl)}
                >
                  <Copy size={16} />
                </button>
              </div>
              <div className="slds-form-element__help">Copia esta URL y configúrala en tu proveedor de WABA (Twilio, Gupshup o Meta).</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
