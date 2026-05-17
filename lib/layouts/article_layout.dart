import 'package:jaspr/dom.dart';
import 'package:jaspr/jaspr.dart';
import 'package:jaspr_content/jaspr_content.dart';

import '../components/site_footer.dart';
import '../components/site_header.dart';
import '../theme.dart';

/// Article/blog-post layout: editorial header, drop-cap body, tag chips.
class ArticleLayout extends PageLayoutBase {
  const ArticleLayout();

  @override
  String get name => 'article';

  @override
  Iterable<Component> buildHead(Page page) sync* {
    yield* super.buildHead(page);
    yield* fontLinks();
    yield Style(styles: [...globalStyles, ...SiteHeader.styles, ...SiteFooter.styles, ..._styles]);
  }

  @override
  Component buildBody(Page page, Component child) {
    final data = page.data.page;
    final title = data['title'] as String? ?? 'Untitled';
    final description = data['description'] as String?;
    final date = data['date'] as String?;
    final readTime = data['readTime'] as String?;
    final tags = data['tags'] is List ? (data['tags'] as List).map((e) => e.toString()).toList() : const <String>[];
    final primaryTag = tags.isNotEmpty ? tags.first : null;

    return Component.fragment([
      SiteHeader(currentPath: page.url),
      main_(classes: 'article', [
        header(classes: 'article__head', [
          div(classes: 'article__meta', [
            if (primaryTag != null)
              span(classes: 'article__meta-item article__meta-item--accent', [Component.text(primaryTag)]),
            if (primaryTag != null && (date != null || readTime != null))
              span(classes: 'article__meta-sep', [Component.text('·')]),
            if (date != null) span(classes: 'article__meta-item', [Component.text(date)]),
            if (date != null && readTime != null) span(classes: 'article__meta-sep', [Component.text('·')]),
            if (readTime != null) span(classes: 'article__meta-item', [Component.text('$readTime read')]),
          ]),
          h1(classes: 'article__title', [Component.text(title)]),
          if (description != null) p(classes: 'article__dek', [Component.text(description)]),
        ]),
        figure(classes: 'article__hero', [
          div(classes: 'article__hero-art', []),
        ]),
        article(classes: 'article__body', [child]),
        if (tags.isNotEmpty)
          div(classes: 'article__tags', [
            for (final tag in tags) span(classes: 'article__tag', [Component.text(tag)]),
          ]),
      ]),
      const SiteFooter(),
    ]);
  }

  static List<StyleRule> get _styles => [
    css('main.article').styles(
      maxWidth: 52.rem,
      margin: Margin.symmetric(horizontal: Unit.auto),
      padding: Padding.symmetric(horizontal: 1.5.rem, vertical: 3.rem),
      raw: {'padding-top': 'calc(4.5rem + 3rem)'},
    ),
    css('.article__head').styles(margin: Margin.only(bottom: 3.rem)),
    css('.article__meta').styles(
      display: Display.flex,
      flexWrap: FlexWrap.wrap,
      alignItems: AlignItems.center,
      gap: Gap.all(0.5.rem),
      margin: Margin.only(bottom: 1.5.rem),
      fontFamily: headlineFont,
      fontSize: 0.75.rem,
      fontWeight: FontWeight.w600,
      textTransform: TextTransform.upperCase,
      letterSpacing: 0.08.em,
      color: Palette.onSurfaceVariant,
    ),
    css('.article__meta-item--accent').styles(color: Palette.primary),
    css('.article__meta-sep').styles(color: Palette.outlineVariant, opacity: 0.7),
    css('.article__title').styles(
      fontFamily: headlineFont,
      fontSize: 3.rem,
      fontWeight: FontWeight.w700,
      lineHeight: 1.1.em,
      letterSpacing: (-0.02).em,
      color: Palette.onSurface,
      margin: Margin.only(bottom: 1.5.rem),
    ),
    css('.article__dek').styles(
      fontFamily: bodyFont,
      fontSize: 1.375.rem,
      fontStyle: FontStyle.italic,
      color: Palette.onSurfaceVariant,
      lineHeight: 1.5.em,
      maxWidth: 40.rem,
      margin: Margin.zero,
    ),
    css('.article__hero').styles(
      margin: Margin.only(top: 2.5.rem, bottom: 3.5.rem),
      padding: Padding.zero,
    ),
    css('.article__hero-art').styles(
      raw: {
        'aspect-ratio': '16 / 10',
        'background':
            'linear-gradient(135deg, #e5e8ef 0%, #eceef3 55%, #f3f3f7 100%)',
      },
      radius: BorderRadius.circular(0.75.rem),
    ),
    css('.article__body').styles(
      fontFamily: bodyFont,
      fontSize: 1.125.rem,
      lineHeight: 1.7.em,
      color: Palette.onSurface,
    ),
    css('.article__body > p').styles(margin: Margin.only(bottom: 1.5.rem)),
    css('.article__body > p:first-of-type::first-letter').styles(
      color: Palette.primary,
      fontFamily: headlineFont,
      fontSize: 3.5.rem,
      fontWeight: FontWeight.w700,
      lineHeight: 1.em,
      raw: {
        'float': 'left',
        'margin': '0.2rem 0.6rem 0 0',
      },
    ),
    css('.article__body h2').styles(
      fontFamily: headlineFont,
      fontSize: 1.75.rem,
      fontWeight: FontWeight.w700,
      color: Palette.onSurface,
      letterSpacing: (-0.01).em,
      margin: Margin.only(top: 3.rem, bottom: 1.rem),
    ),
    css('.article__body h3').styles(
      fontFamily: headlineFont,
      fontSize: 1.25.rem,
      fontWeight: FontWeight.w600,
      color: Palette.onSurface,
      margin: Margin.only(top: 2.25.rem, bottom: 0.75.rem),
    ),
    css('.article__body a').styles(
      color: Palette.primary,
      raw: {
        'text-decoration': 'underline',
        'text-decoration-color': 'rgba(93, 94, 97, 0.3)',
        'text-underline-offset': '3px',
      },
    ),
    css('.article__body a:hover').styles(
      color: Palette.onSurface,
      raw: {'text-decoration-color': 'rgba(46, 51, 57, 0.6)'},
    ),
    css('.article__body blockquote').styles(
      margin: Margin.symmetric(vertical: 2.5.rem),
      padding: Padding.only(left: 1.5.rem),
      border: Border.only(
        left: BorderSide(color: Palette.primaryDim, width: 2.px, style: BorderStyle.solid),
      ),
      fontStyle: FontStyle.italic,
      fontSize: 1.25.rem,
      color: Palette.onSurfaceVariant,
    ),
    css('.article__body code').styles(
      fontFamily: FontFamilies.monospace,
      fontSize: 0.9.em,
      padding: Padding.symmetric(horizontal: 0.35.rem, vertical: 0.125.rem),
      backgroundColor: Palette.surfaceContainer,
      radius: BorderRadius.circular(0.25.rem),
    ),
    css('.article__body pre').styles(
      margin: Margin.symmetric(vertical: 2.rem),
      padding: Padding.all(1.25.rem),
      backgroundColor: Palette.surfaceContainer,
      radius: BorderRadius.circular(0.5.rem),
      overflow: const Overflow.only(x: Overflow.auto),
      fontSize: 0.875.rem,
      lineHeight: 1.6.em,
    ),
    css('.article__body pre code').styles(
      padding: Padding.zero,
      backgroundColor: const Color('transparent'),
    ),
    css('.article__body ul, .article__body ol').styles(
      padding: Padding.only(left: 1.5.rem),
      margin: Margin.symmetric(vertical: 1.25.rem),
    ),
    css('.article__body li').styles(margin: Margin.symmetric(vertical: 0.5.rem)),
    css('.article__body img').styles(
      radius: BorderRadius.circular(0.5.rem),
      margin: Margin.symmetric(vertical: 2.rem),
    ),
    css('.article__tags').styles(
      display: Display.flex,
      flexWrap: FlexWrap.wrap,
      gap: Gap.all(0.5.rem),
      margin: Margin.only(top: 3.5.rem, bottom: 0.5.rem),
      padding: Padding.only(top: 2.rem),
    ),
    css('.article__tag').styles(
      padding: Padding.symmetric(horizontal: 0.75.rem, vertical: 0.375.rem),
      backgroundColor: Palette.surfaceContainer,
      color: Palette.onSurfaceVariant,
      fontFamily: headlineFont,
      fontSize: 0.6875.rem,
      fontWeight: FontWeight.w600,
      textTransform: TextTransform.upperCase,
      letterSpacing: 0.08.em,
      radius: BorderRadius.circular(0.25.rem),
    ),
    css.media(MediaQuery.all(maxWidth: 600.px), [
      css('.article__title').styles(fontSize: 2.25.rem),
      css('.article__dek').styles(fontSize: 1.125.rem),
    ]),
  ];
}
