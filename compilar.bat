@echo off
title Visor TV Web - Compilador de Produccion
color 0a

echo ===============================================================================
echo                   VISOR TV WEB - COMPILACION DE PRODUCCION
echo ===============================================================================
echo.

set WEB_DIR=%~dp0
cd /d "%WEB_DIR%"

echo [1/3] Ejecutando pruebas unitarias de frontend (Vitest)...
call npm test -- --run
if %ERRORLEVEL% NEQ 0 (
    color 0c
    echo [ERROR] Las pruebas fallaron. Corrige los errores antes de compilar.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Compilando Frontend con Vite...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    color 0c
    echo [ERROR] La compilacion con Vite fallo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Verificando archivos generados en dist/...
if not exist "%WEB_DIR%dist\index.html" (
    color 0c
    echo [ERROR] No se encontro index.html en dist.
    pause
    exit /b 1
)

if not exist "%WEB_DIR%dist\.htaccess" (
    echo [AVISO] Copiando .htaccess de SPA a dist...
    copy "%WEB_DIR%public\.htaccess" "%WEB_DIR%dist\.htaccess"
)

echo.
echo ===============================================================================
echo                    ^!COMPILACION EXITOSA EN VISOR TV WEB^!
echo ===============================================================================
echo.
echo  Los archivos compilados estan listos en:
echo  - %WEB_DIR%dist\
echo.
echo  El repositorio de visortv_web contiene tu codigo fuente y la carpeta dist/.
echo  Puedes hacer commit y push normalmente cuando lo desees.
echo.
pause
