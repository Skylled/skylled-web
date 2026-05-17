import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

import '../theme.dart';

/// Glassmorphic top navigation shared across every page.
///
/// [currentPath] is the page's URL path — used to underline the active link.
class SiteHeader extends StatelessComponent {
  const SiteHeader({required this.currentPath, super.key});

  final String currentPath;

  bool _isActive(String href) {
    if (href == '/') return currentPath == '/';
    return currentPath == href || currentPath.startsWith('$href/');
  }

  @override
  Component build(BuildContext context) {
    const links = [
      ('Home', '/'),
      ('Posts', '/posts'),
      ('Tools', '/tools'),
    ];

    return header(classes: 'site-header', [
      div(classes: 'site-header__inner', [
        a(classes: 'site-header__brand', href: '/', [
          span([Component.text('skylled.dev')]),
        ]),
        nav(classes: 'site-header__nav', [
          for (final (label, href) in links)
            a(
              classes: 'site-header__link${_isActive(href) ? ' is-active' : ''}',
              href: href,
              [Component.text(label)],
            ),
        ]),
      ]),
    ]);
  }

  static List<StyleRule> styles = [
    css('.site-header').styles(
      position: Position.fixed(top: Unit.zero, left: Unit.zero, right: Unit.zero),
      zIndex: const ZIndex(50),
      backgroundColor: const Color('rgba(250, 249, 252, 0.8)'),
      backdropFilter: Filter.blur(12.px),
      raw: {'-webkit-backdrop-filter': 'blur(12px)'},
    ),
    css('.site-header__inner').styles(
      display: Display.flex,
      alignItems: AlignItems.center,
      justifyContent: JustifyContent.spaceBetween,
      gap: Gap.all(1.5.rem),
      padding: Padding.symmetric(horizontal: 1.5.rem, vertical: 1.rem),
      maxWidth: 80.rem,
      margin: Margin.symmetric(horizontal: Unit.auto),
    ),
    css('.site-header__brand').styles(
      fontFamily: headlineFont,
      fontWeight: FontWeight.w700,
      fontSize: 1.125.rem,
      color: Palette.onSurface,
      letterSpacing: (-0.01).em,
      textDecoration: const TextDecoration(line: TextDecorationLine.none),
    ),
    css('.site-header__nav').styles(
      display: Display.flex,
      alignItems: AlignItems.center,
      gap: Gap.all(2.rem),
    ),
    css('.site-header__link').styles(
      fontFamily: headlineFont,
      fontSize: 0.875.rem,
      fontWeight: FontWeight.w500,
      letterSpacing: 0.02.em,
      color: Palette.onSurfaceVariant,
      textDecoration: const TextDecoration(line: TextDecorationLine.none),
      padding: Padding.only(bottom: 0.25.rem),
      transition: Transition('color', duration: Duration(milliseconds: 200)),
    ),
    css('.site-header__link:hover').styles(color: Palette.onSurface),
    css('.site-header__link.is-active').styles(
      color: Palette.onSurface,
      border: Border.only(
        bottom: BorderSide(color: Palette.onSurface, width: 2.px, style: BorderStyle.solid),
      ),
    ),
    css.media(MediaQuery.all(maxWidth: 600.px), [
      css('.site-header__nav').styles(gap: Gap.all(1.25.rem)),
      css('.site-header__inner').styles(padding: Padding.symmetric(horizontal: 1.rem, vertical: 0.75.rem)),
    ]),
  ];
}
