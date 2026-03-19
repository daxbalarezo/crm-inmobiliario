import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, TrendingUp, CheckCircle2, Grid, Map, Home, Search, List, LayoutGrid, Plus, 
  Bell, PhoneMissed, Ban, AlarmClock, Calculator, Edit3, Trash2, User, Phone, Save, 
  FileText, Check, MessageCircle, Thermometer, ThermometerSun, Snowflake, ArrowUpDown,
  PhoneOutgoing, Send, Target, BarChart3
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, writeBatch, doc, deleteDoc, getDocs, updateDoc } from "firebase/firestore"; 
import { signInAnonymously } from "firebase/auth";

import { db, auth } from './config/firebase';
import type { Lead, Unit, ProformaConfig } from './types/definitions'; 
import { checkAlertStatus, getInterestColor, getStatusColor, formatDateShort, formatDate } from './utils/helpers';

import { saveLeadService, deleteLeadService, completeTaskService } from './services/leads';

import InventoryModal from './components/modals/InventoryModal';
import LeadModal from './components/modals/LeadModal'; 
import ProformaModal from './components/modals/ProformaModal';
import StatsModal from './components/modals/StatsModal';

const PROJECT_LOTE = "Tierras del Sol";
const PROJECT_DEPA = "Las Torres de Monaco";
const STAGES_LOTE = ['Nuevo', 'Contactado', 'No Contesta', 'Visita Proyecto', 'Separación', 'Vendido', 'No Interesado'];
const STAGES_DEPA = ['Nuevo', 'Contactado', 'No Contesta', 'Visita Piloto', 'Separación', 'Vendido', 'No Interesado'];

export default function RealEstateCRM() {
  const [activeModule, setActiveModule] = useState<'LOTE' | 'DEPA'>('LOTE');
  const [viewMode, setViewMode] = useState<'LIST' | 'BOARD'>('BOARD');
  const [sortMode, setSortMode] = useState<'PRIORITY' | 'DAILY'>('PRIORITY');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [inventory, setInventory] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState('ALL');

  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showProformaModal, setShowProformaModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  
  const [modalMode, setModalMode] = useState<'EDIT' | 'VIEW'>('EDIT');
  
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [activeTab, setActiveTab] = useState<'CLIENTE' | 'PROPIEDAD' | 'HISTORIAL'>('CLIENTE');
  
  const [newInteractionNote, setNewInteractionNote] = useState('');
  const [newInteractionType, setNewInteractionType] = useState('Nota');
  const [tempTimeString, setTempTimeString] = useState('');

  const [proformaLead, setProformaLead] = useState<Lead | null>(null);
  const [proformaConfig, setProformaConfig] = useState<ProformaConfig>({
      unitId: '', locationId: '', area: 0, priceList: 0, isCash: false, cashDiscount: 0, initialPayment: 0, highInitialDiscount: 0, bonusType: 'Ninguno', bonusAmount: 0, extraDiscountName: 'Descuento Especial', extraDiscountAmount: 0, months: 36
  });

  useEffect(() => {
    signInAnonymously(auth).catch(err => console.error("Auth error", err));
    const u1 = onSnapshot(query(collection(db, 'crm_leads'), orderBy('updatedAt', 'desc')), s => { 
        setLeads(s.docs.map(d => ({ id: d.id, ...d.data() } as Lead))); 
        setLoading(false); 
    });
    const u2 = onSnapshot(query(collection(db, 'crm_inventory')), s => 
        setInventory(s.docs.map(d => ({ id: d.id, ...d.data() } as Unit)))
    );
    return () => { u1(); u2(); };
  }, []);

  const filteredLeads = useMemo(() => {
    let result = leads.filter(l => l.type === activeModule);
    
    if (quickFilter === 'TODAY_PENDING') {
        const todayStr = new Date().toISOString().split('T')[0];
        result = result.filter(l => {
            const status = activeModule === 'LOTE' ? l.statusLote : l.statusDepa;
            if (status === 'No Interesado') return false;

            const lastInter = l.interactions?.[0]?.date || '';
            const touchedToday = lastInter.startsWith(todayStr);
            const alertStatus = checkAlertStatus(l.nextFollowUpDate || undefined);

            // Si tiene fecha futura, NO cuenta como pendiente hoy
            if (l.nextFollowUpDate && alertStatus !== 'today' && alertStatus !== 'overdue') return false;

            if (alertStatus === 'today' || alertStatus === 'overdue') return true;
            if (status === 'No Contesta') return true;
            if (!touchedToday) return true;

            return false;
        });
    } else if (quickFilter === 'LOST') {
        result = result.filter(l => (l.type === 'LOTE' ? l.statusLote : l.statusDepa) === 'No Interesado');
    } else {
        result = result.filter(l => (l.type === 'LOTE' ? l.statusLote : l.statusDepa) !== 'No Interesado');
    }

    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(l => (l.name && l.name.toLowerCase().includes(lower)) || (l.phone && l.phone.includes(lower)));
    }

    if (quickFilter === 'HOT') result = result.filter(l => l.interestLevel === 'Alto');
    if (quickFilter === 'MEDIUM') result = result.filter(l => l.interestLevel === 'Medio');
    if (quickFilter === 'LOW') result = result.filter(l => l.interestLevel === 'Bajo');
    if (quickFilter === 'NO_ANSWER') result = result.filter(l => (l.type === 'LOTE' ? l.statusLote : l.statusDepa) === 'No Contesta');
    if (quickFilter === 'ALERTS') result = result.filter(l => ['overdue', 'today', 'upcoming'].includes(checkAlertStatus(l.nextFollowUpDate || undefined)));
    
    return result.sort((a, b) => {
        if (sortMode === 'DAILY') {
             const todayStr = new Date().toISOString().split('T')[0]; 
             const lastInterA = a.interactions?.[0]?.date || '';
             const lastInterB = b.interactions?.[0]?.date || '';
             const contactedA = lastInterA.startsWith(todayStr) ? 1 : 0;
             const contactedB = lastInterB.startsWith(todayStr) ? 1 : 0;
             if (contactedA !== contactedB) return contactedA - contactedB;
        }
        const sA = checkAlertStatus(a.nextFollowUpDate || undefined);
        const sB = checkAlertStatus(b.nextFollowUpDate || undefined);
        const score = (s: string) => s === 'overdue' ? 4 : s === 'today' ? 3 : s === 'upcoming' ? 2 : s === 'future' ? 1 : 0;
        if (score(sB) !== score(sA)) return score(sB) - score(sA);
        return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
    });
  }, [leads, activeModule, searchTerm, quickFilter, sortMode]);

  const totalLeads = leads.filter(l => l.type === activeModule && (activeModule === 'LOTE' ? l.statusLote : l.statusDepa) !== 'No Interesado').length;
  
  const todayPendingCount = useMemo(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      return leads.filter(l => {
          if (l.type !== activeModule) return false;
          const status = activeModule === 'LOTE' ? l.statusLote : l.statusDepa;
          if (status === 'No Interesado') return false;
          
          const lastInter = l.interactions?.[0]?.date || '';
          const touchedToday = lastInter.startsWith(todayStr);
          const alertStatus = checkAlertStatus(l.nextFollowUpDate || undefined);

          if (l.nextFollowUpDate && alertStatus !== 'today' && alertStatus !== 'overdue') return false;

          if (alertStatus === 'today' || alertStatus === 'overdue') return true;
          if (status === 'No Contesta') return true;
          if (!touchedToday) return true;
          return false;
      }).length;
  }, [leads, activeModule]);

  const alertCount = leads.filter(l => l.type === activeModule && ['overdue', 'today', 'upcoming'].includes(checkAlertStatus(l.nextFollowUpDate || undefined))).length;
  const hotLeads = leads.filter(l => l.type === activeModule && l.interestLevel === 'Alto').length;
  const mediumLeads = leads.filter(l => l.type === activeModule && l.interestLevel === 'Medio').length;
  const lowLeads = leads.filter(l => l.type === activeModule && l.interestLevel === 'Bajo').length;
  const soldLeads = leads.filter(l => l.type === activeModule && (activeModule === 'LOTE' ? l.statusLote : l.statusDepa) === 'Vendido').length;
  const noAnswerCount = leads.filter(l => (l.type === activeModule && (activeModule === 'LOTE' ? l.statusLote : l.statusDepa) === 'No Contesta')).length;
  const lostCount = leads.filter(l => (l.type === activeModule && (activeModule === 'LOTE' ? l.statusLote : l.statusDepa) === 'No Interesado')).length;
  const allActiveCount = leads.filter(l => (l.type === activeModule && (activeModule === 'LOTE' ? l.statusLote : l.statusDepa) !== 'No Interesado')).length;

  const handleOpenNewLead = () => {
    setEditingLead(null);
    setFormData({ type: activeModule, project: activeModule === 'LOTE' ? PROJECT_LOTE : PROJECT_DEPA, statusLote: 'Nuevo', statusDepa: 'Nuevo', interestLevel: 'Medio', interactions: [] });
    setModalMode('EDIT'); setShowLeadModal(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await saveLeadService(formData, activeModule, editingLead ? editingLead.id : null);
        setShowLeadModal(false);
      } catch (err) { alert("Error al guardar cliente"); }
  };

  const handleDeleteLead = async (id: string) => {
      if(confirm("¿Eliminar lead permanentemente?")) { await deleteLeadService(id); setShowLeadModal(false); }
  };

  const handleCompleteReminder = async (lead: Lead) => {
      if (!confirm('¿Marcar recordatorio como completado?')) return;
      await completeTaskService(lead);
  };

  const handleViewLead = (lead: Lead) => {
      setEditingLead(lead); setFormData(lead); setModalMode('VIEW'); setShowLeadModal(true);
  };

  const addInteraction = () => {
      if (!newInteractionNote.trim()) return;
      const note = { id: Date.now().toString(), date: new Date().toISOString(), type: newInteractionType, note: newInteractionNote };
      setFormData({ ...formData, interactions: [note, ...(formData.interactions || [])] });
      setNewInteractionNote('');
  };

  const handleQuickAction = async (lead: Lead, type: 'NO_CONTESTA' | 'WHATSAPP') => {
      const noteText = type === 'NO_CONTESTA' ? 'Intento de llamada: No contestó' : 'Seguimiento rápido por WhatsApp';
      const interactionType = type === 'NO_CONTESTA' ? 'Llamada' : 'WhatsApp';
      const newInteraction = { id: Date.now().toString(), date: new Date().toISOString(), type: interactionType, note: noteText };
      const updateData: any = { updatedAt: new Date(), interactions: [newInteraction, ...(lead.interactions || [])] };
      if (type === 'NO_CONTESTA') {
          if (activeModule === 'LOTE') updateData.statusLote = 'No Contesta';
          else updateData.statusDepa = 'No Contesta';
      }
      await updateDoc(doc(db, 'crm_leads', lead.id), updateData);
  };

  const handleImportInventory = async (textInput: string) => {
      const lines = textInput.split('\n'); const batch = writeBatch(db); let c = 0; let lastGroup = ""; 
      for (let line of lines) {
          const cleanLine = line.replace(/[\r]+/g, ''); if (!cleanLine.trim()) continue; 
          const cols = cleanLine.split('\t').map(x => x.trim()); if (cols.length < 4) continue;
          if (cols[0]) lastGroup = cols[0];
          const lote = cols[1]; if (!lote || lote.toLowerCase().includes('lote')) continue; 
          
          const description = cols[3] || ''; 
          const priceList = parseFloat(cols[4]?.replace(/[^\d.]/g,'')||'0'); 
          const priceCash = parseFloat(cols[5]?.replace(/[^\d.]/g,'')||'0'); 
          const lineUpper = line.toUpperCase();
          const descUpper = description.toUpperCase();
          const explicitStatus = cols[6]?.toUpperCase() || '';
          
          let statusFinal: any = 'DISPONIBLE';
          if (explicitStatus.includes('VENDIDO') || lineUpper.includes('VENDIDO')) statusFinal = 'VENDIDO';
          else if (explicitStatus.includes('SEPARADO') || lineUpper.includes('SEPARADO')) statusFinal = 'SEPARADO';
          else if (explicitStatus.includes('BLOQUEADO') || lineUpper.includes('BLOQUEADO')) statusFinal = 'BLOQUEADO';
          else if (explicitStatus.includes('PROMO') || lineUpper.includes('PROMO')) statusFinal = 'PROMO';
          else {
              if (priceList <= 0 && priceCash <= 0) {
                  if (descUpper.includes('PARQUE') || descUpper.includes('AREA VERDE')) statusFinal = 'PARQUE';
                  else if (descUpper.includes('EDUCACION') || descUpper.includes('EDUCACIÓN')) statusFinal = 'EDUCACION';
                  else if (descUpper.includes('OTROS') || descUpper.includes('EQUIPAMIENTO')) statusFinal = 'OTROS';
              }
          }
          const ref = doc(collection(db, 'crm_inventory'));
          batch.set(ref, {
              type: activeModule, group: lastGroup || 'General', customId: lote, description: description, 
              area: parseFloat(cols[2]?.replace(/[^\d.]/g,'')||'0'), price: priceList, priceCash: priceCash, price2k: 0, price5k: 0, status: statusFinal
          }); c++;
      }
      await batch.commit(); alert(`✅ ${c} importados.`); setShowInventoryModal(false);
  };

  const handleDeleteAllInventory = async () => {
      if(!confirm("⚠️ ¿BORRAR TODO?")) return;
      const snap = await getDocs(query(collection(db, 'crm_inventory')));
      const batch = writeBatch(db); snap.docs.forEach(d => batch.delete(d.ref)); await batch.commit(); alert("Eliminado.");
  };

  const updateDatePart = (v: string) => { const d = new Date(formData.nextFollowUpDate || new Date()); const [y,m,day] = v.split('-').map(Number); d.setFullYear(y,m-1,day); setFormData({...formData, nextFollowUpDate: d.toISOString()}); };
  const updateTimePart = (v: string) => { const d = new Date(formData.nextFollowUpDate || new Date()); const [h,m] = v.split(':').map(Number); d.setHours(h,m); setFormData({...formData, nextFollowUpDate: d.toISOString()}); };
  const getDateValue = () => formData.nextFollowUpDate ? new Date(formData.nextFollowUpDate).toISOString().split('T')[0] : '';
  const formatDateLocal = (s: string) => { try { return new Date(s).toLocaleString(); } catch { return s; } };

  const openWhatsApp = (lead: Lead) => {
    const phone = lead.phone.replace(/\D/g,''); 
    if(!phone) return;
    const product = lead.type === 'DEPA' ? 'los departamentos' : 'los lotes';
    const message = `Hola ${lead.name} , soy Daniel Balarezo de Inmobiliaria Ganesha . 👋\nIntenté llamarte hace un momento para contarte sobre ${product} en los que te registraste...`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="h-screen bg-slate-100 flex flex-col font-sans text-slate-800 overflow-x-hidden">
      
      {/* HEADER + DASHBOARD */}
      <div className="bg-white p-4 shadow-sm z-10 border-b border-gray-100">
         <div className="max-w-7xl mx-auto">
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" className="h-10 w-auto bg-gradient-to-br from-indigo-600 to-purple-600 p-1.5 rounded-lg shadow-md" onError={(e)=>e.currentTarget.style.display='none'}/>
                    <h1 className="font-bold text-xl text-gray-900">Inmobiliaria Ganesha</h1>
                </div>
                <div className="relative w-full max-w-md mx-4 hidden md:block">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                    <input type="text" placeholder="Buscar cliente..." className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowStatsModal(true)} className="bg-white text-indigo-600 border border-indigo-100 px-4 py-2 rounded-lg flex gap-2 items-center text-sm font-bold hover:bg-indigo-50 transition-all shadow-sm">
                        <BarChart3 size={16}/> <span className="hidden sm:inline">Reportes</span>
                    </button>
                    <button onClick={handleOpenNewLead} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex gap-2 items-center text-sm font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all hover:scale-105"><Plus size={16}/> Nuevo Lead</button>
                </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
               <div className="bg-white p-3 rounded-xl border-l-4 border-indigo-500 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                   <div><p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Activos</p><p className="text-2xl font-bold text-gray-800">{totalLeads}</p></div>
                   <div className="bg-indigo-50 p-2 rounded-full"><Users className="text-indigo-600" size={20}/></div>
               </div>
               <div className="bg-white p-3 rounded-xl border-l-4 border-orange-500 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                   <div><p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Oportunidades</p><p className="text-2xl font-bold text-orange-600">{hotLeads}</p></div>
                   <div className="bg-orange-50 p-2 rounded-full"><TrendingUp className="text-orange-600" size={20}/></div>
               </div>
               <div className="bg-white p-3 rounded-xl border-l-4 border-emerald-500 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                   <div><p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Ventas</p><p className="text-2xl font-bold text-emerald-600">{soldLeads}</p></div>
                   <div className="bg-emerald-50 p-2 rounded-full"><CheckCircle2 className="text-emerald-600" size={20}/></div>
               </div>
               <div onClick={() => setShowInventoryModal(true)} className="bg-blue-50 p-3 rounded-xl border-l-4 border-blue-500 shadow-sm flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors">
                   <div><p className="text-blue-600 text-xs font-bold">Ver Stock</p><p className="text-[10px] text-blue-400">Lotes/Depas</p></div>
                   <div className="bg-blue-100 p-2 rounded-full"><Grid size={20} className="text-blue-600"/></div>
               </div>
             </div>
             
             <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                 <div className="flex bg-gray-100 p-1 rounded-lg">
                     <button onClick={()=>setActiveModule('LOTE')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeModule==='LOTE'?'bg-white text-indigo-700 shadow-sm':'text-gray-500'}`}>Lotes</button>
                     <button onClick={()=>setActiveModule('DEPA')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeModule==='DEPA'?'bg-white text-purple-700 shadow-sm':'text-gray-500'}`}>Depas</button>
                 </div>
                 
                 <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto items-center">
                     
                     <button onClick={() => setQuickFilter(quickFilter === 'TODAY_PENDING' ? 'ALL' : 'TODAY_PENDING')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${quickFilter === 'TODAY_PENDING' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`} title="Foco Hoy: Alertas + NC + Vírgenes">
                        <Target size={14}/> Foco Hoy {todayPendingCount > 0 && <span className="bg-indigo-500 text-white text-[9px] px-1.5 rounded-full border border-white">{todayPendingCount}</span>}
                     </button>

                     <div className="h-6 w-px bg-gray-300 mx-1"></div>

                     <button onClick={() => setQuickFilter(quickFilter === 'ALERTS' ? 'ALL' : 'ALERTS')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${quickFilter === 'ALERTS' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        <Bell size={14}/> Agenda {alertCount > 0 && <span className="bg-rose-500 text-white text-[9px] px-1.5 rounded-full animate-pulse">{alertCount}</span>}
                     </button>

                     <button onClick={() => setQuickFilter(quickFilter === 'NO_ANSWER' ? 'ALL' : 'NO_ANSWER')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${quickFilter === 'NO_ANSWER' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-rose-500 border-rose-100 hover:bg-rose-50'}`}>
                        <PhoneMissed size={14}/> No Contesta {noAnswerCount > 0 && <span className="bg-rose-600 text-white text-[9px] px-1.5 rounded-full">{noAnswerCount}</span>}
                     </button>

                     <button onClick={() => setQuickFilter('ALL')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${quickFilter === 'ALL' ? 'bg-gray-800 text-white' : 'bg-white text-gray-500'}`}>
                        Todos {allActiveCount}
                     </button>

                     <button onClick={() => setQuickFilter('HOT')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${quickFilter === 'HOT' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-500 hover:text-emerald-600'}`}>
                        <ThermometerSun size={14}/> Alto {hotLeads > 0 && <span className="bg-emerald-600 text-white text-[9px] px-1.5 rounded-full">{hotLeads}</span>}
                     </button>

                     <button onClick={() => setQuickFilter('MEDIUM')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${quickFilter === 'MEDIUM' ? 'bg-amber-400 text-white border-amber-400' : 'bg-white text-gray-500 hover:text-amber-500'}`}>
                        <Thermometer size={14}/> Medio {mediumLeads > 0 && <span className="bg-amber-500 text-white text-[9px] px-1.5 rounded-full">{mediumLeads}</span>}
                     </button>

                     <button onClick={() => setQuickFilter('LOW')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${quickFilter === 'LOW' ? 'bg-blue-400 text-white border-blue-400' : 'bg-white text-gray-500 hover:text-blue-500'}`}>
                        <Snowflake size={14}/> Bajo {lowLeads > 0 && <span className="bg-blue-500 text-white text-[9px] px-1.5 rounded-full">{lowLeads}</span>}
                     </button>

                     <div className="h-6 w-px bg-gray-300 mx-1"></div>

                     <button onClick={() => setQuickFilter(quickFilter === 'LOST' ? 'ALL' : 'LOST')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1 transition-all ${quickFilter === 'LOST' ? 'bg-slate-600 text-white' : 'bg-white text-slate-400 hover:bg-slate-100'}`} title="Ver descartados">
                        <Ban size={14}/> {lostCount}
                     </button>
                     
                     <div className="h-6 w-px bg-gray-300 mx-1"></div>
                     <button onClick={() => setSortMode(sortMode === 'PRIORITY' ? 'DAILY' : 'PRIORITY')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${sortMode === 'DAILY' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`} title={sortMode === 'PRIORITY' ? 'Modo Agenda: Muestra pendientes por hora' : 'Modo Barrido: Oculta los ya contactados hoy'}>
                        <ArrowUpDown size={14}/> {sortMode === 'PRIORITY' ? 'Agenda' : 'Barrido'}
                     </button>

                     <div className="flex bg-gray-100 rounded-lg p-1 ml-2 shrink-0">
                        <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><List size={16}/></button>
                        <button onClick={() => setViewMode('BOARD')} className={`p-1.5 rounded-md transition-all ${viewMode === 'BOARD' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={16}/></button>
                     </div>
                 </div>
             </div>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 md:p-6">
         <div className="max-w-7xl mx-auto">
             {viewMode === 'BOARD' ? (
                 <div className="flex gap-6 h-full pb-4 overflow-x-auto">
                    {(activeModule === 'LOTE' ? STAGES_LOTE : STAGES_DEPA).filter(s => quickFilter === 'LOST' ? s === 'No Interesado' : s !== 'No Interesado').map(stage => (
                        <div key={stage} className="flex-none w-80 flex flex-col h-full max-h-[calc(100vh-280px)]">
                            <div className="flex justify-between items-center mb-3 px-3 pt-3">
                                <span className="font-bold text-sm text-gray-600 uppercase tracking-wider">{stage}</span>
                                <span className="bg-white text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full border">{filteredLeads.filter(l => (activeModule === 'LOTE' ? l.statusLote : l.statusDepa) === stage).length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3 px-2 pb-2">
                                {filteredLeads.filter(l => (activeModule === 'LOTE' ? l.statusLote : l.statusDepa) === stage).map(lead => {
                                    const alertStatus = checkAlertStatus(lead.nextFollowUpDate);
                                    const lastInteraction = lead.interactions?.[0]; 
                                    return (
                                        <div key={lead.id} onClick={() => { setEditingLead(lead); setFormData(lead); setModalMode('VIEW'); setShowLeadModal(true); }} className={`bg-white p-3 rounded-xl shadow-sm border border-transparent hover:border-indigo-200 cursor-pointer group ${alertStatus === 'today' ? 'ring-2 ring-rose-400' : ''} relative`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-gray-800 text-sm truncate pr-2">{lead.name}</h4>
                                                <div className={`w-2.5 h-2.5 rounded-full ${getInterestColor(lead.interestLevel)}`}></div>
                                            </div>
                                            <div className="text-xs text-gray-400 mb-2 flex items-center gap-1"><Phone size={12}/> {lead.phone}</div>
                                            {lead.nextFollowUpDate && (
                                                <div className={`text-[10px] flex items-center gap-1 font-bold mb-1 ${alertStatus === 'overdue' ? 'text-red-600' : alertStatus === 'today' ? 'text-orange-600' : 'text-blue-600'}`}>
                                                    <button onClick={(e) => { e.stopPropagation(); handleCompleteReminder(lead); }} className="p-0.5 bg-white rounded-full border border-current hover:scale-110 transition-transform"><Check size={10}/></button>
                                                    <AlarmClock size={12}/> {formatDateShort(lead.nextFollowUpDate)}
                                                </div>
                                            )}
                                            {lastInteraction && <div className="text-[10px] text-gray-400 italic border-t pt-1 mt-1 truncate">"{lastInteraction.note}"</div>}
                                            
                                            <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                                                <button onClick={(e) => { e.stopPropagation(); handleQuickAction(lead, 'NO_CONTESTA'); }} className="flex-1 bg-rose-50 text-rose-600 text-[10px] font-bold py-1 rounded hover:bg-rose-100 flex items-center justify-center gap-1" title="Marcar No Contesta">
                                                    <PhoneMissed size={12}/> NC
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); openWhatsApp(lead); handleQuickAction(lead, 'WHATSAPP'); }} className="flex-1 bg-green-50 text-green-600 text-[10px] font-bold py-1 rounded hover:bg-green-100 flex items-center justify-center gap-1" title="Abrir WSP y registrar">
                                                    <MessageCircle size={12}/> WSP
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                 </div>
             ) : (
                 /* MODO LISTA */
                 <div className="space-y-2">
                     {filteredLeads.map(lead => {
                         const alertStatus = checkAlertStatus(lead.nextFollowUpDate);
                         const lastInteraction = lead.interactions?.[0]; 
                         return (
                             <div key={lead.id} className={`bg-white p-3 rounded-lg shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-300 transition-all ${alertStatus === 'today' ? 'ring-2 ring-rose-400' : ''}`} onClick={() => handleViewLead(lead)}>
                                 
                                 <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                                     
                                     <div className="flex items-center gap-3 flex-1 min-w-0">
                                         <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${getInterestColor(lead.interestLevel).replace('ring-4', 'bg-gradient-to-br')}`}>
                                             {lead.name.charAt(0)}
                                         </div>
                                         <div className="min-w-0 flex-1">
                                             <h4 className="font-bold text-gray-900 text-sm truncate">{lead.name}</h4>
                                             <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2 mt-0.5">
                                                 <span className="flex items-center gap-1">
                                                     <Phone size={10}/> {lead.phone}
                                                 </span>
                                                 <span className="text-gray-300">•</span>
                                                 <span className="text-indigo-600 font-bold">{activeModule==='LOTE'?lead.statusLote:lead.statusDepa}</span>
                                             </div>
                                         </div>
                                     </div>

                                     <div className="hidden lg:flex items-center gap-2 flex-1 min-w-0 px-4 border-l border-gray-100">
                                         {lead.nextFollowUpDate ? (
                                             <div className={`flex items-center gap-2 text-xs font-bold ${alertStatus === 'overdue' ? 'text-red-600' : alertStatus === 'today' ? 'text-orange-600' : 'text-blue-600'}`}>
                                                 <button onClick={(e) => { e.stopPropagation(); handleCompleteReminder(lead); }} className="shrink-0 p-0.5 bg-white rounded-full border border-current hover:scale-110 transition-transform"><Check size={10}/></button>
                                                 <AlarmClock size={14} className="shrink-0"/> 
                                                 <span className="truncate">{formatDateShort(lead.nextFollowUpDate)}: {lead.nextFollowUpNote}</span>
                                             </div>
                                         ) : (
                                             lastInteraction && <div className="text-xs text-gray-400 italic truncate">"{lastInteraction.note}"</div>
                                         )}
                                     </div>
                                     
                                     <div className="flex items-center gap-2 shrink-0 justify-end">
                                         <button onClick={(e) => { e.stopPropagation(); handleQuickAction(lead, 'NO_CONTESTA'); }} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors border border-rose-100" title="Marcar No Contesta">
                                             <PhoneMissed size={16}/>
                                         </button>
                                         <button onClick={(e) => { e.stopPropagation(); openWhatsApp(lead); handleQuickAction(lead, 'WHATSAPP'); }} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors border border-green-100" title="WhatsApp">
                                             <MessageCircle size={16}/>
                                         </button>
                                         <button onClick={(e) => { e.stopPropagation(); setProformaLead(lead); setShowProformaModal(true); }} className="hidden sm:block p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Proforma">
                                             <FileText size={16}/>
                                         </button>
                                     </div>
                                 </div>

                                 <div className="lg:hidden mt-2 pt-2 border-t border-gray-100">
                                     {lead.nextFollowUpDate ? (
                                         <div className={`flex items-center gap-2 text-xs font-bold ${alertStatus === 'overdue' ? 'text-red-600' : alertStatus === 'today' ? 'text-orange-600' : 'text-blue-600'}`}>
                                             <button onClick={(e) => { e.stopPropagation(); handleCompleteReminder(lead); }} className="shrink-0 p-0.5 bg-white rounded-full border border-current hover:scale-110 transition-transform"><Check size={10}/></button>
                                             <AlarmClock size={12}/> 
                                             <span className="truncate">{formatDateShort(lead.nextFollowUpDate)}: {lead.nextFollowUpNote}</span>
                                         </div>
                                     ) : (
                                         lastInteraction && <div className="text-xs text-gray-400 italic truncate">"{lastInteraction.note}"</div>
                                     )}
                                 </div>
                             </div>
                         )
                     })}
                 </div>
             )}
         </div>
      </div>

      <InventoryModal 
        isOpen={showInventoryModal} onClose={() => setShowInventoryModal(false)} activeModule={activeModule} inventory={inventory} 
        onImport={handleImportInventory} onDeleteAll={handleDeleteAllInventory} 
        onDeleteUnit={async (id: string) => await deleteDoc(doc(db, 'crm_inventory', id))}
        onToggleStatus={async (u: Unit, manualStatus?: string) => {
            if (manualStatus) {
                await updateDoc(doc(db, 'crm_inventory', u.id), { status: manualStatus });
                return;
            }
            const nextStatus = u.status === 'DISPONIBLE' ? 'SEPARADO' : u.status === 'SEPARADO' ? 'VENDIDO' : u.status === 'VENDIDO' ? 'BLOQUEADO' : u.status === 'BLOQUEADO' ? 'PROMO' : u.status === 'PROMO' ? 'PARQUE' : u.status === 'PARQUE' ? 'EDUCACION' : u.status === 'EDUCACION' ? 'OTROS' : 'DISPONIBLE';
            await updateDoc(doc(db, 'crm_inventory', u.id), { status: nextStatus });
        }}
      />

      <LeadModal
        isOpen={showLeadModal} onClose={() => setShowLeadModal(false)} mode={modalMode} setMode={setModalMode}
        formData={formData} setFormData={setFormData} onSave={handleSaveLead} onDelete={handleDeleteLead}
        activeModule={activeModule} activeTab={activeTab} setActiveTab={setActiveTab}
        onOpenUnitSelector={() => { setShowLeadModal(false); setShowInventoryModal(true); }}
        newInteractionNote={newInteractionNote} setNewInteractionNote={setNewInteractionNote}
        newInteractionType={newInteractionType} setNewInteractionType={setNewInteractionType}
        onAddInteraction={addInteraction} tempTimeString={tempTimeString} setTempTimeString={setTempTimeString}
        updateDatePart={updateDatePart} updateTimePart={updateTimePart} getDateValue={getDateValue} formatDate={formatDateLocal}
        onOpenWhatsApp={() => openWhatsApp(formData as Lead)}
        onOpenProforma={() => { if(!editingLead) return alert("Guarda primero"); setProformaLead(editingLead); setShowProformaModal(true); }}
      />

      <ProformaModal 
        isOpen={showProformaModal} onClose={() => setShowProformaModal(false)} lead={proformaLead!}
        config={proformaConfig} setConfig={setProformaConfig} activeModule={activeModule} inventory={inventory}
        onSave={async () => { if(proformaLead) await updateDoc(doc(db, 'crm_leads', proformaLead.id), { savedProforma: { ...proformaConfig, generatedAt: new Date().toISOString(), finalPrice: 0, totalDiscount: 0 } }); alert("Guardado"); }}
        onGeneratePDF={() => { /* PDF Logic */ }}
      />

      <StatsModal 
        isOpen={showStatsModal} 
        onClose={() => setShowStatsModal(false)} 
        leads={leads} 
      />
    </div>
  );
}