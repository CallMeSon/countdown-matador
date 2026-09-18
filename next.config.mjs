/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  // Hanya di `next dev`: proxy POST /upload ke relay lokal supaya same-origin
  // (tanpa env & tanpa CORS). Build `output: 'export'` mengabaikan rewrites —
  // di produksi jalur ini ditangani nginx.
  ...(isDev
    ? {
        async rewrites() {
          return [{ source: '/upload', destination: 'http://127.0.0.1:8081/upload' }];
        },
      }
    : {}),
};

export default nextConfig;
