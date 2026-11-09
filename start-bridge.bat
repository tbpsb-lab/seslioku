@echo off
title SesliOku Chrome Ses Koprusu
echo ========================================================
echo    SesliOku - Chrome Dogal Ses Koprusu (Edge-TTS)
echo ========================================================
echo.
echo 1. Yerel TTS Servisi (Port 3005) baslatiliyor...
start "SesliOku Bridge (3005)" cmd /k "node bridge.js"

echo 2. Guvenli HTTPS Tuneli (Localtunnel) baslatiliyor...
echo Acilan pencerede 'your url is: https://...' satiri goruntulenecektir.
start "SesliOku Tunnel (HTTPS)" cmd /k "npx --yes localtunnel --port 3005"

echo.
echo Islem tamamlandi!
echo Tarayicinizda (Chrome) SesliOku Ayarlarina girip URL'yi yapistirabilirsiniz.
echo ========================================================
pause
