@echo off
echo ==========================================
echo      INICIANDO BACKUP DO SISTEMA
echo ==========================================
echo.

:: --- CONFIGURAÇÃO DOS CAMINHOS ---

:: 1. ONDE ESTÁ O BANCO AGORA (Pasta segura do Usuário)
set "origem=%APPDATA%\SistemaCotacao\distribuidora.db"

:: 2. ONDE VAMOS GUARDAR (Cria uma pasta no seu Desktop)
set "destino=%USERPROFILE%\Desktop\Backups_Sistema"

:: Cria a pasta de backups se não existir
if not exist "%destino%" mkdir "%destino%"

:: --- LÓGICA DE DATA E HORA (A sua estava ótima, mantive) ---
set dia=%date:~0,2%
set mes=%date:~3,2%
set ano=%date:~6,4%
set hora=%time:~0,2%
set min=%time:~3,2%

:: Remove espaço da hora se for menor que 10 (ex: 9h vira 09h)
set hora=%hora: =0%

set nome_arquivo=backup_distribuidora_%ano%-%mes%-%dia%_%hora%-%min%.db

:: --- COPIA O ARQUIVO ---
echo Buscando banco de dados em:
echo %origem%
echo.

copy "%origem%" "%destino%\%nome_arquivo%" >nul

echo.
if exist "%destino%\%nome_arquivo%" (
    color 0A
    echo [SUCESSO] Backup salvo na pasta: 
    echo %destino%
    echo.
    echo Arquivo: %nome_arquivo%
) else (
    color 0C
    echo [ERRO] O banco de dados nao foi encontrado!
    echo Verifique se voce ja abriu o sistema instalado pelo menos uma vez.
)
echo.
echo Pressione qualquer tecla para sair...
pause