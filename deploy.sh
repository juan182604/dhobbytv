#!/bin/bash
# ==============================================
# DhobbyTV - Script de Despliegue Automático
# GitHub + Vercel + Supabase
# ==============================================
# 
# INSTRUCCIONES:
# 1. Crea un token de GitHub: https://github.com/settings/tokens
#    - Scopes: repo (full control of private repos)
# 2. Crea un token de Vercel: https://vercel.com/account/tokens
#    - Scope: Full Account
# 3. Crea un proyecto en Supabase: https://supabase.com
#    - Ve a Settings > Database > Connection string > URI
#    - Copia la URL de conexión
#
# USO:
#   GITHUB_TOKEN="ghp_xxxx" VERCEL_TOKEN="xxxx" SUPABASE_URL="postgresql://..." ./deploy.sh
#
# O configura las variables en el archivo .deploy-env
# ==============================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Cargar .deploy-env si existe
if [ -f ".deploy-env" ]; then
    source .deploy-env
fi

# Verificar variables obligatorias
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}ERROR: GITHUB_TOKEN no está configurada${NC}"
    echo -e "${YELLOW}Crea tu token en: https://github.com/settings/tokens${NC}"
    echo -e "Necesitas el scope: ${BLUE}repo${NC}"
    echo ""
    echo "Luego ejecuta:"
    echo "  GITHUB_TOKEN=ghp_tu_token ./deploy.sh"
    exit 1
fi

if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${RED}ERROR: VERCEL_TOKEN no está configurada${NC}"
    echo -e "${YELLOW}Crea tu token en: https://vercel.com/account/tokens${NC}"
    echo ""
    echo "Luego ejecuta:"
    echo "  VERCEL_TOKEN=tu_token ./deploy.sh"
    exit 1
fi

REPO_NAME="dhobbytv"
GITHUB_USER=$(curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user | grep -o '"login":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$GITHUB_USER" ]; then
    echo -e "${RED}ERROR: No se pudo obtener el usuario de GitHub. Verifica tu token.${NC}"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  DhobbyTV - Despliegue Automático${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Usuario GitHub: ${GREEN}$GITHUB_USER${NC}"
echo -e "Repositorio: ${GREEN}$GITHUB_USER/$REPO_NAME${NC}"
echo ""

# ==============================================
# PASO 1: Crear repositorio en GitHub
# ==============================================
echo -e "${YELLOW}[1/4] Creando repositorio en GitHub...${NC}"

HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token $GITHUB_TOKEN" \
    https://api.github.com/repos/$GITHUB_USER/$REPO_NAME)

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "  ${GREEN}✓ Repositorio ya existe${NC}"
else
    CREATE_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
        -d "{\"name\":\"$REPO_NAME\",\"description\":\"DhobbyTV - Videochat P2P con matching por hobbies\",\"private\":false,\"auto_init\":false}" \
        https://api.github.com/user/repos)
    
    if echo "$CREATE_RESPONSE" | grep -q "full_name"; then
        echo -e "  ${GREEN}✓ Repositorio creado: https://github.com/$GITHUB_USER/$REPO_NAME${NC}"
    else
        echo -e "  ${RED}✗ Error creando repositorio${NC}"
        echo "$CREATE_RESPONSE"
        exit 1
    fi
fi

# ==============================================
# PASO 2: Subir código a GitHub
# ==============================================
echo -e "${YELLOW}[2/4] Subiendo código a GitHub...${NC}"

# Configurar git
# Remove origin if exists, add new
git remote remove origin 2>/dev/null || true
git remote add origin https://$GITHUB_USER:$GITHUB_TOKEN@github.com/$GITHUB_USER/$REPO_NAME.git

git add -A
git commit -m "deploy: DhobbyTV v1.0" --allow-empty 2>/dev/null || true

git push -u origin main --force 2>&1

echo -e "  ${GREEN}✓ Código subido correctamente${NC}"

# ==============================================
# PASO 3: Desplegar en Vercel
# ==============================================
echo -e "${YELLOW}[3/4] Desplegando en Vercel...${NC}"

# Configurar Supabase si se proporcionó
if [ -n "$SUPABASE_URL" ]; then
    SUPABASE_ARG="--env DATABASE_URL=$SUPABASE_URL"
    echo -e "  ${GREEN}✓ DATABASE_URL configurada (Supabase)${NC}"
else
    SUPABASE_ARG=""
    echo -e "  ${YELLOW}⚠ DATABASE_URL no configurada - deberás agregarla en Vercel${NC}"
fi

# Deploy con Vercel CLI
echo "$VERCEL_TOKEN" | vercel --yes --token "$VERCEL_TOKEN" --prod $SUPABASE_ARG 2>&1

DEPLOY_URL=$(echo "$VERCEL_TOKEN" | vercel ls --token "$VERCEL_TOKEN" 2>/dev/null | head -1 | awk '{print $1}')

echo -e "  ${GREEN}✓ Desplegado en Vercel${NC}"
if [ -n "$DEPLOY_URL" ]; then
    echo -e "  ${GREEN}  URL: https://$DEPLOY_URL${NC}"
fi

# ==============================================
# PASO 4: Configurar base de datos en Supabase
# ==============================================
echo -e "${YELLOW}[4/4] Configurando base de datos...${NC}"

if [ -n "$SUPABASE_URL" ]; then
    echo -e "  Ejecutando migraciones de Prisma..."
    DATABASE_URL="$SUPABASE_URL" npx prisma db push 2>&1
    echo -e "  ${GREEN}✓ Tablas creadas en Supabase${NC}"
    
    # Crear super admin
    echo -e "  Creando usuario Super Admin..."
    echo -e "  ${YELLOW}  (Se creará automáticamente al acceder a /api/setup-admin)${NC}"
    echo -e "  ${GREEN}✓ Base de datos lista${NC}"
else
    echo -e "  ${YELLOW}⚠ Omitido - Configura SUPABASE_URL para migrar la DB${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  ¡DESPLIEGUE COMPLETADO!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Próximos pasos:${NC}"
echo "1. Configura la DATABASE_URL en el dashboard de Vercel si no lo hiciste"
echo "   Vercel Dashboard > tu proyecto > Settings > Environment Variables"
echo "   Nombre: DATABASE_URL"
echo "   Valor: tu URL de Supabase PostgreSQL"
echo ""
echo "2. Visita tu sitio web y accede a /api/setup-admin para crear el Super Admin"
echo "   Credenciales por defecto: admin / admin123"
echo ""
echo "3. Para el servicio de Socket.io (matchmaking), despliega el mini-service en:"
echo "   - Render.com (gratis): https://render.com"
echo "   - Railway.app (gratis): https://railway.app"
echo "   Agrega la variable SOCKET_SERVER_URL en Vercel"
echo ""
echo -e "${YELLOW}Nota: El videochat P2P requiere el servicio Socket.io separado.${NC}"
echo -e "Sin él, la web funcionará pero el matchmaking no conectará usuarios.${NC}