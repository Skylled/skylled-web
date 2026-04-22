import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_content/jaspr_content.dart';

import '../components/site_footer.dart';
import '../components/site_header.dart';
import '../theme.dart';

/// Home page layout: hero block with intro + latest-post CTA, followed by a
/// grid of the remaining posts as cards.
class HomeLayout extends PageLayoutBase {
  const HomeLayout();

  @override
  String get name => 'home';

  @override
  Iterable<Component> buildHead(Page page) sync* {
    yield* super.buildHead(page);
    yield* fontLinks();
    yield Style(styles: [...globalStyles, ...SiteHeader.styles, ...SiteFooter.styles, ..._styles]);
  }

  @override
  Component buildBody(Page page, Component child) {
    return _HomeBody(page: page, child: child);
  }

  static List<StyleRule> get _styles => [
    css('main.home').styles(
      maxWidth: 80.rem,
      margin: Margin.symmetric(horizontal: Unit.auto),
      padding: Padding.symmetric(horizontal: 1.5.rem, vertical: 3.rem),
      raw: {'padding-top': 'calc(4.5rem + 3rem)'},
    ),
    css('.home__hero').styles(
      display: Display.grid,
      gap: Gap.all(3.rem),
      gridTemplate: GridTemplate(columns: GridTracks([GridTrack(TrackSize.fr(1))])),
      padding: Padding.only(bottom: 4.rem),
    ),
    css.media(MediaQuery.all(minWidth: 900.px), [
      css('.home__hero').styles(
        gridTemplate: GridTemplate(columns: GridTracks([GridTrack(TrackSize.fr(7)), GridTrack(TrackSize.fr(5))])),
        gap: Gap(row: 3.rem, column: 4.rem),
      ),
    ]),
    css('.home__eyebrow').styles(
      display: Display.flex,
      alignItems: AlignItems.center,
      gap: Gap.all(0.75.rem),
      margin: Margin.only(bottom: 1.5.rem),
    ),
    css('.home__eyebrow-label').styles(
      fontFamily: headlineFont,
      fontSize: 0.75.rem,
      fontWeight: FontWeight.w600,
      textTransform: TextTransform.upperCase,
      letterSpacing: 0.08.em,
      color: Palette.primary,
    ),
    css('.home__eyebrow-rule').styles(
      display: Display.inlineBlock,
      width: 2.rem,
      height: 1.px,
      backgroundColor: Palette.outlineVariant,
      opacity: 0.6,
    ),
    css('.home__title').styles(
      fontFamily: headlineFont,
      fontSize: 3.rem,
      fontWeight: FontWeight.w700,
      lineHeight: 1.1.em,
      letterSpacing: (-0.02).em,
      color: Palette.onSurface,
      margin: Margin.only(bottom: 1.25.rem),
    ),
    css('.home__tagline').styles(
      fontFamily: bodyFont,
      fontSize: 1.375.rem,
      fontStyle: FontStyle.italic,
      color: Palette.onSurfaceVariant,
      lineHeight: 1.5.em,
      maxWidth: 36.rem,
      margin: Margin.only(bottom: 1.5.rem),
    ),
    css('.home__intro').styles(
      fontFamily: bodyFont,
      fontSize: 1.125.rem,
      color: Palette.onSurface,
      maxWidth: 36.rem,
    ),
    css('.home__intro p').styles(margin: Margin.only(bottom: 1.em)),
    css('.home__cta').styles(
      display: Display.inlineBlock,
      margin: Margin.only(top: 2.rem),
      padding: Padding.symmetric(horizontal: 2.rem, vertical: 0.875.rem),
      backgroundColor: Palette.primary,
      color: Palette.onPrimary,
      fontFamily: headlineFont,
      fontSize: 0.875.rem,
      fontWeight: FontWeight.w500,
      letterSpacing: 0.02.em,
      radius: BorderRadius.circular(0.5.rem),
      textDecoration: const TextDecoration(line: TextDecorationLine.none),
      transition: Transition('background-color', duration: Duration(milliseconds: 200)),
    ),
    css('.home__cta:hover').styles(backgroundColor: Palette.primaryDim, color: Palette.onPrimary),

    css('.home__feature-card').styles(
      display: Display.block,
      padding: Padding.all(1.75.rem),
      backgroundColor: Palette.surfaceContainerLowest,
      radius: BorderRadius.circular(0.75.rem),
      textDecoration: const TextDecoration(line: TextDecorationLine.none),
      color: Palette.onSurface,
      transition: Transition('transform', duration: Duration(milliseconds: 300)),
    ),
    css('.home__feature-card:hover').styles(transform: Transform.translate(y: (-4).px)),
    css('.home__feature-art').styles(
      raw: {
        'aspect-ratio': '4 / 5',
        'background':
            'linear-gradient(135deg, #dfe3eb 0%, #eceef3 50%, #f3f3f7 100%)',
      },
      radius: BorderRadius.circular(0.5.rem),
      margin: Margin.only(bottom: 1.5.rem),
    ),
    css('.home__feature-meta').styles(
      display: Display.flex,
      gap: Gap.all(0.75.rem),
      fontFamily: headlineFont,
      fontSize: 0.75.rem,
      fontWeight: FontWeight.w600,
      textTransform: TextTransform.upperCase,
      letterSpacing: 0.08.em,
      color: Palette.onSurfaceVariant,
      margin: Margin.only(bottom: 0.75.rem),
    ),
    css('.home__feature-tag').styles(color: Palette.primary),
    css('.home__feature-title').styles(
      fontFamily: headlineFont,
      fontSize: 1.5.rem,
      fontWeight: FontWeight.w600,
      lineHeight: 1.25.em,
      color: Palette.onSurface,
      margin: Margin.only(bottom: 0.75.rem),
    ),
    css('.home__feature-excerpt').styles(
      fontFamily: bodyFont,
      fontSize: 1.rem,
      color: Palette.onSurfaceVariant,
      lineHeight: 1.55.em,
      margin: Margin.zero,
    ),

    css('.home__recent').styles(margin: Margin.only(top: 2.rem)),
    css('.home__recent-head').styles(
      display: Display.flex,
      alignItems: AlignItems.baseline,
      justifyContent: JustifyContent.spaceBetween,
      gap: Gap.all(1.rem),
      margin: Margin.only(bottom: 2.5.rem),
      flexWrap: FlexWrap.wrap,
    ),
    css('.home__recent-title').styles(
      fontFamily: headlineFont,
      fontSize: 1.5.rem,
      fontWeight: FontWeight.w700,
      textTransform: TextTransform.upperCase,
      letterSpacing: 0.04.em,
      color: Palette.onSurface,
      margin: Margin.zero,
    ),
    css('.home__recent-link').styles(
      fontFamily: headlineFont,
      fontSize: 0.875.rem,
      color: Palette.primary,
      textDecoration: const TextDecoration(line: TextDecorationLine.none),
    ),
    css('.home__grid').styles(
      display: Display.grid,
      gap: Gap(row: 3.rem, column: 2.rem),
      gridTemplate: GridTemplate(columns: GridTracks([GridTrack(TrackSize.fr(1))])),
    ),
    css.media(MediaQuery.all(minWidth: 640.px), [
      css('.home__grid').styles(
        gridTemplate: GridTemplate(columns: GridTracks([GridTrack(TrackSize.fr(1)), GridTrack(TrackSize.fr(1))])),
      ),
    ]),
    css.media(MediaQuery.all(minWidth: 960.px), [
      css('.home__grid').styles(
        gridTemplate: GridTemplate(columns: GridTracks([GridTrack(TrackSize.fr(1)), GridTrack(TrackSize.fr(1)), GridTrack(TrackSize.fr(1))])),
      ),
    ]),
    css('.home__card').styles(
      display: Display.flex,
      flexDirection: FlexDirection.column,
      textDecoration: const TextDecoration(line: TextDecorationLine.none),
      color: Palette.onSurface,
      transition: Transition('transform', duration: Duration(milliseconds: 250)),
    ),
    css('.home__card:hover').styles(transform: Transform.translate(y: (-4).px)),
    css('.home__card:hover .home__card-title').styles(color: Palette.primary),
    css('.home__card-art').styles(
      raw: {
        'aspect-ratio': '4 / 3',
        'background':
            'linear-gradient(135deg, #dfe3eb 0%, #eceef3 55%, #f3f3f7 100%)',
      },
      radius: BorderRadius.circular(0.5.rem),
      margin: Margin.only(bottom: 1.rem),
    ),
    css('.home__card-meta').styles(
      fontFamily: headlineFont,
      fontSize: 0.75.rem,
      fontWeight: FontWeight.w600,
      textTransform: TextTransform.upperCase,
      letterSpacing: 0.08.em,
      color: Palette.onSurfaceVariant,
      margin: Margin.only(bottom: 0.5.rem),
    ),
    css('.home__card-title').styles(
      fontFamily: headlineFont,
      fontSize: 1.25.rem,
      fontWeight: FontWeight.w600,
      lineHeight: 1.3.em,
      color: Palette.onSurface,
      margin: Margin.only(bottom: 0.5.rem),
      transition: Transition('color', duration: Duration(milliseconds: 200)),
    ),
    css('.home__card-excerpt').styles(
      fontFamily: bodyFont,
      fontSize: 1.rem,
      color: Palette.onSurfaceVariant,
      lineHeight: 1.55.em,
      margin: Margin.zero,
    ),
    css.media(MediaQuery.all(maxWidth: 600.px), [
      css('.home__title').styles(fontSize: 2.25.rem),
      css('.home__tagline').styles(fontSize: 1.125.rem),
    ]),
  ];
}

class _HomeBody extends StatelessComponent {
  const _HomeBody({required this.page, required this.child});

  final Page page;
  final Component child;

  @override
  Component build(BuildContext context) {
    final posts = _collectPosts(context);
    final featured = posts.isNotEmpty ? posts.first : null;
    final rest = posts.length > 1 ? posts.sublist(1) : const <_PostMeta>[];

    final pageData = page.data.page;
    final title = pageData['title'] as String? ?? 'skylled.dev';
    final tagline = pageData['description'] as String? ?? '';

    return Component.fragment([
      SiteHeader(currentPath: page.url),
      main_(classes: 'home', [
        section(classes: 'home__hero', [
          div(classes: 'home__hero-copy', [
            div(classes: 'home__eyebrow', [
              span(classes: 'home__eyebrow-label', [Component.text('Writing · Code · Notes')]),
              span(classes: 'home__eyebrow-rule', []),
            ]),
            h1(classes: 'home__title', [Component.text(title)]),
            if (tagline.isNotEmpty) p(classes: 'home__tagline', [Component.text(tagline)]),
            div(classes: 'home__intro', [child]),
            if (featured != null)
              a(
                classes: 'home__cta',
                href: featured.url,
                [Component.text('Read the latest: ${featured.title}')],
              ),
          ]),
          if (featured != null)
            aside(classes: 'home__feature', [
              a(classes: 'home__feature-card', href: featured.url, [
                div(classes: 'home__feature-art', []),
                div(classes: 'home__feature-meta', [
                  if (featured.tag != null)
                    span(classes: 'home__feature-tag', [Component.text(featured.tag!.toUpperCase())]),
                  if (featured.date != null)
                    span(classes: 'home__feature-date', [Component.text(featured.date!)]),
                ]),
                h2(classes: 'home__feature-title', [Component.text(featured.title)]),
                if (featured.description != null)
                  p(classes: 'home__feature-excerpt', [Component.text(featured.description!)]),
              ]),
            ]),
        ]),
        if (rest.isNotEmpty)
          section(classes: 'home__recent', [
            div(classes: 'home__recent-head', [
              h2(classes: 'home__recent-title', [Component.text('Recent Posts')]),
              a(classes: 'home__recent-link', href: '/posts', [Component.text('View archive →')]),
            ]),
            div(classes: 'home__grid', [
              for (final post in rest)
                a(classes: 'home__card', href: post.url, [
                  div(classes: 'home__card-art', []),
                  div(classes: 'home__card-meta', [
                    if (post.tag != null) Component.text('${post.tag!.toUpperCase()} · '),
                    if (post.date != null) Component.text(post.date!),
                  ]),
                  h3(classes: 'home__card-title', [Component.text(post.title)]),
                  if (post.description != null)
                    p(classes: 'home__card-excerpt', [Component.text(post.description!)]),
                ]),
            ]),
          ]),
      ]),
      const SiteFooter(),
    ]);
  }

  static List<_PostMeta> _collectPosts(BuildContext context) {
    final posts = <_PostMeta>[];
    for (final p in context.pages) {
      if (!p.url.startsWith('/posts/')) continue;
      final data = p.data.page;
      posts.add(_PostMeta(
        url: p.url,
        title: data['title'] as String? ?? p.url,
        description: data['description'] as String?,
        date: data['date'] as String?,
        tag: (data['tags'] is List && (data['tags'] as List).isNotEmpty)
            ? (data['tags'] as List).first.toString()
            : null,
      ));
    }
    posts.sort((left, right) => (right.date ?? '').compareTo(left.date ?? ''));
    return posts;
  }
}

class _PostMeta {
  const _PostMeta({
    required this.url,
    required this.title,
    this.description,
    this.date,
    this.tag,
  });

  final String url;
  final String title;
  final String? description;
  final String? date;
  final String? tag;
}
