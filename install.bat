@echo off
REM Script de instalación y configuración del Backend CIP (Windows)
REM Ejecuta este script desde PowerShell en la carpeta raíz del proyecto

echo.
echo ==========================================
echo Instalacion del Backend CIP
echo ==========================================
echo.

setlocal enabledelayedexpansion

REM Colores para output (Windows requiere herramientas adicionales, simplificado)

REM Paso 1: Instalar dependencias
echo [1/5] Instalando dependencias...
cd back-cip
pip install -r requirements.txt
if errorlevel 1 (
    echo Error al instalar dependencias
    pause
    exit /b 1
)
echo Dependencias instaladas correctamente
echo.

REM Paso 2: Crear migraciones
echo [2/5] Creando migraciones...
python manage.py makemigrations
if errorlevel 1 (
    echo Error al crear migraciones
    pause
    exit /b 1
)
echo Migraciones creadas
echo.

REM Paso 3: Aplicar migraciones
echo [3/5] Aplicando migraciones a la base de datos...
python manage.py migrate
if errorlevel 1 (
    echo Error al aplicar migraciones
    pause
    exit /b 1
)
echo Migraciones aplicadas
echo.

REM Paso 4: Crear directorios de media
echo [4/5] Creando directorios necesarios...
if not exist media mkdir media
if not exist media\tramites mkdir media\tramites
if not exist media\tramites\fotos mkdir media\tramites\fotos
if not exist media\tramites\titulos mkdir media\tramites\titulos
if not exist media\tramites\vouchers mkdir media\tramites\vouchers
if not exist staticfiles mkdir staticfiles
echo Directorios creados
echo.

REM Paso 5: Colectar archivos estáticos
echo [5/5] Recolectando archivos estáticos...
python manage.py collectstatic --noinput
if errorlevel 1 (
    echo Error al recolectar archivos estáticos
    pause
    exit /b 1
)
echo Archivos estáticos recolectados
echo.

REM Resumen final
echo ==========================================
echo Instalacion completada exitosamente!
echo ==========================================
echo.
echo Proximos pasos:
echo.
echo 1. Crear superusuario:
echo    python manage.py createsuperuser
echo.
echo 2. Cargar datos iniciales:
echo    psql -U cip_user -d cip_db -f ..\init-db\init.sql
echo.
echo 3. Iniciar servidor de desarrollo:
echo    python manage.py runserver
echo.
echo 4. Acceder a:
echo    - Admin: http://localhost:8000/admin/
echo    - API: http://localhost:8000/api/
echo.
pause
