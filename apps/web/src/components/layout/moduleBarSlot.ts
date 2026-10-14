import { createContext } from "react";

/**
 * Element above the app header where a module's own top bar is rendered
 * (the legacy "TEACHER MGMT" bar sits above the sidebar header and stays pinned).
 */
export const ModuleBarSlotContext = createContext<HTMLElement | null>(null);
