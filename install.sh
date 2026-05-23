#!/bin/bash
# Script de instalación y configuración del Backend CIP
# Ejecuta este script desde la carpeta raíz del proyecto

echo "=========================================="
echo "🚀 Instalación del Backend CIP"
echo "=========================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Paso 1: Instalar dependencias
echo -e "${YELLOW}[1/5] Instalando dependencias...${NC}"
cd back-cip
pip install -r requirements.txt
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencias instaladas correctamente${NC}"
else
    echo -e "${RED}✗ Error al instalar dependencias${NC}"
    exit 1
fi
echo ""

# Paso 2: Crear migraciones
echo -e "${YELLOW}[2/5] Creando migraciones...${NC}"
python manage.py makemigrations
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migraciones creadas${NC}"
else
    echo -e "${RED}✗ Error al crear migraciones${NC}"
    exit 1
fi
echo ""

# Paso 3: Aplicar migraciones
echo -e "${YELLOW}[3/5] Aplicando migraciones a la base de datos...${NC}"
python manage.py migrate
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migraciones aplicadas${NC}"
else
    echo -e "${RED}✗ Error al aplicar migraciones${NC}"
    exit 1
fi
echo ""

# Paso 4: Crear directorio de media
echo -e "${YELLOW}[4/5] Creando directorios necesarios...${NC}"
mkdir -p media/tramites/fotos
mkdir -p media/tramites/titulos
mkdir -p media/tramites/vouchers
mkdir -p staticfiles
echo -e "${GREEN}✓ Directorios creados${NC}"
echo ""

# Paso 5: Colectar archivos estáticos
echo -e "${YELLOW}[5/5] Recolectando archivos estáticos...${NC}"
python manage.py collectstatic --noinput
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Archivos estáticos recolectados${NC}"
else
    echo -e "${RED}✗ Error al recolectar archivos estáticos${NC}"
    exit 1
fi
echo ""

# Resumen final
echo "=========================================="
echo -e "${GREEN}✓ Instalación completada exitosamente${NC}"
echo "=========================================="
echo ""
echo "Próximos pasos:"
echo "1. Crear superusuario:"
echo "   python manage.py createsuperuser"
echo ""
echo "2. Cargar datos iniciales:"
echo "   psql -U cip_user -d cip_db -f ../init-db/init.sql"
echo ""
echo "3. Iniciar servidor de desarrollo:"
echo "   python manage.py runserver"
echo ""
echo "4. Acceder a:"
echo "   - Admin: http://localhost:8000/admin/"
echo "   - API: http://localhost:8000/api/"
echo "   - Docs: Ver API_ENDPOINTS.md y SETUP_BACKEND.md"
echo ""
