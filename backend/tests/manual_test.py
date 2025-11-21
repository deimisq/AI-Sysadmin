import urllib.request
import json
import time
import sys

BASE_URL = "http://localhost:8000/api/v1"

def post(endpoint, data):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

def wait_for_server():
    print("Waiting for server to start...")
    for i in range(10):
        try:
            urllib.request.urlopen("http://localhost:8000/health")
            print("Server is up!")
            return
        except:
            time.sleep(1)
    print("Server failed to start.")
    sys.exit(1)

def main():
    wait_for_server()

    # 1. Create Client
    print("\n[1] Creating Client...")
    timestamp = int(time.time())
    client_name = f"Test Client {timestamp}"
    try:
        client = post("/clients/", {"name": client_name, "description": "A test client"})
        print(f"Success: {client}")
    except Exception as e:
        print(f"Failed to create client: {e}")
        sys.exit(1)

    # 2. Create Server
    print("\n[2] Creating Server...")
    # We need a client ID. If creation failed, we might fail here. 
    # Let's assume client creation returned a dict.
    if 'client' not in locals():
         # Fetch existing clients if creation failed?
         # For now, let's just proceed.
         pass
         
    server_data = {
        "hostname": "test-server",
        "ip_address": "127.0.0.1",
        "client_id": client['id'],
        "description": "Local test server",
        "os_info": "Ubuntu 22.04",
        "ssh_username": "ubuntu",
        "ssh_port": 22
    }
    server = post("/servers/", server_data)
    print(f"Success: {server}")

    # 3. Diagnose
    print("\n[3] Diagnosing Problem...")
    diagnosis = post("/agent/diagnose", {
        "server_id": server['id'],
        "problem_description": "Server is running slow"
    })
    print(f"Success: {diagnosis}")

    # 4. Execute
    print("\n[4] Executing Command...")
    execution = post("/agent/execute", {
        "server_id": server['id'],
        "command": "echo 'Hello World'",
        "approved_by": "admin"
    })
    print(f"Success: {execution}")

if __name__ == "__main__":
    main()
