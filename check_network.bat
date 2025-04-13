@echo off
echo ===== Проверка сетевых настроек =====
echo.

echo --- IP-адреса компьютера ---
ipconfig | findstr IPv4
echo.

echo --- Проверка открытости портов ---
echo Проверка порта 3000 (Frontend):
netstat -an | findstr :3000
echo.

echo Проверка порта 8000 (Backend):
netstat -an | findstr :8000
echo.

echo --- Проверка брандмауэра Windows ---
echo Проверка правил для входящих соединений:
netsh advfirewall firewall show rule name=all dir=in | findstr "NodeJS Python"
echo.

echo --- Проверка доступности приложения ---
echo Проверка доступности бэкенда:
curl -I http://localhost:8000/api/v1/
echo.

echo Проверка доступности фронтенда:
curl -I http://localhost:3000/
echo.

echo === Рекомендации ===
echo.
echo 1. Убедитесь, что оба сервиса (бэкенд и фронтенд) запущены
echo 2. Если порты не отображаются в выводе netstat, значит сервисы не запущены
echo 3. Если брандмауэр Windows блокирует соединения, выполните:
echo    - netsh advfirewall firewall add rule name="Node.js" dir=in action=allow program="C:\Program Files\nodejs\node.exe" enable=yes
echo    - netsh advfirewall firewall add rule name="Python" dir=in action=allow program="%LOCALAPPDATA%\Programs\Python\Python39\python.exe" enable=yes
echo 4. При доступе с мобильного устройства используйте IP-адрес вашего компьютера
echo    вместо localhost (например, http://192.168.1.x:3000)
echo.

pause 