# Sistema de Autenticación

## Resumen
El Agente Sysadmin AI ahora incluye un sistema completo de autenticación basado en JWT para asegurar el acceso a la aplicación.

## Características

### Backend
- **Modelo de Usuario**: Almacena credenciales de usuario de forma segura con contraseñas hasheadas.
- **Tokens JWT**: Autenticación sin estado (stateless) utilizando JSON Web Tokens.
- **Hashing de Contraseñas**: Utiliza bcrypt para el almacenamiento seguro de contraseñas.
- **Rutas Protegidas**: Todos los endpoints de la API requieren autenticación.

### Frontend
- **Página de Login/Registro**: Interfaz de autenticación combinada.
- **Almacenamiento de Token**: Tokens JWT almacenados en localStorage.
- **Dashboard Protegido**: Redirección automática basada en el estado de autenticación.
- **Funcionalidad de Logout**: Limpia el token y redirige al login.

## Endpoints de la API

### Autenticación
- `POST /api/v1/auth/register` - Registrar un nuevo usuario
  - Cuerpo: `{ email, username, password, full_name? }`
  - Retorna: Objeto de usuario

- `POST /api/v1/auth/login` - Iniciar sesión y obtener token de acceso
  - Cuerpo: Datos del formulario con `username` y `password`
  - Retorna: `{ access_token, token_type }`

- `GET /api/v1/auth/me` - Obtener información del usuario actual
  - Cabeceras: `Authorization: Bearer <token>`
  - Retorna: Objeto del usuario actual

## Uso

### Configuración Inicial
1. Navega a `/login`
2. Haz clic en "¿No tienes cuenta? Regístrate"
3. Rellena email, nombre de usuario y contraseña
4. Haz clic en "Registrarse"
5. Inicia sesión con tus credenciales

### Acceso al Dashboard
1. Navega a `/login`
2. Ingresa nombre de usuario y contraseña
3. Haz clic en "Iniciar Sesión"
4. Serás redirigido a `/dashboard`

### Cerrar Sesión
Haz clic en el botón "Logout" en la cabecera del dashboard.

## Consideraciones de Seguridad

### Despliegue en Producción
1. **Cambiar SECRET_KEY**: Establece una `SECRET_KEY` fuerte y aleatoria en `.env`.
2. **Solo HTTPS**: Usa siempre HTTPS en producción.
3. **Expiración de Token**: Los tokens expiran después de `ACCESS_TOKEN_EXPIRE_MINUTES` (por defecto: 30 minutos).
4. **Requisitos de Contraseña**: Considera agregar requisitos de fortaleza de contraseña.
5. **Rate Limiting**: Agrega limitación de tasa para prevenir ataques de fuerza bruta.

### Variables de Entorno
Agregar a `backend/.env`:
```
SECRET_KEY=tu-clave-super-secreta-cambiala-en-produccion
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Esquema de Base de Datos

### Tabla de Usuarios
- `id`: Clave primaria
- `email`: Dirección de correo única
- `username`: Nombre de usuario único
- `hashed_password`: Contraseña hasheada con Bcrypt
- `full_name`: Nombre completo opcional
- `role`: Rol global (superadmin, admin, group_admin, user)
- `is_active`: Bandera booleana para usuarios activos
- `is_superuser`: Bandera booleana para usuarios superadmin
- `created_at`: Marca de tiempo
- `updated_at`: Marca de tiempo

## Implementación Técnica

### Hashing de Contraseñas
```python
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
```

### Creación de Token JWT
```python
from jose import jwt
access_token = jwt.encode({"sub": username}, SECRET_KEY, algorithm=ALGORITHM)
```

### Rutas Protegidas
```python
from dependencies import get_current_active_user

@router.get("/protected")
def protected_route(current_user: User = Depends(get_current_active_user)):
    return {"message": f"Hola {current_user.username}"}
```

## Mejoras Futuras
- [ ] Verificación de correo electrónico
- [ ] Funcionalidad de restablecimiento de contraseña
- [ ] Autenticación de dos factores (2FA)
- [ ] Integración OAuth (Google, GitHub)
- [x] Control de acceso basado en roles (RBAC) - **Implementado**
- [ ] Gestión de sesiones
- [ ] Tokens de refresco
