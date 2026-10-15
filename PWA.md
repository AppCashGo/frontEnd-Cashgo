# CashGo como PWA

CashGo se publica como una aplicación web progresiva instalable desde
`https://cashgoapp.com.co`. La misma versión web funciona en computador,
Android y iPhone, sin mantener proyectos nativos separados.

## Instalar en Android

1. Abre CashGo en Chrome.
2. Usa el botón **Instalar** que aparece dentro de la plataforma. Si no aparece,
   abre el menú de Chrome y elige **Instalar aplicación** o **Agregar a pantalla
   principal**.
3. Confirma la instalación.

## Instalar en iPhone

1. Abre CashGo en Safari.
2. Toca **Compartir**.
3. Selecciona **Agregar a inicio**, activa **Abrir como app** y toca **Agregar**.

## Comportamiento sin conexión y actualizaciones

El shell visual y los recursos estáticos visitados quedan disponibles sin
conexión después de la primera carga. Las operaciones que consultan o modifican
datos siguen necesitando Internet; las respuestas de la API no se guardan en
caché para proteger la información y evitar mostrar saldos desactualizados.

El service worker busca nuevas versiones automáticamente. La actualización se
aplica de forma segura al volver a abrir o recargar la aplicación.

## Verificación local

```bash
npm run build
npm run preview -- --host 0.0.0.0
```

Los navegadores solo permiten instalar una PWA desde HTTPS, excepto en
`localhost`. En producción el dominio debe conservar su certificado HTTPS.
