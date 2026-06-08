export interface Lead {
  id?: string;
  tenantId: string;      // Identificador de la inmobiliaria cliente
  projectId: string;     // Identificador del proyecto (ej: valle_pacora)
  productType: 'lote_agricola' | 'departamento' | 'casa_campo' | 'lote_rustico';
  name: string;
  phone: string;
  status: 'nuevo' | 'contactado' | 'interesado' | 'vendido';
  nextFollowUpDate: string;
  nextFollowUpNote: string;
  createdAt: any;
  updatedAt: any;
}