// src/layouts/CorporateLayout.tsx
import React, { useState, useEffect } from 'react';
import LeadModal from '../components/LeadModal';
import { Home, Briefcase, Package, Map, ChevronDown, Calendar, Bell, CreditCard, BarChart3, Settings, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCRM } from '../context/CRMContext';
import { useProjects } from '../hooks/useProjects';

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
  const { logout, userProfile, isImpersonating, stopImpersonating, tenant, activeProjectId, setActiveProjectId } = useCRM();
  const { projects } = useProjects();
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
    ...(userProfile?.role !== 'owner' ? [
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
      { name: 'Reporte Comercial', path: '/reportes', icon: BarChart3 }
    ] : []),
    ...(userProfile?.role === 'owner' ? [
      { name: 'Administración', path: '/configuracion', icon: Settings }
    ] : [])
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
    <div className="flex flex-col h-screen bg-[#F3F3F3] font-['Inter',_sans-serif] text-[#1E293B] antialiased">
      
      {/* BANNER DE MODO SOPORTE */}
      {isImpersonating && (
        <div className="bg-amber-600 text-white px-4 py-2 flex justify-between items-center text-sm font-bold z-50 shrink-0 shadow-md">
          <div className="flex items-center gap-2">
            <span className="animate-pulse">⚠️</span>
            <span>MODO SOPORTE: Viendo el sistema como {userProfile?.name} ({tenant?.name})</span>
          </div>
          <button 
            onClick={stopImpersonating}
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
          >
            Regresar a SuperAdmin
          </button>
        </div>
      )}

      {/* TOPBAR ESTRATÉGICO (OSCURO Y GLOBAL) */}
      <header className="h-12 bg-[#1a2b4c] text-white flex items-center justify-between px-4 shrink-0 z-30 shadow-sm border-b border-[#0f192d]">
        
        {/* LOGO AREA (IZQUIERDA) */}
        <div className="flex items-center gap-4 w-[240px]">
          <h1 className="text-white text-base font-bold tracking-wider truncate uppercase">
            {tenant?.name || 'INMOBILIARIA'}
          </h1>
          {userProfile?.role === 'owner' && (
            <span className="bg-[#0176D3]/20 text-[#6eb8f5] border border-[#0176D3]/50 text-[11px] font-bold px-1.5 py-0.5 rounded-sm tracking-widest uppercase">
              Global
            </span>
          )}
        </div>

        {/* ACCIONES GLOBALES Y USUARIO (DERECHA) */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <label className="text-[13px] text-slate-300 font-semibold uppercase tracking-wider hidden md:block">Proyecto:</label>
            <div className="relative group">
              <select
                className="appearance-none bg-[#0f192d] border border-[#2a3c5a] text-slate-200 font-semibold text-sm px-3 py-1.5 pr-8 focus:outline-none focus:border-[#4DB6AC] cursor-pointer transition-colors rounded-sm"
                value={activeProjectId || 'all'}
                onChange={(e) => setActiveProjectId(e.target.value)}
              >
                <option value="all">Todos los proyectos</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 border-l border-[#2a3c5a] pl-4">
            <button className="relative text-slate-300 hover:text-white transition-colors" title="Notificaciones">
              <Bell size={16} />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-[#1a2b4c]"></span>
            </button>
            <button className="text-slate-300 hover:text-white transition-colors" title="Calendario">
              <Calendar size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3 border-l border-[#2a3c5a] pl-4">
            <div className="flex flex-col text-right hidden md:flex">
              <span className="text-[15px] font-bold text-white truncate max-w-[120px]" title={userProfile?.name}>{userProfile?.name || 'Usuario'}</span>
              <span className="text-[11px] text-[#6eb8f5] uppercase tracking-widest">
                {userProfile?.role === 'owner' ? 'Admin Global' : userProfile?.role === 'manager' ? 'Administrador' : 'Asesor'}
              </span>
            </div>
            <div className="w-8 h-8 bg-[#0f192d] flex items-center justify-center text-white font-bold text-sm shrink-0 border border-[#2a3c5a] rounded-sm">
              {userProfile?.name?.charAt(0) || 'U'}
            </div>
            <button
              onClick={logout}
              className="p-1 text-slate-400 hover:text-rose-400 transition-colors ml-1"
              title="Cerrar sesión"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ÁREA INFERIOR (SIDEBAR + MAIN) */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR CORPORATIVO (CLARO) */}
        <aside className="w-[250px] bg-white flex flex-col h-full border-r border-[#DDDBDA] z-20 hidden lg:flex shrink-0">
          {/* NAVEGACIÓN PRINCIPAL */}
          <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
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
                      className={`w-full flex items-center justify-between px-3 py-2.5 transition-all duration-200 text-sm font-semibold rounded-sm ${isActive
                          ? 'bg-[#f3f9fd] text-[#0176D3]'
                          : 'text-[#444444] hover:bg-slate-50 hover:text-[#181818]'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={isActive ? "text-[#0176D3]" : "text-slate-400"} />
                        {item.name}
                      </div>
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} text-slate-400`}
                      />
                    </button>
                  ) : (
                    // Enlace normal para elementos sin sub-rutas
                    <Link
                      to={item.path!}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-200 text-sm font-semibold rounded-sm ${isActive
                          ? 'bg-[#f3f9fd] text-[#0176D3] border-l-[3px] border-[#0176D3]'
                          : 'text-[#444444] hover:bg-slate-50 hover:text-[#181818] border-l-[3px] border-transparent'
                        }`}
                    >
                      <Icon size={18} className={isActive ? "text-[#0176D3]" : "text-slate-400"} />
                      {item.name}
                    </Link>
                  )}

                  {/* CONTENIDO DEL ACORDEÓN (SUBMENÚ) */}
                  {item.subItems && (
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0'
                        }`}
                    >
                      <div className="overflow-hidden flex flex-col gap-0.5 pl-9 mt-0.5 mb-1">
                        {item.subItems.map(subItem => {
                          const isSubActive = location.pathname === subItem.path;
                          return (
                            <Link
                              key={subItem.name}
                              to={subItem.path}
                              className={`py-2 px-3 rounded-sm text-sm transition-colors ${isSubActive
                                  ? 'text-[#0176D3] font-bold bg-[#f3f9fd]'
                                  : 'text-[#444444] hover:text-[#181818] hover:bg-slate-50'
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
        </aside>

        {/* ÁREA PRINCIPAL DE CONTENIDO */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[#F3F3F3]">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>

      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        onSave={async (data) => handleSaveLead(data)}
      />
    </div>
  );
}