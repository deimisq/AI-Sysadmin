const withNextIntl = require('next-intl/plugin')(
    './src/i18n/request.ts'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Use standalone for better compatibility with dynamic routes
    output: 'standalone',

    // Optimize images
    images: {
        unoptimized: false,
    },
};

module.exports = withNextIntl(nextConfig);
