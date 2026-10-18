import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// App bar that always shows a back arrow when the route can pop.
/// Fixes missing back buttons under go_router shell branches.
class KeytAppBar extends StatelessWidget implements PreferredSizeWidget {
  const KeytAppBar({
    super.key,
    required this.title,
    this.actions,
    this.bottom,
  });

  final String title;
  final List<Widget>? actions;
  final PreferredSizeWidget? bottom;

  @override
  Size get preferredSize => Size.fromHeight(
        kToolbarHeight + (bottom?.preferredSize.height ?? 0),
      );

  @override
  Widget build(BuildContext context) {
    final canPop = context.canPop();
    return AppBar(
      title: Text(title),
      automaticallyImplyLeading: false,
      leading: canPop
          ? IconButton(
              icon: const Icon(Icons.arrow_back),
              tooltip: MaterialLocalizations.of(context).backButtonTooltip,
              onPressed: () => context.pop(),
            )
          : null,
      actions: actions,
      bottom: bottom,
    );
  }
}
