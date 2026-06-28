# REGLAS DEL PROYECTO (OBLIGATORIAS PARA LA IA)

## Regla de Documentación Estricta en la Carpeta Context
1. Todo cambio, decisión arquitectónica, o hallazgo importante DEBE ser documentado inmediatamente en la carpeta `context/` (especialmente en `04_DECISIONES.md` y `04_MIGRATION_STATUS.md`).
2. En **TODA** interacción con el usuario (sin excepción), al final de la respuesta, la IA **debe declarar expresamente** el estado de la documentación usando el siguiente formato:
   - Si documentó algo: *"He documentado [X e Y] en la carpeta context."*
   - Si no documentó nada: *"En esta interacción no fue necesario documentar nada en la carpeta context porque [Razón]."*
Esta regla no es opcional y debe cumplirse para evitar pérdida de conocimiento entre sesiones.