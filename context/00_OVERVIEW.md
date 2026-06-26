# 00. OVERVIEW: CRM Inmobiliario V2

## Objetivo del Proyecto
Desarrollar un CRM Multi-Tenant (Multi-Inmobiliaria) diseñado específicamente para el sector de bienes raíces. Permite a múltiples inmobiliarias gestionar sus leads (prospectos), agentes comerciales, inventario de proyectos (departamentos/casas), y pipeline de ventas desde una única plataforma centralizada.

## Stack Tecnológico Principal
- **Frontend Core:** React 19 + TypeScript + Vite.
- **Enrutamiento:** React Router DOM v7.
- **Diseño (UI/UX):** Salesforce Lightning Design System (SLDS). *Tailwind fue removido para garantizar una estética 100% corporativa.*
- **Backend / Base de Datos / Autenticación:** Supabase (PostgreSQL). *(Nota: Recientemente migrado desde Firebase).*

## Jerarquía de Usuarios (Roles)
1. **Owner (Dueño del CRM):** Administrador del sistema o Super Admin. Gestiona suscripciones, crea nuevas Inmobiliarias (Tenants) y ve el MRR/ARR global.
2. **Manager (Gerente de Inmobiliaria):** Administrador de una Inmobiliaria en particular. Solo ve los datos de su propio Tenant. Gestiona asesores, proyectos e inventario.
3. **Agent (Asesor de Ventas):** Usuario final. Gestiona sus propios leads, seguimientos y cotizaciones.

## Flujo Principal
Un lead ingresa al sistema -> Se asigna a un Agente -> Pasa por el embudo (Prospecto, Visita, Separación) -> Se convierte en Venta (ligado al inventario de un Proyecto).
