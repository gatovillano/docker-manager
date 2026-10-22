# 🐳 Docker Manager (Desktop App)

Aplicación de escritorio moderna, rápida e intuitiva para la gestión integral de contenedores Docker, desarrollada con **Electron**, **React**, **Vite** y **Tailwind CSS**.

---

## ✨ Características Principales

### 📦 Gestión de Contenedores
- **Vista en tiempo real** de todos los contenedores con estado animado (*En ejecución*, *Detenido*, *Pausado*, *Reiniciando*).
- **Modos de visualización**: Cuadrícula de tarjetas modernas (Cards) o Tabla detallada.
- **Filtros rápidos** por estado y barra de búsqueda en tiempo real (por nombre, imagen, ID, puertos).
- **Acciones instantáneas**:
  - Iniciar (Play)
  - Detener (Stop)
  - Reiniciar (Restart)
  - Pausar / Reanudar (Pause / Unpause)
  - Eliminar con confirmación
- **Mapeo de puertos directo**: Clic sobre los enlaces de puertos mapeados (ej. `localhost:8088`) para abrirlos directamente en tu navegador web predeterminado.

### 📋 Visor de Logs Avanzado
- **Streaming en vivo** de logs con auto-actualización.
- **Búsqueda y filtrado** de texto dentro de los logs con resaltado de advertencias y errores.
- **Controles de visualización**:
  - Auto-scroll automático hacia las últimas líneas.
  - Selección de límite de líneas (100, 300, 1000).
  - Copiar al portapapeles con un clic.
  - Descargar los logs como archivo de texto `.txt`.
  - Limpiar vista de logs.

### 💻 Consola Interactiva (Shell Exec con xterm.js)
- Acceso a la terminal interactiva dentro del contenedor en tiempo real.
- Soporte para `/bin/bash`, `/bin/sh` y `/bin/zsh`.
- Detección de tamaño de ventana y redimensionamiento automático TTY.
- Soporte para combinaciones de teclas ANSI, colores y copy/paste.

### 📊 Métricas y Rendimiento en Vivo
- **Uso de CPU**: Porcentaje en tiempo real con gráfico sparkline de histórico reciente.
- **Memoria RAM**: Uso actual, barra porcentual y límite máximo asignado.
- **Tráfico de Red**: Bytes recibidos (RX) y transmitidos (TX).
- **I/O de Disco**: Operaciones de lectura y escritura en bloque.

### 🔍 Inspección Técnica Completa
- Datos de configuración: ID completo, fecha de creación, comandos de inicio (`Cmd`), directorio de trabajo, PID y políticas de reinicio.
- Redes asociadas: Direcciones IP locales, puertas de enlace (Gateway) y direcciones MAC.
- Puntos de montaje y volúmenes vinculados (Host vs Contenedor, RW/RO).
- Listado de variables de entorno con opción de copia en 1 clic.
- Exportación del objeto JSON completo sin procesar.

### 🚀 Crear y Arrancar Contenedores
- Modal asistido para desplegar rápidamente nuevos contenedores desde imágenes locales o de Docker Hub (`nginx:alpine`, `redis:alpine`, `postgres`, etc.).
- Configuración opcional de nombre, puertos mapeados, variables de entorno y política de reinicio.

### 🖼️ Gestión de Imágenes, Volúmenes y Redes
- **Imágenes**: Listado con tags, tamaño y fecha. Botón para eliminar imágenes y función para limpiar imágenes huérfanas (*Dangling Prune*) con reporte del espacio liberado en disco.
- **Volúmenes**: Visualización de volúmenes persistentes y limpieza de huérfanos.
- **Redes**: Exploración de redes Docker, subnets, gateways y contenedores conectados.

---

## 🚀 Inicio Rápido

### Ejecución directa:
```bash
./start.sh
```
o mediante npm:
```bash
npm start
```

### Modo Desarrollo (Hot Reload):
```bash
npm run dev
```

### Compilar paquete de producción:
```bash
npm run build
```

---

## 🛠️ Requisitos
- **Docker Engine** en ejecución. Tu usuario debe tener permisos para comunicarse con `/var/run/docker.sock` (generalmente perteneciendo al grupo `docker`: `sudo usermod -aG docker $USER`).
- **Node.js** >= 18.
