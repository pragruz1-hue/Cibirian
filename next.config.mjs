/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Замыкающий слэш во всех URL — как на sibcirulnik.ru
  // (/catalog/razdel/tovar/), чтобы ссылки совпадали с оригиналом
  // и не было лишнего 308-редиректа.
  trailingSlash: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'sibcirulnik.ru' },
      { protocol: 'https', hostname: '**.sibcirulnik.ru' },
    ],
  },
};
export default nextConfig;
