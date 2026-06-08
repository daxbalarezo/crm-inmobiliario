import React, { useState, useMemo } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCommercialData } from '../hooks/useCommercialData';
import { useCRM } from '../context/CRMContext';
import LeadModal from '../components/LeadModal';
import type { Lead } from '../types/definitions';

export default function CommercialDashboard() {
  const { leads, inventory, loading } = useCommercialData();
  const { tenantId, activeProjectId, userProfile } = useCRM();
  const [searchTerm, setSearchTerm] = useState('');
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead]     = useState<Lead | null>(null);

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    const lower = searchTerm.toLowerCase();
    return leads.filter(l =>
      l.name?.toLowerCase().includes(lower) || l.phone?.includes(lower)
    );
  }, [leads, searchTerm]);

  const handleSave = async (data: Partial<Lead>) => {
    if (editingLead?.id) {
      await updateDoc(doc(db, 'leads', editingLead.id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, 'leads'), {
        ...data,
        tenantId,
        projectId: activeProjectId,
        assignedTo: userProfile?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'leads', id));
  };

  const openNew = () => { setEditingLead(null); setShowLeadModal(true); };
  const openEdit = (lead: Lead) => { setEditingLead(lead); setShowLeadModal(true); };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4DB6AC]"/>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-[Poppins] font-extrabold text-[#0B2B40]">Gestión Comercial</h2>
          <p className="text-slate-500 font-medium mt-1">Administra prospectos y cierra ventas.</p>
        </div>
        <button onClick={openNew}
          className="bg-[#F2A900] text-[#0B2B40] px-6 py-3 rounded-2xl font-bold hover:bg-[#d99700] transition-all flex items-center gap-2 shadow-md">
          <Plus size={18}/> Nuevo Prospecto
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-slate-400" size={20}/>
          <input type="text" placeholder="Buscar prospecto..."
            className="w-full pl-12 p-3.5 bg-slate-50 rounded-2xl outline-none border border-slate-200 focus:ring-2 focus:ring-[#4DB6AC] font-medium transition-all"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Activos</p>
            <p className="text-3xl font-[Poppins] font-black text-[#0B2B40] mt-1">{filteredLeads.length}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-2xl"><Users className="text-[#0B2B40]"/></div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No hay prospectos aún.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLeads.map(lead => (
              <div key={lead.id} onClick={() => openEdit(lead)}
                className="flex items-center justify-between p-5 hover:bg-slate-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#0B2B40] flex items-center justify-center text-white font-bold">
                    {lead.name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="font-bold text-[#0B2B40]">{lead.name}</p>
                    <p className="text-sm text-slate-500">{lead.phone}</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700">
                  {lead.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <LeadModal
        isOpen={showLeadModal}
        onClose={() => setShowLeadModal(false)}
        lead={editingLead}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}