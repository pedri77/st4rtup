#!/bin/bash

# Script de desarrollo para la extensión de Zoho Mail
# Uso: ./dev.sh [comando]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Riskitera Sales - Zoho Mail Extension${NC}\n"

case "$1" in
  "init")
    echo -e "${YELLOW}📦 Instalando dependencias...${NC}"
    npm install -g zoho-extension-toolkit
    echo -e "${GREEN}✅ Zoho Extension Toolkit instalado${NC}"
    ;;

  "dev")
    echo -e "${YELLOW}🔧 Iniciando servidor de desarrollo...${NC}"
    echo -e "${YELLOW}Abre Zoho Mail y activa el modo desarrollador${NC}"
    echo -e "${YELLOW}URL: https://localhost:3000${NC}\n"
    zet run
    ;;

  "validate")
    echo -e "${YELLOW}🔍 Validando extensión...${NC}"
    zet validate
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✅ Extensión válida${NC}"
    else
      echo -e "${RED}❌ Errores encontrados${NC}"
      exit 1
    fi
    ;;

  "pack")
    echo -e "${YELLOW}📦 Empaquetando extensión...${NC}"
    zet pack
    echo -e "${GREEN}✅ Extensión empaquetada en dist/${NC}"
    ;;

  "test")
    echo -e "${YELLOW}🧪 Ejecutando tests...${NC}"
    echo -e "${YELLOW}(Tests no implementados aún)${NC}"
    ;;

  "docs")
    echo -e "${YELLOW}📚 Abriendo documentación...${NC}"
    if command -v xdg-open > /dev/null; then
      xdg-open README.md
    elif command -v open > /dev/null; then
      open README.md
    else
      echo -e "${YELLOW}Abre manualmente: README.md${NC}"
    fi
    ;;

  "clean")
    echo -e "${YELLOW}🧹 Limpiando archivos generados...${NC}"
    rm -rf .zet/ dist/ *.zip node_modules/
    echo -e "${GREEN}✅ Limpieza completada${NC}"
    ;;

  *)
    echo -e "${YELLOW}Uso: ./dev.sh [comando]${NC}\n"
    echo "Comandos disponibles:"
    echo "  init      - Instalar Zoho Extension Toolkit"
    echo "  dev       - Iniciar servidor de desarrollo"
    echo "  validate  - Validar la extensión"
    echo "  pack      - Empaquetar para producción"
    echo "  test      - Ejecutar tests"
    echo "  docs      - Abrir documentación"
    echo "  clean     - Limpiar archivos generados"
    echo ""
    echo -e "${YELLOW}Ejemplo:${NC} ./dev.sh dev"
    ;;
esac
