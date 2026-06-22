import React, { useState, useEffect, useRef } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useFinance } from '../../hooks/useFinance';
import { Save, Upload, FileText, Copy, Check, Trash2, Star, AlertCircle, Edit2, X } from 'lucide-react';
import styles from '../SettingsDashboard.module.css';

const CopyableVariable = ({ code, label }: { code: string, label: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
      <button 
        type="button"
        onClick={handleCopy}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: copied ? '#dcfce7' : 'white',
          color: copied ? '#166534' : '#0f172a',
          border: '1px solid',
          borderColor: copied ? '#bbf7d0' : '#cbd5e1',
          padding: '4px 8px', borderRadius: '6px', cursor: 'pointer',
          fontFamily: 'monospace', fontSize: '12px', transition: 'all 0.2s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}
        title="Copiar al portapapeles"
      >
        {code}
        {copied ? <Check size={14} /> : <Copy size={14} color="#94a3b8" />}
      </button>
      <span style={{ fontSize: '13px', color: '#64748b' }}>{label}</span>
    </li>
  );
};

export default function ContractTemplateSettings() {
  const { tenantId, userPermissions } = useCRM();
  const { getContractTemplates, uploadContractTemplate, deleteContractTemplate, setDefaultContractTemplate, renameContractTemplate } = useFinance(tenantId || undefined);
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getContractTemplates();
      setTemplates(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) loadData();
    else setLoading(false);
  }, [tenantId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!userPermissions?.settings?.manage) {
      alert("No tienes permiso para gestionar plantillas.");
      return;
    }

    if (templates.length >= 5) {
      alert("Límite alcanzado: Tienes el máximo de 5 plantillas.");
      return;
    }

    if (!file.name.endsWith('.docx')) {
      alert('El archivo debe ser un documento Word (.docx)');
      return;
    }

    // 2 MB limit
    if (file.size > 2 * 1024 * 1024) {
      alert('El archivo es muy pesado. El tamaño máximo permitido es 2MB.');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64 = event.target?.result as string;
        await uploadContractTemplate(file.name, base64, file.size);
        await loadData();
      } catch (err: any) {
        alert(err.message || "Error al subir la plantilla.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta plantilla?")) return;
    try {
      await deleteContractTemplate(id);
      await loadData();
    } catch (e) {
      alert("Error eliminando plantilla.");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultContractTemplate(id);
      await loadData();
    } catch (e) {
      alert("Error estableciendo como predeterminado.");
    }
  };

  const handleEditClick = (tpl: any) => {
    setEditingTemplateId(tpl.id);
    setEditName(tpl.name);
  };

  const handleRenameSubmit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await renameContractTemplate(id, editName.trim());
      setEditingTemplateId(null);
      await loadData();
    } catch (e) {
      alert("Error renombrando plantilla.");
    }
  };

  if (loading) return <div style={{padding: 24}}>Cargando plantillas...</div>;

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>Plantilla de Contrato (.docx)</h2>
          <p className={styles.panelSubtitle}>Configura el formato por defecto para los contratos de esta inmobiliaria.</p>
        </div>
        {/* Botón de guardar removido, el upload guarda directamente */}
      </div>

      <div className={styles.panelContent} style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', padding: '24px' }}>
        
        <div style={{ flex: '0 0 400px', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Tus Plantillas</h3>
              <span style={{ fontSize: '12px', fontWeight: 600, color: templates.length >= 5 ? '#ef4444' : '#64748b', backgroundColor: templates.length >= 5 ? '#fee2e2' : '#e2e8f0', padding: '2px 8px', borderRadius: '12px' }}>
                {templates.length} / 5
              </span>
            </div>
            
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', lineHeight: '1.5' }}>
              Sube tus diseños en <strong>.docx</strong>. Máximo 2MB por archivo.
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
              disabled={uploading || templates.length >= 5 || !userPermissions?.settings?.manage}
              style={{ width: '100%', padding: '16px', backgroundColor: 'white', border: '2px dashed #cbd5e1', borderRadius: '8px', cursor: (uploading || templates.length >= 5) ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: '#3b82f6', marginBottom: '16px', transition: 'border-color 0.2s', opacity: (uploading || templates.length >= 5) ? 0.6 : 1 }}
            >
              <Upload size={24} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>{uploading ? 'Subiendo...' : 'Subir Nueva Plantilla'}</span>
            </button>

            {templates.length === 0 && !uploading && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                <FileText size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                <p style={{ fontSize: '13px', margin: 0 }}>No tienes plantillas subidas.</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {templates.map(tpl => (
                <div key={tpl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', backgroundColor: tpl.isDefault ? '#ecfdf5' : 'white', border: `1px solid ${tpl.isDefault ? '#a7f3d0' : '#e2e8f0'}`, padding: '12px', borderRadius: '6px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div style={{ backgroundColor: tpl.isDefault ? '#10b981' : '#f1f5f9', padding: '8px', borderRadius: '4px', color: tpl.isDefault ? 'white' : '#64748b', display: 'flex' }}>
                      <FileText size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingTemplateId === tpl.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="text" 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(tpl.id); if (e.key === 'Escape') setEditingTemplateId(null); }}
                            autoFocus
                            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #3b82f6', outline: 'none', fontSize: '13px', width: '100%', fontFamily: 'inherit' }}
                          />
                          <button onClick={() => handleRenameSubmit(tpl.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#10b981' }}>
                            <Check size={16} />
                          </button>
                          <button onClick={() => setEditingTemplateId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8' }}>
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: tpl.isDefault ? '#065f46' : '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {tpl.name}
                        </p>
                      )}
                      <p style={{ margin: 0, fontSize: '11px', color: tpl.isDefault ? '#047857' : '#64748b' }}>
                        {tpl.size ? `${(tpl.size / 1024).toFixed(1)} KB` : 'Documento Word'}
                      </p>
                    </div>
                  </div>
                  
                  {userPermissions?.settings?.manage && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {!editingTemplateId && (
                        <button onClick={() => handleEditClick(tpl)} title="Renombrar plantilla" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b', borderRadius: '4px' }}>
                          <Edit2 size={16} />
                        </button>
                      )}
                      {!tpl.isDefault && !editingTemplateId && (
                        <button onClick={() => handleSetDefault(tpl.id)} title="Marcar como predeterminada" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8', borderRadius: '4px' }}>
                          <Star size={16} />
                        </button>
                      )}
                      {tpl.isDefault && !editingTemplateId && (
                        <span title="Plantilla Predeterminada" style={{ padding: '4px', color: '#f59e0b', display: 'flex' }}>
                          <Star size={16} fill="#f59e0b" />
                        </span>
                      )}
                      {!editingTemplateId && (
                        <button onClick={() => handleDelete(tpl.id)} title="Eliminar plantilla" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ef4444', borderRadius: '4px' }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ flex: 1, backgroundColor: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 16px 0' }}>¿Cómo preparar tu archivo Word?</h3>
          <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px', lineHeight: '1.6' }}>
            Para que el sistema sepa dónde colocar los datos del cliente, debes escribir las siguientes variables exactamente como aparecen aquí, dentro de tu archivo de Word, incluyendo las llaves dobles <strong>{"{{"}</strong> y <strong>{"}}"}</strong>.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', display: 'block', color: '#64748b', marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Datos Personales y Cónyuge:</span>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                <CopyableVariable code="{{CLIENTE_NOMBRE}}" label="Nombre" />
                <CopyableVariable code="{{CLIENTE_DNI}}" label="DNI" />
                <CopyableVariable code="{{CLIENTE_ESTADO_CIVIL}}" label="Estado Civil" />
                <CopyableVariable code="{{CLIENTE_OCUPACION}}" label="Ocupación" />
                <CopyableVariable code="{{CLIENTE_NACIONALIDAD}}" label="Nacionalidad" />
                <CopyableVariable code="{{CONYUGE_NOMBRE}}" label="Nombre Cónyuge" />
                <CopyableVariable code="{{CONYUGE_DNI}}" label="DNI Cónyuge" />
              </ul>
            </div>
            
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', display: 'block', color: '#64748b', marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Contacto y Domicilio:</span>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                <CopyableVariable code="{{CLIENTE_CELULAR}}" label="Celular" />
                <CopyableVariable code="{{CLIENTE_EMAIL}}" label="Email" />
                <CopyableVariable code="{{CLIENTE_DOMICILIO}}" label="Domicilio" />
                <CopyableVariable code="{{CLIENTE_DISTRITO}}" label="Distrito" />
                <CopyableVariable code="{{CLIENTE_PROVINCIA}}" label="Provincia" />
                <CopyableVariable code="{{CLIENTE_DEPARTAMENTO}}" label="Departamento" />
              </ul>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', display: 'block', color: '#64748b', marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Inmueble / Unidad:</span>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                <CopyableVariable code="{{PROYECTO_PARTIDA}}" label="Nro. Partida Registral" />
                <CopyableVariable code="{{PARCELA_MANZANA}}" label="Manzana" />
                <CopyableVariable code="{{PARCELA_LOTE}}" label="Lote" />
                <CopyableVariable code="{{PARCELA_NUMERO}}" label="Nro. Identificador" />
                <CopyableVariable code="{{PARCELA_AREA}}" label="Área Aprox. m2" />
                <CopyableVariable code="{{PARCELA_PRECIO}}" label="Precio de la Parcela" />
              </ul>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', display: 'block', color: '#64748b', marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase' }}>Pagos, Saldos y Fechas:</span>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                <CopyableVariable code="{{PAGO_ADELANTO}}" label="Monto Separación" />
                <CopyableVariable code="{{SALDO_RESTANTE}}" label="Saldo Pendiente" />
                <CopyableVariable code="{{CUOTAS_CANTIDAD}}" label="Cantidad de Cuotas" />
                <CopyableVariable code="{{CUOTAS_MONTO}}" label="Monto por Cuota" />
                <CopyableVariable code="{{PAGO_OPERACION}}" label="Nro. Operación" />
                <CopyableVariable code="{{PAGO_DIA}}" label="Día de Pago" />
                <CopyableVariable code="{{PAGO_MES}}" label="Mes de Pago" />
                <CopyableVariable code="{{PAGO_ANO}}" label="Año de Pago" />
                <CopyableVariable code="{{FIRMA_DIA}}" label="Día de Firma" />
                <CopyableVariable code="{{FIRMA_MES}}" label="Mes de Firma" />
                <CopyableVariable code="{{FIRMA_ANO}}" label="Año de Firma" />
                <CopyableVariable code="{{FECHA_ACTUAL}}" label="Fecha completa de hoy" />
                <CopyableVariable code="{{CUENTA_BANCARIA}}" label="Nro. Cuenta Depósito" />
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
