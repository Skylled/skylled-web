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
                titleText: 'Tweet Yeet',
                actions: [
                  TextButton(
                    onPressed: () {
                      launchUrl(Uri(
                          scheme: 'https',
                          host: 'play.google.com',
                          path: 'store/apps/details',
                          queryParameters: {'id': 'dev.skylled.tweetyeet'}));
                    },
                    child: Text('Play Store'),
                  ),
                  TextButton(
                    onPressed: () {
                      launchUrl(Uri(
                        // https://drive.google.com/file/d/1m85CkozX-zrAAuFdrfKHI6egCJKDUbx1/view?usp=share_link
                        scheme: 'https',
                        host: 'drive.google.com',
                        path: 'file/d/1m85CkozX-zrAAuFdrfKHI6egCJKDUbx1/view',
                      ));
                    },
                    child: Text('Community Edition (free)'),
                  ),
                ],
                child: Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: Text('''
Tweet Yeet is an Android app for deleting tweets from your Twitter account, using your archive.

While the Play Store version costs \$2, I've also provided a free "Community" edition that can be sideloaded.'''),
                ),
              ),
              ProjectCard(
                titleText: 'ExpansionTileCard',
                actions: <Widget>[
                  TextButton(
                    onPressed: () {
                      launchUrl(Uri(
                          scheme: 'https',
                          host: 'pub.dev',
                          path: 'packages/expansion_tile_card'));
                    },
                    child: Text('Pub'),
                  ),
                  TextButton(
                    onPressed: () {
                      launchUrl(Uri(
                          scheme: 'https',
                          host: 'github.com',
                          path: 'Skylled/expansion_tile_card'));
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
                      launchUrl(Uri(
                          scheme: 'https',
                          host: 'github.com',
                          path: 'Skylled/skylled-web'));
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
