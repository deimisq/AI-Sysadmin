const withNextIntl = require('next-intl/plugin')(
    './src/i18n/request.ts'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Use 'export' for desktop (Tauri) builds, 'standalone' for SaaS/Docker
    output: process.env.DESKTOP_BUILD === 'true' ? 'export' : 'standalone',

    // Disable image optimization for static export (desktop mode)
    ...(process.env.DESKTOP_BUILD === 'true' && {
        images: {
            unoptimized: true,
        },
    }),
};

module.exports = withNextIntl(nextConfig);
