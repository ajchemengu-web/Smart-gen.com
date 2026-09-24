import DashboardSidebarLayout from "@/components/DashboardSidebarLayout";

const SECTIONS = [
  {
    href: "/dashboard/timetabling_admin_dashboard",
    label: "Timetable",
    exact: true,
  },
];

export default function TimetablingAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardSidebarLayout
      roleLabel="Directorate of Timetabling"
      sections={SECTIONS}
    >
      {children}
    </DashboardSidebarLayout>
  );
}
