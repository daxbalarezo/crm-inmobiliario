import React, { useState, useEffect } from 'react';
import { Upload, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import { useCRM } from '../context/CRMContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';
import type { Lead, Payment } from '../types/definitions';

interface Props {
  lead: Lead;
}

export default function LeadFinanceTab({ lead }: Props) {
  const { tenantId, userProfile } = useCRM();
  const { getLeadPayments, createPayment } = useFinance(tenantId!);
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Form
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USD'|'PEN'>('USD');
  const [reference, setReference] = useState('');
  const [unitId, setUnitId] = useState(''); // Idealmente se carga del inventario, para esta fase es libre
  const [file, setFile] = useState<File | null>(null);

  const loadPayments = async () => {
    setLoading(true);
    const data = await getLeadPayments(lead.id!);
    setPayments(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPayments();
  }, [lead.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !reference || !file) {
      alert("Monto, Referencia y Voucher son obligatorios.");
      return;
    }

    setIsUploading(true);
    try {
      // 1. Subir archivo a Storage
      const fileRef = ref(storage, `vouchers/${tenantId}/${lead.id}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const voucherUrl = await getDownloadURL(fileRef);

      // 2. Crear documento de pago
      await createPayment({
        tenantId: tenantId!,
        leadId: lead.id!,
        leadName: lead.name,
        unitId: unitId || 'N/A',
        unitName: unitId ? `Unidad ${unitId}` : 'Sin unidad', // En el futuro: buscar nombre real
        amount: Number(amount),
        currency,
        reference,
        voucherUrl,
        createdBy: userProfile!.uid,
      });

      alert("Pago registrado y enviado a aprobación.");
      setAmount('');
      setReference('');
      setUnitId('');
      setFile(null);
      loadPayments(); // Recargar
    } catch (err) {
      console.error(err);
      alert("Error al registrar el pago.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Registrar Nuevo Pago (Separación)</h3>
      
      <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Monto *</label>
            <div style={{ display: 'flex' }}>
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value as any)}
                style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px 0 0 6px', borderRight: 'none', backgroundColor: '#f1f5f9' }}
              >
                <option value="USD">USD</option>
                <option value="PEN">PEN</option>
              </select>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '0 6px 6px 0' }} 
              />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Nro de Operación / Referencia *</label>
            <input 
              type="text" 
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>ID Unidad a Separar</label>
            <input 
              type="text" 
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              placeholder="Ej: Lote-5"
              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }} 
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>Adjuntar Voucher (Foto/PDF) *</label>
            <input 
              type="file" 
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              style={{ width: '100%', padding: '6px', border: '1px dashed #cbd5e1', borderRadius: '6px', backgroundColor: 'white' }} 
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isUploading}
          style={{ 
            alignSelf: 'flex-start', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            backgroundColor: 'var(--primary-color)', 
            color: 'white', 
            padding: '8px 16px', 
            borderRadius: '6px', 
            border: 'none', 
            fontWeight: 600,
            cursor: isUploading ? 'not-allowed' : 'pointer',
            opacity: isUploading ? 0.7 : 1
          }}
        >
          <Upload size={16} />
          {isUploading ? 'Subiendo...' : 'Registrar Pago'}
        </button>
      </form>

      <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Historial de Pagos</h3>
      {loading ? (
        <p style={{ fontSize: '13px', color: '#64748b' }}>Cargando historial...</p>
      ) : payments.length === 0 ? (
        <p style={{ fontSize: '13px', color: '#64748b' }}>No hay pagos registrados para este cliente.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {payments.map(payment => (
            <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={20} color="#64748b" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>
                    {payment.currency === 'USD' ? '$' : 'S/.'} {payment.amount.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Ref: {payment.reference} • {payment.createdAt?.toDate ? payment.createdAt.toDate().toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
              <div>
                {payment.status === 'PENDING' && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#d97706', backgroundColor: '#fef3c7', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}><Clock size={12}/> Pendiente</span>}
                {payment.status === 'APPROVED' && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#15803d', backgroundColor: '#dcfce7', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}><CheckCircle size={12}/> Aprobado</span>}
                {payment.status === 'REJECTED' && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#b91c1c', backgroundColor: '#fee2e2', padding: '4px 8px', borderRadius: '12px', fontWeight: 600 }}><XCircle size={12}/> Rechazado</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
