import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import type { RolePermission } from '../types/definitions';

export function useRoles(tenantId: string | undefined) {
  const [roles, setRoles] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, [tenantId]);

  return { roles, loading };
}
