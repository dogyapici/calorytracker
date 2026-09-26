import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Progress photos are downscaled in the browser to well under 1.5 MB before upload.
    serverActions: { bodySizeLimit: "2mb" },
    // Schon besuchte Seiten 30 s im Browser behalten: Zurück zu einem Tab ist
    // dann sofort da. Server Actions mit revalidatePath leeren diesen Cache.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
