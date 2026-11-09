# MindSharpener

Extensión de navegador para bloquear las webs que te roban la atención (YouTube, Instagram, TikTok…) mientras trabajas.

**Gratis, de código abierto y 100% local.** Sin cuentas, sin servidores, sin registros. Ver [PRIVACY.md](PRIVACY.md).

Funciona en Brave, Chrome, Edge y otros navegadores basados en Chromium (Firefox, próximamente).

## Funcionalidades

- **Sesiones de foco** de 25, 50, 90 minutos o la duración que elijas, con la tarea en la que vas a trabajar.
- **Perfiles por actividad** («Estudio», «Trabajo»…), cada uno con su lista negra o blanca. Eliges el perfil al empezar la sesión y cada horario puede usar el suyo; si coinciden varios, gana lo más estricto.
- **Lista negra o lista blanca**: bloquea solo ciertas webs, o todo excepto las que necesitas para trabajar.
- **Horarios**: el bloqueo se activa solo (p. ej. de lunes a viernes de 9:00 a 13:00), también en franjas que cruzan la medianoche.
- **Pase temporal**: si de verdad necesitas una web bloqueada, pide unos minutos (por defecto 5 min, 2 al día) pagando la misma fricción que para rendirte. Al acabar, la pestaña vuelve sola a la página de foco.
- **Atajo de teclado**: `Alt+Mayús+F` («F de foco») abre el popup con el cursor en la tarea; Enter empieza la sesión. Se puede cambiar en `brave://extensions/shortcuts`.
- **YouTube sin distracciones**: bloquea Shorts y oculta el inicio, las recomendaciones y los comentarios, durante el foco o siempre.
- **Pomodoro**: descansos cortos y largos encadenados, con notificaciones.
- **Fricción para rendirse**: elige qué cuesta terminar antes de tiempo (confirmar, esperar, escribir una frase incómoda o modo estricto).
- **Sin trampas fáciles**: con el bloqueo activo puedes endurecer las reglas, pero no relajarlas.
- **Página de foco**: en lugar de la web bloqueada verás el tiempo restante y tu tarea.
- **Progreso**: tiempo de foco de hoy frente a tu objetivo diario, racha de días cumpliéndolo y gráfica de los últimos 7 o 30 días. Solo se guardan totales por día, nunca qué webs visitas.
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
npm test          # pruebas de dominios, reglas, horarios, perfiles, pases e historial
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
  popup/               # temporizador, perfil, progreso de hoy, empezar/terminar sesión
  options/             # progreso, perfiles, horarios, YouTube, Pomodoro, fricción, pases, datos
  blocked/             # página que ves al intentar entrar en una web bloqueada (y pase temporal)
components/            # piezas compartidas (fricción para rendirse o pedir un pase)
lib/
  rules.ts             # convierte la configuración en reglas declarativeNetRequest
  policy.ts            # lógica pura: combinar perfiles, pases, historial y rachas
  profiles.ts          # perfiles y migración desde la v0.2
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
- [x] v0.3: perfiles por actividad, pase temporal, progreso con objetivo diario y atajo de teclado
- [ ] Fase 3: publicación en Chrome Web Store y Firefox Add-ons
- [ ] Fase 4: modo estricto con políticas del navegador

## Licencia

[MIT](LICENSE)
