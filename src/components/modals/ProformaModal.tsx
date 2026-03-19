import React, { useState } from 'react';
import { Calculator, X, Grid, ChevronDown, DollarSign, Save, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ProformaConfig, Unit, Lead } from '../../types/definitions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  config: ProformaConfig;
  setConfig: (cfg: ProformaConfig) => void;
  activeModule: 'LOTE' | 'DEPA';
  inventory: Unit[];
  onSave: () => void;
  onGeneratePDF: () => void;
}

export default function ProformaModal({ isOpen, onClose, lead, config, setConfig, activeModule, inventory, onSave, onGeneratePDF }: Props) {
  if (!isOpen) return null;

  const [selectedMz, setSelectedMz] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // --- VARIABLES CALCULADAS ---
  const precioBase = config.priceList; 
  const descuentoExtra = config.extraDiscountAmount || 0;
  // En tu script Python: precio_objetivo = precio_lista - descuentos.
  // Aquí asumimos que precioVenta es el precio final tras descuentos directos.
  const precioVenta = precioBase - descuentoExtra; 
  
  // Cálculo del saldo
  const saldoAFinanciar = precioVenta - config.initialPayment;
  const cuotaMensual = config.months > 0 ? saldoAFinanciar / config.months : 0;
  const ahorroTotal = descuentoExtra; // Se puede sumar más lógica si hubiera bonos

  const handleSelectUnit = (unitId: string) => {
    const unit = inventory.find(u => u.id === unitId);
    if (unit) {
      setSelectedUnit(unit);
      setConfig({
        ...config,
        unitId: unit.customId,
        locationId: unit.group,
        area: unit.area,
        priceList: unit.price,
        initialPayment: 0,
        extraDiscountAmount: 0,
        months: 36,
        isCash: false
      });
    }
  };

  const applyPricePlan = (planBasePrice: number, requiredInitial: number, isCashPlan: boolean = false) => {
    setConfig({
      ...config,
      priceList: planBasePrice, 
      initialPayment: requiredInitial,
      extraDiscountAmount: 0,
      isCash: isCashPlan,
      months: isCashPlan ? 0 : 36
    });
  };

  // --- GENERACIÓN DE PDF (ESTILO PYTHON SCRIPT) ---
  const handlePrintPDF = async () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString();
    
    // Datos del Asesor (Fijos o dinámicos)
    const advisorName = "Daniel Balarezo"; 
    const advisorPhone = "936 897 318";    
    const projectName = activeModule === 'LOTE' ? 'TIERRAS DEL SOL' : 'TORRES DE MONACO';
    const empresaName = "Inmobiliaria GANESHA";

    // Colores del Script Python
    const colorEmpresa = [26, 54, 93];   // #1a365d
    const colorProyecto = [214, 158, 46]; // #d69e2e (Dorado)
    const colorAzulTabla = [44, 82, 130]; // #2c5282
    const colorGrisTexto = [74, 85, 104]; // #4a5568
    const colorRojoTexto = [197, 48, 48]; // #c53030
    const colorVerdeFondo = [240, 255, 244]; // #f0fff4
    const colorGrisFondo = [226, 232, 240];  // #e2e8f0

    // 1. Cargar Logo
    const getLogoData = async (url: string): Promise<{ data: string; w: number; h: number } | null> => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    const img = new Image();
                    img.src = base64;
                    img.onload = () => resolve({ data: base64, w: img.width, h: img.height });
                };
                reader.readAsDataURL(blob);
            });
        } catch (e) { return null; }
    };
    const logoInfo = await getLogoData('/logo.png');

    // --- ENCABEZADO (Replica _crear_encabezado) ---
    if (logoInfo) {
        // Logo cuadrado aprox 0.7 inch ~ 18mm
        const logoSize = 25; 
        // Mantener proporción
        const logoW = (logoInfo.w / logoInfo.h) * logoSize;
        doc.addImage(logoInfo.data, 'PNG', 15, 15, logoW, logoSize);
    }

    // Texto Encabezado (Lado derecho del logo)
    const textX = 50; 
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(colorEmpresa[0], colorEmpresa[1], colorEmpresa[2]);
    doc.text(empresaName, textX, 20);

    doc.setFontSize(13);
    doc.setTextColor(colorProyecto[0], colorProyecto[1], colorProyecto[2]);
    doc.text(projectName, textX, 27);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(colorGrisTexto[0], colorGrisTexto[1], colorGrisTexto[2]);
    doc.text(`Asesor: ${advisorName} | Cel: ${advisorPhone}`, textX, 34);

    // Línea separadora dorada
    doc.setDrawColor(colorProyecto[0], colorProyecto[1], colorProyecto[2]);
    doc.setLineWidth(1.5); // 1.5pt en Python
    doc.line(15, 42, 195, 42);

    // --- INFO CLIENTE (Replica _crear_info_cliente) ---
    // Usamos autoTable para simular la tabla de info del cliente
    autoTable(doc, {
        startY: 48,
        head: [],
        body: [
            ['CLIENTE:', lead.name, 'FECHA:', currentDate]
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 25 },
            1: { cellWidth: 90 },
            2: { fontStyle: 'bold', cellWidth: 20 },
            3: { cellWidth: 40 }
        },
        didDrawPage: (data) => {
            // Línea gris debajo
            doc.setDrawColor(128, 128, 128);
            doc.setLineWidth(0.5);
            doc.line(15, data.cursor!.y, 195, data.cursor!.y);
        }
    });

    // --- INFO LOTE (Replica _crear_tabla_lote_individual) ---
    const startY_Lote = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(colorAzulTabla[0], colorAzulTabla[1], colorAzulTabla[2]);
    
    // Título del lote
    const loteTitulo = activeModule === 'LOTE' 
        ? `LOTE: ${config.unitId} - MZ: ${config.locationId}` 
        : `DEPA: ${config.unitId} - PISO: ${config.locationId}`;
    
    doc.text(`${loteTitulo} (Área: ${config.area} m²)`, 15, startY_Lote);

    // --- TABLA RESUMEN FINANCIERO (Replica _crear_tabla_resumen_financiero) ---
    // Encabezado de la tabla (Fondo Azul Oscuro)
    const startY_Fin = startY_Lote + 8;
    
    // Datos de la tabla
    const bodyData = [
        ['PRECIO DE LISTA (Mercado)', `S/ ${precioBase.toLocaleString('es-PE', {minimumFractionDigits: 2})}`],
    ];

    // Descuentos
    if (descuentoExtra > 0) {
        bodyData.push(['(-) Descuento Promocional', `- S/ ${descuentoExtra.toLocaleString('es-PE', {minimumFractionDigits: 2})}`]);
    }

    // Precio Final (Highlight)
    bodyData.push(['PRECIO FINAL DEL INMUEBLE', `S/ ${precioVenta.toLocaleString('es-PE', {minimumFractionDigits: 2})}`]);

    // Pago Inicial
    if (config.initialPayment > 0) {
        bodyData.push(['(-) PAGO INICIAL / CUOTA INICIAL', `- S/ ${config.initialPayment.toLocaleString('es-PE', {minimumFractionDigits: 2})}`]);
    }

    // Saldo a Financiar (si no es contado)
    if (!config.isCash) {
        bodyData.push(['SALDO A FINANCIAR', `S/ ${saldoAFinanciar.toLocaleString('es-PE', {minimumFractionDigits: 2})}`]);
    } else {
        bodyData.push(['SALDO A FINANCIAR', `S/ 0.00`]);
    }

    // Ahorro Total
    if (ahorroTotal > 0) {
        bodyData.push(['AHORRO TOTAL (Descuentos)', `S/ ${ahorroTotal.toLocaleString('es-PE', {minimumFractionDigits: 2})}`]);
    }

    autoTable(doc, {
        startY: startY_Fin,
        head: [['RESUMEN DE INVERSIÓN Y FINANCIAMIENTO', '']],
        body: bodyData,
        theme: 'grid',
        headStyles: {
            fillColor: colorAzulTabla, // #2c5282
            halign: 'center',
            fontSize: 12,
            fontStyle: 'bold',
            textColor: [255, 255, 255]
        },
        styles: {
            lineColor: colorAzulTabla,
            lineWidth: 0.1,
            fontSize: 10,
            cellPadding: 6 // Más espaciado como en el script
        },
        columnStyles: {
            0: { cellWidth: 110, fontStyle: 'bold' }, // Columna Concepto Bold
            1: { cellWidth: 70, halign: 'right' } // Columna Precio Derecha
        },
        didParseCell: function(data) {
            // Estilos específicos por fila (Simulando el script Python)
            if (data.section === 'body') {
                const rowName = data.row.raw[0] as string;
                
                // Estilo para PRECIO FINAL (Fondo gris azulado, texto dorado)
                if (rowName.includes('PRECIO FINAL')) {
                    data.cell.styles.fillColor = colorGrisFondo; // #e2e8f0
                    data.cell.styles.textColor = colorProyecto;  // #d69e2e
                    data.cell.styles.fontStyle = 'bold';
                }
                
                // Estilo para Descuentos y Pago Inicial (Texto Rojo)
                if (rowName.includes('(-)') || rowName.includes('Descuento')) {
                    if (data.column.index === 1) { // Solo la columna de precio
                        data.cell.styles.textColor = colorRojoTexto; // #c53030
                    }
                }

                // Estilo para SALDO A FINANCIAR (Fondo verde claro, texto grande)
                if (rowName.includes('SALDO A FINANCIAR')) {
                    data.cell.styles.fillColor = colorVerdeFondo; // #f0fff4
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fontSize = 12;
                }

                // Estilo para AHORRO TOTAL (Texto Verde)
                if (rowName.includes('AHORRO TOTAL')) {
                    data.cell.styles.textColor = [0, 128, 0]; // Verde
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    // --- INFORMACIÓN DE CUOTAS (Si es financiado) ---
    if (!config.isCash) {
        const finalY = (doc as any).lastAutoTable.finalY + 15;
        
        // Caja de Cuotas (Estilo similar al saldo a financiar)
        doc.setFillColor(240, 255, 244); // Verde claro
        doc.setDrawColor(44, 82, 130);   // Borde azul
        doc.roundedRect(15, finalY, 180, 25, 2, 2, 'FD');

        doc.setFontSize(11);
        doc.setTextColor(colorAzulTabla[0], colorAzulTabla[1], colorAzulTabla[2]);
        doc.text(`PLAN DE PAGOS A ${config.months} MESES`, 105, finalY + 8, { align: 'center' });

        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text(`CUOTA MENSUAL FIJA:  S/ ${cuotaMensual.toLocaleString('es-PE', {minimumFractionDigits: 2})}`, 105, finalY + 18, { align: 'center' });
    } else {
        // Mensaje Contado
        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFillColor(240, 255, 244);
        doc.setDrawColor(44, 82, 130);
        doc.roundedRect(15, finalY, 180, 20, 2, 2, 'FD');
        doc.setFontSize(14);
        doc.setTextColor(44, 82, 130);
        doc.setFont('helvetica', 'bold');
        doc.text("PAGO ÚNICO AL CONTADO", 105, finalY + 13, { align: 'center' });
    }

    // --- PIE DE PÁGINA (Replica _crear_pie_pagina) ---
    const pageHeight = doc.internal.pageSize.height;
    // Línea dorada arriba del pie
    doc.setDrawColor(colorProyecto[0], colorProyecto[1], colorProyecto[2]);
    doc.setLineWidth(1);
    doc.line(15, pageHeight - 25, 195, pageHeight - 25);

    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128); // Gris
    doc.setFont('helvetica', 'normal');
    doc.text(`Cotización válida por 48 horas. ${projectName}`, 105, pageHeight - 15, { align: 'center' });
    doc.text(empresaName, 105, pageHeight - 10, { align: 'center' });

    // Guardar
    doc.save(`Cotizacion_${projectName.replace(/ /g,'')}_${lead.name.split(' ')[0]}.pdf`);
    if(onGeneratePDF) onGeneratePDF();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b bg-gray-50 rounded-t-2xl flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Calculator className="text-indigo-600" /> Cotizador Inteligente</h3>
          <button onClick={onClose}><X size={24} className="text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <h4 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2"><Grid size={16} /> Seleccionar Unidad</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-indigo-700 mb-1">Manzana</label>
                <div className="relative">
                  <select className="w-full border-indigo-200 rounded-lg text-sm p-2 appearance-none bg-white" value={selectedMz} onChange={e => setSelectedMz(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {[...new Set(inventory.filter(u => u.type === activeModule).map(u => u.group))].sort().map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-3 text-indigo-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-indigo-700 mb-1">Lote</label>
                <div className="relative">
                  <select className="w-full border-indigo-200 rounded-lg text-sm p-2 appearance-none bg-white" onChange={e => handleSelectUnit(e.target.value)} disabled={!selectedMz}>
                    <option value="">Seleccionar...</option>
                    {inventory.filter(u => u.type === activeModule && u.group === selectedMz && u.status === 'DISPONIBLE').sort((a, b) => a.customId.localeCompare(b.customId, undefined, { numeric: true })).map(u => (
                      <option key={u.id} value={u.id}>{u.customId} - {u.area}m²</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-3 text-indigo-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {selectedUnit && (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">1. Seleccionar Plan (Fija el Precio Base)</label>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => applyPricePlan(selectedUnit.price, 2000, false)} className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 flex flex-col items-center min-w-[100px]">
                  <span>Inicial 2k</span><span className="text-[10px] font-normal">Base: S/ {selectedUnit.price}</span>
                </button>
                {selectedUnit.price5k && selectedUnit.price5k > 0 && (
                  <button type="button" onClick={() => applyPricePlan(selectedUnit.price5k!, 5000, false)} className="px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-100 flex flex-col items-center min-w-[100px]">
                    <span>Inicial 5k</span><span className="text-[10px] font-normal">Base: S/ {selectedUnit.price5k}</span>
                  </button>
                )}
                {selectedUnit.priceCash && selectedUnit.priceCash > 0 && (
                  <button type="button" onClick={() => applyPricePlan(selectedUnit.priceCash!, selectedUnit.priceCash!, true)} className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 flex flex-col items-center min-w-[100px]">
                    <span>Contado</span><span className="text-[10px] font-normal">Base: S/ {selectedUnit.priceCash}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
             <div><label className="block text-xs font-bold text-gray-500 mb-1">Precio Base Aplicado</label><div className="relative"><DollarSign size={16} className="absolute left-3 top-2.5 text-gray-400"/><input type="number" className="w-full pl-9 border-gray-300 rounded-lg p-2 text-sm font-bold text-gray-700 bg-gray-50" value={config.priceList} readOnly /></div></div>
             <div><label className="block text-xs font-bold text-gray-500 mb-1">Forma de Pago</label><select className="w-full border-gray-300 rounded-lg p-2 text-sm" value={config.isCash ? 'CONTADO' : 'FINANCIADO'} onChange={e => setConfig({...config, isCash: e.target.value === 'CONTADO'})}><option value="FINANCIADO">Financiado</option><option value="CONTADO">Contado</option></select></div>
          </div>

          <div className="border-t border-gray-100 pt-4">
             <h4 className="text-sm font-bold text-gray-800 mb-3">2. Cálculo de Cuotas</h4>
             <div className="space-y-3">
                 <div className="flex items-center gap-2 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <div className="flex-1">
                          <label className="block text-xs font-bold text-yellow-800 mb-1">Descuento Excepcional (Resta al precio)</label>
                          <input type="text" className="w-full border-yellow-300 rounded-lg p-1.5 text-sm" placeholder="Motivo" value={config.extraDiscountName} onChange={e => setConfig({...config, extraDiscountName: e.target.value})}/>
                      </div>
                      <div className="w-32">
                          <label className="block text-xs font-bold text-yellow-800 mb-1">Monto (S/)</label>
                          <input type="number" className="w-full border-yellow-300 rounded-lg p-1.5 text-sm text-right font-bold" placeholder="0.00" value={config.extraDiscountAmount} onChange={e => setConfig({...config, extraDiscountAmount: Number(e.target.value)})}/>
                      </div>
                 </div>

                 {!config.isCash && (
                     <>
                        <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between border border-gray-200"><span className="text-sm font-bold text-gray-700">Cuota Inicial:</span><input type="number" className="w-32 border-gray-300 rounded-lg p-1.5 text-sm text-right font-bold" value={config.initialPayment} onChange={e => setConfig({...config, initialPayment: Number(e.target.value)})}/></div>
                        <div className="bg-gray-50 p-3 rounded-lg flex items-center justify-between border border-gray-200">
                            <span className="text-sm font-bold text-gray-700">Plazo (Meses):</span>
                            <input type="number" max={36} className="w-32 border-gray-300 rounded-lg p-1.5 text-sm text-right font-bold" value={config.months} onChange={e => setConfig({...config, months: Number(e.target.value)})}/>
                        </div>
                        
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm space-y-1">
                            <div className="flex justify-between"><span>Precio Base:</span><span>S/ {precioBase.toLocaleString()}</span></div>
                            {config.extraDiscountAmount > 0 && <div className="flex justify-between text-red-500"><span>- Dscto Extra:</span><span>S/ {config.extraDiscountAmount.toLocaleString()}</span></div>}
                            <div className="flex justify-between font-bold text-gray-800 border-t pt-1"><span>Precio Venta:</span><span>S/ {precioVenta.toLocaleString()}</span></div>
                            <div className="flex justify-between text-blue-600"><span>- Inicial:</span><span>S/ {config.initialPayment.toLocaleString()}</span></div>
                            <div className="flex justify-between font-bold text-blue-900 border-t border-blue-200 pt-1 mt-1"><span>Saldo a Financiar:</span><span>S/ {saldoAFinanciar.toLocaleString()}</span></div>
                        </div>

                        <div className="bg-blue-600 text-white p-3 rounded-lg flex items-center justify-between shadow-md">
                            <span className="text-sm font-bold">Cuota Mensual ({config.months} meses):</span>
                            <span className="text-xl font-black">S/ {cuotaMensual.toLocaleString('es-PE', {maximumFractionDigits: 2})}</span>
                        </div>
                     </>
                 )}
                 {config.isCash && (
                     <div className="bg-emerald-600 text-white p-3 rounded-lg flex items-center justify-center shadow-md">
                        <span className="text-lg font-black">PAGO ÚNICO AL CONTADO</span>
                     </div>
                 )}
             </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-bold">Cancelar</button>
          <button onClick={onSave} className="px-5 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-sm hover:bg-emerald-700 flex items-center gap-2"><Save size={18}/> Grabar</button>
          <button onClick={handlePrintPDF} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg hover:bg-indigo-700 flex items-center gap-2"><FileText size={18}/> Generar PDF</button>
        </div>
      </div>
    </div>
  );
}