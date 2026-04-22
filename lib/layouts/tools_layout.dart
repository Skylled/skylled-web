import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_content/jaspr_content.dart';

import '../components/site_footer.dart';
import '../components/site_header.dart';
import '../theme.dart';

/// Tools index layout: intro block + card grid of tools declared in frontmatter.
class ToolsLayout extends PageLayoutBase {
  const ToolsLayout();

  @override
  String get name => 'tools';

  @override
  Iterable<Component> buildHead(Page page) sync* {
    yield* super.buildHead(page);
    yield* fontLinks();
    yield Style(styles: [...globalStyles, ...SiteHeader.styles, ...SiteFooter.styles, ..._styles]);
  }

  @override
  Component buildBody(Page page, Component child) {
    final data = page.data.page;
    final title = data['title'] as String? ?? 'Tools';
    final tagline = data['description'] as String?;
    final tools = data['tools'] is List
        ? (data['tools'] as List).whereType<Map>().map(_Tool.fromMap).toList()
        : const <_Tool>[];

    return Component.fragment([
      SiteHeader(currentPath: page.url),
      main_(classes: 'tools', [
        section(classes: 'tools__hero', [
          div(classes: 'tools__eyebrow', [
            span(classes: 'tools__eyebrow-label', [Component.text('Utilities · Side-quests')]),
            span(classes: 'tools__eyebrow-rule', []),
          ]),
          h1(classes: 'tools__title', [Component.text(title)]),
          if (tagline != null) p(classes: 'tools__tagline', [Component.text(tagline)]),
          div(classes: 'tools__intro', [child]),
        ]),
        if (tools.isNotEmpty)
          section(classes: 'tools__grid', [
            for (final t in tools)
              a(classes: 'tools__card', href: '/tools/${t.slug}/', [
                div(classes: 'tools__card-art', []),
                div(classes: 'tools__card-meta', [
                  if (t.tagline != null) Component.text(t.tagline!.toUpperCase()),
                ]),
                h2(classes: 'tools__card-title', [Component.text(t.name)]),
                if (t.description != null)
                  p(classes: 'tools__card-excerpt', [Component.text(t.description!)]),
                span(classes: 'tools__card-cta', [Component.text('Open →')]),
              ]),
          ]),
      ]),
      const SiteFooter(),
    ]);
  }

  static List<StyleRule> get _styles => [
    css('main.tools').styles(
      maxWidth: 80.rem,
      margin: Margin.symmetric(horizontal: Unit.auto),
      padding: Padding.symmetric(horizontal: 1.5.rem, vertical: 3.rem),
      raw: {'padding-top': 'calc(4.5rem + 3rem)'},
    ),
    css('.tools__hero').styles(
      padding: Padding.only(bottom: 4.rem),
      maxWidth: 48.rem,
    ),
    css('.tools__eyebrow').styles(
      display: Display.flex,
      alignItems: AlignItems.center,
      gap: Gap.all(0.75.rem),
      margin: Margin.only(bottom: 1.5.rem),
    ),
    css('.tools__eyebrow-label').styles(
      fontFamily: headlineFont,
      fontSize: 0.75.rem,
      fontWeight: FontWeight.w600,
      textTransform: TextTransform.upperCase,
      letterSpacing: 0.08.em,
      color: Palette.primary,
    ),
    css('.tools__eyebrow-rule').styles(
      display: Display.inlineBlock,
      width: 2.rem,
      height: 1.px,
      backgroundColor: Palette.outlineVariant,
      opacity: 0.6,
    ),
    css('.tools__title').styles(
      fontFamily: headlineFont,
      fontSize: 3.rem,
      fontWeight: FontWeight.w700,
      lineHeight: 1.1.em,
      letterSpacing: (-0.02).em,
      color: Palette.onSurface,
      margin: Margin.only(bottom: 1.25.rem),
    ),
    css('.tools__tagline').styles(
      fontFamily: bodyFont,
      fontSize: 1.375.rem,
      fontStyle: FontStyle.italic,
      color: Palette.onSurfaceVariant,
      lineHeight: 1.5.em,
      margin: Margin.only(bottom: 1.5.rem),
    ),
    css('.tools__intro').styles(
      fontFamily: bodyFont,
      fontSize: 1.125.rem,
      color: Palette.onSurface,
    ),
    css('.tools__intro p').styles(margin: Margin.only(bottom: 1.em)),
    css('.tools__grid').styles(
      display: Display.grid,
      gap: Gap(row: 2.rem, column: 2.rem),
      gridTemplate: GridTemplate(columns: GridTracks([GridTrack(TrackSize.fr(1))])),
    ),
    css.media(MediaQuery.all(minWidth: 720.px), [
      css('.tools__grid').styles(
        gridTemplate: GridTemplate(columns: GridTracks([GridTrack(TrackSize.fr(1)), GridTrack(TrackSize.fr(1))])),
      ),
    ]),
    css.media(MediaQuery.all(minWidth: 1080.px), [
      css('.tools__grid').styles(
        gridTemplate: GridTemplate(columns: GridTracks([GridTrack(TrackSize.fr(1)), GridTrack(TrackSize.fr(1)), GridTrack(TrackSize.fr(1))])),
      ),
    ]),
    css('.tools__card').styles(
      display: Display.flex,
      flexDirection: FlexDirection.column,
      padding: Padding.all(1.75.rem),
      backgroundColor: Palette.surfaceContainerLowest,
      radius: BorderRadius.circular(0.75.rem),
      textDecoration: const TextDecoration(line: TextDecorationLine.none),
      color: Palette.onSurface,
      transition: Transition('transform', duration: Duration(milliseconds: 250)),
    ),
    css('.tools__card:hover').styles(transform: Transform.translate(y: (-4).px)),
    css('.tools__card:hover .tools__card-title').styles(color: Palette.primary),
    css('.tools__card-art').styles(
      raw: {
        'aspect-ratio': '16 / 9',
        'background':
            'linear-gradient(135deg, #dfe3eb 0%, #eceef3 55%, #f3f3f7 100%)',
      },
      radius: BorderRadius.circular(0.5.rem),
      margin: Margin.only(bottom: 1.25.rem),
    ),
    css('.tools__card-meta').styles(
      fontFamily: headlineFont,
      fontSize: 0.75.rem,
      fontWeight: FontWeight.w600,
      textTransform: TextTransform.upperCase,
      letterSpacing: 0.08.em,
      color: Palette.primary,
      margin: Margin.only(bottom: 0.5.rem),
    ),
    css('.tools__card-title').styles(
      fontFamily: headlineFont,
      fontSize: 1.5.rem,
      fontWeight: FontWeight.w700,
      lineHeight: 1.25.em,
      color: Palette.onSurface,
      margin: Margin.only(bottom: 0.75.rem),
      transition: Transition('color', duration: Duration(milliseconds: 200)),
    ),
    css('.tools__card-excerpt').styles(
      fontFamily: bodyFont,
      fontSize: 1.rem,
      color: Palette.onSurfaceVariant,
      lineHeight: 1.55.em,
      margin: Margin.only(bottom: 1.25.rem),
    ),
    css('.tools__card-cta').styles(
      fontFamily: headlineFont,
      fontSize: 0.875.rem,
      fontWeight: FontWeight.w500,
      color: Palette.primary,
      margin: Margin.only(top: Unit.auto),
    ),
    css.media(MediaQuery.all(maxWidth: 600.px), [
      css('.tools__title').styles(fontSize: 2.25.rem),
      css('.tools__tagline').styles(fontSize: 1.125.rem),
    ]),
  ];
}

class _Tool {
  const _Tool({required this.name, required this.slug, this.tagline, this.description});

  final String name;
  final String slug;
  final String? tagline;
  final String? description;

  factory _Tool.fromMap(Map m) => _Tool(
    name: m['name']?.toString() ?? 'Tool',
    slug: m['slug']?.toString() ?? '',
    tagline: m['tagline']?.toString(),
    description: m['description']?.toString(),
  );
}
