const withNextIntl = require('next-intl/plugin')(
    './src/i18n/request.ts'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    experimental: {
        outputFileTracingRoot: undefined,
    },
};

module.exports = withNextIntl(nextConfig);
