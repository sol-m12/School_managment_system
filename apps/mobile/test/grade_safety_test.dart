import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Fails if mobile code gains grade-entry / grade-write functionality.
/// Note: reading `gradeLevel` from student profile JSON is allowed.
void main() {
  test('mobile must not contain grade-entry or grade-write surfaces', () {
    final lib = Directory('lib');
    expect(lib.existsSync(), isTrue);

    final forbidden = <RegExp>[
      RegExp(r'grade[-_]?entry', caseSensitive: false),
      RegExp(r'grade[-_]?write', caseSensitive: false),
      RegExp(r'enterGrade'),
      RegExp(r'submitGrade'),
      RegExp(r'saveGrade'),
      RegExp(r'updateGrade'),
      RegExp(r'GradeEntry'),
      RegExp(r'/teacher/grades'),
      RegExp(r'/teacher/office/grades'),
      RegExp(r'/grades/scores'),
      RegExp(r'/grades/plans'),
      RegExp(r"post\([^)]*grade", caseSensitive: false),
    ];

    final hits = <String>[];
    for (final file in lib.listSync(recursive: true).whereType<File>()) {
      if (!file.path.endsWith('.dart')) continue;
      final text = file.readAsStringSync();
      for (final pattern in forbidden) {
        if (pattern.hasMatch(text)) {
          hits.add('${file.path} matches ${pattern.pattern}');
        }
      }
    }

    expect(hits, isEmpty, reason: hits.join('\n'));
  });
}
