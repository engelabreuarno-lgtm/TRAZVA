# Verificación — TRAZVA 3.2.0

Revisión del 7 de octubre de 2026.

## Resultado comprobado

- La colección reúne 12 pares: ocho archivos GLB locales válidos y cuatro referencias de running con visor externo.
- Tres pruebas de catálogo: elegibilidad por modelo, combinación de filtros/favoritos y orden numérico con precios desconocidos al final.
- Tres pruebas de integración con D1 real de Miniflare: autenticación/origen/validación; guardado sin duplicados y aislamiento por cuenta; consultas idempotentes y borrado autorizado. El caso de producto retirado (201) se rechaza.
- Revisión de interacción DOM con JSDOM: 12 acciones, filtros de running/marca/búsqueda, restablecimiento, favoritos running, comparación, sustitución de ventanas sin desbloquear el fondo, menú con Escape y selector de estilos que incluye correr. Es una prueba de lógica de interfaz, no de renderizado visual.
- Todas las tarjetas se generan sin imágenes. Ocho contienen la vista de su GLB; cuatro abren el modelo externo desde la ficha. El único `img` en las páginas es el logotipo SVG.
- Se elimina el indicador `siteProgress`. El único indicador del desplazamiento es `#header::after`, actualizado al desplazar, redimensionar y cambiar la altura del contenido.
- Running ya no tiene navegación ni catálogo separados. El archivo antiguo `running.html` solo redirige hacia la colección y conserva búsquedas, productos y comparaciones compartidas.
- Los créditos y licencias se conservan. Las menciones promocionales de 3D desaparecen de la portada y las tarjetas; se conservan descripciones accesibles del visor y documentación de procedencia.

## Verificación de publicación

El flujo de publicación ejecuta la comprobación de sintaxis/rutas, la compilación del Worker y las seis pruebas antes de guardar la versión. El estado final del alojamiento es la confirmación de publicación; conservar el acceso privado existente.

## Límites

No se hizo una nueva revisión visual en navegador: el perfil de previsualización disponible no admite el servidor de este proyecto estático con Worker ESM. No se afirma haber validado visualmente la carga de los cuatro modelos de Sketchfab; dependen de ese servicio externo. Sus estados de carga, reintento, error y cierre se conservan.

Los datos de fabricante y las licencias no se volvieron a investigar en esta revisión. Las pruebas históricas del 1 de octubre no se presentan como pruebas de esta edición.
