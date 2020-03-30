import 'package:flutter/material.dart';

class FindMeCard extends StatelessWidget {
  const FindMeCard({@required this.leading, @required this.title, this.onTap});

  final Widget leading;
  final String title;
  final Function onTap;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(8.0),
      height: 92.0,
      width: 360.0,
      child: Material(
        type: MaterialType.card,
        borderRadius: BorderRadius.circular(6.0),
        elevation: 2.0,
        child: InkWell(
          onTap: onTap,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Container(
                  width: 48.0,
                  height: 48.0,
                  child: leading,
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.headline5,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
