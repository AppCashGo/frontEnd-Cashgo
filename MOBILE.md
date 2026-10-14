# CashGo móvil

CashGo usa Capacitor para compartir el frontend de producción entre Web,
Android e iOS.

## Identidad de la aplicación

- Nombre: `CashGo`
- Identificador Android/iOS: `co.com.cashgoapp.mobile`
- Esquema de enlaces: `cashgo://`
- API móvil: `https://cashgoapp.com.co/api`

El identificador debe considerarse definitivo antes de publicar la primera
versión en Google Play o App Store. Cambiarlo después crea una aplicación
distinta para las tiendas.

## Requisitos

- Node.js 22 o superior.
- Android Studio 2025.2.1 o superior con Android SDK 36.
- Para iOS: macOS con Xcode 26 o superior y una cuenta de Apple Developer.

## Flujo de desarrollo

```bash
npm install
npm run mobile:sync
```

Abrir Android:

```bash
npm run mobile:android
```

Abrir iOS:

```bash
npm run mobile:ios
```

Después de cada cambio web, ejecuta `npm run mobile:sync` antes de compilar.

## Publicación

- Android se distribuye como APK para pruebas y como AAB firmado para Google
  Play.
- iOS se archiva y firma desde Xcode para distribuirse por TestFlight y App
  Store.
- Los enlaces universales requieren publicar los archivos de asociación del
  dominio cuando estén disponibles el Team ID de Apple y la huella SHA-256 del
  certificado Android.
- El acceso con Google debe registrar clientes OAuth nativos separados para
  Android e iOS antes de la publicación.
