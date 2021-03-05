// Source: https://github.com/flutter/samples/blob/master/experimental/web_dashboard/lib/src/widgets/third_party/adaptive_scaffold.dart
//
// Copyright 2020, the Flutter project authors. Please see the AUTHORS file
// for details. All rights reserved. Use of this source code is governed by a
// BSD-style license that can be found in the LICENSE file.

// Changes:
// * Remove Drawer related code. I don't want drawer, only rail or bottom nav

import 'package:flutter/material.dart';

bool _isMediumScreen(BuildContext context) {
  return MediaQuery.of(context).size.width > 640.0;
}

/// See bottomNavigationBarItem or NavigationRailDestination
class AdaptiveScaffoldDestination {
  final String title;
  final IconData icon;

  const AdaptiveScaffoldDestination({
    required this.title,
    required this.icon,
  });
}

/// A widget that adapts to the current display size, displaying a [Drawer],
/// [NavigationRail], or [BottomNavigationBar]. Navigation destinations are
/// defined in the [destinations] parameter.
class AdaptiveScaffold extends StatefulWidget {
  final Widget title;
  final Widget body;
  final int selectedIndex;
  final List<AdaptiveScaffoldDestination> destinations;
  final ValueChanged<int> onNavigationIndexChange;

  AdaptiveScaffold({
    required this.title,
    required this.body,
    required this.selectedIndex,
    required this.destinations,
    required this.onNavigationIndexChange,
  });

  @override
  _AdaptiveScaffoldState createState() => _AdaptiveScaffoldState();
}

class _AdaptiveScaffoldState extends State<AdaptiveScaffold> {
  @override
  Widget build(BuildContext context) {
    // Show a navigation rail
    if (_isMediumScreen(context)) {
      return Scaffold(
        appBar: AppBar(
          title: widget.title,
        ),
        body: Row(
          children: [
            NavigationRail(
              destinations: [
                ...widget.destinations.map(
                  (d) => NavigationRailDestination(
                    icon: Icon(d.icon),
                    label: Text(d.title),
                  ),
                ),
              ],
              selectedIndex: widget.selectedIndex,
              onDestinationSelected: widget.onNavigationIndexChange,
            ),
            VerticalDivider(
              width: 1,
              thickness: 1,
              color: Colors.grey[300],
            ),
            Expanded(
              child: widget.body,
            ),
          ],
        ),
      );
    }

    // Show a bottom app bar
    return Scaffold(
      body: widget.body,
      appBar: AppBar(title: widget.title),
      bottomNavigationBar: BottomNavigationBar(
        items: [
          ...widget.destinations.map(
            (d) => BottomNavigationBarItem(
              icon: Icon(d.icon),
              label: d.title,
            ),
          ),
        ],
        currentIndex: widget.selectedIndex,
        onTap: widget.onNavigationIndexChange,
      ),
    );
  }
}
