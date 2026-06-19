import React, { useState, useEffect } from 'react';
import { useCRM } from '../../context/CRMContext';
import { useAuditTrail } from '../../hooks/useAuditTrail';
import type { AuditEvent } from '../../types/definitions';
import { ShieldAlert, Search, Filter, Download } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import styles from './AuditDashboard.module.css';

export default function AuditDashboard() {
  const { tenantId, userPermissions } = useCRM();
  const { getRecentLogs, loading } = useAuditTrail(tenantId || '');
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState('');

  useEffect(() => {
    async function fetchLogs() {
      const data = await getRecentLogs(100);
      setLogs(data);
    }
    fetchLogs();
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      const q = query(collection(db, 'users'), where('tenantId', '==', tenantId));
      getDocs(q).then(snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }
  }, [tenantId]);

  if (!userPermissions.settings.manage) {
    return <div className={styles.emptyState}>No tienes permisos para ver esta sección.</div>;
  }

  const filteredLogs = logs.filter(log => {
    const matchUser = selectedUser ? log.userId === selectedUser : true;
    const matchSearch = searchTerm ? (
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase())
    ) : true;
    return matchUser && matchSearch;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'DELETE': return <span className={`${styles.badge} ${styles.badgeRed}`}>ELIMINACIÓN</span>;
      case 'APPROVE': return <span className={`${styles.badge} ${styles.badgeGreen}`}>APROBACIÓN</span>;
      case 'REJECT': return <span className={`${styles.badge} ${styles.badgeOrange}`}>RECHAZO</span>;
      case 'UPDATE_PERMISSIONS': return <span className={`${styles.badge} ${styles.badgeBlue}`}>PERMISOS</span>;
      default: return <span className={`${styles.badge} ${styles.badgeGray}`}>{action}</span>;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'medium' });
  };

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;
    
    // Encabezados
    const headers = ['Fecha y Hora', 'Usuario', 'Acción', 'Módulo', 'Detalles'];
    
    // Filas
    const rows = filteredLogs.map(log => [
      `"${formatDate(log.timestamp)}"`,
      `"${log.userName}"`,
      `"${log.action}"`,
      `"${log.resource}"`,
      `"${log.details.replace(/"/g, '""')}"` // Escapar comillas dobles
    ]);
    
    // Unir todo en formato CSV
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    // Crear un Blob y forzar la descarga
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF para que Excel reconozca los acentos (BOM)
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auditoria_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Registro de Auditoría</h2>
          <p className={styles.subtitle}>Historial inmutable de acciones críticas (solo administradores).</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className={styles.searchBox}>
            <Filter size={18} color="#64748b" />
            <select 
              value={selectedUser} 
              onChange={(e) => setSelectedUser(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '150px', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              <option value="">Todos los usuarios</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.searchBox}>
            <Search size={18} color="#64748b" />
            <input 
              type="text" 
              placeholder="Buscar acción o detalle..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={exportToCSV}
            className={styles.btnExport}
            disabled={filteredLogs.length === 0}
            title="Exportar a CSV"
          >
            <Download size={18} />
            <span>Exportar</span>
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.emptyState}>Cargando registros...</div>
        ) : filteredLogs.length === 0 ? (
          <div className={styles.emptyState}>
            <ShieldAlert size={48} color="#cbd5e1" style={{ margin: '0 auto 16px' }} />
            No hay registros que coincidan con la búsqueda.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Módulo</th>
                <th>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id}>
                  <td className={styles.tdDate}>{formatDate(log.timestamp)}</td>
                  <td className={styles.tdUser}>{log.userName}</td>
                  <td>{getActionBadge(log.action)}</td>
                  <td className={styles.tdResource}>{log.resource}</td>
                  <td className={styles.tdDetails}>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
