import React from 'react';
import { X, Clock, AlertTriangle, Phone, Mail } from 'lucide-react';
import type { AgentStats, SLALead } from '../../hooks/useAdminMetrics';

interface SLAModalProps {
  viewType: 'compliance' | 'forgotten' | 'worst';
  agent: AgentStats;
  onClose: () => void;
  slaTargetHours: number;
}

export default function SLAModal({ viewType, agent, onClose, slaTargetHours }: SLAModalProps) {
  
  const formatTime = (hours: number) => {
    if (hours === 0) return '0 min';
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    return `${hours.toFixed(1)} h`;
  };

  const renderLeadRow = (lead: SLALead, highlight: 'success' | 'warning' | 'danger') => {
    const timeValue = lead._ttfcHours || 0;
    
    return (
      <div key={lead.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{lead.name.toLowerCase()}</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {lead.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14} /> {lead.phone}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px',
            color: highlight === 'success' ? '#10b981' : highlight === 'warning' ? '#f59e0b' : '#ef4444',
            fontWeight: 600,
            fontSize: '13px'
          }}>
            <Clock size={16} />
            {formatTime(timeValue)} {viewType === 'forgotten' ? 'esperando' : ''}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '600px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {viewType === 'compliance' && 'Detalle de Cumplimiento SLA'}
              {viewType === 'forgotten' && 'Leads Olvidados (Sin Contactar)'}
              {viewType === 'worst' && 'Caso Crítico: Peor Tiempo'}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Rendimiento de <span style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{agent.name.toLowerCase()}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-secondary)', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ overflowY: 'auto', padding: '20px 24px' }}>
          
          {viewType === 'compliance' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                <div style={{ border: '1px solid var(--border-color)', borderLeft: '4px solid #10b981', borderRadius: '8px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dentro de SLA</div>
                    <div style={{ fontSize: '12px', color: '#10b981', marginTop: '2px' }}>≤ {slaTargetHours} horas</div>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)' }}>{agent.compliantLeadsList.length}</div>
                </div>
                <div style={{ border: '1px solid var(--border-color)', borderLeft: '4px solid #ef4444', borderRadius: '8px', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-surface)', boxShadow: 'var(--shadow-sm)' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Con Retraso</div>
                    <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '2px' }}>&gt; {slaTargetHours} horas</div>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-primary)' }}>{agent.nonCompliantLeadsList.length}</div>
                </div>
              </div>

              {agent.nonCompliantLeadsList.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Leads con retraso
                  </h3>
                  <div style={{ border: '1px solid var(--border-color)', borderTop: 'none', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', overflow: 'hidden' }}>
                    {agent.nonCompliantLeadsList.sort((a,b) => (b._ttfcHours||0) - (a._ttfcHours||0)).map(lead => renderLeadRow(lead, 'danger'))}
                  </div>
                </div>
              )}

              {agent.compliantLeadsList.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Leads a tiempo
                  </h3>
                  <div style={{ border: '1px solid var(--border-color)', borderTop: 'none', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px', overflow: 'hidden' }}>
                    {agent.compliantLeadsList.sort((a,b) => (b._ttfcHours||0) - (a._ttfcHours||0)).map(lead => renderLeadRow(lead, 'success'))}
                  </div>
                </div>
              )}
            </div>
          )}

          {viewType === 'forgotten' && (
            <div>
              <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderLeft: '4px solid #f59e0b', borderRadius: '8px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', boxShadow: 'var(--shadow-sm)' }}>
                <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Estos leads superaron la meta SLA ({slaTargetHours} horas) y <strong style={{ color: 'var(--text-primary)' }}>todavía no tienen ninguna actividad registrada</strong>. Requieren atención urgente.
                </p>
              </div>

              {agent.uncontactedLeadsList.length > 0 ? (
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                  {agent.uncontactedLeadsList.sort((a,b) => (b._ttfcHours||0) - (a._ttfcHours||0)).map(lead => renderLeadRow(lead, 'warning'))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px', fontSize: '14px' }}>No hay leads olvidados.</p>
              )}
            </div>
          )}

          {viewType === 'worst' && (
            <div>
              {agent.worstLead ? (
                <div>
                  <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderLeft: '4px solid #ef4444', borderRadius: '8px', padding: '16px', marginBottom: '24px', display: 'flex', gap: '16px', boxShadow: 'var(--shadow-sm)' }}>
                    <Clock size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      Este es el prospecto crítico que tuvo que esperar la mayor cantidad de tiempo antes de recibir su primer contacto.
                    </p>
                  </div>
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                    {renderLeadRow(agent.worstLead, 'danger')}
                  </div>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px', fontSize: '14px' }}>No hay registros de tiempo.</p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
