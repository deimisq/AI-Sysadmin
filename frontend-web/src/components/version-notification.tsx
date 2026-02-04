"use client"

import { useEffect, useState } from "react"
import { Bell, X, Download, ExternalLink } from "lucide-react"
import { fetchCurrentUser } from "@/lib/api"

interface VersionInfo {
    current_version: string
    latest_version: string | null
    update_available: boolean
    download_url: string | null
    changelog_url: string | null
    release_date: string | null
}

export function VersionNotification() {
    const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null)
    const [dismissed, setDismissed] = useState(false)
    const [loading, setLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    useEffect(() => {
        const checkVersionAndUser = async () => {
            try {
                const token = localStorage.getItem("token")
                if (!token) {
                    setLoading(false)
                    return
                }

                // First check if user is admin/superadmin
                try {
                    const user = await fetchCurrentUser()
                    if (!user || !["admin", "superadmin"].includes(user.role)) {
                        setLoading(false)
                        return // Don't show to non-admin users
                    }
                    setIsAdmin(true)
                } catch (error) {
                    setLoading(false)
                    return
                }

                // Only check for version updates for admins
                const response = await fetch("/api/v1/version/check", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })

                if (response.ok) {
                    const data = await response.json()
                    setVersionInfo(data)

                    // Check if user has dismissed this version update before
                    const dismissedVersion = localStorage.getItem("dismissed_version_update")
                    if (dismissedVersion === data.latest_version) {
                        setDismissed(true)
                    }
                }
            } catch (error) {
                console.error("Error checking version:", error)
            } finally {
                setLoading(false)
            }
        }

        checkVersionAndUser()
    }, [])

    const handleDismiss = () => {
        if (versionInfo?.latest_version) {
            localStorage.setItem("dismissed_version_update", versionInfo.latest_version)
        }
        setDismissed(true)
    }

    // Only show to admin/superadmin users with available updates
    if (loading || !isAdmin || !versionInfo || !versionInfo.update_available || dismissed) {
        return null
    }

    return (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in-right">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-4 border border-blue-500">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        <Bell className="h-6 w-6 text-yellow-300 animate-bounce" />
                    </div>

                    <div className="flex-1">
                        <h4 className="font-bold text-lg mb-1">
                            ¡Nueva versión disponible! 🚀
                        </h4>
                        <p className="text-sm text-blue-100 mb-3">
                            Versión <span className="font-mono font-bold">{versionInfo.latest_version}</span> está disponible.
                            <br />
                            Tu versión actual: <span className="font-mono">{versionInfo.current_version}</span>
                        </p>

                        {versionInfo.release_date && (
                            <p className="text-xs text-blue-200 mb-3">
                                Publicado: {versionInfo.release_date}
                            </p>
                        )}

                        <div className="flex gap-2">
                            {versionInfo.changelog_url && (
                                <a
                                    href={versionInfo.changelog_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                    Ver Cambios
                                </a>
                            )}

                            {versionInfo.download_url && (
                                <a
                                    href={versionInfo.download_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 rounded text-sm font-medium transition-colors"
                                >
                                    <Download className="h-4 w-4" />
                                    Descargar
                                </a>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
                        title="Descartar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
