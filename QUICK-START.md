# Quick Start - Deploy to WSL with Cloudflare Tunnel

## 🚀 One-Command Deployment

```bash
./deploy.sh
```

## 📋 Manual Setup (5 minutes)

### 1. Get Cloudflare Tunnel Token (2 min)

1. Go to https://one.dash.cloudflare.com/
2. Click **Networks** → **Tunnels** → **Create a tunnel**
3. Name it `deathmatch-game` → **Save**
4. **Copy the token** (long string starting with `eyJ...`)
5. Configure Public Hostname:
   - Subdomain: `deathmatch` (or your choice)
   - Domain: (select your domain)
   - Service Type: **HTTP**
   - URL: `game-server:5500`
6. Click **Save**

### 2. Configure Environment (30 sec)

```bash
# Copy example file
cp .env.example .env

# Edit and paste your token
nano .env
# or
vim .env
```

Paste your token:
```env
TUNNEL_TOKEN=eyJhIjoiYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTYiLCJ0IjoiZGVmZzEyMzQtYWJjZC01Njc4LTkwYWItY2RlZjEyMzQ1Njc4IiwicyI6IllXSmpaR1ZtWjJocGFtdHNiVzV2Y0hGeWMzUjFkbmQ0ZVhveCJ9
```

### 3. Deploy (1 min)

```bash
# Build and start
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

### 4. Play! 🎮

- **Local**: http://100.104.133.109:5500
- **Public**: https://deathmatch.yourdomain.com

## 🛠️ Common Commands

```bash
# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Restart
docker-compose restart

# Update after code changes
docker-compose up -d --build

# Check status
docker-compose ps
```

## ❓ Troubleshooting

**Tunnel not connecting?**
```bash
docker-compose logs cloudflared
```

**Game not loading?**
```bash
docker-compose logs game-server
```

**Need to rebuild?**
```bash
docker-compose down
docker-compose up -d --build
```

## 📖 Full Documentation

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed information.
