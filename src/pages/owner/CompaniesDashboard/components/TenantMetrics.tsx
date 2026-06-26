import React from 'react';
import { Building2, LineChart, DollarSign } from 'lucide-react';

interface TenantMetricsProps {
  activeCount: number;
  suspendedCount: number;
  mrr: number;
  arr: number;
}

export default function TenantMetrics({ activeCount, suspendedCount, mrr, arr }: TenantMetricsProps) {
  return (
    <div className="slds-grid slds-gutters slds-m-bottom_medium slds-grid_vertical-stretch">
      <div className="slds-col slds-size_1-of-1 slds-medium-size_1-of-3">
        <div className="slds-box slds-box_small slds-theme_default slds-text-align_center" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="slds-text-heading_small slds-text-color_weak slds-m-bottom_x-small">
            <DollarSign size={16} className="slds-m-right_xx-small" style={{verticalAlign: 'text-bottom'}} />
            Ingreso Mensual (MRR)
          </div>
          <div className="slds-text-heading_large slds-text-color_success">
            S/ {mrr.toLocaleString('en-US')}
          </div>
        </div>
      </div>
      <div className="slds-col slds-size_1-of-1 slds-medium-size_1-of-3">
        <div className="slds-box slds-box_small slds-theme_default slds-text-align_center" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="slds-text-heading_small slds-text-color_weak slds-m-bottom_x-small">
            <LineChart size={16} className="slds-m-right_xx-small" style={{verticalAlign: 'text-bottom'}} />
            Ingreso Anual (ARR)
          </div>
          <div className="slds-text-heading_medium">
            S/ {arr.toLocaleString('en-US')}
          </div>
        </div>
      </div>
      <div className="slds-col slds-size_1-of-1 slds-medium-size_1-of-3">
        <div className="slds-box slds-box_small slds-theme_default slds-text-align_center" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="slds-text-heading_small slds-text-color_weak slds-m-bottom_x-small">
            <Building2 size={16} className="slds-m-right_xx-small" style={{verticalAlign: 'text-bottom'}} />
            Inmobiliarias Activas
          </div>
          <div className="slds-text-heading_medium">
            {activeCount}
          </div>
          {suspendedCount > 0 && (
            <div className="slds-text-body_small slds-text-color_error slds-m-top_xx-small">
              {suspendedCount} suspendidas
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
