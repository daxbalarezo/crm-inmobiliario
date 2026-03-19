// src/types/definitions.ts

export interface Unit {
  id: string; 
  customId: string; 
  group: string; 
  type: 'LOTE' | 'DEPA';
  description?: string;
  area: number;
  price: number;
  price2k?: number;     
  price5k?: number;     
  priceCash?: number;   
  status: 'DISPONIBLE' | 'SEPARADO' | 'VENDIDO' | 'BLOQUEADO' | 'PARQUE' | 'EDUCACION' | 'OTROS' | 'PROMO';
}

export interface Interaction {
  id: string;
  date: string;
  type: string;
  note: string;
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
}

export interface Lead {
  id: string;
  type: string;
  name: string;
  dni?: string;
  phone: string;
  email: string;
  project: string;
  source: string;
  createdAt?: any;
  updatedAt?: any;
  contactDate?: string; // <--- NUEVO CAMPO: Fecha Real de Ingreso (Manual)
  notes?: string;
  aiStrategy?: string; // Campo IA agregado anteriormente
  interactions?: Interaction[];
  interestLevel?: 'Alto' | 'Medio' | 'Bajo';
  nextFollowUpDate?: string | null;
  nextFollowUpNote?: string;
  loteType?: string; 
  area?: number;
  price?: number; 
  reservationAmount?: number;
  paymentMethod?: string;
  financeTime?: string;
  statusLote?: string;
  depaType?: string; 
  footage?: number;
  floor?: number;
  view?: string;
  downPayment?: number;
  creditType?: string;
  statusDepa?: string;
  savedProforma?: ProformaConfig & {
    generatedAt: string;
    finalPrice: number;
    totalDiscount: number;
  };
}