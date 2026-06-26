# 04. REGISTRO DE DECISIONES ARQUITECTÓNICAS (ADRs)

## 1. Migración de Firebase a Supabase (Junio 2026)
**Contexto:** El CRM maneja relaciones complejas (Tenants -> Usuarios -> Leads -> Actividades -> Proyectos -> Propiedades). En Firebase (NoSQL), agregar analíticas avanzadas o filtrar inventario disponible resultaba en múltiples consultas pesadas y denormalización excesiva de datos.
**Decisión:** Migrar el backend a Supabase para aprovechar PostgreSQL.
**Beneficios:** Permite consultas relacionales complejas (`JOIN`), control estricto de seguridad con RLS a nivel de base de datos, y mayor escalabilidad empresarial.

## 2. Adopción Estricta de SLDS (Salesforce Lightning Design System)
**Contexto:** Se requiere un diseño que inspire confianza empresarial ("Enterprise"), idéntico al estándar corporativo, para evitar que la aplicación parezca "amateur". Inicialmente se combinaban herramientas.
**Decisión:** Eliminar TailwindCSS y forzar el uso nativo de SLDS.
**Beneficios:** Estandarización visual inmediata en toda la plataforma. Accesibilidad pre-configurada por los ingenieros de Salesforce.

## 3. Integración de SLDS en Vite (Prevención de MIME Type Errors)
**Contexto:** El uso de `vite-plugin-static-copy` para copiar los más de 5,000 archivos estáticos de SLDS causaba colisiones en el servidor de desarrollo, retornando errores `text/css` como módulo.
**Decisión:** Eliminar las copias estáticas e importar el archivo CSS principal directamente en `src/main.tsx` (`import '@salesforce-ux/design-system/assets/styles/salesforce-lightning-design-system.min.css'`).
**Beneficios:** Vite gestiona eficientemente el bundler del CSS, resolviendo rutas de imágenes y fuentes internamente, garantizando un servidor de desarrollo rápido y libre de cuelgues.

## 4. Integraciones "Plug & Play" (Webhooks Nativos vs Zapier/Make)
**Contexto:** El mercado local (inmobiliarias) es reacio a pagar y configurar middlewares de integración adicionales como Zapier o Make para la ingesta de leads.
**Decisión:** Dotar al CRM de su propio motor de ingestión mediante Webhooks nativos. Se generan URLs únicas de Webhook por Inmobiliaria (Tenant) para configurar directamente en Facebook Ads y proveedores de WABA (WhatsApp).
**Beneficios:** Reduce radicalmente la fricción de entrada (Onboarding), evita el "impuesto Zapier" al cliente final, y da control total al CRM sobre el embudo, permitiendo acoplar un motor interno de asignación automática de leads (Round-Robin).

## 5. Facturación y Cobranza Manual (Depósitos Bancarios)
**Contexto:** El mercado local aún tiene fricción con el cobro automático por tarjeta de crédito recurrente (Stripe/PayPal), prefiriendo en muchos casos transferencias o depósitos directos.
**Decisión:** El módulo de Facturación del SaaS (`owner`) se diseña asumiendo un flujo de validación manual. Las suscripciones tienen estados como "Esperando comprobante" o "Validando depósito".
**Beneficios:** Adaptación total a la realidad comercial de LATAM. Permite al Owner revisar los comprobantes enviados por WhatsApp o correo y aprobar la renovación de suscripción de la inmobiliaria manualmente con un clic, extendiendo el ciclo de facturación.
