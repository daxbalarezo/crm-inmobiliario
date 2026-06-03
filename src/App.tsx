import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, TrendingUp, CheckCircle2, Grid, Map, Home, Search, List, LayoutGrid, Plus, 
  Bell, PhoneMissed, Ban, AlarmClock, Calculator, Edit3, Trash2, User, Phone, Save, 
  FileText, Check, MessageCircle, Thermometer, ThermometerSun, Snowflake, ArrowUpDown,
  PhoneOutgoing, Send, Target, BarChart3, Calendar
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
import CalendarModal from './components/modals/CalendarModal';
import ReminderAlert from './components/ReminderAlert';

const PROJECT_VP1 = "Valle Pacora 1";
const PROJECT_VP2 = "Valle Pacora 2";
const STAGES = ['Nuevo', 'No Contactado', 'En Negociación', 'Venta', 'No Interesado'];

export default function RealEstateCRM() {
  const [activeModule, setActiveModule] = useState<'VP1' | 'VP2'>('VP1');
  const [viewMode, setViewMode] = useState<'LIST' | 'BOARD'>('BOARD');
  const [sortMode, setSortMode] = useState<'PRIORITY' | 'DAILY'>('PRIORITY');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [inventory, setInventory] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState('ALL');
  
  // Nuevo speech enfocado en urgencia, plusvalía y lote agrícola
  const [campaignMessage, setCampaignMessage] = useState('Hola {nombre}, soy Daniel de Valle Pacora 🌾.\n\nTe escribo rapidito porque nos quedan pocos días con los precios de introducción en preventa. 🚨 Es el momento exacto para asegurar tu plusvalía.\n\n¿Te gustaría que te envíe las ubicaciones disponibles antes de que suban?');

  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showProformaModal, setShowProformaModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  
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

  const [activeAlertLead, setActiveAlertLead] = useState<Lead | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

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

  useEffect(() => {
      const checkAlerts = () => {
          const now = new Date();
          const pendingAlerts = leads.filter(lead => {
              if (!lead.nextFollowUpDate) return false;

              const alertKey = `${lead.id}-${lead.nextFollowUpDate}`;
              if (dismissedAlerts.has(alertKey)) return false;

              const alertTime = new Date(lead.nextFollowUpDate);
              const isToday = alertTime.toDateString() === now.toDateString();
              const isDue = alertTime.getTime() <= now.getTime();

              return isToday && isDue;
          });

          if (pendingAlerts.length > 0) {
              pendingAlerts.sort((a, b) => new Date(a.nextFollowUpDate!).getTime() - new Date(b.nextFollowUpDate!).getTime());
              setActiveAlertLead(pendingAlerts[0]);
          } else {
              setActiveAlertLead(null);
          }
      };

      checkAlerts(); 
      const interval = setInterval(checkAlerts, 10000); 
      return () => clearInterval(interval);
  }, [leads, dismissedAlerts]);

  const filteredLeads = useMemo(() => {
    let result = leads.filter(l => l.type === activeModule);
    
    if (quickFilter === 'LOST') {
        result = result.filter(l => {
            const s = activeModule === 'VP1' ? l.statusVP1 : l.statusVP2;
            return s === 'No Interesado';
        });
    } else if (quickFilter === 'CAMPANA') {
        result = result.filter(l => {
            const s = activeModule === 'VP1' ? l.statusVP1 : l.statusVP2;
            return s === 'En Negociación' || s === 'Incubadora';
        });
    } else {
        result = result.filter(l => {
            const s = activeModule === 'VP1' ? l.statusVP1 : l.statusVP2;
            return s !== 'No Interesado' && s !== 'En Negociación' && s !== 'Incubadora';
        });

        if (quickFilter === 'TODAY_PENDING') {
            const todayStr = new Date().toISOString().split('T')[0];
            result = result.filter(l => {
                const status = activeModule === 'VP1' ? l.statusVP1 : l.statusVP2;
                const lastInter = l.interactions?.[0]?.date || '';
                const touchedToday = lastInter.startsWith(todayStr);
                const alertStatus = checkAlertStatus(l.nextFollowUpDate || undefined);

                if (l.nextFollowUpDate && alertStatus !== 'today' && alertStatus !== 'overdue') return false;
                if (alertStatus === 'today' || alertStatus === 'overdue') return true;
                if (status === 'No Contactado') return true;
                if (!touchedToday) return true;
                return false;
            });
        }
        
        if (quickFilter === 'HOT') result = result.filter(l => l.interestLevel === 'Alto');
        if (quickFilter === 'MEDIUM') result = result.filter(l => l.interestLevel === 'Medio');
        if (quickFilter === 'LOW') result = result.filter(l => l.interestLevel === 'Bajo');
        if (quickFilter === 'NO_ANSWER') result = result.filter(l => (activeModule === 'VP1' ? l.statusVP1 : l.statusVP2) === 'No Contactado');
        if (quickFilter === 'ALERTS') result = result.filter(l => ['overdue', 'today', 'upcoming'].includes(checkAlertStatus(l.nextFollowUpDate || undefined)));
    }

    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(l => (l.name && l.name.toLowerCase().includes(lower)) || ((l.phone || '').includes(lower)));
    }

    return result.sort((a, b) => {
        const sA = checkAlertStatus(a.nextFollowUpDate || undefined);
        const sB = checkAlertStatus(b.nextFollowUpDate || undefined);

        if (sortMode === 'DAILY') {
             const todayStr = new Date().toISOString().split('T')[0]; 
             const contactedA = (a.interactions?.[0]?.date || '').startsWith(todayStr) ? 1 : 0;
             const contactedB = (b.interactions?.[0]?.date || '').startsWith(todayStr) ? 1 : 0;
             if (contactedA !== contactedB) return contactedA - contactedB;

             const getSweepScore = (lead: Lead, alertStatus: string) => {
                 if (alertStatus === 'overdue') return 1000;
                 if (alertStatus === 'today') return 900;
                 if (alertStatus === 'upcoming') return 800;
                 const stage = activeModule === 'VP1' ? lead.statusVP1 : lead.statusVP2;
                 if (stage === 'Nuevo') return 500;
                 if (stage === 'No Contactado') return 300;
                 return 0;
             };

             const scoreA = getSweepScore(a, sA);
             const scoreB = getSweepScore(b, sB);
             if (scoreA !== scoreB) return scoreB - scoreA;
        } else {
            const score = (s: string) => s === 'overdue' ? 4 : s === 'today' ? 3 : s === 'upcoming' ? 2 : s === 'future' ? 1 : 0;
            if (score(sB) !== score(sA)) return score(sB) - score(sA);
        }

        return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
    });
  }, [leads, activeModule, searchTerm, quickFilter, sortMode]);

  const mainPipelineLeads = useMemo(() => leads.filter(l => {
      const s = activeModule === 'VP1' ? l.statusVP1 : l.statusVP2;
      return l.type === activeModule && s !== 'No Interesado' && s !== 'En Negociación' && s !== 'Incubadora';
  }), [leads, activeModule]);

  const totalLeads = mainPipelineLeads.length;
  const allActiveCount = mainPipelineLeads.length;
  
  const todayPendingCount = useMemo(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      return mainPipelineLeads.filter(l => {
          const status = activeModule === 'VP1' ? l.statusVP1 : l.statusVP2;
          const lastInter = l.interactions?.[0]?.date || '';
          const touchedToday = lastInter.startsWith(todayStr);
          const alertStatus = checkAlertStatus(l.nextFollowUpDate || undefined);

          if (l.nextFollowUpDate && alertStatus !== 'today' && alertStatus !== 'overdue') return false;
          if (alertStatus === 'today' || alertStatus === 'overdue') return true;
          if (status === 'No Contactado') return true;
          if (!touchedToday) return true;
          return false;
      }).length;
  }, [mainPipelineLeads, activeModule]);

  const alertCount = mainPipelineLeads.filter(l => ['overdue', 'today', 'upcoming'].includes(checkAlertStatus(l.nextFollowUpDate || undefined))).length;
  const hotLeads = mainPipelineLeads.filter(l => l.interestLevel === 'Alto').length;
  const mediumLeads = mainPipelineLeads.filter(l => l.interestLevel === 'Medio').length;
  const lowLeads = mainPipelineLeads.filter(l => l.interestLevel === 'Bajo').length;
  const noAnswerCount = mainPipelineLeads.filter(l => (activeModule === 'VP1' ? l.statusVP1 : l.statusVP2) === 'No Contactado').length;
  
  const soldLeads = leads.filter(l => l.type === activeModule && (activeModule === 'VP1' ? l.statusVP1 : l.statusVP2) === 'Venta').length;
  const campanaCount = leads.filter(l => { const s = activeModule === 'VP1' ? l.statusVP1 : l.statusVP2; return l.type === activeModule && (s === 'En Negociación' || s === 'Incubadora'); }).length;
  const lostCount = leads.filter(l => (l.type === activeModule && (activeModule === 'VP1' ? l.statusVP1 : l.statusVP2) === 'No Interesado')).length;

  const handleOpenNewLead = () => {
    setEditingLead(null);
    setFormData({ type: activeModule, project: activeModule === 'VP1' ? PROJECT_VP1 : PROJECT_VP2, statusVP1: 'Nuevo', statusVP2: 'Nuevo', interestLevel: 'Medio', interactions: [] });
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

  const handleDismissAlert = () => {
      if (activeAlertLead) {
          const alertKey = `${activeAlertLead.id}-${activeAlertLead.nextFollowUpDate}`;
          setDismissedAlerts(prev => new Set(prev).add(alertKey));
          setActiveAlertLead(null);
      }
  };

  const handleAttendAlert = () => {
      if (activeAlertLead) {
          const alertKey = `${activeAlertLead.id}-${activeAlertLead.nextFollowUpDate}`;
          setDismissedAlerts(prev => new Set(prev).add(alertKey));
          handleViewLead(activeAlertLead); 
          setActiveAlertLead(null);
      }
  };

  const addInteraction = () => {
      if (!newInteractionNote.trim()) return;
      const note = { id: Date.now().toString(), date: new Date().toISOString(), type: newInteractionType, note: newInteractionNote };
      setFormData({ ...formData, interactions: [note, ...(formData.interactions || [])] });
      setNewInteractionNote('');
  };

  const handleQuickAction = async (lead: Lead, type: 'NO_CONTESTA' | 'WHATSAPP' | 'CAMPANA_WSP') => {
      let noteText = ''; let interactionType = 'Llamada';
      if (type === 'NO_CONTESTA') noteText = 'Intento de llamada: No contactado';
      else if (type === 'WHATSAPP') { noteText = 'Seguimiento rápido por WhatsApp'; interactionType = 'WhatsApp'; }
      else if (type === 'CAMPANA_WSP') { noteText = 'Mensaje de Campaña masiva enviado'; interactionType = 'Campaña'; }

      const newInteraction = { id: Date.now().toString(), date: new Date().toISOString(), type: interactionType, note: noteText };
      const updateData: any = { updatedAt: new Date(), interactions: [newInteraction, ...(lead.interactions || [])] };
      
      if (type === 'NO_CONTESTA') {
          if (activeModule === 'VP1') updateData.statusVP1 = 'No Contactado';
          else updateData.statusVP2 = 'No Contactado';
      }
      if (type === 'CAMPANA_WSP') updateData.lastCampaignDate = new Date().toISOString();

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
    const phone = (lead.phone || '').replace(/\D/g,''); 
    if(!phone) return;
    const project = lead.type === 'VP1' ? 'Valle Pacora 1' : 'Valle Pacora 2';
    const message = `Hola ${lead.name || 'amigo'}, soy Daniel Balarezo de ${project}. 👋\nIntenté llamarte hace un momento para contarte sobre los lotes agrícolas en los que te registraste. ¡La preventa está volando y quiero asegurar la mejor ubicación para ti!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const openCampaignWhatsApp = (lead: Lead) => {
    const phone = (lead.phone || '').replace(/\D/g,''); 
    if(!phone) return;
    const personalizedMessage = campaignMessage.replace(/{nombre}/g, lead.name || '');
    window.open(`https://wa.me/51${phone}?text=${encodeURIComponent(personalizedMessage)}`, '_blank');
  };

  return (
    <div className="h-screen bg-slate-100 flex flex-col font-sans text-slate-800 overflow-x-hidden">
      
      {/* HEADER + DASHBOARD con colores del Sistema de Diseño */}
      <div className="bg-white p-4 shadow-sm z-10 border-b border-gray-100">
         <div className="w-full px-4 lg:px-8">
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <img src="/logo.png" className="h-10 w-auto bg-[#0B2B40] p-1.5 rounded-lg shadow-md" onError={(e)=>e.currentTarget.style.display='none'}/>
                    <h1 className="font-bold text-xl text-[#0B2B40]">Valle Pacora</h1>
                </div>
                <div className="relative w-full max-w-xl mx-4 hidden md:block">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                    <input type="text" placeholder="Buscar cliente..." className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#4DB6AC] focus:bg-white transition-all outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowCalendarModal(true)} className="bg-white text-[#0B2B40] border border-[#0B2B40]/20 px-4 py-2 rounded-lg flex gap-2 items-center text-sm font-bold hover:bg-[#0B2B40]/5 transition-all shadow-sm">
                        <Calendar size={16}/> <span className="hidden md:inline">Calendario</span>
                    </button>
                    <button onClick={() => setShowStatsModal(true)} className="bg-white text-[#0B2B40] border border-[#0B2B40]/20 px-4 py-2 rounded-lg flex gap-2 items-center text-sm font-bold hover:bg-[#0B2B40]/5 transition-all shadow-sm">
                        <BarChart3 size={16}/> <span className="hidden sm:inline">Reportes</span>
                    </button>
                    <button onClick={handleOpenNewLead} className="bg-[#0B2B40] text-white px-4 py-2 rounded-lg flex gap-2 items-center text-sm font-bold hover:bg-[#082030] shadow-md shadow-[#0B2B40]/30 transition-all hover:scale-105"><Plus size={16}/> Nuevo Lead</button>
                </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
               <div className="bg-white p-3 rounded-xl border-l-4 border-[#0B2B40] shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                   <div><p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Activos</p><p className="text-2xl font-bold text-[#0B2B40]">{totalLeads}</p></div>
                   <div className="bg-[#0B2B40]/10 p-2 rounded-full"><Users className="text-[#0B2B40]" size={20}/></div>
               </div>
               <div className="bg-white p-3 rounded-xl border-l-4 border-[#F2A900] shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                   <div><p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Oportunidades</p><p className="text-2xl font-bold text-[#F2A900]">{hotLeads}</p></div>
                   <div className="bg-[#F2A900]/10 p-2 rounded-full"><TrendingUp className="text-[#F2A900]" size={20}/></div>
               </div>
               <div className="bg-white p-3 rounded-xl border-l-4 border-[#4DB6AC] shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                   <div><p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Ventas</p><p className="text-2xl font-bold text-[#4DB6AC]">{soldLeads}</p></div>
                   <div className="bg-[#4DB6AC]/10 p-2 rounded-full"><CheckCircle2 className="text-[#4DB6AC]" size={20}/></div>
               </div>
               <div onClick={() => setShowInventoryModal(true)} className="bg-blue-50 p-3 rounded-xl border-l-4 border-blue-500 shadow-sm flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors">
                   <div><p className="text-blue-600 text-xs font-bold">Ver Stock</p><p className="text-[10px] text-blue-400">Lotes Agrícolas</p></div>
                   <div className="bg-blue-100 p-2 rounded-full"><Grid size={20} className="text-blue-600"/></div>
               </div>
             </div>
             
             <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                 <div className="flex bg-gray-100 p-1 rounded-lg">
                     <button onClick={()=>setActiveModule('VP1')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeModule==='VP1'?'bg-white text-[#0B2B40] shadow-sm':'text-gray-500'}`}>Valle Pacora 1</button>
                     <button onClick={()=>setActiveModule('VP2')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeModule==='VP2'?'bg-white text-[#0B2B40] shadow-sm':'text-gray-500'}`}>Valle Pacora 2</button>
                 </div>
                 
                 <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto items-center">
                     <button onClick={() => setQuickFilter(quickFilter === 'TODAY_PENDING' ? 'ALL' : 'TODAY_PENDING')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${quickFilter === 'TODAY_PENDING' ? 'bg-[#0B2B40] text-white border-[#0B2B40]' : 'bg-white text-[#0B2B40] border-[#0B2B40]/20 hover:bg-[#0B2B40]/5'}`}>
                        <Target size={14}/> Foco Hoy {todayPendingCount > 0 && <span className="bg-[#4DB6AC] text-white text-[9px] px-1.5 rounded-full border border-white">{todayPendingCount}</span>}
                     </button>
                     <div className="h-6 w-px bg-gray-300 mx-1"></div>
                     <button onClick={() => setQuickFilter(quickFilter === 'ALERTS' ? 'ALL' : 'ALERTS')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${quickFilter === 'ALERTS' ? 'bg-[#0B2B40] text-white border-[#0B2B40]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                        <Bell size={14}/> Agenda {alertCount > 0 && <span className="bg-rose-500 text-white text-[9px] px-1.5 rounded-full animate-pulse">{alertCount}</span>}
                     </button>
                     <button onClick={() => setQuickFilter(quickFilter === 'NO_ANSWER' ? 'ALL' : 'NO_ANSWER')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${quickFilter === 'NO_ANSWER' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-rose-500 border-rose-100 hover:bg-rose-50'}`}>
                        <PhoneMissed size={14}/> No Contactado {noAnswerCount > 0 && <span className="bg-rose-600 text-white text-[9px] px-1.5 rounded-full">{noAnswerCount}</span>}
                     </button>
                     <button onClick={() => setQuickFilter(quickFilter === 'CAMPANA' ? 'ALL' : 'CAMPANA')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${quickFilter === 'CAMPANA' ? 'bg-[#4DB6AC] text-white border-[#4DB6AC]' : 'bg-white text-[#4DB6AC] border-[#4DB6AC]/20 hover:bg-[#4DB6AC]/10'}`}>
                        <Send size={14}/> Campaña {campanaCount > 0 && <span className="bg-[#0B2B40] text-white text-[9px] px-1.5 rounded-full">{campanaCount}</span>}
                     </button>
                     <button onClick={() => setQuickFilter('ALL')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${quickFilter === 'ALL' ? 'bg-[#0B2B40] text-white' : 'bg-white text-gray-500'}`}>Todos {allActiveCount}</button>
                     <button onClick={() => setQuickFilter('HOT')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${quickFilter === 'HOT' ? 'bg-[#F2A900] text-white border-[#F2A900]' : 'bg-white text-gray-500 hover:text-[#F2A900]'}`}><ThermometerSun size={14}/> Alto {hotLeads > 0 && <span className="bg-[#F2A900] text-white text-[9px] px-1.5 rounded-full">{hotLeads}</span>}</button>
                     <button onClick={() => setQuickFilter('MEDIUM')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${quickFilter === 'MEDIUM' ? 'bg-[#4DB6AC] text-white border-[#4DB6AC]' : 'bg-white text-gray-500 hover:text-[#4DB6AC]'}`}><Thermometer size={14}/> Medio {mediumLeads > 0 && <span className="bg-[#4DB6AC] text-white text-[9px] px-1.5 rounded-full">{mediumLeads}</span>}</button>
                     <button onClick={() => setQuickFilter('LOW')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${quickFilter === 'LOW' ? 'bg-blue-400 text-white border-blue-400' : 'bg-white text-gray-500 hover:text-blue-500'}`}><Snowflake size={14}/> Bajo {lowLeads > 0 && <span className="bg-blue-500 text-white text-[9px] px-1.5 rounded-full">{lowLeads}</span>}</button>
                     <div className="h-6 w-px bg-gray-300 mx-1"></div>
                     <button onClick={() => setQuickFilter(quickFilter === 'LOST' ? 'ALL' : 'LOST')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1 transition-all ${quickFilter === 'LOST' ? 'bg-slate-600 text-white' : 'bg-white text-slate-400 hover:bg-slate-100'}`}><Ban size={14}/> {lostCount}</button>
                     <div className="h-6 w-px bg-gray-300 mx-1"></div>
                     <button onClick={() => setSortMode(sortMode === 'PRIORITY' ? 'DAILY' : 'PRIORITY')} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${sortMode === 'DAILY' ? 'bg-[#0B2B40] text-white border-[#0B2B40]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}><ArrowUpDown size={14}/> {sortMode === 'PRIORITY' ? 'Agenda' : 'Barrido'}</button>

                     <div className="flex bg-gray-100 rounded-lg p-1 ml-2 shrink-0">
                        <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white text-[#0B2B40] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><List size={16}/></button>
                        <button onClick={() => setViewMode('BOARD')} className={`p-1.5 rounded-md transition-all ${viewMode === 'BOARD' ? 'bg-white text-[#0B2B40] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid size={16}/></button>
                     </div>
                 </div>
             </div>

             {quickFilter === 'CAMPANA' && (
                 <div className="bg-[#4DB6AC]/10 p-4 rounded-xl border border-[#4DB6AC]/30 mb-4 shadow-inner mt-2">
                     <label className="flex items-center gap-2 text-sm font-bold text-[#0B2B40] mb-2">
                         📝 Plantilla de Mensaje (Usa <span className="bg-[#4DB6AC]/20 px-1 rounded text-[#0B2B40]">{`{nombre}`}</span> para personalizar)
                     </label>
                     <textarea
                         className="w-full text-sm p-3 rounded-lg border border-[#4DB6AC]/30 focus:ring-2 focus:ring-[#4DB6AC] outline-none text-gray-700"
                         rows={3}
                         value={campaignMessage}
                         onChange={(e) => setCampaignMessage(e.target.value)}
                     />
                 </div>
             )}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
         <div className="w-full">
             {viewMode === 'BOARD' ? (
                 <div className="flex gap-6 h-full pb-4 overflow-x-auto items-start">
                    {STAGES.filter(s => quickFilter === 'LOST' ? s === 'No Interesado' : s !== 'No Interesado').map(stage => (
                        <div key={stage} className="flex-none w-80 lg:w-96 bg-gray-50/70 rounded-2xl p-4 flex flex-col border border-gray-200/50 max-h-[calc(100vh-280px)]">
                            <div className="flex justify-between items-center mb-4 px-2">
                                <span className="font-black text-xs text-gray-600 uppercase tracking-widest">{stage}</span>
                                <span className="bg-white text-[#0B2B40] text-xs font-bold px-3 py-1 rounded-full border border-[#0B2B40]/20">
                                    {filteredLeads.filter(l => {
                                        const s = activeModule === 'VP1' ? l.statusVP1 : l.statusVP2;
                                        return s === stage || (stage === 'En Negociación' && s === 'Incubadora');
                                    }).length}
                                </span>
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-2">
                                {filteredLeads.filter(l => {
                                    const s = activeModule === 'VP1' ? l.statusVP1 : l.statusVP2;
                                    return s === stage || (stage === 'En Negociación' && s === 'Incubadora');
                                }).map(lead => {
                                    const alertStatus = checkAlertStatus(lead.nextFollowUpDate);
                                    const lastInteraction = lead.interactions?.[0]; 
                                    const currentStage = activeModule === 'VP1' ? lead.statusVP1 : lead.statusVP2;
                                    return (
                                        <div key={lead.id} onClick={() => { setEditingLead(lead); setFormData(lead); setModalMode('VIEW'); setShowLeadModal(true); }} className={`bg-white p-4 rounded-2xl shadow-sm border-2 border-transparent hover:border-[#4DB6AC]/40 cursor-pointer transition-all group ${alertStatus === 'today' ? 'border-[#F2A900] shadow-[#F2A900]/20' : ''}`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <h4 className="font-bold text-[#0B2B40] text-sm truncate pr-2">{lead.name || 'Sin nombre'}</h4>
                                                <div className={`w-3 h-3 rounded-full shrink-0 ${getInterestColor(lead.interestLevel)}`}></div>
                                            </div>
                                            <div className="text-xs text-gray-500 mb-3 flex items-center gap-2"><Phone size={14} className="text-[#4DB6AC]"/> {lead.phone || 'Sin número'}</div>
                                            
                                            {lead.lastCampaignDate && (
                                                <div className="text-[10px] text-[#0B2B40] bg-[#4DB6AC]/10 px-2 py-1 rounded-md border border-[#4DB6AC]/20 inline-block mb-3 font-bold">
                                                    🚀 Enviado: {formatDateShort(lead.lastCampaignDate)}
                                                </div>
                                            )}

                                            {lead.nextFollowUpDate && (
                                                <div className={`text-xs flex items-center gap-2 font-bold mb-2 ${alertStatus === 'overdue' ? 'text-red-600' : alertStatus === 'today' ? 'text-[#F2A900]' : 'text-[#4DB6AC]'}`}>
                                                    <button onClick={(e) => { e.stopPropagation(); handleCompleteReminder(lead); }} className="p-1 bg-white rounded-full border-2 border-current hover:bg-gray-50 transition-colors"><Check size={12}/></button>
                                                    <AlarmClock size={14}/> {formatDateShort(lead.nextFollowUpDate)}
                                                </div>
                                            )}
                                            {lastInteraction && <div className="text-[11px] text-gray-400 italic border-t border-gray-50 pt-2 mt-2 line-clamp-2">"{lastInteraction.note}"</div>}
                                            
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                                                <button onClick={(e) => { e.stopPropagation(); handleQuickAction(lead, 'NO_CONTESTA'); }} className="flex-1 bg-rose-50 text-rose-600 text-[10px] font-black py-2 rounded-xl hover:bg-rose-100 uppercase transition-colors">
                                                    NC
                                                </button>
                                                {currentStage === 'Incubadora' || currentStage === 'En Negociación' ? (
                                                    <button onClick={(e) => { e.stopPropagation(); openCampaignWhatsApp(lead); handleQuickAction(lead, 'CAMPANA_WSP'); }} className="flex-[2] bg-[#4DB6AC]/10 text-[#0B2B40] text-[10px] font-black py-2 rounded-xl hover:bg-[#4DB6AC]/20 flex items-center justify-center gap-2 uppercase transition-colors">
                                                        <Send size={14}/> Promo Plusvalía
                                                    </button>
                                                ) : (
                                                    <button onClick={(e) => { e.stopPropagation(); openWhatsApp(lead); handleQuickAction(lead, 'WHATSAPP'); }} className="flex-[2] bg-green-50 text-green-600 text-[10px] font-black py-2 rounded-xl hover:bg-green-100 flex items-center justify-center gap-2 uppercase transition-colors">
                                                        <MessageCircle size={14}/> WhatsApp
                                                    </button>
                                                )}
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
                 <div className="flex flex-col gap-3">
                     {filteredLeads.map(lead => {
                         const alertStatus = checkAlertStatus(lead.nextFollowUpDate);
                         const lastInteraction = lead.interactions?.[0]; 
                         const rawStage = activeModule === 'VP1' ? lead.statusVP1 : lead.statusVP2;
                         const currentStage = rawStage === 'Incubadora' ? 'En Negociación' : rawStage;

                         return (
                             <div key={lead.id} className={`bg-white p-4 rounded-2xl shadow-sm border-2 ${alertStatus === 'today' ? 'border-[#F2A900]' : 'border-gray-100 hover:border-[#4DB6AC]/40'} cursor-pointer transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`} onClick={() => handleViewLead(lead)}>
                                 
                                 <div className="flex items-center gap-4 flex-1 min-w-0">
                                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl bg-[#0B2B40] shrink-0`}>
                                         {lead.name ? lead.name.charAt(0).toUpperCase() : '?'}
                                     </div>
                                     <div className="min-w-0">
                                         <h4 className="font-black text-[#0B2B40] truncate">{lead.name || 'Lead sin nombre'}</h4>
                                         <p className="text-xs text-[#4DB6AC] font-bold mt-1 flex items-center gap-2">
                                             <Phone size={12}/> {lead.phone || 'Sin número'} <span className="text-gray-300">|</span> <span className="text-gray-700">{currentStage}</span>
                                         </p>
                                     </div>
                                 </div>

                                 <div className="flex flex-col sm:items-end gap-2 shrink-0 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0">
                                     {lead.nextFollowUpDate ? (
                                         <div className={`flex items-center gap-2 text-xs font-bold ${alertStatus === 'overdue' ? 'text-red-600' : alertStatus === 'today' ? 'text-[#F2A900]' : 'text-[#4DB6AC]'}`}>
                                             <button onClick={(e) => { e.stopPropagation(); handleCompleteReminder(lead); }} className="p-1 bg-white rounded-full border border-current hover:bg-gray-50"><Check size={12}/></button>
                                             <AlarmClock size={14}/> {formatDateShort(lead.nextFollowUpDate)}
                                         </div>
                                     ) : (
                                         lastInteraction && <div className="text-[11px] text-gray-400 italic truncate max-w-[300px]">"{lastInteraction.note}"</div>
                                     )}

                                     <div className="flex items-center gap-2 mt-1">
                                         <button onClick={(e) => { e.stopPropagation(); handleQuickAction(lead, 'NO_CONTESTA'); }} className="px-3 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 font-bold text-[10px] uppercase border border-rose-100">
                                             NC
                                         </button>
                                         {currentStage === 'En Negociación' ? (
                                            <button onClick={(e) => { e.stopPropagation(); openCampaignWhatsApp(lead); handleQuickAction(lead, 'CAMPANA_WSP'); }} className="px-4 py-2 bg-[#4DB6AC]/10 text-[#0B2B40] rounded-xl hover:bg-[#4DB6AC]/20 flex items-center gap-2 font-bold text-[10px] uppercase border border-[#4DB6AC]/20">
                                                <Send size={14}/> Promo VP
                                            </button>
                                         ) : (
                                            <button onClick={(e) => { e.stopPropagation(); openWhatsApp(lead); handleQuickAction(lead, 'WHATSAPP'); }} className="px-4 py-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 flex items-center gap-2 font-bold text-[10px] uppercase border border-green-100">
                                                <MessageCircle size={14}/> WSP
                                            </button>
                                         )}
                                         <button onClick={(e) => { e.stopPropagation(); setProformaLead(lead); setShowProformaModal(true); }} className="hidden sm:block p-2 text-[#0B2B40] hover:bg-[#0B2B40]/10 rounded-lg" title="Proforma">
                                             <FileText size={16}/>
                                         </button>
                                     </div>
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
            if (manualStatus) { await updateDoc(doc(db, 'crm_inventory', u.id), { status: manualStatus }); return; }
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

      <StatsModal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} leads={leads} />

      <CalendarModal 
        isOpen={showCalendarModal} 
        onClose={() => setShowCalendarModal(false)} 
        leads={leads}
        onViewLead={handleViewLead}
      />

      {activeAlertLead && (
        <ReminderAlert 
          leadName={activeAlertLead.name || 'Cliente sin nombre'}
          note={activeAlertLead.nextFollowUpNote || 'Tienes una llamada programada con este cliente en este momento.'}
          onClose={handleDismissAlert}
          onAttend={handleAttendAlert}
        />
      )}
    </div>
  );
}