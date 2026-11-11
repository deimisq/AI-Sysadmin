import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
    // Solo se permiten los dos idiomas de la aplicación.
    const cookieStore = await cookies();
    const locale = cookieStore.get('NEXT_LOCALE')?.value === 'en' ? 'en' : 'es';

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default
    };
});
