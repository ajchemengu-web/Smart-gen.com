import CameraManagementClient from "@/components/CameraManagementClient";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "Camera management — Security Admin — Smart Gen",
};

export default function SecurityAdminCameraManagementPage() {
  return (
    <>
      <h1>Camera management</h1>
      <p className={shell.subtitle}>
        Camera status and configuration within SmartAccess (docs/PRD.md §8)
        — provisioning and removing a camera stays with the Original Admin.
      </p>
      <CameraManagementClient canCreate={false} canDelete={false} />
    </>
  );
}
