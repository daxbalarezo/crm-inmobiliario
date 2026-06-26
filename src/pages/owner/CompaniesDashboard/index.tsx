import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Building2, Plus, Settings } from 'lucide-react';
import { useCRM } from '../../../context/CRMContext';
import { supabase } from '../../../config/supabase';

import TenantMetrics from './components/TenantMetrics';
import TenantList from './components/TenantList';
import TenantDetailPanel from './components/TenantDetailPanel';
import NewTenantModal from './components/NewTenantModal';

export default function CompaniesDashboard() {
  const { userProfile } = useCRM();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [planPrices, setPlanPrices] = useState({ starter: 49, pro: 99, enterprise: 299 });

  useEffect(() => {
    if (userProfile?.role !== 'owner') return;
    
    // Load prices from localStorage
    const savedPrices = localStorage.getItem('crm_plan_prices');
    if (savedPrices) {
      try {
        setPlanPrices(JSON.parse(savedPrices));
      } catch (e) {}
    }
    
    fetchTenants();
  }, [userProfile?.role]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      // Supabase supports returning relation counts
      const { data, error } = await supabase
        .from('tenants')
        .select('*, users(count), projects(count)')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Mapear los counts a propiedades planas
      const mappedData = (data || []).map(t => ({
        ...t,
        users_count: t.users?.[0]?.count ?? 0,
        projects_count: t.projects?.[0]?.count ?? 0
      }));
      
      setTenants(mappedData);
      
      // Update selected tenant if it was open, or select the first one by default
      if (selectedTenant) {
        const updatedSelected = mappedData.find(t => t.id === selectedTenant.id);
        if (updatedSelected) {
          setSelectedTenant(updatedSelected);
        } else if (mappedData.length > 0) {
          setSelectedTenant(mappedData[0]);
        }
      } else if (mappedData.length > 0) {
        setSelectedTenant(mappedData[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (data: { name: string; ruc: string; plan: string; firstProject: string }) => {
    const tenantData = {
      name: data.name.trim(),
      ruc: data.ruc.trim(),
      plan: data.plan,
      status: 'active'
    };
    
    const { data: newTenant, error: tenantError } = await supabase
      .from('tenants')
      .insert([tenantData])
      .select()
      .single();
      
    if (tenantError) throw tenantError;

    if (data.firstProject.trim() && newTenant) {
      const { error: projError } = await supabase.from('projects').insert([{
        name: data.firstProject.trim(),
        tenant_id: newTenant.id
      }]);
      if (projError) throw projError;
    }

    // Refresh everything to get proper counts
    await fetchTenants();
    setIsTenantModalOpen(false);
  };

  const handleUpdateTenantStatus = async (tenantId: string, newStatus: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas ${newStatus === 'suspended' ? 'suspender' : 'reactivar'} esta inmobiliaria?`)) return;
    
    try {
      const { error } = await supabase.from('tenants').update({ status: newStatus }).eq('id', tenantId);
      if (error) throw error;
      
      const updateFn = (prev: any[]) => prev.map(t => t.id === tenantId ? { ...t, status: newStatus } : t);
      setTenants(updateFn);
      if (selectedTenant?.id === tenantId) setSelectedTenant({ ...selectedTenant, status: newStatus });
    } catch (err) {
      console.error(err);
      alert('Error al actualizar estado.');
    }
  };

  const handleUpdatePlan = async (tenantId: string, newPlan: string) => {
    try {
      const { error } = await supabase.from('tenants').update({ plan: newPlan }).eq('id', tenantId);
      if (error) throw error;
      
      const updateFn = (prev: any[]) => prev.map(t => t.id === tenantId ? { ...t, plan: newPlan } : t);
      setTenants(updateFn);
      if (selectedTenant?.id === tenantId) setSelectedTenant({ ...selectedTenant, plan: newPlan });
    } catch (err) {
      console.error(err);
      alert('Error al actualizar plan.');
    }
  };

  const handleUpdateTenantDetails = async (tenantId: string, updates: { name?: string; ruc?: string }) => {
    try {
      const { error } = await supabase.from('tenants').update(updates).eq('id', tenantId);
      if (error) throw error;
      
      const updateFn = (prev: any[]) => prev.map(t => t.id === tenantId ? { ...t, ...updates } : t);
      setTenants(updateFn);
      if (selectedTenant?.id === tenantId) setSelectedTenant({ ...selectedTenant, ...updates });
    } catch (err) {
      console.error(err);
      alert('Error al actualizar datos de la inmobiliaria.');
    }
  };

  const handleSavePricing = (newPrices: { starter: number; pro: number; enterprise: number }) => {
    setPlanPrices(newPrices);
    localStorage.setItem('crm_plan_prices', JSON.stringify(newPrices));
  };

  if (userProfile?.role !== 'owner') {
    return <Navigate to="/" replace />;
  }

  // KPIs
  const activeTenants = tenants.filter(t => t.status === 'active' || !t.status);
  const suspendedTenantsCount = tenants.length - activeTenants.length;
  const mrr = activeTenants.reduce((sum, t) => sum + (planPrices[t.plan as keyof typeof planPrices] || planPrices.starter), 0);
  const arr = mrr * 12;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* PAGE HEADER */}
      <div className="slds-page-header slds-m-bottom_medium" style={{ backgroundColor: 'white' }}>
        <div className="slds-page-header__row">
          <div className="slds-page-header__col-title">
            <div className="slds-media">
              <div className="slds-media__figure">
                <span className="slds-icon_container slds-icon-standard-account" title="inmobiliarias" style={{ color: 'white' }}>
                  <Building2 size={32} className="slds-icon slds-page-header__icon" />
                </span>
              </div>
              <div className="slds-media__body">
                <div className="slds-page-header__name">
                  <div className="slds-page-header__name-title">
                    <h1>
                      <span className="slds-page-header__title slds-truncate" title="Inmobiliarias Registradas">Inmobiliarias</span>
                    </h1>
                  </div>
                </div>
                <p className="slds-page-header__name-meta">Gestión Global de Clientes (Enterprise Admin)</p>
              </div>
            </div>
          </div>
          <div className="slds-page-header__col-actions">
            <div className="slds-page-header__controls">
              <div className="slds-page-header__control">
                <button className="slds-button slds-button_brand" onClick={() => setIsTenantModalOpen(true)}>
                  <Plus size={14} className="slds-m-right_x-small" /> Nueva Inmobiliaria
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TenantMetrics 
        activeCount={activeTenants.length} 
        suspendedCount={suspendedTenantsCount} 
        mrr={mrr} 
        arr={arr} 
      />

      <div className="slds-grid slds-gutters" style={{ flex: 1, overflow: 'hidden' }}>
        <div className={`slds-col ${selectedTenant ? 'slds-size_8-of-12' : 'slds-size_1-of-1'}`} style={{ transition: 'width 0.3s ease', height: '100%' }}>
          <TenantList 
            tenants={tenants} 
            loading={loading} 
            selectedTenantId={selectedTenant?.id || null}
            onSelectTenant={setSelectedTenant}
          />
        </div>
        
        {selectedTenant && (
          <div className="slds-col slds-size_4-of-12" style={{ height: '100%' }}>
            <TenantDetailPanel 
              tenant={selectedTenant}
              onClose={() => setSelectedTenant(null)}
              onUpdateStatus={handleUpdateTenantStatus}
              onUpdatePlan={handleUpdatePlan}
              onUpdateDetails={handleUpdateTenantDetails}
            />
          </div>
        )}
      </div>

      <NewTenantModal 
        isOpen={isTenantModalOpen} 
        onClose={() => setIsTenantModalOpen(false)} 
        onSave={handleCreateTenant} 
      />
    </div>
  );
}
