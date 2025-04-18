# Инструкция по доступу с мобильных устройств

Для доступа к системе с телефона или другого устройства в локальной сети, выполните следующие шаги:

## 1. Узнайте IP-адрес вашего компьютера

### На Windows:
1. Откройте командную строку (cmd)
2. Введите команду: `ipconfig`
3. Найдите строку "IPv4 Address" - это и есть ваш IP-адрес (обычно начинается с 192.168.X.X)

### На macOS или Linux:
1. Откройте терминал
2. Введите команду: `ifconfig` (на Linux может потребоваться: `ip addr`)
3. Найдите свой сетевой интерфейс (обычно eth0 или wlan0) и запишите IP-адрес

## 2. Настройте .env файл

В файле `ticket-system-frontend/.env` замените:
```
REACT_APP_API_URL=http://192.168.1.XXX:8000/api/v1
```
на ваш реальный IP-адрес, например:
```
REACT_APP_API_URL=http://192.168.1.5:8000/api/v1
```

## 3. Запустите бэкенд и фронтенд

1. Запустите бэкенд:
```
python run.py
```

2. Запустите фронтенд:
```
cd ticket-system-frontend
npm start
```

## 4. Подключитесь с мобильного устройства

1. Убедитесь, что мобильное устройство подключено к той же Wi-Fi сети
2. Откройте браузер на мобильном устройстве
3. Введите в адресной строке:
```
http://192.168.1.XXX:3000
```
(замените IP-адрес на IP вашего компьютера)

## Устранение неполадок

1. **Не могу подключиться с телефона**:
   - Проверьте, что телефон и компьютер в одной сети Wi-Fi
   - Проверьте, не блокирует ли брандмауэр Windows порты 3000 и 8000
   - Временно отключите брандмауэр для тестирования

2. **Страница загружается, но нет данных**:
   - Откройте консоль разработчика на телефоне и проверьте ошибки
   - Убедитесь, что в настройках CORS на бэкенде разрешены все источники

3. **CORS ошибки**:
   - Проверьте настройки CORS в `app/main.py`
   - Для тестирования на бэкенде должно быть:
     ```python
     allow_origins=["*"]
     ``` 