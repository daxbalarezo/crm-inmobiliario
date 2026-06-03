// src/types/definitions.ts

export interface Unit {
  id: string; 
  customId: string; 
  group: string; 
  type: 'VP1' | 'VP2';
  description?: string;
  area: number;
  price: number;
  price2k?: number;     
  price5k?: number;     
  priceCash?: number;   
  status: 'DISPONIBLE' | 'SEPARADO' | 'VENDIDO' | 'BLOQUEADO';
}

export interface Interaction {
  id: string;
  date: string;
  type: string;
  note: string;
}

export interface Lead {
  id: string;
  name?: string;
  phone?: string;
  type: 'VP1' | 'VP2';
  project?: string;
  // Estados para Valle Pacora 1
  statusVP1?: 'Nuevo' | 'No Contactado' | 'En Negociación' | 'Incubadora' | 'Venta' | 'No Interesado';
  // Estados para Valle Pacora 2
  statusVP2?: 'Nuevo' | 'No Contactado' | 'En Negociación' | 'Incubadora' | 'Venta' | 'No Interesado';
  interestLevel?: 'Alto' | 'Medio' | 'Bajo';
  interactions?: Interaction[];
  nextFollowUpDate?: string;
  nextFollowUpNote?: string;
  lastCampaignDate?: string;
  updatedAt?: any; // Timestamp de Firebase
  savedProforma?: any;
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
  bonusType: string;
  bonusAmount: number;
  extraDiscountName: string;
  extraDiscountAmount: number;
  months: number;
  generatedAt?: string;
  finalPrice?: number;
  totalDiscount?: number;
}