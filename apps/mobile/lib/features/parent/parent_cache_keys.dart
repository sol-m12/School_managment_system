/// Logical cache keys for parent screens (scoped by tenantId+userId in CacheRepository).
String parentChildrenCacheKey() => 'parent_children';

String parentAttendanceCacheKey(int studentId) => 'parent_att_$studentId';

String parentDisciplineCacheKey(int studentId) => 'parent_disc_$studentId';

String parentAssignmentsCacheKey(int studentId) => 'parent_hw_$studentId';

String parentResultsCacheKey(int studentId) => 'parent_results_$studentId';

String parentLibraryCacheKey(int studentId) => 'parent_lib_$studentId';

String parentMessagesCacheKey(int studentId) => 'parent_msg_$studentId';

String parentNotificationsCacheKey() => 'parent_notifications';

String parentAppointmentsCacheKey() => 'parent_appointments';

/// Resolves which child is selected after children list changes.
/// Empty → null; one child → that id; otherwise keep current if still linked, else null.
int? resolveSelectedStudentId({
  required List<int> studentIds,
  required int? currentSelected,
}) {
  if (studentIds.isEmpty) return null;
  if (studentIds.length == 1) return studentIds.first;
  if (currentSelected != null && studentIds.contains(currentSelected)) {
    return currentSelected;
  }
  return null;
}
