import CameraManagementClient from "@/components/CameraManagementClient";
import shell from "@/components/DashboardShell.module.css";

export const metadata = {
  title: "Camera management — Original Admin — Smart Gen",
};

export default function OriginalAdminCameraManagementPage() {
  return (
    <>
      <h1>Camera management</h1>
      <p className={shell.subtitle}>
        Full camera management control (docs/PRD.md §8) — provision,
        configure, and remove any checkpoint or classroom camera.
      </p>
      <CameraManagementClient canCreate canDelete />
    </>
  );
}
