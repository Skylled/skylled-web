import 'package:flutter/material.dart';

class ProjectCard extends StatelessWidget {
  const ProjectCard({
    this.titleText,
    this.child,
    this.actions,
  });

  final String titleText;
  final Widget child;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(8.0),
      height: 260.0,
      width: 360.0,
      child: Material(
        type: MaterialType.card,
        borderRadius: BorderRadius.circular(6.0),
        elevation: 2.0,
        child: Column(
          children: <Widget>[
            // Title line
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: Padding(
                padding: const EdgeInsets.all(8.0),
                child: Text(
                  titleText,
                  style: Theme.of(context).textTheme.headline6,
                ),
              ),
            ),
            // Central widget
            Expanded(child: child),
            // Action buttons
            if (actions.isNotEmpty)
              ButtonBar(
                alignment: MainAxisAlignment.end,
                children: actions,
              ),
          ],
        ),
      ),
    );
  }
}
