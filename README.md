# Camera Monitor

Cloudflare Workers-based RTSP camera availability monitor for home and small office environments.

The project checks whether IP cameras are reachable over TCP and whether they respond to RTSP requests. It provides a simple web dashboard, automatic monitoring through Cloudflare Cron Triggers, Telegram notifications, and password-protected access.

The project is intentionally simple. It does not try to replace a full video surveillance system or an NVR. Its purpose is to answer one question:

"Is my camera alive and responding to RTSP?"

---

# English

## Features

- RTSP camera availability monitoring
- TCP connectivity check
- RTSP protocol check
- RTSP response latency measurement
- Web dashboard
- Responsive camera grid
- Automatic status checks using Cloudflare Cron Triggers
- Telegram notifications when camera status changes
- Password authentication
- Session-based login
- Logout support
- Cloudflare KV for camera states and sessions
- Camera configuration stored directly in `cameras.ts`
- No database required
- No server or VPS required
- Runs entirely on Cloudflare Workers

The project is designed for home and small-office environments.

---

## How it works

For every configured camera the Worker performs the following checks:

1. Opens a TCP connection to the configured host and port.
2. Measures TCP connection latency.
3. Sends an RTSP `OPTIONS` request.
4. Waits for an RTSP response.
5. Verifies that the response is a valid RTSP response.
6. Stores the current camera state in Cloudflare KV.
7. Compares the current state with the previous state.
8. Sends a Telegram notification if the state changed.

Example:

```text
Camera: Front Door
Status: ONLINE
TCP latency: 15 ms
RTSP: 200 OK
RTSP latency: 32 ms
```

If the camera stops responding:

```
Camera: Front Door
Status: OFFLINE
```

## Requirements

You need:

- A Cloudflare account
- Node.js
- npm
- Wrangler
- A Cloudflare Workers project
- A Telegram bot if Telegram notifications are required

Node.js can be downloaded from:
[https://nodejs.org/](https://nodejs.org/)

Cloudflare documentation:
[https://developers.cloudflare.com/workers/](https://developers.cloudflare.com/workers/)


# Installation

## 1. Clone the repository

```
git clone https://github.com/fsdevcom2000/camera-monitor.git
cd camera-monitor
```

## 2. Install dependencies

```
npm install
```

---

## 3. Authenticate Wrangler

Run:

```
npx wrangler login
```

A browser window will open.

Authorize Wrangler to access your Cloudflare account.

You can verify the authentication with:

```
npx wrangler whoami
```

# Configuration

## 4. Configure your cameras

Camera configuration is stored in:

```
src/cameras.ts
```

Example:

```
export interface Camera {
  id: string;
  name: string;
  host: string;
  port: number;
}

export const cameras: Camera[] = [
  {
    id: "camera-01",
    name: "Front Door",
    host: "192.168.1.101",
    port: 554,
  },

  {
    id: "camera-02",
    name: "Back Door",
    host: "192.168.1.102",
    port: 554,
  },

  {
    id: "camera-03",
    name: "Garage",
    host: "192.168.1.103",
    port: 1554,
  },
];
```

### Important

The `host` must be reachable from Cloudflare Workers.

For a local/private camera:

```
192.168.1.100
10.0.0.50
172.16.0.20
```

Cloudflare Workers cannot directly connect to cameras behind your private LAN unless the cameras are otherwise reachable from the Internet.

For example:

```
Internet
   |
Router
   |
   +---- Camera 01
   +---- Camera 02
   +---- Camera 03
```

The camera's RTSP port must therefore be reachable by Cloudflare's infrastructure.

#### Security recommendation:
Avoid exposing camera RTSP ports directly to the Internet unless it is required for your setup. If remote access is needed, you may expose the RTSP ports, but make sure the cameras are properly secured and use strong authentication where available.

---

# Cloudflare KV

## 5. Create the KV namespace

Create a remote KV namespace:

```
npx wrangler kv namespace create CAMERA_STATUS
```

Wrangler will return something similar to:

```
Success!
To access your new KV Namespace in your Worker, add the following snippet:

{
  "kv_namespaces": [
    {
      "binding": "CAMERA_STATUS",
      "id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    }
  ]
}
```

Wrangler can add the configuration automatically.

If prompted:

```
Would you like Wrangler to add it on your behalf?
```

answer:

```
yes
```

If Wrangler asks:

```
For local dev, do you want to connect to the remote resource instead of a local resource?
```

You can normally answer:

```
N
```

for local development.
## 6. Check `wrangler.jsonc`

Your configuration should contain a KV binding similar to:

```
{
  "$schema": "node_modules/wrangler/config-schema.json",

  "name": "camera-monitor",

  "main": "src/index.ts",

  "compatibility_date": "2026-08-20",

  "triggers": {
    "crons": [
      "* * * * *"
    ]
  },

  "observability": {
    "enabled": true
  },

  "upload_source_maps": true,

  "kv_namespaces": [
    {
      "binding": "CAMERA_STATUS",
      "id": "YOUR_KV_NAMESPACE_ID"
    }
  ]
}
```

Do not copy someone else's KV namespace ID.
Create your own namespace and use your own ID.

---

# Authentication

The dashboard is protected by a password.

The password is stored as a Cloudflare Worker secret.

Do not put the password directly into `wrangler.jsonc`.

## 7. Create the administrator password

Run:

```
npx wrangler secret put ADMIN_PASSWORD
```

Enter your password when Wrangler asks for it.

---
# Telegram notifications

Telegram notifications are optional but recommended.

The project uses:

```
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

Both values should be stored as Cloudflare secrets.

## 8. Create a Telegram bot

Open Telegram and talk to:

```
@BotFather
```

Create a new bot using:

```
/newbot
```

BotFather will provide a token similar to:

```
1234567890:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Do not publish this token.

---

## 9. Add the Telegram bot token

Run:

```
npx wrangler secret put TELEGRAM_BOT_TOKEN
```

Paste the bot token.

---

## 10. Get your Telegram Chat ID

Start a conversation with your bot and send it a message.

You can then use the Telegram Bot API to determine the chat ID.

For example:

```
https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
```

Find:

```
"chat": {
  "id": 123456789
}
```

The number is your Chat ID.

Do not publish your bot token.

---

## 11. Add the Telegram Chat ID

Run:

```
npx wrangler secret put TELEGRAM_CHAT_ID
```

Enter your Chat ID.

---

# Local development

## 12. Generate Worker types

Run:

```
npm run cf-typegen
```

or:

```
npx wrangler types
```

---

## 13. Start the development server

Run:

```
npm run dev
```

The Worker should become available at:

```
http://127.0.0.1:8787
```

Open it in a browser.

You should see the login page.

# Testing the Cron Worker locally

Cloudflare Cron Triggers are not automatically executed by Wrangler during local development.

Wrangler provides a special endpoint for testing scheduled events.

Run:

```
curl.exe "http://127.0.0.1:8787/cdn-cgi/local/scheduled"
```

On Linux/macOS:

```
curl "http://127.0.0.1:8787/cdn-cgi/local/scheduled"
```

The Worker should produce log output similar to:

```
Camera monitor cron started
[INITIAL] Front Door: online
[INITIAL] Back Door: online
Camera monitor cron finished
```

When a camera changes state:

```
[STATE CHANGE] Front Door: online -> offline
```

or:

```
[STATE CHANGE] Front Door: offline -> online
```

If Telegram is configured, a notification will also be sent.

---

# Testing the API

After logging in, the following endpoints are available.

## Get camera list

```
GET /api/cameras
```

Example:

```
https://your-worker.workers.dev/api/cameras
```

---

## Check one camera

```
GET /api/check?id=camera-01
```

Example response:

```
{
  "camera": {
    "id": "camera-01",
    "name": "Front Door",
    "host": "192.168.1.101",
    "port": 554
  },
  "online": true,
  "tcpLatency": 15,
  "rtsp": true,
  "rtspLatency": 32,
  "rtspCode": 200,
  "rtspStatus": "OK"
}
```

---

## Check all cameras

```
GET /api/check-all
```

Example:

```
{
  "checkedAt": "2026-08-24T14:23:20.000Z",
  "duration": 505,
  "cameras": []
}
```

All API endpoints are protected by authentication.

---
# Deployment

## 14. Deploy the Worker

Run:

```
npm run deploy
```

or:

```
npx wrangler deploy
```

Wrangler will deploy the Worker to Cloudflare.

You should receive a URL similar to:

```
https://camera-monitor.example.workers.dev
```

Open the URL and log in.

---

# Cron monitoring

The project uses the following Cron expression:

```
* * * * *
```

This means:

```
Every minute
```

Every minute Cloudflare executes the scheduled Worker.

The Worker checks all cameras and compares their states with the previous states stored in KV.

Notifications are sent only when a camera changes state.

For example:

```
online -> offline
```

sends an offline notification.

Then:

```
offline -> online
```

sends an online notification.

Repeated checks with the same status do not generate notifications.

---

# Initial state

When the Worker checks a camera for the first time, there is no previous state in KV.

Therefore the first check initializes the state.

Example:

```
[INITIAL] Front Door: online
```

No Telegram notification is sent for the initial state.

This prevents Telegram from being flooded with messages immediately after deployment.

---

# Security

The dashboard is protected using:

- Password authentication
- Random session tokens
- HttpOnly cookies
- Secure cookies
- SameSite cookies
- Cloudflare KV session storage
- Session expiration

The session lifetime is currently:

```
7 days
```

The dashboard also provides:

```
/logout
```

which invalidates the session.


---

# Project structure

```
camera-monitor/
│
├── src/
│   ├── cameras.ts
│   ├── index.ts
│   └── rtsp.ts
│
├── package.json
├── wrangler.jsonc
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### `src/index.ts`

Main Worker application.

Contains:

- HTTP routes
- Dashboard
- Authentication
- Sessions
- Camera monitoring
- Cron handler
- Telegram notifications

### `src/rtsp.ts`

RTSP/TCP connectivity checker.

It performs:

```
TCP connection
       |
RTSP OPTIONS
       |
RTSP response
```

### `src/cameras.ts`

Camera configuration.

This is the main file users should modify when adding or removing cameras.

### `wrangler.jsonc`

Cloudflare Worker configuration.

Contains:

- Worker name
- Entry point
- Compatibility date
- Cron schedule
- KV binding
- Observability configuration

---

# Adding a camera

Edit:

```
src/cameras.ts
```

Add:

```
{
  id: "camera-08",
  name: "Office",
  host: "192.168.1.108",
  port: 554,
},
```

Then run:

```
npm run dev
```

Test the camera locally.

After verifying everything:

```
npm run deploy
```

---

# Changing the monitoring interval

The default Cron schedule is:

```
* * * * *
```

which means every minute.

The schedule is configured in:

```
wrangler.jsonc
```

Example:

```
"triggers": {
  "crons": [
    "*/5 * * * *"
  ]
}
```

This means every 5 minutes.

Another example:

```
"triggers": {
  "crons": [
    "*/10 * * * *"
  ]
}
```

This means every 10 minutes.

After changing the schedule, redeploy:

```
npm run deploy
```

---

# Limitations

This project is intentionally lightweight.

It is not:

- An NVR
- A video recording system
- A video streaming server
- A camera management platform
- A replacement for dedicated surveillance software

It only checks camera availability and RTSP responsiveness.
The Worker does not receive or store video.
The RTSP check uses an `OPTIONS` request and does not authenticate to the camera.
Cameras requiring RTSP authentication may therefore need additional handling.

---

# Why Cloudflare Workers?

The project uses Cloudflare Workers because it provides:

- Serverless execution
- Global infrastructure
- Cron Triggers
- KV storage
- HTTPS
- Easy deployment
- No VPS required
- No Docker required
- Low maintenance

For a small home or office monitoring system, this is usually more than enough.

---

# Development commands

Install dependencies:

```
npm install
```

Start development server:

```
npm run dev
```

Generate Cloudflare Worker types:

```
npm run cf-typegen
```

Run tests:

```
npm test
```

Deploy:

```
npm run deploy
```


---

# License 

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

# Русский

# Camera Monitor

Монитор доступности IP-камер через RTSP на базе Cloudflare Workers.

Проект проверяет, доступна ли камера по TCP и отвечает ли она на RTSP-запросы. В комплекте есть веб-интерфейс, автоматическая проверка через Cloudflare Cron Triggers, уведомления в Telegram и авторизация по паролю.

Проект специально сделан простым. Это не полноценная система видеонаблюдения и не NVR.

Основная задача:

"Жива ли камера и отвечает ли она по RTSP?"

---

## Возможности

- Проверка доступности IP-камер
- Проверка TCP-соединения
- Проверка RTSP
- Измерение TCP задержки
- Измерение RTSP задержки
- Веб-интерфейс
- Адаптивная сетка камер
- Автоматическая проверка камер
- Cloudflare Cron Triggers
- Уведомления в Telegram при изменении состояния
- Авторизация по паролю
- Сессионная авторизация
- Logout
- Cloudflare KV
- Хранение конфигурации камер в `cameras.ts`
- Отсутствие отдельной базы данных
- Отсутствие VPS
- Полностью serverless

Проект ориентирован прежде всего на домашнее использование и небольшие офисы.

---

# Как работает мониторинг

Для каждой камеры выполняется:

1. TCP-подключение к указанному адресу и порту.
2. Измерение времени подключения.
3. Отправка RTSP `OPTIONS`.
4. Ожидание ответа.
5. Проверка RTSP-ответа.
6. Сохранение текущего состояния камеры в Cloudflare KV.
7. Сравнение текущего состояния с предыдущим.
8. Отправка уведомления в Telegram при изменении состояния.

Например:

```
Camera: Front Door
Status: ONLINE
TCP latency: 15 ms
RTSP: 200 OK
RTSP latency: 32 ms
```

Если камера перестала отвечать:

```
Camera: Front Door
Status: OFFLINE
```

---

# Требования

Необходимо:

- аккаунт Cloudflare
- Node.js
- npm
- Wrangler
- Cloudflare Workers
- Telegram-бот для уведомлений

Node.js:
[https://nodejs.org/](https://nodejs.org/)

Документация Cloudflare Workers:
[https://developers.cloudflare.com/workers/](https://developers.cloudflare.com/workers/)

---

# Установка

## 1. Клонирование проекта

```
git clone https://github.com/fsdevcom2000/camera-monitor.git
cd camera-monitor
```

---

## 2. Установка зависимостей

```
npm install
```

---

## 3. Авторизация Wrangler

```
npx wrangler login
```

Откроется браузер.

Разрешите Wrangler доступ к вашему Cloudflare аккаунту.

Проверить авторизацию:

```
npx wrangler whoami
```

---

# Настройка камер

## 4. Отредактировать `src/cameras.ts`

Пример:

```
export interface Camera {
  id: string;
  name: string;
  host: string;
  port: number;
}

export const cameras: Camera[] = [
  {
    id: "camera-01",
    name: "Front Door",
    host: "192.168.1.101",
    port: 554,
  },

  {
    id: "camera-02",
    name: "Back Door",
    host: "192.168.1.102",
    port: 554,
  },

  {
    id: "camera-03",
    name: "Garage",
    host: "192.168.1.103",
    port: 1554,
  },
];
```

Для каждой камеры необходимо указать:

```
id
name
host
port
```

`id` должен быть уникальным.

---

# Важный момент с доступностью камер

Cloudflare Worker должен иметь возможность подключиться к камере.

Например:

```
Internet
   |
Router
   |
   +---- Camera 01
   +---- Camera 02
   +---- Camera 03
```

Если камера находится только в локальной сети:

```
192.168.1.x
10.x.x.x
172.16.x.x
```

Cloudflare Worker напрямую подключиться к ней не сможет.
Камера должна быть каким-либо образом доступна из инфраструктуры Cloudflare.

#### Рекомендация по безопасности:
Не рекомендуется без необходимости открывать RTSP-порты камер напрямую в Интернет. Если удалённый доступ необходим для вашей конфигурации, вы можете открыть RTSP-порты, но убедитесь, что камеры защищены должным образом и используют надёжную аутентификацию, если она поддерживается.

---

# Cloudflare KV

## 5. Создать KV namespace

Выполнить:

```
npx wrangler kv namespace create CAMERA_STATUS
```

Wrangler выдаст примерно такое:

```
Success!

{
  "kv_namespaces": [
    {
      "binding": "CAMERA_STATUS",
      "id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    }
  ]
}
```

Если Wrangler предложит автоматически добавить namespace в конфигурацию:

```
Would you like Wrangler to add it on your behalf?
```

ответьте:

```
yes
```

Если появится вопрос:

```
For local dev, do you want to connect to the remote resource instead of a local resource?
```

для обычной локальной разработки можно ответить:

```
N
```

---

# Проверка `wrangler.jsonc`

В конфигурации должен присутствовать KV binding:

```
"kv_namespaces": [
  {
    "binding": "CAMERA_STATUS",
    "id": "YOUR_KV_NAMESPACE_ID"
  }
]
```

Не используйте чужой KV ID.

Создайте собственный namespace.

---

# Авторизация

Пароль администратора хранится в Cloudflare Secret.

Не записывайте пароль непосредственно в `wrangler.jsonc`.

## 6. Создать пароль

```
npx wrangler secret put ADMIN_PASSWORD
```

Введите пароль.

---

# Telegram

Telegram-уведомления используются для сообщения об изменении состояния камеры.

Необходимо следующее:

```
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

---

## 7. Создать Telegram-бота

Откройте:

```
@BotFather
```

В Telegram.

Выполните:

```
/newbot
```

BotFather выдаст токен.

Например:

```
1234567890:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Этот токен нельзя публиковать.

---

## 8. Добавить Telegram token

```
npx wrangler secret put TELEGRAM_BOT_TOKEN
```

Вставьте полученный токен.

---

## 9. Получить Chat ID

Напишите сообщение своему боту.

После этого можно получить список обновлений через Telegram Bot API.

Например:

```
https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
```

Найдите:

```
"chat": {
  "id": 123456789
}
```

Это ваш Chat ID.

---

## 10. Добавить Chat ID

```
npx wrangler secret put TELEGRAM_CHAT_ID
```

Введите полученный Chat ID.

---

# Локальный запуск

## 11. Сгенерировать типы

```
npm run cf-typegen
```

---

## 12. Запустить Worker

```
npm run dev
```

Worker будет доступен  по адресу:

```
http://127.0.0.1:8787
```

Откройте его в браузере.

Появится страница авторизации.

---

# Проверка Cron локально

При локальной разработке Cloudflare Cron Triggers автоматически не запускаются.

Для ручного запуска используйте:

Windows:

```
curl.exe "http://127.0.0.1:8787/cdn-cgi/local/scheduled"
```

Linux/macOS:

```
curl "http://127.0.0.1:8787/cdn-cgi/local/scheduled"
```

В консоли появится примерно:

```
Camera monitor cron started
[INITIAL] Front Door: online
[INITIAL] Back Door: online
Camera monitor cron finished
```

При изменении состояния:

```
[STATE CHANGE] Front Door: online -> offline
```

или:

```
[STATE CHANGE] Front Door: offline -> online
```

При настроенном Telegram будет отправлено уведомление.

---

# API

После авторизации доступны:

```
GET /api/cameras
```

```
GET /api/check?id=camera-01
```

```
GET /api/check-all
```

Все API защищены авторизацией.

---

# Деплой

## 13. Деплой Worker

```
npm run deploy
```

или:

```
npx wrangler deploy
```

После деплоя Wrangler выдаст URL:

```
https://camera-monitor.example.workers.dev
```

Откройте его и выполните авторизацию.

---

# Автоматический мониторинг

В `wrangler.jsonc` используется:

```
"triggers": {
  "crons": [
    "* * * * *"
  ]
}
```

Это означает:

```
Проверка каждую минуту
```

Каждую минуту Cloudflare запускает Worker.

Worker:

```
Проверяет камеры
       |
Получает текущий статус
       |
Сравнивает с KV
       |
Статус изменился?
    |     |
    Да   Нет
    |     |
Telegram  Ничего
```

Если камера несколько раз подряд остается `offline`, повторных уведомлений не будет.

Уведомление будет только при переходе:

```
online -> offline
```

и затем:

```
offline -> online
```

---

# Первоначальная проверка

При первом запуске предыдущего состояния камеры в KV еще нет.

Поэтому Worker просто создаст начальное состояние:

```
[INITIAL] Front Door: online
```

Сообщение в Telegram бот при этом не отправляется.

Это сделано для того, чтобы после первого запуска не получить сразу множество уведомлений.

---

# Безопасность

Используются:

- пароль администратора
- случайные session tokens
- HttpOnly cookies
- Secure cookies
- SameSite cookies
- Cloudflare KV
- ограниченное время жизни сессии
- Logout

Текущий срок действия сессии:

```
7 дней
```

Logout:

```
/logout
```

После logout текущая сессия удаляется из KV.

---

# Структура проекта

```
camera-monitor/
│
├── src/
│   ├── cameras.ts
│   ├── index.ts
│   └── rtsp.ts
│
├── package.json
├── wrangler.jsonc
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

## `src/index.ts`

Основной Worker.

Содержит:

- HTTP API
- Dashboard
- авторизацию
- сессии
- мониторинг камер
- Cron handler
- Telegram notifications

## `src/rtsp.ts`

Проверка TCP и RTSP.

Схема:

```
TCP connection
       |
RTSP OPTIONS
       |
RTSP response
```

## `src/cameras.ts`

Конфигурация камер.

Именно этот файл необходимо изменять при добавлении или удалении камер.

#### `wrangler.jsonc`

Конфигурация Cloudflare Worker.

Содержит:

- имя Worker
- entry point
- compatibility date
- Cron schedule
- KV binding
- observability

---

# Добавление камеры

Откройте:

```
src/cameras.ts
```

Добавьте:

```
{
  id: "camera-08",
  name: "Office",
  host: "192.168.1.108",
  port: 554,
},
```

Запустите:

```
npm run dev
```

Проверьте камеру.

После проверки:

```
npm run deploy
```

---

# Изменение интервала проверки

Сейчас используется:

```
* * * * *
```

то есть одна проверка каждую минуту.

Чтобы проверять каждые 5 минут:

```
"triggers": {
  "crons": [
    "*/5 * * * *"
  ]
}
```

Каждые 10 минут:

```
"triggers": {
  "crons": [
    "*/10 * * * *"
  ]
}
```

После изменения необходимо выполнить:

```
npm run deploy
```

---

# Ограничения

Проект не является:

- NVR
- системой записи видео
- видеосервером
- системой просмотра RTSP-потока
- полноценной системой видеонаблюдения

Он только проверяет доступность камеры и наличие ответа RTSP.
Видео Worker не принимает и не хранит.
Проверка выполняется через RTSP `OPTIONS`.
Авторизация RTSP-камеры в текущей реализации не используется.
Поэтому камеры, требующие RTSP username/password для ответа на `OPTIONS`, могут потребовать дополнительной реализации.

---

# Почему Cloudflare Workers?

Cloudflare Workers позволяют получить:

- serverless-архитектуру
- Cron Triggers
- KV storage
- HTTPS
- глобальную инфраструктуру Cloudflare
- простой деплой
- отсутствие VPS
- отсутствие Docker
- минимальное обслуживание

Для домашней сети или небольшого офиса этого обычно достаточно.

---

# Команды

Установка:

```
npm install
```

Локальная разработка:

```
npm run dev
```

Генерация типов:

```
npm run cf-typegen
```

Тесты:

```
npm test
```

Деплой:

```
npm run deploy
```

Создание KV:

```
npx wrangler kv namespace create CAMERA_STATUS
```

Создание секрета:

```
npx wrangler secret put ADMIN_PASSWORD
```

---
# Лицензия

Этот проект распространяется под лицензией MIT. Подробные условия лицензии приведены в файле [LICENSE](LICENSE).
