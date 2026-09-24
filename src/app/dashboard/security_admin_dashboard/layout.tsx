import DashboardSidebarLayout from "@/components/DashboardSidebarLayout";

const SECTIONS = [
  {
    href: "/dashboard/security_admin_dashboard",
    label: "Overview",
    exact: true,
  },
  {
    href: "/dashboard/security_admin_dashboard/camera-management",
    label: "Camera management",
  },
  {
    href: "/dashboard/security_admin_dashboard/investigations",
    label: "Target tracking & investigations",
  },
];

export default function SecurityAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardSidebarLayout roleLabel="Security Admin" sections={SECTIONS}>
      {children}
    </DashboardSidebarLayout>
  );
}
