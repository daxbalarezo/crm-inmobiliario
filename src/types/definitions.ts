export type UserRole = 'owner' | 'manager' | 'agent';

export interface UserProfile {
  uid: string;
  tenantId: string;
  role: UserRole;
  name: string;
  email: string;
  assignedProjectIds: string[];
  status?: 'active' | 'suspended';
  outOfOffice?: boolean;
  createdAt?: any;
}

export interface Tenant {
  id: string;
  name: string;
  plan: 'starter' | 'pro' | 'enterprise';
  status?: string;
  stages?: string[];
  sources?: string[];
  createdAt?: any;
  fields?: CustomFieldDefinition[];
}

export interface ModulePermissions {
  read: 'all' | 'own' | 'none';
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface RolePermission {
  id?: string;
  name: string; // e.g. "Líder de Ventas", "Administrativo"
  tenantId: string;
  permissions: {
    leads: ModulePermissions;
    inventory: ModulePermissions;
    finance: {
      read: 'all' | 'own' | 'none';
      create: boolean;
      approve: boolean;
    };
    settings: {
      manage: boolean;
    };
  };
}

export interface CustomFieldDefinition {
  id: string; // e.g. 'presupuesto'
  label: string; // e.g. 'Presupuesto Máximo'
  type: 'string' | 'number' | 'boolean' | 'date' | 'select';
  options?: string[]; // Para tipo 'select'
  required: boolean;
  order: number;
}

export type ProductType = 'lote' | 'departamento' | 'casa' | 'oficina';

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  productType: ProductType;
  status?: 'active' | 'inactive' | 'sold_out';
  description?: string;
  createdAt?: any;
}

export type LeadStatus = string;

export interface Interaction {
  id: string;
  date: string;
  type: string;
  note: string;
}

export interface LeadActivity {
  id?: string;
  tenantId: string;
  leadId: string;
  userId: string;
  userName: string;
  actionType: 'stage_change' | 'note_added' | 'task_completed' | 'email_sent' | 'contract_generated' | 'lead_created' | 'lead_assigned';
  description: string;
  metadata?: any;
  createdAt: any;
}

export interface Lead {
  id: string;
  tenantId: string;
  projectId: string;
  assignedTo: string;
  name: string;
  phone: string;
  email?: string;
  dni?: string;
  source?: string;
  status: LeadStatus;
  interestLevel?: 'Alto' | 'Medio' | 'Bajo';
  interactions?: Interaction[];
  nextFollowUpDate?: string;
  nextFollowUpNote?: string;
  lastCampaignDate?: string;
  contactDate?: string;
  firstContactAt?: any; // Para métricas SLA (Time to First Contact)
  updatedAt?: any;
  createdAt?: any;
  savedProforma?: any;
  lossReason?: string; // Motivo de pérdida para analítica
  customData?: Record<string, any>; // Dynamic fields
}

export interface Unit {
  id: string;
  tenantId: string;
  projectId: string;
  customId: string;
  group: string;
  type: string;
  area: number;
  price: number;
  price2k?: number;
  price5k?: number;
  priceCash?: number;
  status: 'DISPONIBLE' | 'SEPARADO' | 'VENDIDO' | 'BLOQUEADO' | 'PROMO';
  description?: string;
}

export interface ProformaConfig {
  unitId: string;
  locationId: string;
  area: number;
  priceList: number;
  isCash: boolean;
  cashDiscount: number;
  initialPayment: number;
  highInitialDiscount: number;
  bonusType: 'ESTATAL' | 'DESCUENTO_INMOBILIARIA' | 'NINGUNO';
  bonusAmount: number;
  extraDiscountName: string;
  extraDiscountAmount: number;
  months: number;
  generatedAt?: string;
  finalPrice?: number;
  totalDiscount?: number;
}

export interface Payment {
  id: string;
  tenantId: string;
  leadId: string;
  leadName: string;
  unitId?: string;
  unitName?: string;
  amount: number;
  currency: 'USD' | 'PEN';
  reference: string;
  voucherUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
  createdBy: string;
  approvedBy?: string;
  createdAt: any;
  updatedAt?: any;
}

export interface ContractTemplate {
  id: string;
  tenantId: string;
  name: string;
  htmlContent: string;
  createdAt: any;
  updatedAt?: any;
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  action: 'DELETE' | 'APPROVE' | 'REJECT' | 'UPDATE_PERMISSIONS';
  resource: 'LEAD' | 'PAYMENT' | 'UNIT' | 'PROJECT' | 'ROLE';
  resourceId: string;
  details: string;
  timestamp: any;
}

export type WorkflowTriggerType = 'lead_created' | 'lead_updated';

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: string | number | boolean;
}

export type WorkflowActionType = 'assign_to' | 'assign_round_robin' | 'create_task' | 'add_tag' | 'notify';

export interface WorkflowAction {
  type: WorkflowActionType;
  payload: any;
}

export interface Workflow {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
  trigger: WorkflowTriggerType;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  createdAt: any;
  updatedAt?: any;
}