export type UserRole = 'owner' | 'manager' | 'agent';

export interface UserProfile {
  uid: string;
  tenantId: string;
  role: UserRole;
  name: string;
  email: string;
  assignedProjectIds: string[];
  createdAt?: any;
}

export interface Tenant {
  id: string;
  name: string;
  plan: 'starter' | 'pro' | 'enterprise';
  createdAt?: any;
}

export type ProductType = 'lote_agricola' | 'departamento' | 'casa_campo' | 'lote_urbano';

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  productType: ProductType;
  description?: string;
  createdAt?: any;
}

export type LeadStatus =
  | 'PROSPECTO'
  | 'SIN_CONTACTAR'
  | 'EN_NEGOCIACION'
  | 'VISITA'
  | 'SEPARACION'
  | 'VENDIDO'
  | 'CERRADO';

export interface Interaction {
  id: string;
  date: string;
  type: string;
  note: string;
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
  updatedAt?: any;
  createdAt?: any;
  savedProforma?: any;
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