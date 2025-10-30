# Deployment Guide - WSL with Docker & Cloudflare Tunnel

## Prerequisites
- Docker and Docker Compose installed on WSL
- Cloudflare account (free tier works)

## Step 1: Set up Cloudflare Tunnel

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Navigate to **Networks** > **Tunnels**
3. Click **Create a tunnel**
4. Choose **Cloudflared** as the connector
5. Name your tunnel (e.g., `vibematch-arena`)
6. Click **Save tunnel**
7. Copy the tunnel token (starts with `eyJ...`)

## Step 2: Configure the Tunnel

In the Cloudflare dashboard, configure the tunnel route:

- **Public Hostname:**
  - Subdomain: `vibematch-arena`
  - Domain: `brad-dougherty.com`
  - Path: Leave empty
  
- **Service:**
  - Type: `HTTP`
  - URL: `game-server:5500` (this is the Docker service name)

Click **Save tunnel**

## Step 3: Create Environment File

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your tunnel token:

```env
TUNNEL_TOKEN=eyJhIjoiYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTYiLCJ0IjoiZGVmZzEyMzQtYWJjZC01Njc4LTkwYWItY2RlZjEyMzQ1Njc4IiwicyI6IllXSmpaR1ZtWjJocGFtdHNiVzV2Y0hGeWMzUjFkbmQ0ZVhveCJ9
```

## Step 4: Deploy with Docker Compose

On your WSL machine:

```bash
# Build and start the services
docker-compose up -d --build

# Check logs
docker-compose logs -f

# Check status
docker-compose ps
```

## Step 5: Verify Deployment

1. Check local access: `http://100.104.133.109:5500`
2. Check public access: `https://vibematch-arena.brad-dougherty.com`

## Managing the Deployment

```bash
# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f game-server
docker-compose logs -f cloudflared

# Rebuild after code changes
docker-compose up -d --build
```

## Troubleshooting

### Tunnel not connecting
```bash
# Check cloudflared logs
docker-compose logs cloudflared

# Verify tunnel token is set
echo $TUNNEL_TOKEN
```

### Game server not accessible
```bash
# Check game server logs
docker-compose logs game-server

# Check if port is listening
netstat -tlnp | grep 5500
```

### WebSocket connection issues
- Ensure Cloudflare tunnel is configured for **HTTP** (not HTTPS)
- WebSocket connections will be automatically upgraded by Cloudflare
- Socket.io should work through the tunnel automatically

## Security Notes

- The game server binds to `100.104.133.109:5500` (WSL IP) for local access
- Public access is only through Cloudflare Tunnel (encrypted)
- No ports need to be opened on your router/firewall
- Cloudflare provides DDoS protection automatically
