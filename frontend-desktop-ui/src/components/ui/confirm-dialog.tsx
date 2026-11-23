import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { uiText } from "@/lib/ui-language"

type Pending = { message: string; resolve: (ok: boolean) => void }
let show: ((pending: Pending) => void) | null = null

/** Sustituye a window.confirm con el diálogo de la app. Requiere <ConfirmDialogHost /> montado. */
export function confirmDialog(message: string): Promise<boolean> {
    return new Promise(resolve => (show ? show({ message, resolve }) : resolve(false)))
}

export function ConfirmDialogHost() {
    const [pending, setPending] = useState<Pending | null>(null)
    useEffect(() => { show = setPending; return () => { show = null } }, [])
    const close = (ok: boolean) => { pending?.resolve(ok); setPending(null) }
    return (
        <Dialog open={!!pending} onOpenChange={open => { if (!open) close(false) }}>
            <DialogContent className="bg-card text-card-foreground">
                <DialogTitle>{uiText("Confirmar")}</DialogTitle>
                <DialogDescription>{pending?.message}</DialogDescription>
                <div className="flex justify-end gap-2">
                    <button onClick={() => close(false)} className="px-3 py-2 rounded border border-border">{uiText("Cancelar")}</button>
                    <button onClick={() => close(true)} className="px-3 py-2 rounded bg-red-700 text-white">{uiText("Confirmar")}</button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
