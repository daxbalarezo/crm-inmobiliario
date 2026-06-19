import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useFinance } from '../../hooks/useFinance';
import { Save, Upload, FileText } from 'lucide-react';
import styles from '../SettingsDashboard.module.css';

export default function ContractTemplateSettings() {
  const { tenantId, userPermissions } = useCRM();
  const { getContractTemplate, saveContractTemplate } = useFinance(tenantId || undefined);
  
  const [docxBase64, setDocxBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
        const tpl: any = await Promise.race([getContractTemplate(), timeoutPromise]);
        
        if (isMounted && tpl) {
          if (tpl.docxBase64) setDocxBase64(tpl.docxBase64);
        }
      } catch (err) {
        console.error('ContractTemplateSettings: Error during loadData:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    if (tenantId) loadData();
    else setLoading(false);

    return () => { isMounted = false; };
  }, [tenantId]);

  const handleSave = async () => {
    if (!userPermissions?.settings?.manage) return;
    if (!docxBase64) {
      alert('Por favor sube un archivo de Word primero');
      return;
    }
    setSaving(true);
    try {
      await saveContractTemplate(docxBase64);
      alert('Plantilla guardada exitosamente');
    } catch (e) {
      alert('Error al guardar plantilla');
    }
    setSaving(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      alert('El archivo debe ser un documento Word (.docx)');
      return;
    }

    if (file.size > 800 * 1024) {
      alert('El archivo es muy pesado. El tamaño máximo permitido es 800KB.');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      setDocxBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <div style={{padding: 24}}>Cargando plantilla...</div>;

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>Plantilla de Contrato (.docx)</h2>
          <p className={styles.panelSubtitle}>Configura el formato por defecto para los contratos de esta inmobiliaria.</p>
        </div>
        {userPermissions.settings?.manage && (
          <button 
            onClick={handleSave} 
            disabled={saving || !docxBase64}
            className={styles.btnPrimary}
          >
            <Save size={18} />
            {saving ? 'Guardando...' : 'Guardar Plantilla'}
          </button>
        )}
      </div>

      <div className={styles.panelContent} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', padding: '24px' }}>
        
        <div style={{ flex: '0 0 350px', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 16px 0' }}>Sube tu Archivo Word</h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px', lineHeight: '1.5' }}>
            Sube el diseño original de tu contrato en formato <strong>.docx</strong> (Microsoft Word).<br/>
            Mantendrá tus colores, tablas, marcas de agua y todos los estilos exactamente igual.
          </p>
          
          <input 
            type="file" 
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />

          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '100%', padding: '16px', backgroundColor: 'white', border: '2px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#3b82f6', marginBottom: '16px', transition: 'border-color 0.2s' }}
          >
            <Upload size={24} />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Seleccionar Archivo .docx</span>
          </button>

          {docxBase64 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', padding: '12px', borderRadius: '6px' }}>
              <div style={{ backgroundColor: '#10b981', padding: '8px', borderRadius: '4px', color: 'white', display: 'flex' }}>
                <FileText size={20} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#065f46' }}>Plantilla Lista</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#047857' }}>
                  {fileName ? fileName : 'Plantilla cargada desde la nube'}
                </p>
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, backgroundColor: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 16px 0' }}>¿Cómo preparar tu archivo Word?</h3>
          <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px', lineHeight: '1.6' }}>
            Para que el sistema sepa dónde colocar los datos del cliente, debes escribir las siguientes variables exactamente como aparecen aquí, dentro de tu archivo de Word, incluyendo las llaves dobles <strong>{"{{"}</strong> y <strong>{"}}"}</strong>.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', display: 'block', color: '#64748b', marginBottom: '4px' }}>Datos Personales y Cónyuge:</span>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#0f172a' }}>
                <li><code>{"{{CLIENTE_NOMBRE}}"}</code> (Nombre)</li>
                <li><code>{"{{CLIENTE_DNI}}"}</code> (DNI)</li>
                <li><code>{"{{CLIENTE_ESTADO_CIVIL}}"}</code> (Estado Civil)</li>
                <li><code>{"{{CLIENTE_OCUPACION}}"}</code> (Ocupación)</li>
                <li><code>{"{{CLIENTE_NACIONALIDAD}}"}</code> (Nacionalidad)</li>
                <li><code>{"{{CONYUGE_NOMBRE}}"}</code> (Nombre Cónyuge)</li>
                <li><code>{"{{CONYUGE_DNI}}"}</code> (DNI Cónyuge)</li>
              </ul>
            </div>
            
            <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', display: 'block', color: '#64748b', marginBottom: '4px' }}>Contacto y Domicilio:</span>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#0f172a' }}>
                <li><code>{"{{CLIENTE_CELULAR}}"}</code> (Celular)</li>
                <li><code>{"{{CLIENTE_EMAIL}}"}</code> (Email)</li>
                <li><code>{"{{CLIENTE_DOMICILIO}}"}</code> (Domicilio)</li>
                <li><code>{"{{CLIENTE_DISTRITO}}"}</code> (Distrito)</li>
                <li><code>{"{{CLIENTE_PROVINCIA}}"}</code> (Provincia)</li>
                <li><code>{"{{CLIENTE_DEPARTAMENTO}}"}</code> (Departamento)</li>
              </ul>
            </div>

            <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', display: 'block', color: '#64748b', marginBottom: '4px' }}>Inmueble / Unidad:</span>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#0f172a' }}>
                <li><code>{"{{PROYECTO_PARTIDA}}"}</code> (Nro. Partida Registral)</li>
                <li><code>{"{{PARCELA_MANZANA}}"}</code> (Manzana)</li>
                <li><code>{"{{PARCELA_LOTE}}"}</code> (Lote)</li>
                <li><code>{"{{PARCELA_NUMERO}}"}</code> (Nro. Identificador)</li>
                <li><code>{"{{PARCELA_AREA}}"}</code> (Área Aprox. m2)</li>
                <li><code>{"{{PARCELA_PRECIO}}"}</code> (Precio de la Parcela)</li>
              </ul>
            </div>

            <div style={{ backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', display: 'block', color: '#64748b', marginBottom: '4px' }}>Pagos, Saldos y Fechas:</span>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '13px', color: '#0f172a' }}>
                <li><code>{"{{PAGO_ADELANTO}}"}</code> (Monto Separación)</li>
                <li><code>{"{{SALDO_RESTANTE}}"}</code> (Saldo Pendiente)</li>
                <li><code>{"{{CUOTAS_CANTIDAD}}"}</code> (Cantidad de Cuotas)</li>
                <li><code>{"{{CUOTAS_MONTO}}"}</code> (Monto por Cuota)</li>
                <li><code>{"{{PAGO_OPERACION}}"}</code> (Nro. Operación)</li>
                <li><code>{"{{PAGO_DIA}}"}</code> / <code>{"{{PAGO_MES}}"}</code> / <code>{"{{PAGO_ANO}}"}</code></li>
                <li><code>{"{{FIRMA_DIA}}"}</code> / <code>{"{{FIRMA_MES}}"}</code> / <code>{"{{FIRMA_ANO}}"}</code></li>
                <li><code>{"{{FECHA_ACTUAL}}"}</code> (Fecha completa de hoy)</li>
                <li><code>{"{{CUENTA_BANCARIA}}"}</code> (Nro. Cuenta Depósito)</li>
              </ul>
            </div>
          </div>
          
          <div style={{ backgroundColor: '#fffbeb', borderLeft: '4px solid #fbbf24', padding: '16px', borderRadius: '4px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#92400e', lineHeight: '1.5' }}>
              <strong>Ejemplo de uso en Word:</strong><br/>
              "El señor <strong>{"{{CLIENTE_NOMBRE}}"}</strong> identificado con DNI <strong>{"{{CLIENTE_DNI}}"}</strong> deja una separación de <strong>{"{{PAGO_ADELANTO}}"}</strong> por la compra del Lote <strong>{"{{PARCELA_LOTE}}"}</strong> de la Manzana <strong>{"{{PARCELA_MANZANA}}"}</strong>."
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
