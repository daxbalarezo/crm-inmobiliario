import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../config/supabase';
import { useCRM } from '../context/CRMContext';
import { useGlobalData } from '../context/GlobalDataProvider';
import type { Lead, Unit } from '../types/definitions';

export function useCommercialData() {
  const { leads: globalLeads, loading: globalLoading, updateLeadOptimistically } = useGlobalData();
  const [inventory, setInventory] = useState<Unit[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const { authReady, userProfile, tenantId, activeProjectId } = useCRM();

  const effectiveProjectId = activeProjectId ?? 'all';

  // Filtrar los leads globales en RAM según el rol y el proyecto activo
  const leads = useMemo(() => {
    if (!userProfile) return [];
    
    let filtered = globalLeads;

    // Filtro por tenant (Manager/Agent)
    if (userProfile.role !== 'owner') {
      filtered = filtered.filter(l => l.tenantId === tenantId);
    }

    // Filtro por usuario (Agent)
    if (userProfile.role === 'agent') {
      filtered = filtered.filter(l => l.assignedTo === userProfile.uid);
    }

    // Filtro por proyecto
    if (effectiveProjectId !== 'all') {
      filtered = filtered.filter(l => l.projectId === effectiveProjectId);
    }

    // Ordenar por updatedAt descendente
    return filtered.sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [globalLeads, userProfile, tenantId, effectiveProjectId]);

  useEffect(() => {
    if (!authReady || !userProfile || !tenantId) {
      setInventory([]);
      setLoadingInventory(false);
      return;
    }

    const fetchInventory = async () => {
      setLoadingInventory(true);
      try {
        let query = supabase.from('units').select('*');
        
        if (userProfile.role !== 'owner') {
          query = query.eq('tenant_id', tenantId);
        }
        if (effectiveProjectId !== 'all') {
          query = query.eq('project_id', effectiveProjectId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Mapeo a camelCase
        const mappedUnits: Unit[] = (data || []).map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          projectId: row.project_id,
          customId: row.custom_id,
          group: row.group,
          type: row.type,
          area: row.area,
          price: row.price,
          price2k: row.price_2k,
          price5k: row.price_5k,
          priceCash: row.price_cash,
          status: row.status,
          description: row.description
        }));

        setInventory(mappedUnits);
      } catch (err) {
        console.error('Inventory error:', err);
        setInventory([]);
      } finally {
        setLoadingInventory(false);
      }
    };

    fetchInventory();

  }, [authReady, userProfile, tenantId, effectiveProjectId]);

  return { 
    leads, 
    inventory, 
    loading: globalLoading || loadingInventory,
    updateLeadOptimistically
  };
}