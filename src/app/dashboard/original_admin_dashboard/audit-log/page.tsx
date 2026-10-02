import AuditLogClient from "@/components/AuditLogClient";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "Audit log — Original Admin — Smart Gen",
};

export default function OriginalAdminAuditLogPage() {
  return (
    <>
      <h1>Audit log</h1>
      <p className={shell.subtitle}>
        Who viewed personal data, when, and which record — never the data
        itself. Repeated identical views within five minutes are shown as
        one row with a count. Looking at this page is itself recorded. This
        covers reads made through the API only: it does not see anyone
        reading the database, backups or server directly.
      </p>
      <AuditLogClient />
    </>
  );
}
