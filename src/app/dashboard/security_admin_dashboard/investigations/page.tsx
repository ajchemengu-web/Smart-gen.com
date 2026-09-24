import SmartAccessClient from "./SmartAccessClient";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "SmartAccess Investigations — Smart Gen",
};

export default function SmartAccessInvestigationsPage() {
  return (
    <>
      <h1>Target tracking &amp; investigations</h1>
      <p className={shell.subtitle}>
        Register a person of interest and every live sighting at a
        checkpoint is logged automatically (docs/PRD.md §6.3a) — a target
        flag overrides normal admission, even for an otherwise-legitimate
        member. Investigations are lightweight case files, optionally
        linked to one target, for building a record over time.
      </p>
      <SmartAccessClient />
    </>
  );
}
