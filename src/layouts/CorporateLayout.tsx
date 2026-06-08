// src/layouts/CorporateLayout.tsx
import React, { useState, useEffect } from 'react';
import LeadModal from '../components/LeadModal';
import { Home, Briefcase, Package, Map, ChevronDown, Calendar, Bell, CreditCard, BarChart3, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

// Definición estricta de tipos para la navegación escalar
interface SubNavItem {
  name: string;
  path: string;
}

interface NavItem {
  name: string;
  path?: string;
  icon: React.ElementType;
  subItems?: SubNavItem[];
}

export default function CorporateLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  
  // Estado para manejar los menús desplegables (acordeón)
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Gestión de Seguimientos']);

  const handleSaveLead = (leadData: any) => {
    console.log("Datos listos para enviar a Firebase:", leadData);
    setIsLeadModalOpen(false);
  };

  const toggleMenu = (menuName: string) => {
    setExpandedMenus((prev) => 
      prev.includes(menuName) 
        ? prev.filter(name => name !== menuName) 
        : [...prev, menuName]
    );
  };

  // Configuración centralizada de navegación
  const navItems: NavItem[] = [
    { name: 'Inicio', path: '/', icon: Home },
    { 
      name: 'Gestión de Seguimientos', 
      icon: Map, 
      subItems: [
        { name: 'Gestión de Leads', path: '/seguimientos/leads' }
      ]
    },
    { name: 'Gestión Comercial', path: '/comercial', icon: Briefcase },
    { name: 'Inventario', path: '/inventario', icon: Package },
    { name: 'Gestión de Cobranzas', path: '/cobranzas', icon: CreditCard },
    { name: 'Reporte Comercial', path: '/reportes', icon: BarChart3 },
    { name: 'Configuración de Proyectos', path: '/configuracion-proyectos', icon: Settings },
  ];

  // Efecto para auto-expandir el menú si se ingresa directamente por URL a una sub-ruta
  useEffect(() => {
    navItems.forEach(item => {
      if (item.subItems?.some(sub => location.pathname === sub.path) && !expandedMenus.includes(item.name)) {
        setExpandedMenus(prev => [...prev, item.name]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-['Inter',_sans-serif] text-[#1E293B] antialiased">
      
      {/* SIDEBAR CORPORATIVO */}
      <aside className="w-[340px] bg-[#0B2B40] flex flex-col h-full shadow-2xl z-20 hidden lg:flex shrink-0">
        
        {/* LOGO AREA */}
        <div className="h-24 flex items-center justify-center border-b border-[#154260]/80">
          <h1 className="text-[#F2A900] text-2xl font-[Poppins] font-extrabold tracking-wider flex items-center gap-3">
            NOMBRE DEL CRM
          </h1>
        </div>

        {/* NAVEGACIÓN PRINCIPAL */}
        <nav className="flex-1 px-5 py-8 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isExpanded = expandedMenus.includes(item.name);
            
            // Lógica de estado activo (detecta si el padre o un hijo están seleccionados)
            const isExactActive = item.path ? location.pathname === item.path : false;
            const isChildActive = item.subItems?.some(sub => location.pathname === sub.path) ?? false;
            const isActive = isExactActive || isChildActive;
            
            const Icon = item.icon;

            return (
              <div key={item.name} className="flex flex-col">
                {item.subItems ? (
                  // Botón desplegable para elementos con sub-rutas
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 text-base font-semibold ${
                      isActive 
                        ? 'bg-[#4DB6AC] text-[#0B2B40] shadow-lg shadow-[#4DB6AC]/20' 
                        : 'text-slate-400 hover:bg-[#154260] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Icon size={22} className={isActive ? "text-[#0B2B40]" : "text-slate-400"} />
                      {item.name}
                    </div>
                    <ChevronDown 
                      size={18} 
                      className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} ${isActive ? "text-[#0B2B40]" : "text-slate-400"}`} 
                    />
                  </button>
                ) : (
                  // Enlace normal para elementos sin sub-rutas
                  <Link
                    to={item.path!}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 text-base font-semibold ${
                      isActive 
                        ? 'bg-[#4DB6AC] text-[#0B2B40] shadow-lg shadow-[#4DB6AC]/20' 
                        : 'text-slate-400 hover:bg-[#154260] hover:text-white hover:translate-x-1'
                    }`}
                  >
                    <Icon size={22} className={isActive ? "text-[#0B2B40]" : "text-slate-400"} />
                    {item.name}
                  </Link>
                )}

                {/* CONTENIDO DEL ACORDEÓN (SUBMENÚ) */}
                {item.subItems && (
                  <div 
                    className={`grid transition-all duration-300 ease-in-out ${
                      isExpanded ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden flex flex-col gap-1 pl-12 pr-2">
                      {item.subItems.map(subItem => {
                        const isSubActive = location.pathname === subItem.path;
                        return (
                          <Link
                            key={subItem.name}
                            to={subItem.path}
                            className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                              isSubActive 
                                ? 'bg-[#154260] text-white shadow-inner' 
                                : 'text-slate-400 hover:text-white hover:bg-[#154260]/50 hover:translate-x-1'
                            }`}
                          >
                            {subItem.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        
        {/* ÁREA DE USUARIO */}
        <div className="p-6 border-t border-[#154260]/80 bg-[#0B2B40]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#4DB6AC] flex items-center justify-center text-[#0B2B40] font-black text-lg shadow-inner">
              D
            </div>
            <div className="flex flex-col text-left overflow-hidden">
              <span className="text-base font-bold text-white truncate">Daniel Balarezo</span>
              <span className="text-sm text-[#4DB6AC] font-medium truncate">Asesor de Ventas Inmobiliarias</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* TOPBAR ESTRATÉGICO */}
        <header className="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-10 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <span className="text-sm font-[Poppins] font-bold text-slate-500 uppercase tracking-widest">Proyecto:</span>
            <div className="relative group">
              <select 
                className="appearance-none bg-slate-100 border border-slate-200 text-[#0B2B40] font-bold text-base px-5 py-3 pr-12 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4DB6AC] focus:bg-white cursor-pointer transition-all hover:bg-slate-50"
                defaultValue="valle_pacora"
              >
                <option value="valle_pacora">Valle Pacora (Lotes Agrícolas)</option>
                <option value="torres_monaco">Las Torres de Mónaco (Departamentos)</option>
                <option value="tierras_sol">Tierras del Sol (Lotes)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 group-hover:text-[#4DB6AC] transition-colors">
                <ChevronDown size={18} strokeWidth={2.5} />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              className="relative p-2.5 text-slate-400 hover:text-[#0B2B40] hover:bg-slate-100 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-200 shadow-sm hover:shadow-md"
              title="Notificaciones"
            >
              <Bell size={22} strokeWidth={2.5} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button 
              className="p-2.5 text-slate-400 hover:text-[#0B2B40] hover:bg-slate-100 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-200 shadow-sm hover:shadow-md"
              title="Calendario"
            >
              <Calendar size={22} strokeWidth={2.5} />
            </button>
            <button 
              className="p-2.5 text-slate-400 hover:text-[#0B2B40] hover:bg-slate-100 rounded-xl transition-all duration-200 border border-transparent hover:border-slate-200 shadow-sm hover:shadow-md"
              title="Configuraciones"
            >
              <Settings size={22} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        {/* CONTENIDO DINÁMICO */}
        <div className="flex-1 overflow-y-auto p-10 lg:p-12 bg-slate-50/50">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
        </div>
      </main>

      <LeadModal 
        isOpen={isLeadModalOpen} 
        onClose={() => setIsLeadModalOpen(false)} 
        onSave={async (data) => handleSaveLead(data)} 
      />
    </div>
  );
}