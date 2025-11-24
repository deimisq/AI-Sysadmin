"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
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
                // Login
                const formBody = new URLSearchParams();
                formBody.append("username", formData.username);
                formBody.append("password", formData.password);

                const res = await fetch(`${window.location.protocol}//${window.location.hostname}:8000/api/v1/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: formBody,
                });

                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.detail || "Login failed");
                }

                const data = await res.json();
                localStorage.setItem("token", data.access_token);
                router.push("/dashboard");
            } else {
                // Register
                const res = await fetch(`${window.location.protocol}//${window.location.hostname}:8000/api/v1/auth/register`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username: formData.username,
                        email: formData.email,
                        password: formData.password,
                        full_name: formData.full_name || null,
                    }),
                });

                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.detail || "Registration failed");
                }

                alert("Registration successful! Please login.");
                setIsLogin(true);
                setFormData({ username: "", email: "", password: "", full_name: "" });
            }
        } catch (error: any) {
            console.error(error);
            alert(error.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <Shield className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center">
                        {isLogin ? "Welcome Back" : "Create Account"}
                    </CardTitle>
                    <CardDescription className="text-center">
                        {isLogin
                            ? "Enter your credentials to access your account"
                            : "Fill in your information to get started"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <>
                                <Input
                                    type="email"
                                    placeholder="Email *"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                                <Input
                                    placeholder="Full Name (optional)"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </>
                        )}
                        <Input
                            placeholder="Username *"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                        />
                        <Input
                            type="password"
                            placeholder="Password *"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
                        </Button>
                    </form>

                    <div className="mt-4 text-center text-sm">
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setFormData({ username: "", email: "", password: "", full_name: "" });
                            }}
                            className="text-primary hover:underline"
                        >
                            {isLogin
                                ? "Don't have an account? Register"
                                : "Already have an account? Login"}
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
