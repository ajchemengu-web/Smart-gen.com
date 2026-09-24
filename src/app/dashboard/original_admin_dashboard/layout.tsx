import DashboardSidebarLayout from "@/components/DashboardSidebarLayout";

const SECTIONS = [
  {
    href: "/dashboard/original_admin_dashboard",
    label: "Overview",
    exact: true,
  },
  {
    href: "/dashboard/original_admin_dashboard/analytics",
    label: "Analytics",
  },
  {
    href: "/dashboard/original_admin_dashboard/camera-management",
    label: "Camera management",
  },
  {
    href: "/dashboard/original_admin_dashboard/lecturers",
    label: "Lecturer profiles",
  },
  {
    href: "/dashboard/original_admin_dashboard/facial-enrollment",
    label: "Facial enrollment",
  },
];

export default function OriginalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardSidebarLayout roleLabel="Original Admin" sections={SECTIONS}>
      {children}
    </DashboardSidebarLayout>
  );
}
