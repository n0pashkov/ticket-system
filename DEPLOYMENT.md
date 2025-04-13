# Руководство по развертыванию приложения в продакшене

## Предварительные требования

- VPS или выделенный сервер (рекомендуемый: 2 ГБ RAM, 2 CPU)
- Доменное имя, указывающее на IP-адрес сервера
- Ubuntu 20.04 LTS или новее
- Docker и Docker Compose (опционально)

## 1. Подготовка сервера

### Обновление системы и установка зависимостей
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-dev build-essential libssl-dev libffi-dev python3-setuptools nginx git
```

### Установка PostgreSQL (вместо SQLite для продакшена)
```bash
sudo apt install -y postgresql postgresql-contrib
```

## 2. Настройка PostgreSQL

### Создание базы данных и пользователя
```bash
sudo -u postgres psql
```

В интерактивной оболочке PostgreSQL:
```sql
CREATE DATABASE ticket_system_db;
CREATE USER ticket_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE ticket_system_db TO ticket_user;
\q
```

## 3. Подготовка приложения

### Клонирование репозитория
```bash
git clone https://github.com/your-repo/ticket-system.git
cd ticket-system
```

### Создание файла .env для бэкенда
```bash
# Файл app/.env
ENVIRONMENT=production
SECRET_KEY=your-super-secure-secret-key
DATABASE_URL=postgresql://ticket_user:secure_password@localhost/ticket_system_db
```

### Установка зависимостей бэкенда
```bash
pip3 install -r requirements.txt
```

### Настройка параметров CORS

Отредактируйте файл `app/core/config.py` и замените URL в `get_cors_origins` на фактический домен вашего фронтенда:

```python
def get_cors_origins(self, environment: str = "development"):
    if environment == "production":
        return [
            "https://your-actual-domain.com",
            "https://www.your-actual-domain.com"
        ]
```

## 4. Настройка Gunicorn и Uvicorn для бэкенда

### Создание systemd сервиса
```bash
sudo nano /etc/systemd/system/ticket-api.service
```

Содержимое:
```
[Unit]
Description=Ticket System API
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/path/to/ticket-system
Environment="PATH=/path/to/ticket-system/venv/bin"
Environment="ENVIRONMENT=production"
ExecStart=/path/to/ticket-system/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

### Запуск и активация сервиса
```bash
sudo systemctl start ticket-api
sudo systemctl enable ticket-api
```

## 5. Сборка и настройка фронтенда

### Установка Node.js и npm
```bash
curl -sL https://deb.nodesource.com/setup_14.x -o nodesource_setup.sh
sudo bash nodesource_setup.sh
sudo apt install -y nodejs
```

### Настройка переменных окружения для фронтенда

Создайте файл `ticket-system-frontend/.env.production`:
```
REACT_APP_API_URL=https://api.your-actual-domain.com/api/v1
```

### Сборка фронтенда
```bash
cd ticket-system-frontend
npm install
npm run build
```

## 6. Настройка Nginx

### Создание конфигурации для фронтенда
```bash
sudo nano /etc/nginx/sites-available/ticket-system-frontend
```

Содержимое:
```nginx
server {
    listen 80;
    server_name your-actual-domain.com www.your-actual-domain.com;
    
    location / {
        root /path/to/ticket-system/ticket-system-frontend/build;
        index index.html;
        try_files $uri /index.html;
    }
}
```

### Создание конфигурации для API (обратный прокси)
```bash
sudo nano /etc/nginx/sites-available/ticket-system-api
```

Содержимое:
```nginx
server {
    listen 80;
    server_name api.your-actual-domain.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Активация конфигураций
```bash
sudo ln -s /etc/nginx/sites-available/ticket-system-frontend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/ticket-system-api /etc/nginx/sites-enabled/
sudo nginx -t  # Проверка синтаксиса
sudo systemctl restart nginx
```

## 7. Настройка HTTPS с Let's Encrypt

### Установка Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Получение сертификатов
```bash
sudo certbot --nginx -d your-actual-domain.com -d www.your-actual-domain.com
sudo certbot --nginx -d api.your-actual-domain.com
```

## 8. Обслуживание и обновление

### Обновление приложения
```bash
cd /path/to/ticket-system
git pull
pip3 install -r requirements.txt
cd ticket-system-frontend
npm install
npm run build
sudo systemctl restart ticket-api
```

### Мониторинг логов
```bash
sudo journalctl -u ticket-api -f  # Логи API
sudo tail -f /var/log/nginx/access.log  # Логи Nginx
```

## Вариант с Docker

Если вы предпочитаете использовать Docker, создайте следующие файлы:

### Dockerfile для бэкенда
```docker
FROM python:3.9

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Dockerfile для фронтенда
```docker
# Build stage
FROM node:14 as build

WORKDIR /app

COPY ticket-system-frontend/package*.json ./
RUN npm install

COPY ticket-system-frontend/ ./
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml
```yaml
version: '3'

services:
  db:
    image: postgres:13
    environment:
      POSTGRES_USER: ticket_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: ticket_system_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  api:
    build: ./backend
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=postgresql://ticket_user:secure_password@db/ticket_system_db
      - SECRET_KEY=your-super-secure-secret-key
    depends_on:
      - db
    restart: always

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    depends_on:
      - api
    ports:
      - "80:80"
    restart: always

volumes:
  postgres_data:
```

Запустите с помощью:
```bash
docker-compose up -d
```

## Рекомендации по безопасности

1. **Регулярные обновления**: Обновляйте ОС и все зависимости
2. **Брандмауэр**: Настройте ufw или iptables
3. **SSH**: Используйте ключи вместо паролей, отключите root доступ
4. **Резервное копирование**: Регулярно создавайте бэкапы базы данных
5. **Мониторинг**: Настройте системы мониторинга (Prometheus, Grafana)
6. **Rate Limiting**: Настройте ограничение частоты запросов в Nginx 