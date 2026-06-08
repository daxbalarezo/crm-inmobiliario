import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

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
  tenantId: string | null;
  activeProjectId: string | null;
  setActiveProjectId: (id: string) => void;
  authReady: boolean; // TRUE solo cuando Firebase terminó de verificar sesión
}

const CRMContext = createContext<CRMContextType | null>(null);

export function CRMProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string>('valle_pacora');
  const [authReady, setAuthReady]     = useState(false); // empieza en false

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (snap.exists()) {
            const profile = { uid: firebaseUser.uid, ...snap.data() } as UserProfile;
            setUserProfile(profile);
            if (profile.assignedProjectIds?.length > 0) {
              setActiveProjectId(profile.assignedProjectIds[0]);
            }
          } else {
            // No tiene doc en Firestore — usamos uid como tenantId (modo demo)
            setUserProfile({
              uid: firebaseUser.uid,
              tenantId: firebaseUser.uid,
              role: 'owner',
              name: firebaseUser.displayName ?? 'Usuario',
              email: firebaseUser.email ?? '',
              assignedProjectIds: ['valle_pacora'],
            });
          }
        } catch (e) {
          console.error('Error leyendo perfil:', e);
          // Fallback seguro
          setUserProfile({
            uid: firebaseUser.uid,
            tenantId: firebaseUser.uid,
            role: 'owner',
            name: firebaseUser.displayName ?? 'Usuario',
            email: firebaseUser.email ?? '',
            assignedProjectIds: ['valle_pacora'],
          });
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      // Solo se pone true UNA VEZ — cuando Firebase terminó de verificar
      setAuthReady(true);
    });

    return () => unsub();
  }, []);

  return (
    <CRMContext.Provider value={{
      user,
      userProfile,
      tenantId: userProfile?.tenantId ?? null,
      activeProjectId,
      setActiveProjectId,
      authReady,
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
