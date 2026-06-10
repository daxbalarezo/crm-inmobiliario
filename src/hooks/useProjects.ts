import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
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
        let q;
        if (userProfile.role === 'owner') {
          // El owner ve todos los proyectos de todas las inmobiliarias
          q = query(collection(db, 'projects'));
        } else {
          q = query(
            collection(db, 'projects'),
            where('tenantId', '==', tenantId)
          );
        }
        
        const snap = await getDocs(q);
        if (!cancelled) {
          setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Project[]);
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
