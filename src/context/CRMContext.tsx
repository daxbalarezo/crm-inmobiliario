import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
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
  createdAt?: any;
}

interface CRMContextType {
  user: User | null;
  userProfile: UserProfile | null;
  realUserProfile: UserProfile | null;
  isImpersonating: boolean;
  tenant: Tenant | null;
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
  const [activeProjectId, setActiveProjectId] = useState<string>('valle_pacora');
  const [userPermissions, setUserPermissions] = useState<RolePermission['permissions']>(DEFAULT_PERMISSIONS);
  const [authReady, setAuthReady] = useState(false);

  const fetchTenant = async (tenantId: string, role: string) => {
    if (role === 'owner') {
      return { id: 'global', name: 'ADMIN', plan: 'enterprise' } as Tenant;
    }
    if (!tenantId) return { id: 'unknown', name: 'Empresa no encontrada', plan: 'starter' } as Tenant;
    
    try {
      const tenantSnap = await getDoc(doc(db, 'tenants', tenantId));
      if (tenantSnap.exists()) {
        return { id: tenantSnap.id, ...tenantSnap.data() } as Tenant;
      }
    } catch (e) {
      console.error("Error cargando tenant:", e);
    }
    return { id: tenantId, name: 'Empresa no encontrada', plan: 'starter' } as Tenant;
  };

  const fetchPermissions = async (tenantId: string, roleName: string, roleId?: string) => {
    if (roleName === 'owner' || roleName === 'manager') return MANAGER_PERMISSIONS;
    if (!tenantId) return DEFAULT_PERMISSIONS;
    try {
      if (roleId) {
        const roleSnap = await getDoc(doc(db, `tenants/${tenantId}/roles`, roleId));
        if (roleSnap.exists()) {
          return (roleSnap.data() as RolePermission).permissions;
        }
      } else {
        const q = query(collection(db, `tenants/${tenantId}/roles`), where('name', '==', roleName));
        const snap = await getDocs(q);
        if (!snap.empty) {
          return (snap.docs[0].data() as RolePermission).permissions;
        }
      }
    } catch (e) {
      console.error("Error fetching permissions:", e);
    }
    return DEFAULT_PERMISSIONS; // fallback
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          let profile: UserProfile;
          if (snap.exists()) {
            profile = { uid: firebaseUser.uid, ...snap.data() } as UserProfile;
            if (profile.status === 'suspended') {
              await signOut(auth);
              alert('Tu cuenta ha sido suspendida. Contacta a tu administrador.');
              return;
            }
          } else {
            profile = {
              uid: firebaseUser.uid,
              tenantId: firebaseUser.uid,
              role: 'owner',
              name: firebaseUser.displayName ?? 'Usuario',
              email: firebaseUser.email ?? '',
              assignedProjectIds: ['valle_pacora'],
            };
          }
          
          setUserProfile(profile);
          setRealUserProfile(profile);
          
          const fetchedTenant = await fetchTenant(profile.tenantId, profile.role);
          setTenant(fetchedTenant);

          const permissions = await fetchPermissions(profile.tenantId, profile.role, profile.roleId);
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

    return () => unsub();
  }, []);

  const impersonateUser = async (targetUid: string) => {
    if (realUserProfile?.role !== 'owner') return;
    
    try {
      const snap = await getDoc(doc(db, 'users', targetUid));
      if (snap.exists()) {
        const targetProfile = { uid: targetUid, ...snap.data() } as UserProfile;
        setUserProfile(targetProfile);
        setIsImpersonating(true);
        
        const fetchedTenant = await fetchTenant(targetProfile.tenantId, targetProfile.role);
        setTenant(fetchedTenant);

        const permissions = await fetchPermissions(targetProfile.tenantId, targetProfile.role, targetProfile.roleId);
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

    const permissions = await fetchPermissions(realUserProfile.tenantId, realUserProfile.role, realUserProfile.roleId);
    setUserPermissions(permissions);
  };

  const logout = async () => {
    try {
      await signOut(auth);
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
