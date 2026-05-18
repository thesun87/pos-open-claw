import { useAdminUiStore } from "../../../../shared/stores/admin-ui.store";

const Backdrop: React.FC = () => {
  const isMobileOpen = useAdminUiStore((state) => state.mobileDrawerOpen);
  const setMobileDrawerOpen = useAdminUiStore((state) => state.setMobileDrawerOpen);

  if (!isMobileOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-admin-gray-900/50 lg:hidden"
      onClick={() => setMobileDrawerOpen(false)}
    />
  );
};

export default Backdrop;
