import 'package:flutter/material.dart';
import 'adaptive_scaffold.dart';

AdaptiveScaffoldDestination aboutMe =
    AdaptiveScaffoldDestination(title: 'About Me', icon: Icons.person);

AdaptiveScaffoldDestination projects =
    AdaptiveScaffoldDestination(title: 'Projects', icon: Icons.code);

List<AdaptiveScaffoldDestination> scaffoldDestinations = [
  aboutMe,
  projects,
];
