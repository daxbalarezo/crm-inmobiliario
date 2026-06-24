// src/layouts/CorporateLayout.tsx
import React, { useState, useEffect, useRef } from 'react';
import LeadModal from '../components/LeadModal';
import { Home, Briefcase, Package, Map, ChevronDown, Calendar, Bell, CreditCard, BarChart3, Settings, LogOut, FileText, Users, Building2, FolderKanban, LayoutTemplate, Search, Grip, Star, Plus, HelpCircle } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCRM } from '../context/CRMContext';
import { useProjects } from '../hooks/useProjects';
import styles from './CorporateLayout.module.css';

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
  const { logout, userProfile, userPermissions, isImpersonating, stopImpersonating, tenant, activeProjectId, setActiveProjectId } = useCRM();
  const { projects } = useProjects();
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const hasAutoSelected = useRef(false);

  useEffect(() => {
    if (projects.length > 0 && !hasAutoSelected.current) {
      hasAutoSelected.current = true;
      
      const firstActive = projects.find(p => !p.status || p.status === 'active');
      
      // If no project is selected, or if the current one is inactive/sold out, we override it
      if (!activeProjectId || activeProjectId === 'all') {
        if (firstActive) {
          setActiveProjectId(firstActive.id);
        }
      } else {
        // If a project is selected (e.g. from context default) but it's inactive, we switch to an active one
        const currentProject = projects.find(p => p.id === activeProjectId);
        if (currentProject && currentProject.status && currentProject.status !== 'active') {
          if (firstActive) {
            setActiveProjectId(firstActive.id);
          }
        }
      }
    }
  }, [projects, activeProjectId, setActiveProjectId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const navItems: NavItem[] = [
    ...(userProfile?.role === 'agent' ? [
      { name: 'Inicio', path: '/', icon: Home },
      {
        name: 'Gestión de Seguimientos',
        icon: Map,
        subItems: [
          { name: 'Gestión de Leads', path: '/seguimientos/leads' }
        ]
      },
      { name: 'Gestión Comercial', path: '/comercial', icon: Briefcase },
      { name: 'Seguimientos', path: '/seguimientos', icon: Calendar },
      ...(userPermissions?.finance?.read !== 'none' ? [{ name: 'Finanzas y Pagos', path: '/finanzas', icon: FileText }] : []),
      { name: 'Inventario', path: '/inventario', icon: Package },
      { name: 'Gestión de Cobranzas', path: '/cobranzas', icon: CreditCard },
      { name: 'Reporte Comercial', path: '/reportes', icon: BarChart3 }
    ] : []),
      ...(userProfile?.role === 'owner' || userProfile?.role === 'manager' ? [
      {
        name: 'Analítica de Equipo',
        icon: BarChart3,
        subItems: [
          { name: 'Visión General', path: '/' },
          { name: 'Reportes Avanzados', path: '/reportes-avanzados' },
          { name: 'Reporte por Agente', path: '/analitica-agentes' },
          { name: 'Rendimiento y SLA', path: '/rendimiento' }
        ]
      },
      { name: 'Pipeline Global', path: '/comercial', icon: Briefcase },
      ...(userProfile?.role === 'owner' ? [
        { name: 'Inmobiliarias', path: '/empresas', icon: Building2 }
      ] : []),
      { 
        name: 'Gestión Operativa',
        icon: Users,
        subItems: [
          { name: 'Equipo y Usuarios', path: '/equipo' },
          { name: 'Proyectos', path: '/proyectos' },
          { name: 'Plantillas de Contratos', path: '/plantillas' }
        ]
      },
      { 
        name: 'Configuración Técnica', 
        icon: Settings,
        subItems: [
          { name: 'Modelo de Datos', path: '/configuracion?tab=campos' },
          { name: 'Roles y Permisos', path: '/configuracion?tab=roles' },
          { name: 'Automatizaciones', path: '/configuracion?tab=workflows' },
          { name: 'Registro de Auditoría', path: '/configuracion?tab=auditoria' },
          { name: 'Reglas de Negocio (SLA)', path: '/configuracion?tab=reglas' }
        ]
      }
    ] : [])
  ];

  useEffect(() => {
    navItems.forEach(item => {
      if (item.subItems?.some(sub => location.pathname === sub.path.split('?')[0]) && !expandedMenus.includes(item.name)) {
        setExpandedMenus(prev => [...prev, item.name]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <div className={styles.layoutContainer}>
      
      {isImpersonating && (
        <div className={styles.supportBanner}>
          <div className={styles.supportBannerContent}>
            <span className={styles.pulseIcon}>⚠️</span>
            <span>MODO SOPORTE: Viendo el sistema como {userProfile?.name} ({tenant?.name})</span>
          </div>
          <button onClick={stopImpersonating} className={styles.supportBtn}>
            Regresar a SuperAdmin
          </button>
        </div>
      )}

      <header className={styles.topbar}>
        
        <div className={styles.topbarLeft}>
          <div className={styles.logoArea} ref={dropdownRef}>
            <button 
              className={styles.waffleBtn} 
              title="App Launcher (Cambiar Proyecto)"
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
            >
              <Grip size={20} />
            </button>
            <h1 className={styles.logoText}>
              {activeProjectId === 'all' || !activeProjectId 
                ? 'VISIÓN GLOBAL' 
                : projects.find(p => p.id === activeProjectId)?.name.toUpperCase() || 'INMOBILIARIA'}
            </h1>
            
            {isProjectDropdownOpen && (
              <div className={styles.customDropdown}>
                <button 
                  className={`${styles.dropdownItem} ${(!activeProjectId || activeProjectId === 'all') ? styles.dropdownItemActive : ''}`}
                  onClick={() => { setActiveProjectId('all'); setIsProjectDropdownOpen(false); }}
                >
                  Visión Global (Todos los proyectos)
                </button>
                
                <div className={styles.dropdownGroup}>
                  <div className={styles.dropdownGroupLabel}>Proyectos Activos</div>
                  {projects.filter(p => !p.status || p.status === 'active').map(p => (
                    <button 
                      key={p.id}
                      className={`${styles.dropdownItem} ${activeProjectId === p.id ? styles.dropdownItemActive : ''}`}
                      onClick={() => { setActiveProjectId(p.id); setIsProjectDropdownOpen(false); }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                {projects.some(p => p.status && p.status !== 'active') && (
                  <div className={styles.dropdownGroup}>
                    <div className={styles.dropdownGroupLabel}>Inactivos / Vendidos</div>
                    {projects.filter(p => p.status && p.status !== 'active').map(p => (
                      <button 
                        key={p.id}
                        className={`${styles.dropdownItem} ${activeProjectId === p.id ? styles.dropdownItemActive : ''}`}
                        onClick={() => { setActiveProjectId(p.id); setIsProjectDropdownOpen(false); }}
                      >
                        {p.name}
                        <span className={styles.statusBadge}>{p.status === 'inactive' ? 'Inactivo' : 'Vendido'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.globalSearch}>
          <Search size={16} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Buscar leads, proyectos o contactos..." 
            className={styles.searchInput}
          />
        </div>

        <div className={styles.globalActions}>
          <div className={styles.iconGroup}>
            <button className={styles.iconBtn} title="Favoritos">
              <Star size={18} />
            </button>
            <button className={styles.iconBtn} title="Creación rápida">
              <Plus size={18} />
            </button>
            <button className={styles.iconBtn} title="Ayuda de Salesforce">
              <HelpCircle size={18} />
            </button>
            <button className={styles.iconBtn} title="Configuración">
              <Settings size={18} />
            </button>
            <button className={styles.iconBtn} title="Notificaciones">
              <Bell size={18} />
              <span className={styles.notificationDot}></span>
            </button>
          </div>

          <div className={styles.profileContainer} ref={profileRef}>
            <button 
              className={styles.avatarBtn} 
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              title="Opciones de usuario"
            >
              <div className={styles.userAvatar}>
                {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </button>

            {isProfileDropdownOpen && (
              <div className={styles.profileDropdown}>
                <div className={styles.profileHeader}>
                  <div className={styles.userAvatarLarge}>
                    {userProfile?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className={styles.profileInfo}>
                    <div className={styles.profileName}>{userProfile?.name || 'Usuario'}</div>
                    <div className={styles.profileRole}>
                      {userProfile?.role === 'owner' ? 'Dueño' : userProfile?.role === 'manager' ? 'Gerente' : userProfile?.role === 'agent' ? 'Asesor' : userProfile?.role}
                    </div>
                  </div>
                </div>
                <div className={styles.profileActions}>
                  <button onClick={logout} className={styles.dropdownActionBtn}>
                    <LogOut size={14} />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className={styles.bodyContainer}>
        
        <aside className={styles.sidebar}>
          <nav className={styles.navMenu}>
            {navItems.map((item) => {
              const isExpanded = expandedMenus.includes(item.name);

              const isExactActive = item.path ? location.pathname === item.path.split('?')[0] : false;
              const isChildActive = item.subItems?.some(sub => location.pathname === sub.path.split('?')[0]) ?? false;
              const isActive = isExactActive || isChildActive;

              const Icon = item.icon;

              return (
                <div key={item.name} className={styles.navItemContainer}>
                  {item.subItems ? (
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={`${styles.navBtn} ${isActive ? styles.navBtnActive : styles.navBtnInactive}`}
                    >
                      <div className={styles.navIconLabel}>
                        <Icon size={18} className={isActive ? styles.iconActive : styles.iconInactive} />
                        {item.name}
                      </div>
                      <ChevronDown
                        size={16}
                        className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ''}`}
                      />
                    </button>
                  ) : (
                    <Link
                      to={item.path!}
                      className={`${styles.navLink} ${isActive ? styles.navLinkActive : styles.navLinkInactive}`}
                    >
                      <Icon size={18} className={isActive ? styles.iconActive : styles.iconInactive} />
                      {item.name}
                    </Link>
                  )}

                  {item.subItems && (
                    <div className={`${styles.submenuWrapper} ${isExpanded ? styles.submenuExpanded : styles.submenuCollapsed}`}>
                      <div className={styles.submenuInner}>
                        {item.subItems.map(subItem => {
                          const subItemPath = subItem.path.split('?')[0];
                          const hasQueryParams = subItem.path.includes('?');
                          const isSubActive = hasQueryParams 
                            ? location.pathname + location.search === subItem.path 
                            : location.pathname === subItemPath;
                          
                          return (
                            <Link
                              key={subItem.name}
                              to={subItem.path}
                              className={`${styles.subNavLink} ${isSubActive ? styles.subNavLinkActive : styles.subNavLinkInactive}`}
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

        <main className={styles.mainArea}>
          <div className={styles.contentScroll}>
            <div className={styles.contentWrapper}>
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