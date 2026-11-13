import { uiText } from '../../lib/ui-language';
import { AppUpdateSettings } from '../settings/AppUpdates';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { sendCommand } from '../../lib/bridge';
import { useState } from 'react';

export function HelpView() {
    const [supportError, setSupportError] = useState('');
    return <div className="p-6 h-full overflow-y-auto space-y-6">
        <h1 className="text-3xl font-bold">{uiText("Ayuda e información")}</h1>
        <AppUpdateSettings />
        <section className="space-y-3 rounded-lg border p-4">
            <h2 className="text-xl font-semibold">{uiText("Apoyar el proyecto")}</h2>
            <p>{uiText("AI Sysadmin es gratuito y su código original se distribuye bajo Apache 2.0. Puedes usarlo y recibir actualizaciones sin donar. Las dependencias conservan sus propias licencias.")}</p>
            <p>{uiText("Puedes apoyar su desarrollo mediante GitHub Sponsors de @deimisq. Los aportes son voluntarios y se gestionan en GitHub; la app no solicita datos de pago.")}</p>
            <div className="flex flex-wrap items-center gap-4">
                <button className="inline-flex items-center gap-2 rounded-md bg-pink-600 px-4 py-2 font-medium text-white hover:bg-pink-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-400" onClick={() => { setSupportError(''); void sendCommand('open_sponsors').catch(() => setSupportError(uiText('Abre https://github.com/sponsors/deimisq en tu navegador.'))); }}><span aria-hidden="true">♥</span>{uiText("Apoyar en GitHub Sponsors")}</button>
                <button className="text-blue-400 underline" onClick={() => { setSupportError(''); void sendCommand('open_sentrait').catch(() => setSupportError(uiText('Abre https://sentrait.com.uy/ en tu navegador.'))); }}>{uiText("Visitar Sentra IT · sitio oficial")}</button>
            </div>
            {supportError && <p role="status">{supportError}</p>}
        </section>
        <section className="space-y-3 text-sm">
            <h2 className="text-xl font-semibold">{uiText("Uso y privacidad")}</h2>
            <p>{uiText("AI Sysadmin Agent permite organizar conexiones SSH/RDP, transferir archivos por SFTP y consultar un acompañante IA con tu proveedor configurado. Revisa los comandos antes de autorizarlos.")}</p>
            <p>{uiText("El contexto SSH se registra cifrado localmente. En RDP solo se comparte texto o una captura revisada y autorizada para una pregunta. No hay observación continua del escritorio.")}</p>
            <p>{uiText("Para trasladar conexiones, credenciales y carpetas a otro equipo usa Conexiones → Exportar / importar conexiones. La copia cifrada requiere su contraseña; los chats y claves de IA o GitHub no se incluyen.")}</p>
            <p>{uiText("Antes de informar un problema, anota la versión, el commit y el error. No compartas contraseñas, tokens ni registros sin revisar.")}</p>
            <button className="text-blue-400 underline" onClick={() => useWorkspaceStore.getState().setActiveOverlay('documentation')}>{uiText("Abrir documentación de la aplicación")}</button>
        </section>
    </div>;
}
