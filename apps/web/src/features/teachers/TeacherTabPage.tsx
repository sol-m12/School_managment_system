import { TeacherModuleBar } from "./components/TeacherModuleBar";

/**
 * The other TEACHER MGMT tabs (classes, homeroom, vocational, system assignment) are separate
 * legacy pages that are not ported yet. They show the module bar only.
 */
export function TeacherTabPage() {
  return (
    <div className="px-3 py-4">
      <TeacherModuleBar />
    </div>
  );
}
