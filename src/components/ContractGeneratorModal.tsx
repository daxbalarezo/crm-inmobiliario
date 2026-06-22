import React, { useState, useEffect } from 'react';
import { X, Download, FileText } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useFinance } from '../hooks/useFinance';
import type { Payment, Lead, Unit } from '../types/definitions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// @ts-ignore
import PizZip from 'pizzip';
// @ts-ignore
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
}

const base64ToArrayBuffer = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

export default function ContractGeneratorModal({ isOpen, onClose, payment }: Props) {
  const { tenantId } = useCRM();
  const { getContractTemplates } = useFinance(tenantId!);
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [leadData, setLeadData] = useState<Lead | null>(null);
  const [unitData, setUnitData] = useState<Unit | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    const loadTemplateAndData = async () => {
      setLoading(true);
      try {
        // Cargar plantillas
        const tpls = await getContractTemplates();
        setTemplates(tpls);
        if (tpls.length > 0) {
          const defTpl = tpls.find((t: any) => t.isDefault) || tpls[0];
          setSelectedTemplateId(defTpl.id);
        }

        // Cargar Lead
        if (payment.leadId) {
          const leadDoc = await getDoc(doc(db, 'leads', payment.leadId));
          if (leadDoc.exists()) setLeadData(leadDoc.data() as Lead);
        }

        // Cargar Unidad
        if (payment.unitId) {
          const unitDoc = await getDoc(doc(db, 'units', payment.unitId));
          if (unitDoc.exists()) setUnitData(unitDoc.data() as Unit);
        }
      } catch (err) {
        console.error("Error loading data:", err);
      }
      setLoading(false);
    };

    loadTemplateAndData();
  }, [isOpen, payment]);

  if (!isOpen) return null;

  const handleDownloadWord = () => {
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    if (!selectedTemplate?.docxBase64) return;
    
    try {
      const docxBase64 = selectedTemplate.docxBase64;
      const base64Data = docxBase64.includes(',') ? docxBase64.split(',')[1] : docxBase64;
      const arrayBuffer = base64ToArrayBuffer(base64Data);
      
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
      });

      // Fechas
      const opDate = payment.createdAt?.toDate ? payment.createdAt.toDate() : new Date(payment.createdAt || Date.now());
      const sigDate = new Date();
      
      doc.render({
          CLIENTE_NOMBRE: leadData?.name || payment.leadName || '[Nombre Cliente]',
          CLIENTE_DNI: leadData?.dni || '[DNI]',
          CLIENTE_OCUPACION: leadData?.customData?.ocupacion || '[Ocupación]',
          CLIENTE_NACIONALIDAD: leadData?.customData?.nacionalidad || '[Nacionalidad]',
          CLIENTE_DOMICILIO: leadData?.customData?.domicilio || '[Domicilio]',
          CLIENTE_DISTRITO: leadData?.customData?.distrito || '[Distrito]',
          CLIENTE_PROVINCIA: leadData?.customData?.provincia || '[Provincia]',
          CLIENTE_DEPARTAMENTO: leadData?.customData?.departamento || '[Departamento]',
          CLIENTE_EMAIL: leadData?.email || '[Email]',
          CLIENTE_CELULAR: leadData?.phone || '[Celular]',
          CLIENTE_ESTADO_CIVIL: leadData?.customData?.estadoCivil || '[Estado Civil]',
          
          CONYUGE_NOMBRE: leadData?.customData?.conyugeNombre || '[Nombre de Cónyuge]',
          CONYUGE_DNI: leadData?.customData?.conyugeDni || '[DNI de Cónyuge]',
          
          PARCELA_NUMERO: payment.unitName || unitData?.customId || payment.unitId || '[Nro Parcela]',
          PARCELA_MANZANA: unitData?.group || '[Manzana]',
          PARCELA_LOTE: unitData?.customId || '[Lote]',
          PARCELA_PRECIO: unitData?.price ? `${unitData.price}` : '[Precio Unidad]',
          PARCELA_AREA: unitData?.area ? `${unitData.area} m2` : '[Área Parcela]',
          PROYECTO_PARTIDA: '[Nro Partida Registral]',
          
          PAGO_ADELANTO: `S/ ${payment.amount}`,
          PAGO_OPERACION: payment.reference || '[Nro Operación]',
          PAGO_DIA: opDate.getDate().toString().padStart(2, '0'),
          PAGO_MES: opDate.toLocaleString('es-ES', { month: 'long' }),
          PAGO_ANO: opDate.getFullYear().toString(),
          
          SALDO_RESTANTE: unitData?.price ? `S/ ${unitData.price - payment.amount}` : '[Saldo Restante]',
          CUOTAS_CANTIDAD: leadData?.customData?.numeroCuotas || '[Número de Cuotas]',
          CUOTAS_MONTO: leadData?.customData?.montoCuota || '[Monto de Cuota]',
          CUENTA_BANCARIA: '[Número de Cuenta Constructora]',
          
          FIRMA_DIA: sigDate.getDate().toString().padStart(2, '0'),
          FIRMA_MES: sigDate.toLocaleString('es-ES', { month: 'long' }),
          FIRMA_ANO: sigDate.getFullYear().toString(),
          
          FECHA_ACTUAL: sigDate.toLocaleDateString()
      });
      
      const blob = doc.getZip().generate({
          type: 'blob',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      
      saveAs(blob, `Contrato_${payment.leadName.replace(/\s+/g, '_')}.docx`);
      onClose(); // Cerrar modal al descargar
    } catch (error) {
      console.error("Error generating docx:", error);
      alert('Error al generar el documento. Verifica que las etiquetas estén bien escritas.');
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', borderRadius: '12px', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Generar Contrato</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Descargar archivo Word listo para firmar</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          
          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px' }}>Cargando plantilla...</p>
          ) : templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <p style={{ margin: 0, color: '#ef4444', fontWeight: 500, fontSize: '14px' }}>No hay ninguna plantilla Word configurada.</p>
              <p style={{ margin: '8px 0 0 0', color: '#991b1b', fontSize: '13px' }}>Ve a "Configuración &gt; Plantillas de Contratos" para subir tu archivo .docx original.</p>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Seleccionar Plantilla</label>
                <select 
                  value={selectedTemplateId || ''} 
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', fontFamily: 'inherit', fontSize: '14px', color: '#1e293b', backgroundColor: 'white' }}
                >
                  {templates.map(tpl => (
                    <option key={tpl.id} value={tpl.id}>{tpl.name} {tpl.isDefault ? '(Predeterminada)' : ''}</option>
                  ))}
                </select>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>Datos que se van a inyectar:</p>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li><strong>Cliente:</strong> {payment.leadName}</li>
                  <li><strong>Unidad:</strong> {payment.unitName || payment.unitId}</li>
                  <li><strong>Monto:</strong> S/ {payment.amount}</li>
                  <li><strong>Fecha:</strong> {new Date().toLocaleDateString()}</li>
                </ul>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <FileText size={24} color="#3b82f6" />
                <p style={{ margin: 0, fontSize: '13px', color: '#1e40af', lineHeight: '1.4' }}>
                  El sistema generará el archivo <strong>.docx</strong> con tu diseño original (marcas de agua, tablas) y los datos inyectados automáticamente.
                </p>
              </div>
            </div>
          )}

        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontWeight: 600, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button 
            onClick={handleDownloadWord} 
            disabled={!selectedTemplateId || loading}
            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: (!selectedTemplateId || loading) ? '#cbd5e1' : 'var(--primary-color)', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: (!selectedTemplateId || loading) ? 'not-allowed' : 'pointer' }}
          >
            <Download size={16} /> Descargar Word
          </button>
        </div>
      </div>
    </div>
  );
}
