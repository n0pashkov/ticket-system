@echo off
echo ===== Запуск приложения для доступа по сети =====
echo.

echo --- Проверка IP-адреса ---
ipconfig | findstr IPv4
echo.

echo --- Остановка текущих процессов (если запущены) ---
taskkill /F /IM python.exe /FI "WINDOWTITLE eq backend*" 2>nul
taskkill /F /IM node.exe /FI "WINDOWTITLE eq frontend*" 2>nul
echo.

echo --- Добавление правил в брандмауэр ---
echo Добавление правила для Node.js...
netsh advfirewall firewall add rule name="Node.js 3000" dir=in action=allow protocol=TCP localport=3000 enable=yes
echo Добавление правила для Python...
netsh advfirewall firewall add rule name="Python 8000" dir=in action=allow protocol=TCP localport=8000 enable=yes
echo.

echo --- Запуск бэкенда ---
start "backend" cmd /k "cd ticket-system-backend && python -m app.main --host 0.0.0.0 --port 8000"
echo.

echo --- Запуск фронтенда ---
start "frontend" cmd /k "cd ticket-system-frontend && SET HOST=0.0.0.0 && npm start"
echo.

echo ===== Информация для доступа =====
echo.
echo 1. Фронтенд доступен по адресу: http://<ваш IP>:3000
echo 2. API бэкенда доступен по адресу: http://<ваш IP>:8000/api/v1/
echo 3. Обновите или добавьте в .env файл фронтенда следующую строку:
echo    REACT_APP_API_URL=http://<ваш IP>:8000/api/v1
echo.
echo Приложение запущено и готово к использованию!
echo.

pause 