# 🚀 Guía de Producción y Despliegue Seguro

Este documento detalla el procedimiento oficial para generar versiones de producción del **AI Sysadmin Agent**, asegurando la protección del código fuente y la integridad del sistema.

## 📦 Generación de una Nueva Versión (Release)

Para distribuir una actualización a los clientes o servidores de producción, utilizamos el script automatizado `package_release.sh`.

### Qué hace este script:
1.  **Construye** las imágenes Docker de Backend y Frontend.
2.  **Protege el código Backend**: Compila Python a Bytecode (`.pyc`) y **elimina** los archivos fuente (`.py`) de la imagen final.
3.  **Exporta** las imágenes a archivos `.tar.gz`.
4.  **Empaqueta** todo en un archivo distribuible `ai-sysadmin-release.tar.gz` que incluye un instalador interactivo.

### Pasos para generar:

1.  Asegúrate de estar en la rama correcta (ej. `main`) y tener los últimos cambios.
2.  Ejecuta el script de empaquetado:
    ```bash
    ./package_release.sh
    ```
3.  Al finalizar, obtendrás el archivo:
    `ai-sysadmin-release.tar.gz`

Este es el **único** archivo que necesitas enviar al servidor de producción.

---

## ☁️ Despliegue en Producción (Instalación Nueva)

1.  Copiar `ai-sysadmin-release.tar.gz` al servidor.
2.  Descomprimir:
    ```bash
    tar -xzf ai-sysadmin-release.tar.gz
    ```
3.  Entrar al directorio y ejecutar el instalador:
    ```bash
    cd dist
    ./install.sh
    ```
4.  Seguir las instrucciones en pantalla para configurar dominio, SSL y usuario administrador.

---

## 🔄 Actualización de una Instalación Existente

Para actualizar un servidor que ya tiene el sistema corriendo:

1.  **Generar** el nuevo paquete `ai-sysadmin-release.tar.gz` en tu máquina de desarrollo.
2.  **Copiar** el archivo al servidor de producción.
3.  **Descomprimir** el paquete nuevo (puedes sobreescribir la carpeta `dist` anterior o usar una nueva).
4.  **Cargar las nuevas imágenes Docker**:
    ```bash
    cd dist
    # Cargar imágenes actualizadas (sobrescribe las anteriores)
    docker load < images/backend.tar.gz
    docker load < images/frontend.tar.gz
    # (Opcional: cargar nginx/postgres si cambiaron)
    ```
5.  **Reiniciar los servicios** para aplicar cambios:
    ```bash
    # Si estás en la carpeta donde corre el docker-compose actual (usualmente dist/)
    sudo docker compose down
    sudo docker compose up -d
    ```
    *Nota: `down` y `up` es preferible a `restart` para asegurar que se recreen los contenedores con las nuevas imágenes.*

6.  **Verificar migraciones**: El contenedor de backend aplicará automáticamente cualquier migración de base de datos pendiente al iniciar.

---

## 🛡️ Medidas de Seguridad Implementadas

1.  **Ofuscación de Código**:
    - El `Dockerfile.backend` incluye pasos para compilar a bytecode y borrar fuentes.
    - Nadie con acceso al contenedor puede leer el código original fácilmente.

2.  **Imágenes Mínimas**:
    - Frontend usa `distroless` (sin shell, sin gestores de paquetes).
    - Backend usa `python-slim` y `.dockerignore` estricto.

3.  **Secretos**:
    - No se incluyen secretos en las imágenes.
    - Todas las credenciales se configuran vía variables de entorno en el servidor destino.

4.  **SSL**:
    - Nginx configurado con TLS 1.2/1.3.
    - Soporte para certificados propios o autofirmados.
