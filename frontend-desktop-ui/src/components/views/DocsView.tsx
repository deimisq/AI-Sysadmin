import { useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Input } from '@/components/ui/input';
import { appLanguage } from '../../lib/ui-language';
import { documentation, searchArticles } from '../../lib/documentation';

export function DocsView() {
    const english = appLanguage() === 'en';
    const articles = documentation[english ? 'en' : 'es'];
    const [selected, setSelected] = useState('start');
    const [query, setQuery] = useState('');
    const matches = searchArticles(articles, query);
    const current = matches.find(article => article.id === selected) ?? matches[0];
    const categories = [...new Set(matches.map(article => article.category))];
    const openArticle = (id: string) => { setSelected(id); setQuery(''); };
    return <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-6">
        <header className="shrink-0">
            <h1 className="flex items-center gap-2 text-2xl font-semibold"><BookOpen size={24} />{english ? 'Documentation' : 'Documentación'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{english ? 'Practical Windows guides. Choose a topic or search all articles.' : 'Guías prácticas de Windows. Elegí un tema o buscá en todos los artículos.'}</p>
        </header>
        <div className="relative shrink-0">
            <Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input aria-label={english ? 'Search documentation' : 'Buscar en la documentación'} placeholder={english ? 'Search connections, models, backups…' : 'Buscar conexiones, modelos, copias…'} value={query} onChange={event => setQuery(event.target.value)} className="pl-9" />
        </div>
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(100px,30%)_1fr] gap-4 md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-1">
            <nav aria-label={english ? 'Documentation topics' : 'Temas de documentación'} className="overflow-y-auto rounded-lg border p-2">
                <p role="status" className="px-2 py-1 text-xs text-muted-foreground">{matches.length} {english ? (matches.length === 1 ? 'article' : 'articles') : (matches.length === 1 ? 'artículo' : 'artículos')}</p>
                {categories.map(category => <section key={category} className="mb-3">
                    <h2 className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</h2>
                    {matches.filter(article => article.category === category).map(article => <button key={article.id} aria-current={current?.id === article.id ? 'page' : undefined} className={`mb-1 w-full rounded px-2 py-2 text-left text-sm hover:bg-muted ${current?.id === article.id ? 'bg-secondary font-medium' : ''}`} onClick={() => setSelected(article.id)}>{article.title}</button>)}
                </section>)}
            </nav>
            <article key={current?.id} className="min-w-0 overflow-y-auto rounded-lg border p-5 md:p-7" aria-label={current?.title}>
                {current ? <div className="mx-auto max-w-3xl">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">{current.category}</p>
                    <h2 className="text-2xl font-semibold">{current.title}</h2>
                    <p className="mb-6 mt-2 text-muted-foreground">{current.summary}</p>
                    <div className="space-y-4 text-sm leading-7 [&_h3]:pt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_code]:break-words [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_p]:break-words">
                        <ReactMarkdown components={{ h2: ({ children }) => <h3>{children}</h3> }}>{current.content}</ReactMarkdown>
                    </div>
                    <footer className="mt-8 border-t pt-4">
                        <h3 className="mb-2 text-sm font-semibold">{english ? 'Related guides' : 'Guías relacionadas'}</h3>
                        <div className="flex flex-wrap gap-2">{current.related.map(id => {
                            const related = articles.find(article => article.id === id);
                            return related && <button key={id} onClick={() => openArticle(id)} className="rounded border px-3 py-2 text-sm hover:bg-muted">{related.title}</button>;
                        })}</div>
                    </footer>
                </div> : <div role="status" className="py-8 text-center">
                    <h2 className="font-semibold">{english ? 'No matching articles' : 'No se encontraron artículos'}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{english ? 'Try fewer words or another topic.' : 'Probá con menos palabras o con otro tema.'}</p>
                    <button className="mt-4 rounded border px-3 py-2 text-sm" onClick={() => setQuery('')}>{english ? 'Show all articles' : 'Mostrar todos los artículos'}</button>
                </div>}
            </article>
        </div>
    </div>;
}
