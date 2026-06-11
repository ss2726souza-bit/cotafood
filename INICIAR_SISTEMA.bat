@echo off
title Iniciando Cotador Ferperez...

:: 1. Inicia o servidor e minimiza a janela preta automaticamente
start /min "Servidor Cotador - NAO FECHE" node server.js

:: 2. Espera 2 segundos para o servidor carregar
timeout /t 2 /nobreak >nul

:: 3. Abre o navegador
start http://localhost:3000

:: 4. Fecha esta janela de comando (a do servidor continua minimizada)
exit