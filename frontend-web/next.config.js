const withNextIntl = require('next-intl/plugin')(
    './src/i18n/request.ts'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Standalone mode for Tauri (supports dynamic routes)
    output: 'standalone',

    // Disable image optimization
    images: {
        unoptimized: true,
    },
};

module.exports = withNextIntl(nextConfig);
