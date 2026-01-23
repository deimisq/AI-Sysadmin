# Guacamole Native (guacd) Setup for Windows

## Decision: Switch from guacamole-lite to native guacd + custom WebSocket proxy

**Why?**

- `guacamole-lite` has strict token validation that's blocking our query-string approach
- Native `guacd` is more mature, stable, and battle-tested
- A simple WebSocket-to-TCP proxy is easier to control

## Installation Options for guacd on Windows

### Option 1: Use WSL2 (Recommended for Development)

```bash
# In WSL2 Ubuntu
sudo apt-get update
sudo apt-get install guacd
sudo service guacd start
```

### Option 2: Docker (Easiest)

```bash
# Pull official Guacamole guacd image
docker pull guacamole/guacd

# Run guacd
docker run --name guacd -d -p 4822:4822 guacamole/guacd
```

### Option 3: Build from Source (Advanced)

See: <https://guacamole.apache.org/doc/gug/installing-guacamole.html>

## Alternative: Simpler Approach - Direct WebSocket Proxy

Instead of using guacamole-lite (which has token requirements), create a simple Node.js WebSocket server that:

1. Accepts WebSocket connections with query parameters
2. Parses RDP connection settings from query string  
3. Connects to guacd via TCP (port 4822)
4. Proxies Guacamole protocol messages between WebSocket client and guacd

This gives us full control without fighting guacamole-lite's authentication system.

## Recommended Next Step

Use **Docker approach** for quickest setup:

```powershell
# Install Docker Desktop for Windows if not already installed
# Then run:
docker run --name guacd -d -p 4822:4822 guacamole/guacd

# Verify it's running:
docker ps
netstat -ano | findstr :4822
```

Then create simple WebSocket proxy (see guacamole-proxy-server.cjs).
