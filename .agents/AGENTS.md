# REGLAS DEL PROYECTO (OBLIGATORIAS PARA LA IA)

## Regla de Documentación Estricta en la Carpeta Context
1. Todo cambio, decisión arquitectónica, o hallazgo importante DEBE ser documentado inmediatamente en la carpeta `context/` (especialmente en `04_DECISIONES.md` y `04_MIGRATION_STATUS.md`).
2. En **TODA** interacción con el usuario (sin excepción), al final de la respuesta, la IA **debe declarar expresamente** el estado de la documentación usando el siguiente formato:
   - Si documentó algo: *"He documentado [X e Y] en la carpeta context."*
   - Si no documentó nada: *"En esta interacción no fue necesario documentar nada en la carpeta context porque [Razón]."*
Esta regla no es opcional y debe cumplirse para evitar pérdida de conocimiento entre sesiones.
## Regla de Tono y Estandar Visual (Salesforce y Espanol)
1. Queda ESTRICTAMENTE PROHIBIDO el uso de emojis (ej. palmeras, cohetes) en la interfaz grafica del CRM.
2. Queda ESTRICTAMENTE PROHIBIDO el uso de anglicismos (ej. OOO) a menos que sea el estandar tecnico inevitable. Se debe priorizar la nomenclatura corporativa y profesional de Salesforce en espanol (ej. "Fuera de Oficina").
3. Todo el texto visible en la aplicacion debe estar en espanol neutro, serio y corporativo.
