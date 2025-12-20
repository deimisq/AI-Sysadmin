"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { RichEditor } from "@/components/documentation/rich-editor";
import { toast } from "sonner";
import { 
    DocumentationArticle, 
    fetchDocArticle, 
    createDocArticle, 
    updateDocArticle,
    fetchDocCategories 
} from "@/lib/api-documentation";
import { fetchCurrentUser } from "@/lib/api";

export default function DocumentationEditPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const articleId = searchParams?.get('id');
    
    const [loading, setLoading] = useState(!!articleId);
    const [saving, setSaving] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    
    // Form fields
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("general");
    const [icon, setIcon] = useState("FileText");
    const [order, setOrder] = useState(0);
    const [published, setPublished] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);

    useEffect(() => {
        checkPermissions();
        loadCategories();
        if (articleId) {
            loadArticle();
        }
    }, [articleId]);

    const checkPermissions = async () => {
        try {
            const user = await fetchCurrentUser();
            const admin = ["superadmin", "admin"].includes(user.role);
            setIsAdmin(admin);
            if (!admin) {
                toast.error("No tienes permisos para editar documentación");
                router.push('/documentation');
            }
        } catch (error) {
            router.push('/login');
        }
    };

    const loadCategories = async () => {
        try {
            const cats = await fetchDocCategories();
            setCategories(cats);
        } catch (error) {
            console.error("Failed to load categories", error);
        }
    };

    const loadArticle = async () => {
        try {
            // Note: We need to fetch by ID, but API uses slug. We'll need to modify this
            const articles = await import("@/lib/api-documentation").then(m => m.fetchDocArticles(false));
            const article = articles.find((a: any) => a.id === parseInt(articleId!));
            
            if (article) {
                setTitle(article.title);
                setSlug(article.slug);
                setDescription(article.description || "");
                setContent(article.content);
                setCategory(article.category);
                setIcon(article.icon);
                setOrder(article.order);
                setPublished(article.published);
            }
        } catch (error) {
            console.error("Failed to load article", error);
            toast.error("Error al cargar el artículo");
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (text: string) => {
        return text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    };

    const handleTitleChange = (newTitle: string) => {
        setTitle(newTitle);
        if (!articleId) {
            setSlug(generateSlug(newTitle));
        }
    };

    const handleSave = async (publishNow: boolean = false) => {
        if (!title || !slug || !content) {
            toast.error("Título, slug y contenido son obligatorios");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                title,
                slug,
                description,
                content,
                category,
                icon,
                order,
                published: publishNow || published,
            };

            if (articleId) {
                await updateDocArticle(parseInt(articleId), payload);
                toast.success("Artículo actualizado correctamente");
            } else {
                await createDocArticle(payload);
                toast.success("Artículo creado correctamente");
            }
            
            router.push('/documentation');
        } catch (error: any) {
            console.error("Failed to save article", error);
            toast.error(error.message || "Error al guardar el artículo");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => router.push('/documentation')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver a Documentación
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => handleSave(false)}
                            disabled={saving}
                        >
                            Guardar Borrador
                        </Button>
                        <Button
                            onClick={() => handleSave(true)}
                            disabled={saving}
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            {saving ? "Guardando..." : "Publicar"}
                        </Button>
                    </div>
                </div>

                {/* Main Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>{articleId ? "Editar Artículo" : "Nuevo Artículo"}</CardTitle>
                        <CardDescription>
                            Crea o edita artículos de documentación con formato rico
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Title and Slug */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Título *</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => handleTitleChange(e.target.value)}
                                    placeholder="Título del artículo"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">Slug (URL) *</Label>
                                <Input
                                    id="slug"
                                    value={slug}
                                    onChange={(e) => setSlug(generateSlug(e.target.value))}
                                    placeholder="url-del-articulo"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Descripción Corta</Label>
                            <Input
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Breve descripción para la lista"
                            />
                        </div>

                        {/* Category, Icon, Order */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="category">Categoría</Label>
                                <Input
                                    id="category"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    placeholder="general"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="icon">Ícono (Lucide)</Label>
                                <Input
                                    id="icon"
                                    value={icon}
                                    onChange={(e) => setIcon(e.target.value)}
                                    placeholder="FileText"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="order">Orden</Label>
                                <Input
                                    id="order"
                                    type="number"
                                    value={order}
                                    onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Content Editor */}
                        <div className="space-y-2">
                            <Label>Contenido *</Label>
                            <RichEditor
                                content={content}
                                onChange={setContent}
                                placeholder="Escribe el contenido del artículo aquí..."
                            />
                        </div>

                        {/* Status */}
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="published"
                                checked={published}
                                onChange={(e) => setPublished(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <Label htmlFor="published" className="cursor-pointer">
                                Publicar inmediatamente
                            </Label>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
