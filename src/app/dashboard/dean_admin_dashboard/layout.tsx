import DashboardSidebarLayout from "@/components/DashboardSidebarLayout";

const SECTIONS = [
  {
    href: "/dashboard/dean_admin_dashboard",
    label: "Overview",
    exact: true,
  },
];

export default function DeanAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardSidebarLayout roleLabel="Dean of School" sections={SECTIONS}>
      {children}
    </DashboardSidebarLayout>
  );
}
