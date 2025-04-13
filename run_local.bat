@echo off
echo Запуск приложения для локальной разработки с доступом через сеть

:: Получаем IP-адрес
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /r /c:"IPv4 Address"') do (
    set IP=%%a
    goto :foundip
)
:foundip
set IP=%IP:~1%
echo Ваш IP-адрес: %IP%

:: Обновляем .env файл с правильным IP
echo # URL API на локальном компьютере > ticket-system-frontend\.env
echo # IP адрес компьютера в локальной сети >> ticket-system-frontend\.env
echo REACT_APP_API_URL=http://%IP%:8000/api/v1 >> ticket-system-frontend\.env

:: Запускаем бэкенд в новом окне
start cmd /k "python run.py"

:: Даем бэкенду время на запуск
timeout /t 5 /nobreak

:: Запускаем фронтенд в новом окне
start cmd /k "cd ticket-system-frontend && npm start"

echo ===================================================
echo Приложение запущено!
echo Бэкенд: http://%IP%:8000
echo Фронтенд: http://%IP%:3000
echo Для доступа с телефона, подключитесь к той же сети
echo и введите в браузер http://%IP%:3000
echo ===================================================

pause 