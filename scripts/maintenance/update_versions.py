import json
import io

file_path = '/var/www/agent/versions.json'

new_version = {
    "version": "0.9.2-beta1",
    "date": "2025-12-17",
    "type": "beta",
    "downloadUrl": "https://agent.sentrait.com.uy/ai-sysadmin-release.tar.gz",
    "highlights": [
        "Interfaz Modular Redimensionable (tipo IDE)",
        "Bucle de Retroalimentación de IA automático",
        "Sidebar Global Redimensionable",
        "Terminal Interactiva Mejorada"
    ],
    "changelog": [
        "Feature: Nuevo layout con paneles ajustables",
        "Feature: IA con capacidad de lectura automática de terminal",
        "Feature: Sidebar global para mejor navegación",
        "Fix: Errores de compilación en el frontend",
        "Fix: Sincronización de sesiones SSH en WebSocket",
        "Cleanup: Removida redundancia en elementos de Layout"
    ]
}

try:
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    # Check if version already exists to avoid duplicates
    if data['versions'][0]['version'] != new_version['version']:
        data['versions'].insert(0, new_version)
        
        with open('/home/ubuntu/ai_agent/versions_new.json', 'w') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print("Successfully created new versions.json")
    else:
        print("Version already exists")
except Exception as e:
    print(f"Error: {e}")
