import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import { useAdminUiStore } from "../../../../shared/stores/admin-ui.store";

const AppLayout: React.FC = () => {
  const isExpanded = !useAdminUiStore((state) => state.isCollapsed);
  const isHovered = useAdminUiStore((state) => state.isHovered);
  const isMobileOpen = useAdminUiStore((state) => state.mobileDrawerOpen);

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
