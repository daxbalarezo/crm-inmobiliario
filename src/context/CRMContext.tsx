import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { Tenant } from '../types/definitions';

export interface UserProfile {
  uid: string;
  tenantId: string;
  role: 'owner' | 'manager' | 'agent';
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          let profile: UserProfile;
          if (snap.exists()) {
            profile = { uid: firebaseUser.uid, ...snap.data() } as UserProfile;
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
