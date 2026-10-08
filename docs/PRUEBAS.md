# Verificación — TRAZVA 3.3.0

Revisión del 8 de octubre de 2026.

## Resultado comprobado

- La colección reúne 12 pares: ocho archivos GLB locales válidos y cuatro referencias de running con visor externo.
- Tres pruebas de catálogo: elegibilidad por modelo, combinación de filtros/favoritos y orden numérico con precios desconocidos al final.
- Tres pruebas de integración con D1 real de Miniflare: autenticación/origen/validación; guardado sin duplicados y aislamiento por cuenta; consultas idempotentes y borrado autorizado. El caso de producto retirado (201) se rechaza.
- Revisión de interacción DOM con JSDOM: 12 acciones, filtros de running/marca/búsqueda, restablecimiento, favoritos running, comparación, sustitución de ventanas sin desbloquear el fondo, menú con Escape y selector de estilos que incluye correr. Es una prueba de lógica de interfaz, no de renderizado visual.
- Cinco pruebas nuevas con JSDOM y API Sketchfab simulada: modelo antes del nombre, ausencia de fotos y controles anidados; carga visible de dos en dos con el ID de cada par; pausa y reanudación por visibilidad/ficha/pestaña; limpieza y errores al filtrar; retirada de la tarjeta mientras carga el SDK. No son pruebas del renderizado WebGL remoto.
- Todas las tarjetas se generan sin imágenes: ocho contienen la vista de su GLB y cuatro incorporan su modelo externo en la propia portada. El nombre queda debajo, en la información del producto. El único `img` en las páginas es el logotipo SVG.
- Se elimina el indicador `siteProgress`. El único indicador del desplazamiento es `#header::after`, actualizado al desplazar, redimensionar y cambiar la altura del contenido.
- Running ya no tiene navegación ni catálogo separados. El archivo antiguo `running.html` solo redirige hacia la colección y conserva búsquedas, productos y comparaciones compartidas.
- Los créditos y licencias se conservan. Las menciones promocionales de 3D desaparecen de la portada y las tarjetas; se conservan descripciones accesibles del visor y documentación de procedencia.

## Verificación de publicación

El flujo de publicación ejecuta la comprobación de sintaxis/rutas, la compilación del Worker y las once pruebas antes de guardar la versión. El estado final del alojamiento es la confirmación de publicación; conservar el acceso privado existente.

## Límites

No se hizo una nueva revisión visual en navegador: el perfil de previsualización disponible no admite el servidor de este proyecto estático con Worker ESM. No se afirma haber validado visualmente la carga de los cuatro modelos de Sketchfab; dependen de ese servicio externo. Los ensayos con SDK simulado comprueban la lógica de la integración. Los controles, enlaces y marcas del proveedor permanecen visibles dentro de su iframe completo. Si una miniatura falla, se compacta sin foto y la ficha mantiene el reintento y enlace original.

Los datos de fabricante y las licencias no se volvieron a investigar en esta revisión. Las pruebas históricas del 1 de octubre no se presentan como pruebas de esta edición.
