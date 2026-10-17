import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app/router.dart';
import 'package:mobile/core/auth/auth_user.dart';
import 'package:mobile/core/cache/cache_repository.dart';
import 'package:mobile/features/parent/parent_cache_keys.dart';

AuthUser _user({required String role, int tenantId = 1, int id = 10}) =>
    AuthUser(
      id: id,
      username: 'u$id',
      role: role,
      tenantId: tenantId,
      tenantName: 'T$tenantId',
      permissions: const [],
    );

void main() {
  group('AuthUser.isParent', () {
    test('true only for Parent role', () {
      expect(_user(role: 'Parent').isParent, isTrue);
      expect(_user(role: 'Student').isParent, isFalse);
      expect(_user(role: 'Teacher').isParent, isFalse);
    });

    test('parent home redirect path', () {
      expect(homePathForRole(_user(role: 'Parent')), '/parent/home');
      expect(homePathForRole(_user(role: 'Student')), '/student/home');
      expect(homePathForRole(_user(role: 'Teacher')), '/teacher/home');
      expect(homePathForRole(_user(role: 'Admin')), '/unsupported');
    });
  });

  group('selected child switching', () {
    test('empty children clears selection', () {
      expect(
        resolveSelectedStudentId(studentIds: const [], currentSelected: 5),
        isNull,
      );
    });

    test('single child auto-selects', () {
      expect(
        resolveSelectedStudentId(studentIds: const [42], currentSelected: null),
        42,
      );
      expect(
        resolveSelectedStudentId(studentIds: const [42], currentSelected: 99),
        42,
      );
    });

    test('multi child keeps current when still linked', () {
      expect(
        resolveSelectedStudentId(
          studentIds: const [1, 2, 3],
          currentSelected: 2,
        ),
        2,
      );
    });

    test('multi child clears when previous child is gone', () {
      expect(
        resolveSelectedStudentId(
          studentIds: const [1, 3],
          currentSelected: 2,
        ),
        isNull,
      );
    });

    test('multi child with no prior selection stays null', () {
      expect(
        resolveSelectedStudentId(
          studentIds: const [1, 2],
          currentSelected: null,
        ),
        isNull,
      );
    });
  });

  group('parent cache keys', () {
    test('child-scoped keys include student id', () {
      expect(parentAttendanceCacheKey(7), 'parent_att_7');
      expect(parentDisciplineCacheKey(7), 'parent_disc_7');
      expect(parentAssignmentsCacheKey(7), 'parent_hw_7');
      expect(parentResultsCacheKey(7), 'parent_results_7');
      expect(parentLibraryCacheKey(7), 'parent_lib_7');
      expect(parentMessagesCacheKey(7), 'parent_msg_7');
      expect(parentAttendanceCacheKey(7), isNot(parentAttendanceCacheKey(8)));
    });

    test('scoped key includes tenantId + userId + student key', () {
      final a = scopedCacheKey(1, 10, parentAttendanceCacheKey(5));
      final b = scopedCacheKey(1, 10, parentAttendanceCacheKey(6));
      final c = scopedCacheKey(2, 10, parentAttendanceCacheKey(5));
      expect(a, '1:10:parent_att_5');
      expect(a, isNot(b));
      expect(a, isNot(c));
    });
  });
}
