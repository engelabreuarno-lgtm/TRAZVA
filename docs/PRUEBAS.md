# Verificación — TRAZVA 3.4.0

16 de octubre de 2026.

## Resultado

19 pruebas automatizadas pasan:

- 6 de API y D1 local: autenticación/origen/validación, selección aislada e idempotente, consultas idempotentes, registro con versión legal e identidad del proveedor, configuración bancaria solo administradora y sin filtración pública, exportación/borrado aislados por usuario.
- 3 de catálogo: solo productos con modelo, filtros combinados y orden de precios/datos técnicos.
- 6 de miniaturas: formato, carga de dos en dos, pausa por visibilidad, limpieza al filtrar, retirada durante carga del SDK y consentimiento con bloqueo inicial/revocación. SDK simulado.
- 4 de interfaz: registro sin casillas premarcadas y reintentos conservando datos, acceso anónimo mediante enlace nativo, panel oculto ante rechazo de permisos y preferencias de cookies reabribles/caducadas/inválidas. JSDOM, no navegador visual.

Comprobación adicional de sintaxis y rutas locales, construcción del Worker y revisión del SQL aditivo generado por Drizzle. Las pruebas aplican ambas migraciones en una D1 de Miniflare aislada; no escriben datos ficticios en producción.

## Límites de verificación

El entorno administrado no dispone de la conexión `$control-browser` que exige el flujo de Sites. No se inició un servidor de previsualización alternativo ni se afirma haber ejecutado revisión visual en escritorio/móvil o el inicio de sesión real del proveedor. Las interacciones de formularios se probaron con DOM y respuestas simuladas; las rutas de datos, permisos y migraciones, con Worker y D1 locales. El renderizado WebGL de Sketchfab sigue sin comprobarse visualmente.

La publicación queda verificada por el estado final del alojamiento. Se conserva el Site privado y se sincroniza el mismo código con GitHub.

## Preparación comercial

No hay pagos ni pedidos reales. La administración debe completar su identidad, contacto, dirección, país y datos bancarios. Las políticas completas distinguen las funciones actuales de las condiciones que regirán los pedidos confirmados al habilitar ventas. Referencias: leyes 358-05 y 172-13 y registro de contratos de adhesión de Pro Consumidor. POLITICAS-COMERCIALES.md documenta datos pendientes y el compromiso propuesto de orden de reembolso en siete días hábiles. No se promete conformidad jurídica universal.
