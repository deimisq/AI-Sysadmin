const withNextIntl = require('next-intl/plugin')(
    './src/i18n/request.ts'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Always use 'export' for Tauri desktop builds
    output: 'export',

    // Disable image optimization for static export
    images: {
        unoptimized: true,
    },

    // Exclude problematic pages from build
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
            };
        }
        return config;
    },
};

module.exports = withNextIntl(nextConfig);
