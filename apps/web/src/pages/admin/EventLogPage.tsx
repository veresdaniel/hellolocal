import { useSearchParams } from "react-router-dom";
import { ActivityLogTable } from "../../components/ActivityLogTable";
import { usePageTitle } from "../../hooks/usePageTitle";

export function EventLogPage() {
  const [params] = useSearchParams();
  const global = params.get("scope") === "global";
  usePageTitle(global ? "admin.eventLog.globalTitle" : "admin.eventLog.title");
  return <ActivityLogTable mode={global ? "global" : "scope"} />;
}
