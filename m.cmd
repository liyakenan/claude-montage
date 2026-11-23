@echo off
setlocal
if exist "%~dp0.node\node.exe" set "PATH=%~dp0.node;%PATH%"
node "%~dp0tools\cli.mjs" %*
