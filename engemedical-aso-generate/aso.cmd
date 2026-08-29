@echo off
title Engemedical Connect ASO Generator

echo ==========================================
echo    Engemedical Connect ASO Generator - Auto Setup
echo ==========================================
echo:

if exist "node_modules" goto :check_build
echo [INFO] Dependencias nao encontradas. Executando npm install...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Falha ao instalar dependencias.
    pause
    exit /b %errorlevel%
)
echo [SUCCESS] Dependencias instaladas.

:check_build
if exist "dist\index.js" goto :start_app
echo [INFO] Build nao encontrado. Executando npm run build...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Falha ao realizar o build do projeto.
    pause
    exit /b %errorlevel%
)
echo [SUCCESS] Build concluido.

:start_app
echo [INFO] Iniciando aplicacao Engemedical Connect ASO Generator...
echo:

:: Set environment to production
set NODE_ENV=production

:: Execute the production runner
call npm run start

if %errorlevel% neq 0 (
    echo:
    echo [WARNING] Aplicacao finalizou com erro (code: %errorlevel%).
    pause
)

exit /b 0
