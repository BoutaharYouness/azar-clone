# ChatRandom — Real-Time Video Chat Platform

A full-stack random video chat platform (Azar clone) with:
- **Spring Boot** backend (all business logic, signaling, matchmaking)
- **React.js** web frontend
- **Flutter** mobile app (Android/iOS)
- **MySQL** database

---

## Architecture Overview

```
┌─────────────┐     REST API      ┌──────────────────────┐
│  React Web  │ ─────────────────▶│                      │
│  Flutter    │                   │   Spring Boot Backend │
│  Mobile     │ ◀────────────────▶│                      │
└─────────────┘  WebSocket/STOMP  │  ┌────────────────┐  │
                                  │  │  Matchmaking   │  │
     WebRTC                       │  │  Queue Service │  │
  (media only)                    │  ├────────────────┤  │
┌──────────────────────────┐      │  │  Signaling     │  │
│  Peer A  ◀────▶  Peer B  │      │  │  Router        │  │
└──────────────────────────┘      │  └────────────────┘  │
                                  └──────────┬───────────┘
                                             │
                                      ┌──────▼──────┐
                                      │   MySQL DB  │
                                      └─────────────┘
```

---

## How Signaling Works

All WebRTC signaling is routed **through the backend** — clients never communicate directly during setup.

```
Client A                  Spring Boot                Client B
   │                          │                          │
   │── JOIN QUEUE ────────────▶│                         │
   │                          │◀─── JOIN QUEUE ──────────│
   │                          │                          │
   │                    [Matchmaking pairs A+B]          │
   │                          │                          │
   │◀── MATCHED (SEND_OFFER) ─│── MATCHED (WAIT_OFFER) ─▶│
   │                          │                          │
   │── OFFER (SDP) ───────────▶│──────────────────────────▶│
   │                          │                          │
   │◀─────────────────────────│◀─── ANSWER (SDP) ─────────│
   │                          │                          │
   │── ICE ───────────────────▶│──────────────────────────▶│
   │◀─────────────────────────│◀─── ICE ──────────────────│
   │                          │                          │
   │◀═════════════ Direct WebRTC Media Stream ═══════════▶│
```

Once ICE negotiation completes, **media flows directly** between peers (P2P) for low latency. The backend is only involved in signaling.

---

## How Matchmaking Works

1. Client POSTs to `/api/v1/session` → receives `sessionToken`
2. Client connects via WebSocket (STOMP over SockJS)
3. Client sends `JOIN_QUEUE` to `/app/queue`
4. Server adds session to `ConcurrentLinkedQueue<String>`
5. A `@Scheduled` task runs every 1 second, polling the queue
6. When ≥ 2 users are waiting, they are paired:
   - User A receives `MATCHED { message: "SEND_OFFER" }`
   - User B receives `MATCHED { message: "WAIT_OFFER" }`
7. User A creates WebRTC offer → backend routes to User B
8. User B creates answer → backend routes to User A
9. ICE candidates are exchanged through backend
10. Media connection is established directly between clients

---

## Database Schema

```sql
users          — Anonymous users (nickname + device fingerprint)
sessions       — Active call sessions with status tracking
reports        — User abuse reports
blocked_devices — Permanently banned device fingerprints
```

See `backend/src/main/resources/schema.sql` for full DDL.

**Auto-blocking:** A device is automatically blocked after receiving 5 reports.

---

## Setup Instructions

### Prerequisites
- Java 17+
- Node.js 18+
- Flutter SDK 3.x
- MySQL 8.x
- Maven 3.x

---

### 1. MySQL Setup

```sql
CREATE DATABASE azar_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'azar_user'@'%' IDENTIFIED BY 'yourpassword';
GRANT ALL PRIVILEGES ON azar_db.* TO 'azar_user'@'%';
FLUSH PRIVILEGES;
```

Then run the schema:
```bash
mysql -u azar_user -p azar_db < backend/src/main/resources/schema.sql
```

---

### 2. Backend Setup

```bash
cd backend

# Copy and edit environment config
cp .env.example .env
# Edit DB credentials, CORS origins

# Run with Maven
./mvnw spring-boot:run

# Or build and run JAR
./mvnw clean package -DskipTests
java -jar target/azar-backend-1.0.0.jar
```

The backend starts on port **8080** by default.

#### Environment Variables (backend)

| Variable | Default | Description |
|---|---|---|
| `SERVER_PORT` | `8080` | HTTP server port |
| `DB_URL` | `jdbc:mysql://localhost:3306/azar_db` | MySQL JDBC URL |
| `DB_USERNAME` | `root` | MySQL username |
| `DB_PASSWORD` | `password` | MySQL password |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy and edit environment
cp .env.example .env
# Set VITE_BACKEND_URL and VITE_WS_URL to your server IP

# Development server
npm run dev

# Production build
npm run build
```

#### Frontend .env

```env
VITE_BACKEND_URL=http://192.168.1.100:8080
VITE_WS_URL=http://192.168.1.100:8080/ws
VITE_STUN_URL=stun:stun.l.google.com:19302
```

**Replace `192.168.1.100` with your server's LAN IP or public domain.**

---

### 4. Flutter Setup

```bash
cd mobile

# Install dependencies
flutter pub get

# Run on Android (replace IP with your server)
flutter run --dart-define=BACKEND_URL=http://192.168.1.100:8080 \
            --dart-define=WS_URL=http://192.168.1.100:8080/ws

# Build APK
flutter build apk --dart-define=BACKEND_URL=http://YOUR_SERVER_IP:8080 \
                  --dart-define=WS_URL=http://YOUR_SERVER_IP:8080/ws
```

#### Android Permissions (AndroidManifest.xml)

Add to `mobile/android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.RECORD_AUDIO"/>
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
```

#### iOS Permissions (Info.plist)

Add to `mobile/ios/Runner/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>Camera needed for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone needed for audio calls</string>
```

---

## LAN Deployment (Local Network)

1. Find your server's LAN IP:
   ```bash
   # Linux/Mac
   ip addr show | grep 192.168
   # Windows
   ipconfig | findstr "IPv4"
   ```

2. Update all clients to use this IP:
   - Frontend: `.env` → `VITE_BACKEND_URL=http://192.168.X.X:8080`
   - Flutter: `--dart-define=BACKEND_URL=http://192.168.X.X:8080`

3. Allow port 8080 through firewall:
   ```bash
   # Ubuntu
   sudo ufw allow 8080/tcp
   ```

4. Ensure all devices are on the same WiFi network.

---

## Production Deployment

### Docker (recommended)

```dockerfile
# backend/Dockerfile
FROM eclipse-temurin:17-jre-alpine
COPY target/azar-backend-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: mysql:8
    environment:
      MYSQL_DATABASE: azar_db
      MYSQL_ROOT_PASSWORD: rootpass
    ports: ["3306:3306"]

  backend:
    build: ./backend
    ports: ["8080:8080"]
    environment:
      DB_URL: jdbc:mysql://db:3306/azar_db
      DB_USERNAME: root
      DB_PASSWORD: rootpass
      CORS_ORIGINS: https://yourdomain.com
    depends_on: [db]

  frontend:
    build: ./frontend
    ports: ["80:80"]
```

### HTTPS / TURN Server

For production over the internet, WebRTC **requires HTTPS** and a TURN server:

1. Use **Let's Encrypt** for TLS (via Nginx reverse proxy)
2. Set up a free TURN server (e.g., **Coturn**):
   ```
   VITE_STUN_URL=turn:your-turn-server.com:3478?transport=udp
   ```

---

## Project Structure

```
azar-clone/
├── backend/                    # Spring Boot application
│   ├── src/main/java/com/azarclone/
│   │   ├── config/             # WebSocket, CORS config
│   │   ├── controller/         # REST + WebSocket controllers
│   │   ├── dto/                # Request/Response DTOs
│   │   ├── model/              # JPA entities
│   │   ├── repository/         # Spring Data repositories
│   │   └── service/            # Business logic layer
│   └── src/main/resources/
│       ├── application.properties
│       └── schema.sql
│
├── frontend/                   # React.js web app
│   └── src/
│       ├── components/         # VideoPlayer, Controls, Status
│       ├── hooks/              # useCall (call orchestration)
│       ├── pages/              # LoginPage, CallPage
│       └── services/           # api, signalingService, webrtcService
│
├── mobile/                     # Flutter app
│   └── lib/
│       ├── config/             # AppConfig
│       ├── models/             # SignalingMessage, SessionInfo
│       ├── screens/            # LoginScreen, CallScreen
│       └── services/           # ApiService, SignalingService, WebRTCService
│
└── docs/
    └── README.md               # This file
```

---

## Security Notes

- All sessions are temporary and anonymous (no personal data stored)
- Device fingerprints are UUID v4 (not MAC addresses, which are inaccessible from browser/mobile)
- Reports trigger auto-blocking after 5 reports per device
- All CORS origins are explicitly whitelisted on the backend
- In production, always use HTTPS and WSS (WebSocket Secure)
