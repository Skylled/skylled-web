import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

import '../widgets.dart';

class AboutPage extends StatefulWidget {
  AboutPage({Key key}) : super(key: key);

  @override
  _AboutPageState createState() => _AboutPageState();
}

class _AboutPageState extends State<AboutPage> {
  @override
  void initState() {
    print('Initialized About Page!');
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
                leading: Image.asset('assets/stadia.png'),
                title: 'Skull',
                onTap: () {
                  launch('https://stadia.com/profile/15286501108470772046');
                }
              ),
              FindMeCard(
                leading: Icon(
                  FontAwesomeIcons.twitter,
                  size: 48.0,
                ),
                title: '@SkylledDev',
                onTap: () {
                  launch('https://twitter.com/SkylledDev');
                },
              ),
              FindMeCard(
                leading: Icon(
                  Icons.work,
                  size: 48.0,
                ),
                title: '9to5Google',
                onTap: () {
                  launch('https://9to5google.com/author/skylled/');
                },
              ),
              FindMeCard(
                leading: Icon(
                  FontAwesomeIcons.github,
                  size: 48.0,
                ),
                title: 'Skylled',
                onTap: () {
                  launch('https://github.com/Skylled/');
                },
              ),
            ],
          ),
        ),
      ],
    );
  }
}
