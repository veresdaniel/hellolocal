// src/pages/HomePage.tsx
import { Link } from "react-router-dom";
import { useTenantContext } from "../app/tenant/useTenantContext";
import { buildPath } from "../app/routing/buildPath";
import { useSeo } from "../seo/useSeo";

export function HomePage() {
  const { lang, tenantSlug } = useTenantContext();

  useSeo({
    title: "Helyi élmények felfedezése",
    description: "Borászatok, gasztro és turisztikai helyek egy térképen.",
  });

  return (
    <div style={{ padding: 24 }}>
      <h1>👋 Helló!</h1>
      <p>Fedezd fel a környék legjobb helyeit.</p>

      <Link to={buildPath({ tenantSlug, lang, path: "explore" })}>
        → Felfedezés
      </Link>
    </div>
  );
}
