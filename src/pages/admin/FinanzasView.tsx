import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { LineChart, DollarSign, TrendingUp, Building2, Settings, X } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

export default function FinanzasView() {
  const { userProfile } = useCRM();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const defaultPrices = { starter: 49, pro: 99, enterprise: 299 };
  const [planPrices, setPlanPrices] = useState(defaultPrices);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [editingPrices, setEditingPrices] = useState(defaultPrices);
  const [isSavingPricing, setIsSavingPricing] = useState(false);

  useEffect(() => {
    if (userProfile?.role !== 'owner') return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'tenants'));
        setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const pricingSnap = await getDoc(doc(db, 'config', 'billing'));
        if (pricingSnap.exists()) {
          setPlanPrices(pricingSnap.data() as typeof defaultPrices);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [userProfile?.role]);

  if (userProfile?.role !== 'owner') return <Navigate to="/" replace />;

  const activeTenants = tenants.filter(t => t.status === 'active' || !t.status);
  const suspendedTenantsCount = tenants.length - activeTenants.length;

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPricing(true);
    try {
      await setDoc(doc(db, 'config', 'billing'), {
        starter: Number(editingPrices.starter),
        pro: Number(editingPrices.pro),
        enterprise: Number(editingPrices.enterprise)
      });
      setPlanPrices(editingPrices);
      setIsPricingModalOpen(false);
    } catch (err) {
      console.error("Error guardando precios:", err);
      alert("Error al guardar los precios");
    } finally {
      setIsSavingPricing(false);
    }
  };

  const mrr = activeTenants.reduce((sum, t) => sum + (planPrices[t.plan as keyof typeof planPrices] || 49), 0);
  const arr = mrr * 12;

  const planCounts = activeTenants.reduce((acc, t) => {
    acc[t.plan as keyof typeof planCounts] = (acc[t.plan as keyof typeof planCounts] || 0) + 1;
    return acc;
  }, { starter: 0, pro: 0, enterprise: 0 });

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Finanzas y Métricas SaaS</h1>
        <p className="text-slate-500 text-sm mt-1">Ingreso recurrente y estado general de la plataforma.</p>
      </div>

      {loading ? (
        <div className="py-10 text-center text-slate-500 font-semibold">Cargando métricas...</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* MRR Card */}
            <div className="bg-gradient-to-br from-[#0B2B40] to-[#1a4a6b] p-6 rounded-2xl shadow-lg text-white">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Ingreso Mensual (MRR)</p>
                  <p className="text-4xl font-bold mt-2">S/ {mrr.toLocaleString('es-PE')}</p>
                </div>
                <div className="p-3 bg-white/10 rounded-xl">
                  <DollarSign size={24} className="text-[#4DB6AC]" />
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-[#4DB6AC]">
                <TrendingUp size={16} />
                <span>Métricas en tiempo real</span>
              </div>
            </div>

            {/* ARR Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Ingreso Anual (ARR)</p>
                  <p className="text-4xl font-bold mt-2 text-slate-800">S/ {arr.toLocaleString('es-PE')}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <LineChart size={24} className="text-[#0176D3]" />
                </div>
              </div>
            </div>

            {/* Clientes Activos Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Inmobiliarias Activas</p>
                  <p className="text-4xl font-bold mt-2 text-slate-800">{activeTenants.length}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <Building2 size={24} className="text-[#0176D3]" />
                </div>
              </div>
              {suspendedTenantsCount > 0 && (
                <div className="mt-6 text-sm text-red-500 font-medium">
                  {suspendedTenantsCount} empresa(s) suspendida(s)
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Desglose por Planes</h3>
              <button 
                onClick={() => { setEditingPrices(planPrices); setIsPricingModalOpen(true); }} 
                className="flex items-center gap-2 text-sm text-[#0176D3] hover:text-[#015C99] font-semibold bg-blue-50 px-3 py-1.5 rounded-md transition-colors"
              >
                <Settings size={16} /> Configurar Precios
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-slate-100 rounded-xl flex justify-between items-center bg-slate-50">
                <div>
                  <p className="text-sm font-bold text-slate-500">Plan STARTER</p>
                  <p className="text-xs text-slate-400 mt-1">S/ {planPrices.starter} / mes</p>
                </div>
                <p className="text-2xl font-bold text-slate-700">{planCounts.starter}</p>
              </div>
              <div className="p-4 border border-slate-100 rounded-xl flex justify-between items-center bg-indigo-50">
                <div>
                  <p className="text-sm font-bold text-indigo-600">Plan PRO</p>
                  <p className="text-xs text-indigo-400 mt-1">S/ {planPrices.pro} / mes</p>
                </div>
                <p className="text-2xl font-bold text-indigo-800">{planCounts.pro}</p>
              </div>
              <div className="p-4 border border-[#0B2B40] rounded-xl flex justify-between items-center bg-[#0B2B40] text-white">
                <div>
                  <p className="text-sm font-bold text-[#4DB6AC]">Plan ENTERPRISE</p>
                  <p className="text-xs text-slate-300 mt-1">S/ {planPrices.enterprise} / mes</p>
                </div>
                <p className="text-2xl font-bold text-white">{planCounts.enterprise}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURAR PRECIOS */}
      {isPricingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-lg text-slate-800">Precios de Suscripción (S/)</h3>
              <button onClick={() => setIsPricingModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            
            <form onSubmit={handleSavePricing} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Plan STARTER (Soles)</label>
                <input 
                  type="number" required min="0" step="1"
                  value={editingPrices.starter} 
                  onChange={e => setEditingPrices({...editingPrices, starter: Number(e.target.value)})} 
                  className="w-full border rounded p-2 text-sm" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-indigo-500 uppercase mb-1">Plan PRO (Soles)</label>
                <input 
                  type="number" required min="0" step="1"
                  value={editingPrices.pro} 
                  onChange={e => setEditingPrices({...editingPrices, pro: Number(e.target.value)})} 
                  className="w-full border rounded p-2 text-sm border-indigo-200 focus:border-indigo-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4DB6AC] uppercase mb-1">Plan ENTERPRISE (Soles)</label>
                <input 
                  type="number" required min="0" step="1"
                  value={editingPrices.enterprise} 
                  onChange={e => setEditingPrices({...editingPrices, enterprise: Number(e.target.value)})} 
                  className="w-full border rounded p-2 text-sm border-[#4DB6AC] focus:border-[#0B2B40]" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-6">
                <button type="button" onClick={() => setIsPricingModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded">Cancelar</button>
                <button type="submit" disabled={isSavingPricing} className="bg-[#0176D3] hover:bg-[#015C99] text-white px-4 py-2 rounded text-sm font-semibold transition-colors">
                  {isSavingPricing ? 'Guardando...' : 'Guardar Precios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
