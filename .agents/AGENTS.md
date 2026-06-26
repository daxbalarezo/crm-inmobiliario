# Reglas de Arquitectura UI (Design Tokens)

* A partir de ahora, todas las tablas, tarjetas y botones en la UI deben usar exclusivamente las clases nativas globales de SLDS (ej. `slds-table`, `slds-card`, `slds-button`).
* Está PROHIBIDO usar clases locales de módulos CSS (como `styles.table`, `styles.card` o `styles.button`) para definir estructuras visuales principales, con el fin de garantizar herencia tipográfica, padding y espaciado consistente del Design System.

# Política Obligatoria de Documentación (Obsidian Brain)

A partir de este momento, toda modificación importante del proyecto debe quedar documentada automáticamente en los archivos Markdown de la carpeta `context/` sin que el usuario tenga que solicitarlo.

## Eventos que requieren documentación obligatoria
* Creación de una nueva funcionalidad, integraciones, autenticación, cambios en arquitectura, modelos de datos, migraciones, corrección de bugs, dependencias o antes/después de commits.

## Regla principal
Ninguna tarea se considera completada hasta que la documentación correspondiente haya sido creada o actualizada. No preguntes si deseas documentar el cambio, asume que es obligatorio. Si detectas un cambio significativo y la documentación no ha sido actualizada, detén el flujo y actualízala primero.

## Archivos de documentación a mantener
* `context/01_ESTADO_ACTUAL.md` (Para progreso de tareas)
* `context/02_ARQUITECTURA.md` (Para cambios estructurales)
* `context/04_DECISIONES.md` (Para justificar librerías o patrones)
* `context/05_CHANGELOG.md` (Para un historial de modificaciones)

## Formato de registro en CHANGELOG
Cada cambio documentado debe incluir:
* Fecha y hora.
* Objetivo del cambio, Archivos modificados, Descripción técnica, Impacto y Próximos pasos.

## Reglas de Convenciones (03_CONVENCIONES.md)
* Siempre que resolvamos un bug técnico, tomemos una decisión de diseño UX/UI o hagamos un cambio de arquitectura, debes agregar la regla automáticamente al archivo `context/03_CONVENCIONES.md` antes de finalizar tu respuesta, sin esperar a que el usuario pida que se documente.

## Inicialización Obligatoria (Lectura de Contexto)
* AL INICIAR UNA NUEVA CONVERSACIÓN O SESIÓN: Antes de empezar a escribir código o planificar una solución, DEBES usar la herramienta `list_dir` o `view_file` para leer activamente los archivos en la carpeta `context/` (especialmente `04_MIGRATION_STATUS.md`, `01_ESTADO_ACTUAL.md` y `03_CONVENCIONES.md`). Esto garantiza que tengas todo el contexto necesario, los patrones arquitectónicos en curso (como la migración a Supabase) y las reglas de UI/UX cargadas en tu memoria antes de actuar.
