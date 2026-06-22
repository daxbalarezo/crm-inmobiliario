import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useCRM } from '../../context/CRMContext';
import type { Workflow, WorkflowTriggerType, WorkflowCondition, WorkflowAction, WorkflowActionType } from '../../types/definitions';

export default function WorkflowsDashboard() {
  const { userProfile, tenantId } = useCRM();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [trigger, setTrigger] = useState<WorkflowTriggerType>('lead_created');
  
  // Condición simplificada por ahora (1 condición máxima para la v1)
  const [condField, setCondField] = useState('source');
  const [condOperator, setCondOperator] = useState<'equals' | 'contains' | 'greater_than' | 'less_than'>('equals');
  const [condValue, setCondValue] = useState('');

  // Acción
  const [actionType, setActionType] = useState<WorkflowActionType>('assign_to');
  const [actionPayload, setActionPayload] = useState('');

  useEffect(() => {
    if (tenantId && (userProfile?.role === 'owner' || userProfile?.role === 'manager')) {
      fetchWorkflows();
      fetchUsers();
    }
  }, [tenantId, userProfile]);

  const fetchWorkflows = async () => {
    if (!tenantId) return;
    try {
      const q = query(collection(db, 'workflows'), where('tenantId', '==', tenantId));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Workflow));
      setWorkflows(data);
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!tenantId) return;
    try {
      const q = query(collection(db, 'users'), where('tenantId', '==', tenantId));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setIsActive(true);
    setTrigger('lead_created');
    setCondField('source');
    setCondOperator('equals');
    setCondValue('');
    setActionType('assign_to');
    setActionPayload('');
    setEditingWorkflow(null);
  };

  const handleOpenModal = (wf?: Workflow) => {
    if (wf) {
      setEditingWorkflow(wf);
      setName(wf.name);
      setIsActive(wf.isActive);
      setTrigger(wf.trigger);
      if (wf.conditions.length > 0) {
        setCondField(wf.conditions[0].field);
        setCondOperator(wf.conditions[0].operator);
        setCondValue(wf.conditions[0].value.toString());
      }
      if (wf.actions.length > 0) {
        setActionType(wf.actions[0].type);
        setActionPayload(wf.actions[0].payload);
      }
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    const newCondition: WorkflowCondition = {
      field: condField,
      operator: condOperator,
      value: condField === 'budget' ? Number(condValue) : condValue
    };

    const newAction: WorkflowAction = {
      type: actionType,
      payload: actionPayload
    };

    const workflowData = {
      tenantId: tenantId,
      name,
      isActive,
      trigger,
      conditions: [newCondition],
      actions: [newAction],
      updatedAt: serverTimestamp()
    };

    try {
      if (editingWorkflow) {
        await updateDoc(doc(db, 'workflows', editingWorkflow.id), workflowData);
      } else {
        await addDoc(collection(db, 'workflows'), { ...workflowData, createdAt: serverTimestamp() });
      }
      setIsModalOpen(false);
      fetchWorkflows();
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Error al guardar la automatización.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar esta automatización?')) {
      await deleteDoc(doc(db, 'workflows', id));
      fetchWorkflows();
    }
  };

  if (userProfile?.role !== 'owner' && userProfile?.role !== 'manager') {
    return <div style={{ padding: 24 }}>Acceso denegado. Solo administradores.</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>Automatizaciones (Workflows)</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0' }}>Configura reglas automáticas para tus prospectos.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          style={{
            backgroundColor: '#3b82f6', color: 'white', padding: '10px 20px', 
            borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 500
          }}
        >
          + Nueva Regla
        </button>
      </div>

      {loading ? (
        <p>Cargando automatizaciones...</p>
      ) : workflows.length === 0 ? (
        <div style={{ backgroundColor: 'white', padding: 40, textAlign: 'center', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#64748b' }}>No tienes automatizaciones configuradas todavía.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
          {workflows.map(wf => (
            <div key={wf.id} style={{ backgroundColor: 'white', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>{wf.name}</h3>
                <span style={{ 
                  backgroundColor: wf.isActive ? '#dcfce7' : '#f1f5f9', 
                  color: wf.isActive ? '#166534' : '#475569',
                  padding: '4px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500
                }}>
                  {wf.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              
              <div style={{ fontSize: 13, color: '#475569', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                <div><strong>Cuando:</strong> {wf.trigger === 'lead_created' ? 'Nuevo Prospecto' : 'Prospecto Actualizado'}</div>
                <div><strong>Si:</strong> {wf.conditions[0]?.field} {wf.conditions[0]?.operator} "{wf.conditions[0]?.value}"</div>
                <div><strong>Entonces:</strong> {wf.actions[0]?.type} -&gt; {wf.actions[0]?.payload}</div>
              </div>

              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
                <button onClick={() => handleOpenModal(wf)} style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6, backgroundColor: 'white', cursor: 'pointer', fontWeight: 500 }}>Editar</button>
                <button onClick={() => handleDelete(wf.id)} style={{ padding: '8px 12px', border: 'none', borderRadius: 6, backgroundColor: '#fee2e2', color: '#b91c1c', cursor: 'pointer', fontWeight: 500 }}>Borrar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', padding: 32, borderRadius: 12, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 24px', fontSize: 20 }}>{editingWorkflow ? 'Editar' : 'Nueva'} Automatización</h2>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Nombre de la regla</label>
                <input required value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }} placeholder="Ej: Asignar leads de Facebook" />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                Regla Activa
              </label>

              <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14, color: '#2563eb' }}>1. ¿CUÁNDO se ejecuta?</label>
                <select value={trigger} onChange={e => setTrigger(e.target.value as any)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                  <option value="lead_created">Cuando ingresa un NUEVO prospecto</option>
                  <option value="lead_updated">Cuando se ACTUALIZA un prospecto</option>
                </select>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14, color: '#ea580c' }}>2. SI se cumple la condición:</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={condField} onChange={e => setCondField(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                    <option value="source">Origen</option>
                    <option value="stage">Etapa</option>
                    <option value="budget">Presupuesto</option>
                  </select>
                  <select value={condOperator} onChange={e => setCondOperator(e.target.value as any)} style={{ width: 120, padding: '8px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                    <option value="equals">Es igual a</option>
                    <option value="contains">Contiene</option>
                    <option value="greater_than">Mayor a</option>
                  </select>
                </div>
                <input required value={condValue} onChange={e => setCondValue(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', marginTop: 8 }} placeholder="Valor (ej. Facebook Ads)" />
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500, fontSize: 14, color: '#16a34a' }}>3. ENTONCES haz esto:</label>
                <select value={actionType} onChange={e => setActionType(e.target.value as any)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', marginBottom: 8 }}>
                  <option value="assign_to">Asignar a un asesor específico</option>
                  <option value="assign_round_robin">Asignar equitativamente</option>
                  <option value="add_tag">Añadir una etiqueta VIP</option>
                  <option value="create_task">Crear Tarea Automática</option>
                </select>

                {actionType === 'assign_to' ? (
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: 6, maxHeight: 180, overflowY: 'auto' }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>Selecciona los Asesores</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          const agents = users.filter(u => u.role === 'agent').map(u => u.id);
                          if (actionPayload.split(',').filter(Boolean).length === agents.length) {
                            setActionPayload(''); // Deseleccionar todos
                          } else {
                            setActionPayload(agents.join(',')); // Seleccionar todos
                          }
                        }}
                        style={{ fontSize: 12, color: '#0176D3', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {actionPayload.split(',').filter(Boolean).length === users.filter(u => u.role === 'agent').length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                      </button>
                    </div>
                    {users.filter(u => u.role === 'agent').map(u => {
                      const isSelected = actionPayload.split(',').includes(u.id);
                      return (
                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', margin: 0 }}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={(e) => {
                              let current = actionPayload.split(',').filter(Boolean);
                              if (e.target.checked) current.push(u.id);
                              else current = current.filter(id => id !== u.id);
                              setActionPayload(current.join(','));
                            }}
                            style={{ margin: 0, width: 16, height: 16, cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: 14 }}>{u.name}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : actionType === 'assign_round_robin' ? (
                  <div style={{ padding: '8px 12px', backgroundColor: '#f1f5f9', borderRadius: 6, fontSize: 13, color: '#475569' }}>
                    Los prospectos se asignarán de forma rotativa entre todos los asesores disponibles automáticamente.
                  </div>
                ) : (
                  <input required value={actionPayload} onChange={e => setActionPayload(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }} placeholder="Escribe la etiqueta o el título de la tarea" />
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', fontWeight: 500 }}>Cancelar</button>
                <button type="submit" style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Guardar Regla</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
