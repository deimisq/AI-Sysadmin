"use client"

import { usePathname } from "next/navigation"
import { Bug, MessageSquarePlus } from "lucide-react"
import { useEffect, useState } from "react"

export function FeedbackButton() {
    const pathname = usePathname()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    const recipient = "reporte@sentrait.com.uy"
    const subject = encodeURIComponent("Feedback - AI Sysadmin Agent")
    const body = encodeURIComponent(`
Hola equipo de Sentrait,

Quiero reportar un bug / hacer una sugerencia.

📍 Ubicación en el sistema: ${pathname}
📅 Fecha: ${new Date().toLocaleDateString()}

📝 Detalle del reporte:
(Escribe aquí tu comentario...)

------------------------------------------------
Información técnica:
User Agent: ${window.navigator.userAgent}
`)

    const mailtoLink = `mailto:${recipient}?subject=${subject}&body=${body}`

    return (
        <a
            href={mailtoLink}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-orange-500 px-4 py-3 text-white shadow-lg transition-all hover:scale-105 hover:bg-orange-600 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 animate-bounce-slow"
            title="Reportar Bug o Sugerencia"
            style={{ animationDuration: '3s' }}
        >
            <Bug className="h-5 w-5" />
            <span className="font-bold">Reportar Bug</span>
        </a>
    )
}
