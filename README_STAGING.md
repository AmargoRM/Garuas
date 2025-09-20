# Pre-evaluación de concesión de agua superficial (staging)

Esta página de pre-evaluación se publica únicamente en el entorno de staging y debe compartirse solo con clientes que cuenten con el enlace privado.

## Acceso restringido

- Ruta completa: `/staging/concesion-superficial-4a83002e/?t=8b6a5213-7c50-4967-a0a2-35d26f260841`
- El token (`t`) es obligatorio. Sin ese parámetro la página muestra un 404 suave y no revela contenido.
- No enlazar esta URL desde la navegación pública ni incluirla en `sitemap.xml`.
- Si se requiere regenerar el token:
  1. Generar un nuevo UUID.
  2. Actualizar el atributo `data-access-token` en `staging/concesion-superficial/index.html` y `staging/concesion-superficial-4a83002e/index.html`.
  3. Ajustar la URL comunicada al cliente con el nuevo valor de `t`.

## Protección frente a motores de búsqueda

- Ambas páginas incluyen `meta` tags `noindex, nofollow` y sugerencias de cabeceras `X-Robots-Tag` en comentarios.
- Mantener bloqueado el directorio `/staging/` en `robots.txt` cuando el entorno lo permita.

## Envío de datos

- El formulario intenta enviar un `POST` JSON a `/api/pre-evaluacion`.
- Si el endpoint no existe en el entorno de staging, la aplicación hace fallback a un `mailto:info@garuas.com` con el resumen de la solicitud.
- Se registra la latitud y longitud seleccionada en el mapa junto con las respuestas del cuestionario y el estado preliminar (`admisible` o `requiere revisión`).

## Pruebas recomendadas

1. Abrir la URL con el token válido y completar el formulario con todas las respuestas favorables para verificar el mensaje de "admisible preliminar".
2. Repetir la prueba marcando respuestas que activen "requiere revisión" (por ejemplo, contestar "No" en obligaciones) y confirmar el mensaje de seguimiento en &lt;24 h.
3. Hacer clic en el mapa para confirmar que se crea y actualiza el marcador, y que los campos de latitud/longitud se llenan.
4. Revisar la consola del navegador para validar el intento de `POST` y el fallback `mailto` si no hay endpoint.

## Seguridad

- Evitar compartir la URL fuera de canales controlados.
- Si el enlace se filtra, generar un nuevo token y actualizar los archivos mencionados.
- No habilitar analytics ni scripts de terceros en esta página mientras esté en staging.
