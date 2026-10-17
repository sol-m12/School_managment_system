import { Outlet } from "react-router-dom";
import { PlatformAuthProvider } from "./PlatformAuthProvider";

export function PlatformRoot() {
  return (
    <PlatformAuthProvider>
      <Outlet />
    </PlatformAuthProvider>
  );
}
