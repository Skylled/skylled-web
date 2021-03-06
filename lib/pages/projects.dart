import 'package:flutter/material.dart';
import 'package:expansion_tile_card/expansion_tile_card.dart';
import 'package:url_launcher/url_launcher.dart';

import '../widgets.dart';

class ProjectsPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ListView(
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 16.0, horizontal: 16.0),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              "Projects I've shared:",
              style: Theme.of(context).textTheme.headline5,
            ),
          ),
        ),
        Center(
          child: Wrap(
            spacing: 8.0,
            runSpacing: 4.0,
            children: <Widget>[
              ProjectCard(
                titleText: 'ExpansionTileCard',
                actions: <Widget>[
                  TextButton(
                    onPressed: () {
                      launch('https://pub.dev/packages/expansion_tile_card');
                    },
                    child: Text('Pub'),
                  ),
                  TextButton(
                    onPressed: () {
                      launch('https://github.com/Skylled/expansion_tile_card');
                    },
                    child: Text('GitHub'),
                  ),
                ],
                child: Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: ExpansionTileCard(
                    baseColor: Colors.white,
                    title: Text('Tap me!'),
                    children: <Widget>[
                      Padding(
                        padding: const EdgeInsets.all(8.0),
                        child: Text(
                            'Make your ExpansionTile widgets more material, in a snap!'),
                      ),
                    ],
                  ),
                ),
              ),
              ProjectCard(
                titleText: 'Skylled.dev',
                actions: <Widget>[
                  TextButton(
                    onPressed: () {
                      launch('https://github.com/Skylled/skylled-web');
                    },
                    child: Text('GitHub'),
                  ),
                ],
                child: Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Text(
                      'The source for this website is also available for your perusal!'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
