# Guía de Autenticación - Andes Powder

Sistema de autenticación con Firebase Auth + PostgreSQL para funcionalidades personalizadas.

## Arquitectura

- **Firebase Authentication**: Gestión de usuarios (email/password, Google, Apple)
- **PostgreSQL**: Perfiles de usuario, favoritos, preferencias, alertas
- **Backend**: Middleware de autenticación con tokens JWT de Firebase
- **Mobile**: Context API para estado de autenticación

## Setup Paso a Paso

### 1. Crear Proyecto Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Clic en "Add project"
3. Nombre: `Andes Powder`
4. Desactiva Google Analytics (opcional)
5. Clic en "Create project"

### 2. Configurar Authentication

1. En Firebase Console → **Authentication**
2. Clic "Get started"
3. Habilita métodos de autenticación:
   - ✅ **Email/Password**
   - ⬜ Google (opcional para futuro)
   - ⬜ Apple (requerido para App Store)

### 3. Registrar App iOS

1. En Firebase Console, clic en ícono iOS
2. **iOS bundle ID**: `com.andespowder.app`
3. Descarga `GoogleService-Info.plist`
4. Guárdalo en: `mobile/GoogleService-Info.plist`

### 4. Obtener Credenciales para Backend

1. Firebase Console → **Project Settings** (ícono engranaje)
2. Tab **Service accounts**
3. Clic "Generate new private key"
4. Guarda el archivo JSON como: `backend/firebase-service-account.json`

### 5. Configurar Firebase en Mobile

Edita `mobile/config/firebase.ts` con tus credenciales:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSy...",  // De Firebase Console → Project Settings → General
  authDomain: "andes-powder.firebaseapp.com",
  projectId: "andes-powder",
  storageBucket: "andes-powder.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:ios:abc123"
};
```

**Dónde encontrar estos valores:**
- Firebase Console → Project Settings → General → Your apps → iOS app

### 6. Instalar Dependencias

**Backend:**
```bash
cd backend
npm install firebase-admin
```

**Mobile:**
```bash
cd mobile
npm install firebase @react-native-async-storage/async-storage
```

### 7. Configurar Variables de Entorno

Edita `backend/.env`:

```bash
# Opción 1: Usar archivo de servicio (recomendado)
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Opción 2: Variables individuales
# FIREBASE_PROJECT_ID=andes-powder
# FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@andes-powder.iam.gserviceaccount.com
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 8. Crear Tablas de Usuarios

```bash
cd backend
psql $DATABASE_URL -f database/auth-schema.sql
```

Esto crea:
- `users` - Perfiles de usuario
- `user_preferences` - Preferencias de notificaciones
- `user_favorite_resorts` - Resorts favoritos
- `user_powder_alerts` - Alertas personalizadas
- `user_activity` - Log de actividad

## Flujo de Usuario

### Registro (Sign Up)

1. Usuario abre app → Pantalla de login
2. Toca "Sign Up"
3. Ingresa nombre, email, password
4. **Mobile**: Crea usuario en Firebase Auth
5. **Mobile**: Llama a `POST /api/auth/signup` con Firebase UID
6. **Backend**: Crea perfil en PostgreSQL
7. Usuario redirigido a home

### Login (Sign In)

1. Usuario ingresa email y password
2. **Mobile**: Autentica con Firebase
3. Firebase devuelve token JWT
4. Token se guarda en AsyncStorage
5. Usuario redirigido a home

### Requests Autenticados

Todas las requests a endpoints protegidos incluyen el token:

```typescript
const token = await user.getIdToken();
const response = await api.get('/api/favorites', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

### Logout

1. Usuario toca "Sign Out"
2. Confirmación
3. **Mobile**: Llama a `signOut()` de Firebase
4. Token eliminado de AsyncStorage
5. Usuario redirigido a login

## Endpoints de API

### Autenticación

**POST /api/auth/signup**
- Crea perfil de usuario en PostgreSQL
- Body: `{ firebaseUid, email, displayName }`

**GET /api/auth/me** (protegido)
- Obtiene perfil del usuario actual
- Headers: `Authorization: Bearer <token>`

**PATCH /api/auth/me** (protegido)
- Actualiza perfil (displayName, photoUrl)

**PATCH /api/auth/me/preferences** (protegido)
- Actualiza preferencias de usuario

### Favoritos

**GET /api/favorites** (protegido)
- Lista resorts favoritos del usuario

**POST /api/favorites/:resortId** (protegido)
- Agrega resort a favoritos

**DELETE /api/favorites/:resortId** (protegido)
- Elimina resort de favoritos

**GET /api/favorites/check/:resortId** (protegido)
- Verifica si resort está en favoritos

## Funcionalidades Habilitadas

Con autenticación, ahora puedes agregar:

### ✅ Implementado

- Login/Signup con email y password
- Perfiles de usuario
- Favoritos de resorts
- Preferencias de usuario

### 🔜 Próximas Funcionalidades

- **Powder Alerts**: Notificaciones cuando powder score > threshold
- **Visit History**: Tracking de resorts visitados
- **Custom Alerts**: Alertas personalizadas por resort
- **Social Features**: Compartir condiciones con amigos
- **Trip Planning**: Planificador de viajes de ski

## Seguridad

### Backend

- Tokens JWT verificados en cada request
- Middleware `authenticateUser` valida tokens con Firebase Admin
- Usuario debe existir en PostgreSQL y estar activo
- Tokens expirados son rechazados automáticamente

### Mobile

- Tokens almacenados en AsyncStorage (encriptado en iOS)
- Auto-refresh de tokens por Firebase
- Logout limpia toda la sesión

### Base de Datos

- Relaciones con `ON DELETE CASCADE` para limpieza automática
- Índices en campos de búsqueda frecuente
- Timestamps automáticos en todas las tablas

## Testing

### Test Manual

1. **Signup**:
```bash
# Mobile: Crea usuario test@example.com
# Verifica en Firebase Console → Authentication
# Verifica en PostgreSQL:
psql $DATABASE_URL -c "SELECT * FROM users WHERE email = 'test@example.com';"
```

2. **Login**:
```bash
# Mobile: Login con test@example.com
# Verifica que last_login_at se actualiza
```

3. **Favoritos**:
```bash
# Mobile: Marca Cerro Catedral como favorito
# Verifica en PostgreSQL:
psql $DATABASE_URL -c "SELECT * FROM user_favorite_resorts;"
```

### Test con cURL

```bash
# 1. Obtener token (desde mobile app o Firebase Console)
TOKEN="eyJhbGciOiJSUzI1NiIsImtpZCI6..."

# 2. Test endpoint protegido
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/auth/me

# 3. Agregar favorito
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/favorites/RESORT_ID
```

## Troubleshooting

**"Firebase not initialized"**
- Verifica que `firebase-service-account.json` existe
- Verifica que `FIREBASE_SERVICE_ACCOUNT_PATH` está en `.env`

**"Invalid or expired token"**
- Token expirado, usuario debe hacer login nuevamente
- Verifica que Firebase config en mobile es correcto

**"User not found"**
- Usuario existe en Firebase pero no en PostgreSQL
- Ejecuta signup nuevamente o crea manualmente en DB

**"Cannot connect to Firebase"**
- Verifica credenciales en `mobile/config/firebase.ts`
- Verifica que `GoogleService-Info.plist` está en mobile/

## Próximos Pasos

1. ✅ Configurar Firebase
2. ✅ Instalar dependencias
3. ✅ Crear tablas de usuarios
4. ✅ Probar signup/login
5. 🔜 Implementar powder alerts
6. 🔜 Agregar notificaciones push
7. 🔜 Implementar social features
