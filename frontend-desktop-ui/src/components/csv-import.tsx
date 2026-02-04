import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { fetch } from "@tauri-apps/plugin-http";

const API_URL = import.meta.env.VITE_API_URL || 'https://testing.sentrait.com.uy/api/v1';

interface ImportResult {
    message: string;
    details: {
        success: Array<{
            row: number;
            hostname: string;
            ip_address: string;
            group: string;
        }>;
        errors: Array<{
            row: number;
            hostname?: string;
            error: string;
        }>;
        groups_created: string[];
        total_processed: number;
    };
}

interface CSVImportProps {
    onImportComplete: () => void;
    onCancel: () => void;
}

export function CSVImport({ onImportComplete, onCancel }: CSVImportProps) {
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const downloadTemplate = async () => {
        try {
            const token = localStorage.getItem("token");
            console.log('Downloading CSV template from:', `${API_URL}/servers/csv-template`);

            const response = await fetch(`${API_URL}/servers/csv-template`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`Failed to download template: ${response.status} ${response.statusText}`);
            }

            // Get the CSV content
            const csvContent = await response.text();
            console.log('CSV content received, length:', csvContent.length);

            // Use Tauri dialog to save file
            const { save } = await import('@tauri-apps/plugin-dialog');
            const { writeTextFile } = await import('@tauri-apps/plugin-fs');

            const filePath = await save({
                filters: [{
                    name: 'CSV',
                    extensions: ['csv']
                }],
                defaultPath: 'servers_template.csv',
                title: 'Guardar plantilla CSV'
            });

            if (filePath) {
                // Write the file
                await writeTextFile(filePath, csvContent);
                toast.success(`Plantilla guardada en: ${filePath}`);

                // Optional: Open the folder containing the file
                const { Command } = await import('@tauri-apps/plugin-shell');
                const folder = filePath.substring(0, filePath.lastIndexOf('\\') || filePath.lastIndexOf('/'));

                try {
                    // Windows
                    if (filePath.includes('\\')) {
                        await Command.create('explorer', [folder]).execute();
                    }
                    // Linux/Mac
                    else {
                        await Command.create('xdg-open', [folder]).execute();
                    }
                } catch (e) {
                    console.log('Could not open folder:', e);
                }
            } else {
                toast.info('Descarga cancelada');
            }
        } catch (error: any) {
            console.error("Error downloading template:", error);
            toast.error(error.message || "Error al descargar plantilla");
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!file.name.endsWith(".csv")) {
            toast.error("Por favor selecciona un archivo CSV");
            return;
        }

        setImporting(true);
        setResult(null);

        try {
            const token = localStorage.getItem("token");
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch(`${API_URL}/servers/import-csv`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Import failed");
            }

            const data = await response.json();
            setResult(data);

            if (data.details.success.length > 0) {
                toast.success(`${data.details.success.length} servidores importados`);
                onImportComplete();
            }
        } catch (error: any) {
            console.error("Error importing CSV:", error);
            toast.error(error.message || "Error al importar CSV");
            setResult({
                message: `Error: ${error.message}`,
                details: {
                    success: [],
                    errors: [{ row: 0, error: error.message }],
                    groups_created: [],
                    total_processed: 0,
                },
            });
        } finally {
            setImporting(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-6 w-6" />
                    Importar Servidores desde CSV
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Step 1: Download Template */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                        Paso 1: Descargar Plantilla
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                        Descarga la plantilla CSV, complétala con los datos de tus servidores y súbela.
                    </p>
                    <Button
                        variant="outline"
                        onClick={downloadTemplate}
                        className="border-blue-300 hover:bg-blue-100 dark:border-blue-700 dark:hover:bg-blue-900"
                        type="button"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar Plantilla CSV
                    </Button>
                </div>

                {/* Step 2: Upload File */}
                <div className="space-y-3">
                    <h3 className="font-semibold">Paso 2: Subir Archivo CSV</h3>

                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                            ${dragOver
                                ? "border-primary bg-primary/5"
                                : "border-muted-foreground/25 hover:border-primary/50"
                            }
                            ${importing ? "opacity-50 cursor-not-allowed" : ""}
                        `}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => !importing && fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file);
                            }}
                            disabled={importing}
                        />

                        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-1">
                            {importing
                                ? "Importando servidores..."
                                : "Arrastra tu archivo CSV aquí o haz clic para seleccionar"
                            }
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Formato: CSV con columnas hostname, ip_address, ssh_username, etc.
                        </p>
                    </div>
                </div>

                {/* Results */}
                {result && (
                    <div className="space-y-4">
                        <div className={`p-4 rounded-lg ${result.details.errors.length === 0
                            ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                            : result.details.success.length > 0
                                ? "bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800"
                                : "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
                            }`}>
                            <div className="flex items-center gap-2 mb-2">
                                {result.details.errors.length === 0 ? (
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : result.details.success.length > 0 ? (
                                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-red-600" />
                                )}
                                <span className="font-semibold">{result.message}</span>
                            </div>
                        </div>

                        {/* Groups Created */}
                        {result.details.groups_created.length > 0 && (
                            <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                                <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                                    Grupos creados automáticamente:
                                </p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {result.details.groups_created.map((group, i) => (
                                        <span key={i} className="px-2 py-1 bg-purple-200 dark:bg-purple-800 rounded text-xs">
                                            {group}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Success List */}
                        {result.details.success.length > 0 && (
                            <div className="max-h-40 overflow-y-auto">
                                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                                    ✅ Servidores importados ({result.details.success.length}):
                                </p>
                                <div className="space-y-1">
                                    {result.details.success.map((s, i) => (
                                        <div key={i} className="text-xs p-2 bg-green-100 dark:bg-green-900 rounded">
                                            <span className="font-mono">{s.hostname}</span> - {s.ip_address}
                                            {s.group !== "No group" && (
                                                <span className="ml-2 text-muted-foreground">({s.group})</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Errors List */}
                        {result.details.errors.length > 0 && (
                            <div className="max-h-40 overflow-y-auto">
                                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                                    ❌ Errores ({result.details.errors.length}):
                                </p>
                                <div className="space-y-1">
                                    {result.details.errors.map((e, i) => (
                                        <div key={i} className="text-xs p-2 bg-red-100 dark:bg-red-900 rounded">
                                            <span className="font-semibold">Fila {e.row}:</span> {e.error}
                                            {e.hostname && <span className="ml-1">({e.hostname})</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        className="flex-1"
                        type="button"
                    >
                        {result ? "Cerrar" : "Cancelar"}
                    </Button>
                    {result && result.details.success.length > 0 && (
                        <Button onClick={onCancel} className="flex-1" type="button">
                            Continuar
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
