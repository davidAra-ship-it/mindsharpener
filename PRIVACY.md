# Política de privacidad de MindSharpener

**MindSharpener no recopila, envía ni vende ningún dato.**

- Toda la configuración (webs bloqueadas, sesiones y estadísticas) se guarda únicamente en el almacenamiento local de tu navegador (`chrome.storage.local`).
- No hay servidores, cuentas, analítica, telemetría ni cookies de terceros.
- La extensión no lee tu historial ni el contenido de las páginas. El bloqueo se hace con la API `declarativeNetRequest`: el navegador compara las URLs con tu lista sin que la extensión las vea.
- El permiso de acceso a todos los sitios (`<all_urls>`) se usa solo para poder redirigir las webs bloqueadas a la página de foco de la extensión y, en youtube.com, para ocultar Shorts, recomendaciones y comentarios con CSS. El script de YouTube no lee ni envía nada.
- El permiso de notificaciones se usa solo para avisarte cuando termina una sesión o un descanso.

El código es abierto: puedes comprobar todo lo anterior tú mismo.
