import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import type { RolePermission } from '../types/definitions';

export function useRoles(tenantId: string | undefined) {
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!tenantId) {
      setRoles([]);
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('roles')
          .select('*')
          .eq('tenant_id', tenantId);

        if (error) throw error;
        
        const loadedRoles = (data || []).map(row => ({
          id: row.id,
          name: row.name,
          base_role: row.base_role || 'agent',
          permissions: row.permissions
        })) as RolePermission[];
        
        setRoles(loadedRoles);
      } catch (error) {
        console.error('Error fetching roles:', error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [tenantId, refreshTrigger]);

  const refreshRoles = () => setRefreshTrigger(prev => prev + 1);

  return { roles, loading, refreshRoles };
}
