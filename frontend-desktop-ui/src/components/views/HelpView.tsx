import { AppUpdateSettings } from '../settings/AppUpdates';
import { useWorkspaceStore } from '../../stores/workspaceStore';

export function HelpView() {
    return <div className="p-6 h-full overflow-y-auto space-y-6">
        <h1 className="text-3xl font-bold">Ayuda e información</h1>
        <AppUpdateSettings />
        <section className="space-y-3 text-sm">
            <h2 className="text-xl font-semibold">Uso y privacidad</h2>
            <p>AI Sysadmin Agent permite organizar conexiones SSH/RDP, transferir archivos por SFTP y consultar un acompañante IA con tu proveedor configurado. Revisá los comandos antes de autorizarlos.</p>
            <p>El contexto SSH se registra cifrado localmente. En RDP solo se comparte texto o una captura revisada y autorizada para una pregunta. No hay observación continua del escritorio.</p>
            <p>Para trasladar conexiones, credenciales y carpetas a otro equipo usá Conexiones → Exportar / importar conexiones. La copia cifrada requiere su contraseña; los chats y claves de IA o GitHub no se incluyen.</p>
            <p>Antes de informar un problema, anotá la versión, el commit y el error. No compartas contraseñas, tokens ni registros sin revisar.</p>
            <button className="text-blue-400 underline" onClick={() => useWorkspaceStore.getState().setActiveOverlay('documentation')}>Abrir documentación de la aplicación</button>
        </section>
    </div>;
}