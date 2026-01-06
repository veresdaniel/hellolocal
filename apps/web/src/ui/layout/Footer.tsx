import { Link } from "react-router-dom";
import { HAS_MULTIPLE_TENANTS } from "../../app/config";

export function Footer({
  lang,
  tenantSlug,
}: {
  lang: string;
  tenantSlug?: string;
}) {
  const prefix = HAS_MULTIPLE_TENANTS && tenantSlug ? `/${tenantSlug}` : "";

  return (
    <footer className="border-t mt-10">
      <div className="mx-auto max-w-5xl p-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link className="underline" to={`${prefix}/${lang}/impresszum`}>Impresszum</Link>
        <Link className="underline" to={`${prefix}/${lang}/aszf`}>ÁSZF</Link>
        <Link className="underline" to={`${prefix}/${lang}/adatvedelem`}>Adatvédelem</Link>
      </div>
    </footer>
  );
}
