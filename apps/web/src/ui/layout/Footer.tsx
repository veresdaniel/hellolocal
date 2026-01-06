import { Link } from "react-router-dom";
import { HAS_MULTIPLE_TENANTS } from "../../app/config";
import type { Lang } from "../../app/config";

export function Footer({
  lang,
  tenantSlug,
}: {
  lang: Lang;
  tenantSlug?: string;
}) {
  const base = HAS_MULTIPLE_TENANTS && tenantSlug ? `/${lang}/${tenantSlug}` : `/${lang}`;

  return (
    <footer className="border-t mt-10">
      <div className="mx-auto max-w-5xl p-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link className="underline" to={`${base}/impresszum`}>Impresszum</Link>
        <Link className="underline" to={`${base}/aszf`}>ÁSZF</Link>
        <Link className="underline" to={`${base}/adatvedelem`}>Adatvédelem</Link>
      </div>
    </footer>
  );
}
