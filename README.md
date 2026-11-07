# MindSharpener

Extensión de navegador para bloquear las webs que te roban la atención (YouTube, Instagram, TikTok…) mientras trabajas.

**Gratis, de código abierto y 100% local.** Sin cuentas, sin servidores, sin registros. Ver [PRIVACY.md](PRIVACY.md).

Funciona en Brave, Chrome, Edge y otros navegadores basados en Chromium (Firefox, próximamente).

## Funcionalidades

- **Sesiones de foco** de 25, 50, 90 minutos o la duración que elijas, con la tarea en la que vas a trabajar.
- **Lista negra o lista blanca**: bloquea solo ciertas webs, o todo excepto las que necesitas para trabajar.
- **Horarios**: el bloqueo se activa solo (p. ej. de lunes a viernes de 9:00 a 13:00), también en franjas que cruzan la medianoche.
- **YouTube sin distracciones**: bloquea Shorts y oculta el inicio, las recomendaciones y los comentarios, durante el foco o siempre.
- **Pomodoro**: descansos cortos y largos encadenados, con notificaciones.
- **Fricción para rendirse**: elige qué cuesta terminar antes de tiempo (confirmar, esperar, escribir una frase incómoda o modo estricto).
- **Sin trampas fáciles**: con el bloqueo activo puedes endurecer las reglas, pero no relajarlas.
- **Página de foco**: en lugar de la web bloqueada verás el tiempo restante y tu tarea.
- **Estadísticas locales**: tiempo en foco, sesiones completadas y distracciones evitadas.
- **Español e inglés**, automático según el navegador o a elegir.
- **Exportar e importar** toda la configuración en JSON.

## Instalación (desde el código)

**Opción rápida:** descarga el `.zip` de la [última release](https://github.com/davidAra-ship-it/mindsharpener/releases/latest) y descomprímelo. Después sigue los pasos de abajo eligiendo esa carpeta.

**Desde el código:** necesitas [Node.js](https://nodejs.org/) 22.18 o superior.

```bash
git clone https://github.com/davidAra-ship-it/mindsharpener.git
cd mindsharpener
npm install
npm run build
```

Después, en Brave (o Chrome):

1. Abre `brave://extensions` (o `chrome://extensions`).
2. Activa el **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida** y elige la carpeta descomprimida del `.zip` o, si la has compilado tú, `.output/chrome-mv3`.
4. Opcional: en los detalles de la extensión, activa **Permitir en modo incógnito** para que el bloqueo también funcione ahí.

## Desarrollo

```bash
npm run dev       # abre un navegador con la extensión y recarga en caliente
npm run compile   # comprobación de tipos
npm test          # pruebas de dominios, reglas y horarios
npm run zip       # genera el .zip para publicar
```

> `npm run dev` abre Chrome por defecto. Para usar Brave, crea un archivo `web-ext.config.ts` (está en `.gitignore`):
>
> ```ts
> import { defineWebExtConfig } from 'wxt';
> export default defineWebExtConfig({
>   binaries: { chrome: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe' },
> });
> ```

### Estructura

```
entrypoints/
  background.ts        # decide si hay bloqueo (sesión u horario), aplica reglas, Pomodoro
  youtube.content.ts   # oculta Shorts, inicio, recomendaciones y comentarios
  popup/               # temporizador, empezar/terminar sesión, descansos
  options/             # listas, horarios, YouTube, Pomodoro, fricción, idioma, datos
  blocked/             # página que ves al intentar entrar en una web bloqueada
lib/
  rules.ts             # convierte la configuración en reglas declarativeNetRequest
  schedule.ts          # lógica de horarios
  session.ts           # sesiones de foco y descansos
  storage.ts           # datos guardados en local
  i18n.ts              # textos en español e inglés
public/_locales/       # nombre y descripción de la extensión por idioma
```

> Los selectores de `youtube.content.ts` dependen del HTML de YouTube. Si YouTube cambia su diseño y algo deja de ocultarse, ese es el archivo que hay que actualizar.

## Hoja de ruta

- [x] Fase 1: sesiones de foco, lista de bloqueo, página de foco y estadísticas
- [x] Fase 2: horarios, lista blanca, YouTube sin distracciones, Pomodoro, fricción para desbloquear e inglés
- [ ] Fase 3: publicación en Chrome Web Store y Firefox Add-ons
- [ ] Fase 4: modo estricto con políticas del navegador

## Licencia

[MIT](LICENSE)
