import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { useCRM } from '../context/CRMContext';
import type { Project } from '../types/definitions';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const { tenantId, userProfile, authReady } = useCRM();

  useEffect(() => {
    if (!authReady || !userProfile) {
      setProjects([]);
      setLoadingProjects(false);
      return;
    }

    let cancelled = false;

    async function fetchProjects() {
      setLoadingProjects(true);
      try {
        let query = supabase.from('projects').select('*');
        if (userProfile.role !== 'owner') {
          query = query.eq('tenant_id', tenantId);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (!cancelled) {
          const mapped = (data || []).map(row => ({
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            address: row.address,
            description: row.description,
            status: row.status,
            createdAt: row.created_at
          } as Project));
          setProjects(mapped);
        }
      } catch (err: any) {
        console.error('Projects fetch error:', err.message);
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoadingProjects(false);
      }
    }

    fetchProjects();

    return () => {
      cancelled = true;
    };
  }, [tenantId, userProfile, authReady]);

  return { projects, loadingProjects };
}
