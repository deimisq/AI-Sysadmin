import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import DashboardLayout from '../components/dashboard-layout';

export default function RdpDev() {
    const [host, setHost] = useState('');
    const [user, setUser] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState('Idle');

    const handleConnect = () => {
        if ((window as any).chrome?.webview) {
            (window as any).chrome.webview.postMessage({
                type: 'START_RDP',
                payload: { host, username: user, password, width: 1920, height: 1080 }
            });
            setStatus('Connecting...');
        } else {
            console.log('Not running in WebView2');
            setStatus('Error: Not in WebView2');
        }
    };

    const handleDisconnect = () => {
         if ((window as any).chrome?.webview) {
            (window as any).chrome.webview.postMessage({
                type: 'STOP_RDP'
            });
            setStatus('Disconnected');
        }
    };

    useEffect(() => {
        const handleMessage = (event: any) => {
            if (event.data?.type === 'RDP_DISCONNECTED') {
                setStatus('Disconnected (Native)');
            }
        };

        if ((window as any).chrome?.webview) {
            (window as any).chrome.webview.addEventListener('message', handleMessage);
        }

        return () => {
             if ((window as any).chrome?.webview) {
                (window as any).chrome.webview.removeEventListener('message', handleMessage);
            }
        };
    }, []);

    return (
        <DashboardLayout>
            <div className="p-8 text-white h-full overflow-y-auto bg-[#1e1e1e]">
                <div className="max-w-md mx-auto mt-10 p-6 bg-[#252526] rounded-lg shadow-lg border border-[#333]">
                    <h1 className="text-2xl font-bold mb-6 text-blue-400">Windows RDP Native Dev</h1>
                    <div className="space-y-4">
                        <div>
                            <label className="block mb-1 text-sm text-gray-400">Host (IP or DNS)</label>
                            <input 
                                className="w-full p-2 bg-[#1e1e1e] border border-[#333] rounded text-white focus:outline-none focus:border-blue-500" 
                                value={host} 
                                placeholder="192.168.1.10"
                                onChange={e => setHost(e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm text-gray-400">Username</label>
                            <input 
                                className="w-full p-2 bg-[#1e1e1e] border border-[#333] rounded text-white focus:outline-none focus:border-blue-500" 
                                value={user} 
                                placeholder="Administrator"
                                onChange={e => setUser(e.target.value)} 
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm text-gray-400">Password</label>
                            <input 
                                className="w-full p-2 bg-[#1e1e1e] border border-[#333] rounded text-white focus:outline-none focus:border-blue-500" 
                                type="password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                            />
                        </div>
                        
                        <div className="pt-4 flex gap-3">
                            <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleConnect}>
                                Connect Native RDP
                            </Button>
                            <Button variant="destructive" onClick={handleDisconnect}>
                                Disconnect
                            </Button>
                        </div>
                        
                        <div className="mt-6 p-3 bg-black/30 rounded font-mono text-sm">
                            Status: <span className={status.includes('Error') ? "text-red-500" : "text-yellow-500"}>{status}</span>
                        </div>

                        <div className="text-xs text-gray-500 mt-4 text-center">
                            Note: This controls the local ActiveX RDP client via WebView2 Bridge.
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
