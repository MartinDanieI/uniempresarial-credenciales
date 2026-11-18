import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Todas las vistas dependen de sesión/cookies: se renderizan por solicitud.
  serverExternalPackages: ["@react-pdf/renderer"],
  // El PDF lee el logo desde disco: hay que incluirlo en la función serverless de Vercel.
  outputFileTracingIncludes: {
    "/api/student/manual-pdf": ["./public/logo-uniempresarial.png"],
    "/api/bienestar/students/[id]/historial-pdf": ["./public/logo-uniempresarial.png"],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
