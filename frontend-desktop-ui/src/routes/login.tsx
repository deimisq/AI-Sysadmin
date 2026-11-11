import { uiText } from '../lib/ui-language';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { toast } from "sonner";
import { isWebView2 } from '../lib/bridge';
import { selectWorkspaceMode } from '../lib/workspace-mode';

export default function Login() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        full_name: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                // Use the login function from api.ts
                await login(formData.username, formData.password);
                toast.success("Welcome back!");
                navigate('/');
            } else {
                selectWorkspaceMode('enterprise');
                // Register
                await register({
                    username: formData.username,
                    email: formData.email,
                    password: formData.password,
                    full_name: formData.full_name || null,
                    preferredLanguage: 'es'
                });

                toast.success("Registration successful! Please sign in.");
                setIsLogin(true);
                setFormData(prev => ({ ...prev, password: "" }));
            }
        } catch (err: any) {
            console.error(err);
            toast.error(typeof err === 'string' ? err : (err.message || 'Authentication failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4 relative">
            <div className="absolute top-4 right-4 flex gap-2">
                <ThemeSwitcher />
            </div>
            <Card className="w-full max-w-md animate-in fade-in zoom-in duration-300">
                <CardHeader className="space-y-1">
                    <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <Shield className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold text-center">AI Sysadmin Agent</CardTitle>
                    <CardDescription className="text-center">
                        {isLogin ? "Sign in to your account" : "Create a new account"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isWebView2() && <div className="mb-5 space-y-2">
                        <Button className="w-full" variant="outline" onClick={() => { selectWorkspaceMode('local'); window.location.hash = '#/'; window.location.reload(); }}>{uiText("Trabajar en este equipo sin cuenta")}</Button>
                        <p className="text-xs text-muted-foreground text-center">{uiText("Conexiones y credenciales protegidas con tu cuenta de Windows.")}</p>
                    </div>}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <>
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Full Name (Optional)"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Input
                                        placeholder="Email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                            </>
                        )}
                        <div className="space-y-2">
                            <Input
                                placeholder="Username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (isLogin ? "Sign In" : "Sign Up")}
                        </Button>
                    </form>

                    <div className="mt-4 text-center text-sm">
                        <button
                            type="button"
                            className="text-primary hover:underline"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setFormData({ username: "", email: "", password: "", full_name: "" });
                            }}
                        >
                            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
