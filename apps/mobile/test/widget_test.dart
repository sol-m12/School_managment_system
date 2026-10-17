import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/theme/app_colors.dart';

void main() {
  test('brand colors match web tokens', () {
    expect(AppColors.brand700.toARGB32(), 0xFF003366);
    expect(AppColors.gold.toARGB32(), 0xFFFFCC00);
  });
}
