import 'package:flutter/material.dart';
import 'package:animations/animations.dart';

import 'pages.dart';
import 'widgets.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  // This widget is the root of your application.
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Skylled.dev',
      theme: ThemeData(
        primarySwatch: Colors.indigo,
      ),
      home: HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  @override
  _HomePageState createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _selectedIndex = 0;
  List<Widget> pages = [
    AboutPage(),
    ProjectsPage(),
  ];

  @override
  Widget build(BuildContext context) {
    return AdaptiveScaffold(
      selectedIndex: _selectedIndex,
      destinations: scaffoldDestinations,
      title: Text('Skylled.dev  >  ${scaffoldDestinations[_selectedIndex].title}'),
      onNavigationIndexChange: (var index) {
        setState(() {
          _selectedIndex = index;
        });
      },
      body: Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: 1000.0),
          child: PageTransitionSwitcher(
            transitionBuilder: (
              Widget child,
              Animation<double> animation,
              Animation<double> secAnimation,
            ) {
              return FadeThroughTransition(
                animation: animation,
                secondaryAnimation: secAnimation,
                child: child,
              );
            },
            child: pages[_selectedIndex],
          ),
        ),
      ),
    );
  }
}
