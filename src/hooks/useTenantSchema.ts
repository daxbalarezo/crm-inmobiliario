import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useCRM } from '../context/CRMContext';
import type { CustomFieldDefinition } from '../types/definitions';

export function useTenantSchema(entityType: 'lead' | 'project' = 'lead') {
  const { tenantId } = useCRM();
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId || tenantId === 'global') {
      setFields([]);
      setLoading(false);
      return;
    }

    const fetchSchema = async () => {
      try {
        const { data, error } = await supabase
          .from('tenants')
          .select('fields')
          .eq('id', tenantId)
          .single();

        if (error) throw error;
        
        let allFields: CustomFieldDefinition[] = data?.fields || [];
        // Filtrar por entityType, asumiendo que los que no tienen entityType son 'lead' por retrocompatibilidad
        let filteredFields = allFields.filter(f => (f.entityType || 'lead') === entityType);
        
        // Ordenar por 'order'
        filteredFields.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        setFields(filteredFields);
      } catch (err) {
        console.error('Error fetching tenant schema from Supabase:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchema();

    // Configurar Supabase Realtime para cambios en los fields del tenant
    const channel = supabase
      .channel(`tenant_schema_${tenantId}_${entityType}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tenants', filter: `id=eq.${tenantId}` },
        (payload) => {
          const updatedTenant = payload.new;
          if (updatedTenant && updatedTenant.fields) {
            let allFields: CustomFieldDefinition[] = updatedTenant.fields;
            let filteredFields = allFields.filter(f => (f.entityType || 'lead') === entityType);
            filteredFields.sort((a, b) => (a.order || 0) - (b.order || 0));
            setFields(filteredFields);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, entityType]);

  return { fields, loading };
}
