const withNextIntl = require('next-intl/plugin')(
    './src/i18n/request.ts'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Static export for Tauri desktop app
    output: 'export',

    // Disable image optimization for static export
    images: {
        unoptimized: true,
    },

    // Trailing slash for static hosting
    trailingSlash: true,
};

module.exports = withNextIntl(nextConfig);
