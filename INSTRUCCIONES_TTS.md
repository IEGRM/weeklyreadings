# TTS Integration — Instrucciones

## Archivos modificados (reemplaza estos 3 en tu proyecto):
1. **index.html** — Se reemplazó `<audio>` por controles TTS (Play/Pause/Stop + Voice + Speed)
2. **audio.js** — Reescrito completamente para usar Web Speech API (SpeechSynthesis)
3. **style.css** — Se agregaron estilos TTS al final (todo lo original se mantiene)

## Archivos NO modificados (no tocar):
- `script.js` — Quiz, drag-and-drop game, week selector (funciona igual)
- `camera.js` — Cámara para screenshots (funciona igual)
- `readingTitle.js` — Título de lectura (funciona igual)
- `stop.html` — Página de bloqueo de traducción (funciona igual)
- Todos los JSON en `data/` — Misma estructura, el campo `time` simplemente se ignora

## Lo que cambió:
- ❌ Ya NO necesitas grabar audios .mp3
- ❌ Ya NO necesitas buscar timestamps en Audacity
- ❌ Ya NO necesitas el campo `time` en los JSON (se ignora, pero no rompe nada)
- ✅ El navegador genera la voz automáticamente (TTS)
- ✅ El resaltado se sincroniza con el audio real vía `onboundary` (Chrome)
- ✅ La imagen se sigue cargando normalmente
- ✅ Se eliminó la manito, solo queda el resaltado de palabras
- ✅ Vocabulario sigue funcionando con tooltips al hacer clic

## Para probar:
1. Copia los 3 archivos a tu carpeta `public/` (reemplazando los originales)
2. Abre en Google Chrome
3. Selecciona semana y grado
4. Presiona "▶ Listen"
5. Verifica que el indicador diga "Word-level sync active" (verde)

## Nota sobre el indicador de sync:
- 🟢 **Word-level** = `onboundary` activo = sync perfecto con el audio
- 🟠 **Sentence-level** = `onboundary` no disponible = sync por oración
- En Chrome desktop/Android el sync es word-level
- En Safari/iOS podría ser solo sentence-level
