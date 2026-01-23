# Testing Guacamole RDP Integration

## ✅ Phase 2 Completed

The frontend Guacamole integration is now complete. Here's what was implemented:

### What's New

1. **GuacamoleCanvas Component**: Full-featured RDP canvas with mouse/keyboard input
2. **Auto-start Guacamole Server**: Automatically starts guacamole-lite/guacd when needed
3. **Real RDP Connection**: No more mock frames - actual Windows desktop rendering
4. **Comprehensive Error Handling**: Detailed error messages and troubleshooting tips
5. **Status Indicators**: Visual feedback for connection states

### How to Test

#### Step 1: Pull Latest Changes

```bash
git pull
cd frontend-desktop
npm install
```

#### Step 2: Verify guacamole-lite is Installed

```bash
npm list guacamole-lite guacamole-common-js
```

Expected output:

```
├── guacamole-common-js@1.x.x
└── guacamole-lite@2.x.x
```

#### Step 3: Launch the Application

```bash
npm run tauri dev
```

#### Step 4: Test RDP Connection

1. **Navigate to a Windows Server**:
   - Click on any Windows server in your server list
   - The app will automatically:
     - Start the Guacamole server (guacamole-lite on Windows)
     - Fetch server credentials
     - Initialize the RDP connection

2. **Watch for Status Changes**:
   - "Inizando servidor Guacamole..." (Starting guacamole server)
   - "Cargando credenciales..." (Loading credentials)
   - "Connecting..." (Connecting to RDP)
   - "Connected" (✅ Live RDP Session indicator appears)

3. **Interact with the Desktop**:
   - **Mouse**: Click and drag - should control the remote desktop
   - **Keyboard**: Type text - should work in remote applications
   - **Real-time**: You should see the actual Windows desktop rendering

### Expected Behavior

**✅ Success Indicators**:

- Green "Connected" status in top-right
- "🖥️ Live RDP Session" badge in bottom-left
- You can see and interact with the Windows desktop
- Mouse cursor is hidden (using remote cursor)
- Keyboard input works in remote apps

**❌ Common Issues**:

| Issue | Cause | Solution |
|-------|-------|----------|
| "Cannot connect to WebSocket" | Guacamole server not running | Check console logs for Guacamole startup errors |
| "Connection refused" | RDP port blocked | Check Windows Firewall, ensure port 3389 is open |
| "Authentication failed" | Wrong credentials | Verify username/password in server settings |
| Black screen after "Connected" | RDP connection successful but no rendering | Check RDP server settings, try lowering color depth |
| "guacamole-lite not found" | Missing dependency | Run `npm install guacamole-lite` |

### Console Logs to Check

Open DevTools (F12) and look for:

```
[RDPComponent] Initializing RDP connection...
[RDPComponent] Starting Guacamole server...
[RDPComponent] ✅ Guacamole server started
[RDPComponent] Fetching credentials for server: <id>
[RDPComponent] ✅ Credentials loaded
[GuacamoleCanvas] Initializing connection...
[GuacamoleCanvas] Connecting to WebSocket: ws://127.0.0.1:4822
[GuacamoleCanvas] Connection params: { protocol: 'rdp', hostname: '...', ... }
[GuacamoleCanvas] State changed: 1 (CONNECTING)
[GuacamoleCanvas] State changed: 3 (CONNECTED)
[GuacamoleCanvas] ✅ Connected successfully!
```

### Backend Logs to Check

In the terminal where you ran `npm run tauri dev`:

```
Found guacamole-lite script in cwd: ...
Using Node.js: ...
Starting Guacamole server...
Mode: Node.js (guacamole-lite)
Bind: 127.0.0.1:4822
Guacamole server spawned (PID: ...)
✅ Guacamole server is listening on 127.0.0.1:4822
```

### Testing Checklist

- [ ] Application starts without errors
- [ ] Guacamole server starts automatically
- [ ] Can select a Windows server
- [ ] Loading screen shows status updates
- [ ] Connection establishes successfully
- [ ] Can see Windows desktop in the canvas
- [ ] Mouse clicks work
- [ ] Keyboard input works
- [ ] Can disconnect and reconnect
- [ ] Error states display properly
- [ ] "Native RDP" button still works as fallback

### Next Steps (Day 3)

Once basic RDP is working, we'll add:

- [ ] Clipboard synchronization (copy/paste between local and remote)
- [ ] Audio redirection
- [ ] File transfer (drag & drop files)
- [ ] Multi-monitor support
- [ ] Performance optimizations

### Troubleshooting

**If Guacamole server won't start:**

1. Check if Node.js is installed: `node --version`
2. Check if script exists: `ls frontend-desktop/guacamole-lite-server.js`
3. Try running manually: `node guacamole-lite-server.js`
4. Check port availability: `netstat -ano | findstr :4822` (Windows) or `lsof -i :4822` (Linux/Mac)

**If RDP connection fails:**

1. Test RDP manually: `mstsc /v:SERVER_IP` (Windows) or native client
2. Verify credentials in database/API
3. Check network connectivity: `ping SERVER_IP`
4. Ensure RDP is enabled on target server

**If you see black screen:**

1. Check console for error messages
2. Try refreshing the page
3. Check if RDP server requires NLA (Network Level Authentication)
4. Try connecting with native client first to verify server is accessible

## 🎉 Success Criteria

You know it's working when:

1. You click on a Windows server
2. Within 3-5 seconds, you see the actual Windows login screen or desktop
3. You can move the mouse and click on Start menu
4. You can type in Notepad or Command Prompt
5. No "Mock Frames" indicator - replaced with "Live RDP Session"

## 🆘 Need Help?

If you encounter issues:

1. Share the **console logs** (DevTools)
2. Share the **terminal output** (where you ran `npm run tauri dev`)
3. Share a **screenshot** of what you see
4. Describe the **exact steps** you took

---

**Status**: Ready for testing! 🚀
