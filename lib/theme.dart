/// Shared visual tokens and global styles for skylled.dev.
///
/// The palette and type pairing are adapted from Google Stitch's
/// "Silent Curator" editorial reference — soft grays, generous whitespace,
/// Plus Jakarta Sans for structure, Newsreader for prose.
library;

import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';

abstract final class Palette {
  static const surface = Color('#faf9fc');
  static const surfaceContainerLow = Color('#f3f3f7');
  static const surfaceContainer = Color('#eceef3');
  static const surfaceContainerHigh = Color('#e5e8ef');
  static const surfaceContainerHighest = Color('#dfe3eb');
  static const surfaceContainerLowest = Color('#ffffff');
  static const onSurface = Color('#2e3339');
  static const onSurfaceVariant = Color('#5b5f66');
  static const primary = Color('#5d5e61');
  static const primaryDim = Color('#515255');
  static const onPrimary = Color('#f7f7fa');
  static const outlineVariant = Color('#aeb2ba');
}

final headlineFont = FontFamily.list([
  const FontFamily('Plus Jakarta Sans'),
  FontFamilies.sansSerif,
]);

final bodyFont = FontFamily.list([
  const FontFamily('Newsreader'),
  const FontFamily('Georgia'),
  FontFamilies.serif,
]);

/// Google Fonts stylesheet links. Yield these from a layout's [buildHead].
Iterable<Component> fontLinks() sync* {
  yield link(rel: 'preconnect', href: 'https://fonts.googleapis.com');
  yield link(
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    attributes: const {'crossorigin': ''},
  );
  yield link(
    rel: 'stylesheet',
    href:
        'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap',
  );
}

/// Global page styles: body, links, typography defaults.
List<StyleRule> get globalStyles => [
  css('html, body').styles(
    margin: Margin.zero,
    padding: Padding.zero,
  ),
  css('body').styles(
    backgroundColor: Palette.surfaceContainerLow,
    color: Palette.onSurface,
    fontFamily: bodyFont,
    fontSize: 1.rem,
    lineHeight: 1.6.em,
    raw: {
      '-webkit-font-smoothing': 'antialiased',
      'text-rendering': 'optimizeLegibility',
    },
  ),
  css('*, *::before, *::after').styles(raw: {'box-sizing': 'border-box'}),
  css('img').styles(width: 100.percent, height: Unit.auto, display: Display.block),
  css('a').styles(color: Palette.primary, textDecoration: const TextDecoration(line: TextDecorationLine.none)),
  css('a:hover').styles(color: Palette.onSurface),
];
