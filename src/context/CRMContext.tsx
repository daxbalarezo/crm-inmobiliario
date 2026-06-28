import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import type { Tenant, RolePermission } from '../types/definitions';

const DEFAULT_PERMISSIONS: RolePermission['permissions'] = {
  leads: { read: 'own', create: true, update: true, delete: false },
  inventory: { read: 'all', create: false, update: false, delete: false },
  finance: { read: 'own', create: true, approve: false },
  settings: { manage: false }
};

const MANAGER_PERMISSIONS: RolePermission['permissions'] = {
  leads: { read: 'all', create: true, update: true, delete: true },
  inventory: { read: 'all', create: true, update: true, delete: true },
  finance: { read: 'all', create: true, approve: true },
  settings: { manage: true }
};

export interface UserProfile {
  uid: string;
  tenantId: string;
  role: 'owner' | 'manager' | 'agent' | string;
  roleId?: string;
  name: string;
  email: string;
  assignedProjectIds: string[];
  status?: string;
  createdAt?: any;
}

interface CRMContextType {
  user: User | null;
  userProfile: UserProfile | null;
  realUserProfile: UserProfile | null;
  isImpersonating: boolean;
  tenant: Tenant | null;
  tenantSubscription: any | null;
  tenantId: string | null;
  activeProjectId: string | null;
  userPermissions: RolePermission['permissions'];
  setActiveProjectId: (id: string) => void;
  authReady: boolean;
  logout: () => Promise<void>;
  impersonateUser: (uid: string) => Promise<void>;
  stopImpersonating: () => void;
}

const CRMContext = createContext<CRMContextType | null>(null);

export function CRMProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [realUserProfile, setRealUserProfile] = useState<UserProfile | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantSubscription, setTenantSubscription] = useState<any>(null);
  const [activeProjectId, setActiveProjectId] = useState<string>('all');
  const [userPermissions, setUserPermissions] = useState<RolePermission['permissions']>(DEFAULT_PERMISSIONS);
  const [authReady, setAuthReady] = useState(false);

  const fetchTenant = async (tenantId: string, role: string) => {
    if (role === 'owner') {
      return { id: 'global', name: 'ADMIN', plan: 'enterprise' } as Tenant;
    }
    if (!tenantId) return { id: 'unknown', name: 'Empresa no encontrada', plan: 'starter' } as Tenant;
    
    try {
      const { data, error } = await supabase.from('tenants').select('*, saas_subscriptions(*)').eq('id', tenantId).single();
      if (!error && data) {
        return data as Tenant;
      }
    } catch (e) {
      console.error("Error cargando tenant:", e);
    }
    return { id: tenantId, name: 'Empresa no encontrada', plan: 'starter' } as Tenant;
  };

  const fetchPermissions = async (tenantId: string, roleName: string) => {
    if (roleName === 'owner' || roleName === 'manager') return MANAGER_PERMISSIONS;
    return DEFAULT_PERMISSIONS;
  };

  useEffect(() => {
    // Escuchar cambios de sesión en Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const supabaseUser = session?.user ?? null;
      if (supabaseUser) {
        setUser(supabaseUser);
        try {
          // Buscar perfil en tabla public.users
          const { data: snap } = await supabase.from('users').select('*').eq('uid', supabaseUser.id).maybeSingle();
          
          let profile: UserProfile;
          if (snap) {
            profile = { 
              uid: snap.uid, 
              tenantId: snap.tenant_id,
              role: snap.role,
              name: snap.name,
              email: snap.email,
              assignedProjectIds: snap.assigned_project_ids || [],
              status: snap.status
            } as UserProfile;

            if (profile.status === 'suspended') {
              await supabase.auth.signOut();
              alert('Tu cuenta ha sido suspendida. Contacta a tu administrador.');
              return;
            }
          } else {
            // Error grave de seguridad/sincronización: El usuario está en Auth pero no en public.users o RLS bloquea su lectura.
            await supabase.auth.signOut();
            alert('Error crítico: Tu perfil no fue aprovisionado o no tienes permisos de lectura. Contacta a soporte.');
            return;
          }
          
          setUserProfile(profile);
          setRealUserProfile(profile);
          
          const fetchedTenant = await fetchTenant(profile.tenantId, profile.role);
          setTenant(fetchedTenant);
          if (fetchedTenant.saas_subscriptions && fetchedTenant.saas_subscriptions.length > 0) {
            setTenantSubscription(fetchedTenant.saas_subscriptions[0]);
          } else {
            setTenantSubscription(null);
          }

          const permissions = await fetchPermissions(profile.tenantId, profile.role);
          setUserPermissions(permissions);

          if (profile.assignedProjectIds?.length > 0) {
            setActiveProjectId(profile.assignedProjectIds[0]);
          }
        } catch (e) {
          console.error('Error leyendo perfil:', e);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setRealUserProfile(null);
        setTenant(null);
        setUserPermissions(DEFAULT_PERMISSIONS);
        setIsImpersonating(false);
      }
      setAuthReady(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const impersonateUser = async (targetUid: string) => {
    if (realUserProfile?.role !== 'owner') return;
    try {
      const { data: snap } = await supabase.from('users').select('*').eq('uid', targetUid).single();
      if (snap) {
        const targetProfile = { 
          uid: snap.uid, 
          tenantId: snap.tenant_id,
          role: snap.role,
          name: snap.name,
          email: snap.email,
          assignedProjectIds: snap.assigned_project_ids || []
        } as UserProfile;
        
        setUserProfile(targetProfile);
        setIsImpersonating(true);
        
        const fetchedTenant = await fetchTenant(targetProfile.tenantId, targetProfile.role);
        setTenant(fetchedTenant);
        if (fetchedTenant.saas_subscriptions && fetchedTenant.saas_subscriptions.length > 0) {
          setTenantSubscription(fetchedTenant.saas_subscriptions[0]);
        } else {
          setTenantSubscription(null);
        }

        const permissions = await fetchPermissions(targetProfile.tenantId, targetProfile.role);
        setUserPermissions(permissions);

        if (targetProfile.assignedProjectIds?.length > 0) {
          setActiveProjectId(targetProfile.assignedProjectIds[0]);
        }
      }
    } catch (e) {
      console.error("Error impersonando:", e);
      alert("Error al entrar a la cuenta.");
    }
  };

  const stopImpersonating = async () => {
    if (!realUserProfile) return;
    setUserProfile(realUserProfile);
    setIsImpersonating(false);
    const fetchedTenant = await fetchTenant(realUserProfile.tenantId, realUserProfile.role);
    setTenant(fetchedTenant);
    if (fetchedTenant.saas_subscriptions && fetchedTenant.saas_subscriptions.length > 0) {
      setTenantSubscription(fetchedTenant.saas_subscriptions[0]);
    } else {
      setTenantSubscription(null);
    }

    const permissions = await fetchPermissions(realUserProfile.tenantId, realUserProfile.role);
    setUserPermissions(permissions);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <CRMContext.Provider value={{
      user,
      userProfile,
      realUserProfile,
      isImpersonating,
      tenant,
      tenantSubscription,
      tenantId: userProfile?.tenantId ?? null,
      activeProjectId,
      userPermissions,
      setActiveProjectId,
      authReady,
      logout,
      impersonateUser,
      stopImpersonating
    }}>
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error('useCRM debe usarse dentro de <CRMProvider>');
  return ctx;
}
