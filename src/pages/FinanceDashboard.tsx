import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Check, X, FileText, Image as ImageIcon, Download } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useFinance } from '../hooks/useFinance';
import type { Payment } from '../types/definitions';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import ContractGeneratorModal from '../components/ContractGeneratorModal';
import styles from './FinanceDashboard.module.css';

export default function FinanceDashboard() {
  const { userProfile, userPermissions, tenantId } = useCRM();
  const { allPayments, loading, approvePayment, rejectPayment } = useFinance(tenantId || undefined);
  
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [contractPayment, setContractPayment] = useState<Payment | null>(null);

  // Redirigir si no tiene permisos de finanzas
  if (userPermissions.finance?.read === 'none') {
    return <Navigate to="/" replace />;
  }

  const handleApprove = async (payment: Payment) => {
    if (!window.confirm('¿Estás seguro de aprobar este pago y separar la unidad?')) return;
    setProcessingId(payment.id);
    try {
      await approvePayment(payment.id, userProfile!.uid);
      
      // Actualizar el estado de la unidad a SEPARADO
      if (payment.unitId && payment.unitId !== 'N/A') {
        await updateDoc(doc(db, 'inventory', payment.unitId), {
          status: 'SEPARADO'
        });
      }
      
      // Actualizar el estado del lead a SEPARACIÓN
      if (payment.leadId) {
        await updateDoc(doc(db, 'leads', payment.leadId), {
          status: 'SEPARACIÓN'
        });
      }
      
      alert('Pago aprobado y unidad separada con éxito.');
    } catch (err) {
      console.error(err);
      alert('Hubo un error al aprobar el pago.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (paymentId: string) => {
    const notes = window.prompt('Indique el motivo del rechazo:');
    if (notes === null) return;
    
    setProcessingId(paymentId);
    try {
      await rejectPayment(paymentId, userProfile!.uid, notes);
      alert('Pago rechazado.');
    } catch (err) {
      console.error(err);
      alert('Hubo un error al rechazar el pago.');
    } finally {
      setProcessingId(null);
    }
  };

  const canApprove = userPermissions.finance?.approve;

  const pendingPayments = allPayments.filter(p => p.status === 'PENDING');
  const historyPayments = allPayments.filter(p => p.status !== 'PENDING');

  const renderCard = (payment: Payment) => (
    <div key={payment.id} className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.amount}>
          {payment.currency === 'USD' ? '$' : 'S/.'} {payment.amount.toLocaleString()}
        </div>
        <span className={`${styles.badge} ${payment.status === 'PENDING' ? styles.badgePending : payment.status === 'APPROVED' ? styles.badgeApproved : styles.badgeRejected}`}>
          {payment.status}
        </span>
      </div>

      {payment.voucherUrl ? (
        <a href={payment.voucherUrl} target="_blank" rel="noopener noreferrer">
          <img src={payment.voucherUrl} alt="Voucher" className={styles.voucherImg} style={{ cursor: 'pointer' }} />
        </a>
      ) : (
        <div style={{height: 120, backgroundColor: '#f1f5f9', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12}}>
          <ImageIcon color="#cbd5e1" size={32} />
        </div>
      )}

      <div className={styles.cardInfo}>
        <div><span className={styles.strong}>Cliente:</span> {payment.leadName}</div>
        {payment.unitName && <div><span className={styles.strong}>Unidad:</span> {payment.unitName}</div>}
        <div><span className={styles.strong}>Referencia:</span> {payment.reference}</div>
        <div><span className={styles.strong}>Fecha:</span> {payment.createdAt?.toDate ? payment.createdAt.toDate().toLocaleDateString() : 'N/A'}</div>
      </div>

      {payment.status === 'PENDING' && canApprove && (
        <div className={styles.cardActions}>
          <button 
            onClick={() => handleReject(payment.id)} 
            disabled={processingId === payment.id}
            className={`${styles.btnSecondary} ${styles.btnDanger}`}
          >
            <X size={16} /> Rechazar
          </button>
          <button 
            onClick={() => handleApprove(payment)} 
            disabled={processingId === payment.id}
            className={styles.btnPrimary}
          >
            <Check size={16} /> Aprobar
          </button>
        </div>
      )}

      {payment.status === 'APPROVED' && canApprove && (
        <div className={styles.cardActions}>
          <button 
            onClick={() => setContractPayment(payment)} 
            className={styles.btnSecondary}
            style={{ width: '100%', borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
          >
            <FileText size={16} /> Generar Contrato
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Bandeja de Pagos</h2>
          <p className={styles.subtitle}>Revisa y aprueba los vouchers subidos por los asesores.</p>
        </div>
      </div>

      <div className={styles.board}>
        {/* Columna de Pendientes */}
        <div className={styles.column}>
          <div className={styles.columnHeader}>
            <span>Pendientes de Aprobación</span>
            <span className={styles.columnCount}>{pendingPayments.length}</span>
          </div>
          <div className={styles.columnBody}>
            {loading ? (
              <div className={styles.emptyState}>Cargando pagos...</div>
            ) : pendingPayments.length === 0 ? (
              <div className={styles.emptyState}>No hay pagos pendientes.</div>
            ) : (
              pendingPayments.map(renderCard)
            )}
          </div>
        </div>

        {/* Columna de Historial */}
        <div className={styles.column}>
          <div className={styles.columnHeader}>
            <span>Historial (Aprobados / Rechazados)</span>
            <span className={styles.columnCount}>{historyPayments.length}</span>
          </div>
          <div className={styles.columnBody}>
            {loading ? (
              <div className={styles.emptyState}>Cargando historial...</div>
            ) : historyPayments.length === 0 ? (
              <div className={styles.emptyState}>No hay historial.</div>
            ) : (
              historyPayments.map(renderCard)
            )}
          </div>
        </div>
      </div>

      {contractPayment && (
        <ContractGeneratorModal 
          isOpen={!!contractPayment} 
          onClose={() => setContractPayment(null)} 
          payment={contractPayment} 
        />
      )}
    </div>
  );
}
