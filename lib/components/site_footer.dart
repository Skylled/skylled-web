import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../theme.dart';

class SiteFooter extends StatelessComponent {
  const SiteFooter({super.key});

  @override
  Component build(BuildContext context) {
    return footer(classes: 'site-footer', [
      div(classes: 'site-footer__inner', [
        div(classes: 'site-footer__brand', [Component.text('skylled.dev')]),
        nav(classes: 'site-footer__links', [
          a(href: 'https://github.com/Skylled', attributes: const {'rel': 'me'}, [Component.text('GitHub')]),
          a(href: 'https://mastodon.social/@Skylled', attributes: const {'rel': 'me'}, [Component.text('Mastodon')]),
          a(href: 'https://linkedin.com/in/skylleddev', [Component.text('LinkedIn')]),
          a(href: 'mailto:kyle@skylled.dev', [Component.text('Email')]),
        ]),
        div(classes: 'site-footer__meta', [
          Component.text('© 2026 Kyle Bradshaw'),
        ]),
      ]),
    ]);
  }

  static List<StyleRule> styles = [
    css('.site-footer').styles(
      backgroundColor: Palette.surfaceContainer,
      padding: Padding.symmetric(horizontal: 1.5.rem, vertical: 3.rem),
      margin: Margin.only(top: 4.rem),
    ),
    css('.site-footer__inner').styles(
      display: Display.flex,
      flexDirection: FlexDirection.column,
      alignItems: AlignItems.center,
      gap: Gap.all(1.25.rem),
      maxWidth: 80.rem,
      margin: Margin.symmetric(horizontal: Unit.auto),
      textAlign: TextAlign.center,
    ),
    css('.site-footer__brand').styles(
      fontFamily: headlineFont,
      fontWeight: FontWeight.w800,
      fontSize: 1.125.rem,
      color: Palette.onSurface,
    ),
    css('.site-footer__links').styles(
      display: Display.flex,
      flexWrap: FlexWrap.wrap,
      justifyContent: JustifyContent.center,
      gap: Gap(row: 0.75.rem, column: 1.5.rem),
    ),
    css('.site-footer__links a').styles(
      fontFamily: headlineFont,
      fontSize: 0.75.rem,
      fontWeight: FontWeight.w500,
      color: Palette.onSurfaceVariant,
      textTransform: TextTransform.upperCase,
      letterSpacing: 0.08.em,
      textDecoration: const TextDecoration(line: TextDecorationLine.none),
      opacity: 0.75,
      transition: Transition('opacity', duration: Duration(milliseconds: 200)),
    ),
    css('.site-footer__links a:hover').styles(opacity: 1.0, color: Palette.onSurface),
    css('.site-footer__meta').styles(
      fontFamily: headlineFont,
      fontSize: 0.75.rem,
      color: Palette.onSurfaceVariant,
      opacity: 0.65,
      letterSpacing: 0.04.em,
    ),
    css.media(MediaQuery.all(minWidth: 768.px), [
      css('.site-footer__inner').styles(
        flexDirection: FlexDirection.row,
        justifyContent: JustifyContent.spaceBetween,
        textAlign: TextAlign.start,
      ),
    ]),
  ];
}
