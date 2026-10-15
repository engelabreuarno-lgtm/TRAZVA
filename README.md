# TRAZVA — Tenis con carácter

Una sola colección con 12 referencias visibles: 8 modelos GLB locales y 4 modelos de running con visor externo. La interfaz no muestra fotografías de producto. Los seis modelos investigados sin 3D integrado están fuera del catálogo visible, el buscador y el comparador.

## Ejecutar

Requiere Node.js compatible con Wrangler. Desde la raíz:

```sh
npm ci
npm run db:local
npm run dev
```

Para editar solo el frontend, se puede servir `web/` con HTTP. El guardado requiere la API y D1. La API necesita la identidad que aporta el acceso privado de Sites. Las pruebas locales inyectan una identidad ficticia exclusivamente desde el cliente de pruebas; el código de producción no tiene bypass de desarrollo.

## Organización

| Ruta | Responsabilidad |
| --- | --- |
| web/ | Fuente HTML, CSS, módulos, imágenes, modelos y visor local |
| web/js/data/catalog.js | Archivo lifestyle y unión del catálogo |
| web/js/data/running.js | Investigación de diez fichas; exporta únicamente cuatro con modelo 3D |
| web/js/features/model-preview.js | Miniaturas locales y externas; visibilidad y limpieza al filtrar |
| web/js/features/external-preview.js | Carga de modelos externos de dos en dos y pausa fuera de pantalla |
| web/css/dimensional.css | Presentación compartida sin fotografías de producto |
| web/js/features/running.js | Fichas running, comparación y guardado desde la colección |
| web/js/features/catalog-query.js | Filtros y orden compartidos, sin dependencias del DOM |
| web/js/redirect-running.js | Compatibilidad con enlaces antiguos |
| web/js/features/studio.js | Rotación guardada, exportación y consultas |
| web/js/features/studio-api.js | Cliente de la API privada |
| server/ | Worker, validación y acceso a D1 |
| db/schema.ts | Esquema de datos |
| drizzle/ | Migraciones generadas; no editar tras publicarlas |
| scripts/ | Comprobación y construcción reproducible |
| dist/ | Salida generada: cliente, Worker y metadatos |
| docs/ | Marca, fuentes running, pruebas y preparación comercial |

## Funcionalidad

- Una colección con búsqueda, filtros por estilo y marca, favoritos y orden.
- Running integrado en la colección, con filtro por entrenamiento y orden por peso/drop.
- Comparación de hasta tres pares con enlace compartible.
- Selector de estilo y entrenamiento, sin puntuaciones inventadas.
- Rotación privada guardada en D1, con exportación y borrado.
- Consultas guardadas con referencia, sin correo saliente ni pedido.
- Validación de servidor, autenticación, separación por usuario y comprobación de origen.
- Guardado idempotente y errores recuperables conservando el formulario.
- Las tarjetas running muestran su modelo en la portada y el nombre debajo, con el mismo formato que la colección. El visor externo conserva sus controles y créditos.
- Los modelos externos solo se cargan con permiso de contenido externo y al acercarse al área visible, con un máximo de dos inicializaciones simultáneas. Se pausan fuera de pantalla, con una ficha abierta o al ocultar la pestaña; se eliminan al filtrar o retirar la tarjeta.
- La ficha conserva su visor ampliado y el reintento de carga. Los resultados pequeños del asesor abren la ficha; no anidan un visor interactivo dentro de un botón.
- Las miniaturas locales son renders GLB; se cargan al acercarse al área visible y giran con hover o foco, respetando movimiento reducido.
- Si falla el visor externo, el panel se compacta con reintento y enlace al proveedor; no muestra una foto de sustitución.
- Movimiento reducido, navegación por teclado y diseño adaptable.

Las selecciones running y consultas se guardan en la cuenta. El archivo lifestyle conserva la bolsa y favoritos locales anteriores por compatibilidad. La bolsa sigue siendo una simulación con precios ilustrativos; no procesa compras.

## Editar y verificar

```sh
npm run check
npm run db:generate  # solo al cambiar el esquema
npm run build
npm test
```

No modificar vendor ni redistribuir modelos sin conservar sus créditos. Los enlaces sociales solo se activan al configurar URLs verificadas en web/js/data/brand.js. No poner secretos en el frontend. La publicación usa el proyecto Sites existente; conserva el acceso privado.

## Estado comercial

TRAZVA es la nueva identidad de trabajo. No se ha registrado una empresa o marca, creado perfiles sociales, comprado dominio, contratado proveedores ni activado pagos. Inventario, cuentas comerciales y cobros requieren los datos del titular. Las fichas de fabricante no representan existencias.

## Última revisión

Consulta `docs/PRUEBAS.md` para distinguir las verificaciones actuales de las pruebas históricas. Las 19 pruebas cubren catálogo, D1, perfiles, permisos de administración, exportación y borrado, consentimiento y el ciclo de las miniaturas. Se revisaron filtros, favoritos, comparación, menú y selector con interacciones DOM. Los ensayos de miniaturas usan una API de Sketchfab simulada: no verifican el renderizado del proveedor. El perfil de previsualización no admite este servidor, por lo que no se afirma una revisión visual nueva. La publicación se realiza sobre el mismo proyecto privado mediante su flujo de versiones.

## Cuenta, privacidad y transferencias — 3.4.0

- `iniciar-sesion.html` utiliza el inicio de sesión nativo de ChatGPT Sites; `registro.html` crea un perfil de TRAZVA asociado a esa identidad. No hay contraseña adicional ni autenticación simulada.
- `cuenta.html` permite editar el nombre, descargar los datos y borrar perfil, selecciones y consultas de ese usuario. No elimina la cuenta del proveedor ni datos comerciales.
- `privacidad.html`, `terminos.html`, `cookies.html` y `envios-cambios.html` describen las funciones reales de prelanzamiento. Identidad comercial, contacto y país se completan desde la administración. Revisión legal pendiente antes de aceptar ventas.
- El permiso de contenido externo está desactivado por defecto y vence tras 180 días. Rechazarlo bloquea el SDK y los iframes; retirarlo elimina los visores activos. No se añaden publicidad ni analítica.
- `administracion.html` configura identidad comercial y banco/titular/tipo/número/moneda/instrucciones. Solo permite la identidad autenticada cuyo correo coincide con `TRAZVA_ADMIN_EMAIL`, configurado en el entorno del servidor. Sin esa variable, el acceso administrativo queda denegado.
- Los datos bancarios se guardan en D1 y permanecen privados: no salen en `/api/store`, la exportación del usuario ni en el catálogo. Guardarlos no activa cobros.
- Migración aditiva `0001_wandering_flatman.sql`: tablas `profiles` y `store_settings`. No modificar la migración previa. Las pruebas usan datos ficticios y base local aislada.

La configuración de la identidad administradora no modifica quién puede entrar al Site: se conserva su acceso privado. No hay servicio de contraseñas, verificación de transferencias, pedidos reales ni correos automáticos.
