import { createFileRoute } from "@tanstack/react-router";
import { serverPublicClient, sel } from "@/lib/supabase-public.server";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;

        const supabase = serverPublicClient();
        const { data: bots, error } = await supabase
          .from("bots")
          .select(sel("slug, updated_at"))
          .eq("status", "approved")
          .returns<{ slug: string; updated_at: string }[]>();

        if (error) {
          return new Response(`Error: ${error.message}`, { status: 500 });
        }

        const staticRoutes = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/bots", changefreq: "daily", priority: "0.9" },
          { path: "/categories", changefreq: "weekly", priority: "0.8" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
          { path: "/claim", changefreq: "monthly", priority: "0.5" },
          { path: "/terms", changefreq: "monthly", priority: "0.5" },
          { path: "/privacy", changefreq: "monthly", priority: "0.5" },
        ];

        const staticUrls = staticRoutes.map(
          (route) =>
            `<url><loc>${xmlEscape(`${origin}${route.path}`)}</loc><changefreq>${xmlEscape(route.changefreq)}</changefreq><priority>${xmlEscape(route.priority)}</priority></url>`,
        );

        const botUrls =
          bots?.map((bot) => {
            const updatedAt = bot.updated_at ? new Date(bot.updated_at) : null;
            const lastmod =
              updatedAt && !Number.isNaN(updatedAt.getTime())
                ? `<lastmod>${xmlEscape(updatedAt.toISOString())}</lastmod>`
                : "";
            return `<url><loc>${xmlEscape(`${origin}/bots/${bot.slug}`)}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.7</priority></url>`;
          }) ?? [];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.join("\n")}
${botUrls.join("\n")}
</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
          },
        });
      },
    },
  },
});

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
