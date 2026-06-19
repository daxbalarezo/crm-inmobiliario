import React, { useState } from 'react';
import { Plus, Trash2, Edit2, GripVertical } from 'lucide-react';
import { collection, addDoc, deleteDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useCRM } from '../../context/CRMContext';
import { useTenantSchema } from '../../hooks/useTenantSchema';
import type { CustomFieldDefinition } from '../../types/definitions';
import styles from './DataModelSettings.module.css';

export default function DataModelSettings() {
  const { tenantId } = useCRM();
  const { fields, loading } = useTenantSchema('lead');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  
  // Form State
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldDefinition['type']>('string');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState(''); // Comma separated for 'select'

  const handleOpenModal = (field?: CustomFieldDefinition) => {
    if (field) {
      setEditingField(field);
      setFieldLabel(field.label);
      setFieldType(field.type);
      setFieldRequired(field.required);
      setFieldOptions(field.options?.join(', ') || '');
    } else {
      setEditingField(null);
      setFieldLabel('');
      setFieldType('string');
      setFieldRequired(false);
      setFieldOptions('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !fieldLabel.trim()) return;

    const schemaRef = collection(db, 'tenants', tenantId, 'schema_lead');
    const optionsArray = fieldType === 'select' ? fieldOptions.split(',').map(s => s.trim()).filter(Boolean) : [];

    const fieldData = {
      label: fieldLabel.trim(),
      type: fieldType,
      required: fieldRequired,
      options: optionsArray,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingField) {
        await updateDoc(doc(schemaRef, editingField.id), fieldData);
      } else {
        const generatedId = fieldLabel.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        await addDoc(schemaRef, {
          ...fieldData,
          id: generatedId,
          order: fields.length,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving field:', error);
      alert('Error al guardar el campo.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenantId || !window.confirm('¿Estás seguro de eliminar este campo? Esto no borrará los datos ya guardados en los leads, pero ocultará el campo del formulario.')) return;
    try {
      await deleteDoc(doc(db, 'tenants', tenantId, 'schema_lead', id));
    } catch (error) {
      console.error('Error deleting field:', error);
    }
  };

  if (loading) return <div className={styles.loading}>Cargando esquema...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Data Model: Leads</h2>
          <p className={styles.subtitle}>Define campos personalizados para el formulario de tus prospectos.</p>
        </div>
        <button onClick={() => handleOpenModal()} className={styles.btnPrimary}>
          <Plus size={16} /> Nuevo Campo
        </button>
      </div>

      <div className={styles.fieldsList}>
        {fields.length === 0 ? (
          <div className={styles.emptyState}>No tienes campos personalizados aún.</div>
        ) : (
          fields.map((field) => (
            <div key={field.id} className={styles.fieldItem}>
              <div className={styles.fieldDrag}>
                <GripVertical size={16} />
              </div>
              <div className={styles.fieldInfo}>
                <p className={styles.fieldLabel}>
                  {field.label} {field.required && <span className={styles.requiredAsterisk}>*</span>}
                </p>
                <p className={styles.fieldMeta}>
                  <span className={styles.fieldType}>{field.type}</span>
                  <span className={styles.fieldId}>ID: {field.id}</span>
                </p>
              </div>
              <div className={styles.fieldActions}>
                <button onClick={() => handleOpenModal(field)} className={styles.btnIcon}>
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(field.id)} className={`${styles.btnIcon} ${styles.btnDanger}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editingField ? 'Editar Campo' : 'Nuevo Campo Personalizado'}</h3>
            </div>
            <form onSubmit={handleSave}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nombre del Campo</label>
                <input 
                  type="text" 
                  required 
                  value={fieldLabel} 
                  onChange={e => setFieldLabel(e.target.value)} 
                  className={styles.formInput} 
                  placeholder="Ej. Presupuesto Máximo" 
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tipo de Dato</label>
                <select 
                  value={fieldType} 
                  onChange={e => setFieldType(e.target.value as CustomFieldDefinition['type'])} 
                  className={styles.formSelect}
                >
                  <option value="string">Texto Corto</option>
                  <option value="number">Número</option>
                  <option value="date">Fecha</option>
                  <option value="boolean">Casilla de Verificación (Sí/No)</option>
                  <option value="select">Lista Desplegable (Múltiples Opciones)</option>
                </select>
              </div>

              {fieldType === 'select' && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Opciones (separadas por coma)</label>
                  <input 
                    type="text" 
                    required 
                    value={fieldOptions} 
                    onChange={e => setFieldOptions(e.target.value)} 
                    className={styles.formInput} 
                    placeholder="Ej. Casa, Departamento, Lote" 
                  />
                </div>
              )}

              <div className={styles.formGroupCheckbox}>
                <input 
                  type="checkbox" 
                  id="requiredField"
                  checked={fieldRequired} 
                  onChange={e => setFieldRequired(e.target.checked)} 
                />
                <label htmlFor="requiredField" className={styles.formLabel}>Campo Obligatorio</label>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.btnCancel}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary}>Guardar Campo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
