import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../widgets.dart';

class AboutPage extends StatefulWidget {
  AboutPage({Key? key}) : super(key: key);

  @override
  _AboutPageState createState() => _AboutPageState();
}

class _AboutPageState extends State<AboutPage> {
  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 16.0, horizontal: 16.0),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Where you can find me:',
              style: Theme.of(context).textTheme.headline5,
            ),
          ),
        ),
        Center(
          child: Wrap(
            spacing: 8.0,
            runSpacing: 4.0,
            children: <Widget>[
              FindMeCard(
                leading: Icon(
                  FontAwesomeIcons.mastodon,
                  size: 48.0,
                ),
                title: 'Mastodon',
                onTap: () {
                  launchUrl(Uri(
                    scheme: 'https',
                    host: 'mastodon.social',
                    path: '@Skylled',
                  ));
                },
              ),
              FindMeCard(
                leading: Icon(
                  Icons.email,
                  size: 48,
                ),
                title: 'Kyle@skylled.dev',
                onTap: () {
                  launchUrl(Uri(
                    scheme: 'mailto:',
                    host: 'Kyle@skylled.dev',
                  ));
                },
              ),
              FindMeCard(
                leading: Icon(
                  FontAwesomeIcons.linkedin,
                  size: 48,
                ),
                title: 'LinkedIn',
                onTap: () {
                  launchUrl(Uri(
                    // https://www.linkedin.com/in/skylleddev/
                    scheme: 'https',
                    host: 'linkedin.com',
                    path: 'in/skylleddev',
                  ));
                },
              ),
              FindMeCard(
                leading: Icon(
                  FontAwesomeIcons.twitter,
                  size: 48.0,
                ),
                title: 'Twitter (inactive)',
                onTap: () {
                  launchUrl(Uri(
                    scheme: 'https',
                    host: 'twitter.com',
                    path: 'SkylledDev',
                  ));
                },
              ),
              FindMeCard(
                leading: Icon(
                  Icons.work,
                  size: 48.0,
                ),
                title: '9to5Google',
                onTap: () {
                  launchUrl(Uri(
                    scheme: 'https',
                    host: '9to5google.com',
                    path: 'author/skylled',
                  ));
                },
              ),
              FindMeCard(
                leading: Icon(
                  FontAwesomeIcons.github,
                  size: 48.0,
                ),
                title: 'GitHub',
                onTap: () {
                  launchUrl(Uri(
                    scheme: 'https',
                    host: 'github.com',
                    path: 'Skylled',
                  ));
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}
