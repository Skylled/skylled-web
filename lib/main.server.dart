/// Entry point for static site generation via jaspr_content.
///
/// `jaspr build` pre-renders each page in `content/` using [ContentApp].
library;

import 'package:jaspr/server.dart';
import 'package:jaspr_content/jaspr_content.dart';

import 'main.server.options.dart';

void main() {
  Jaspr.initializeApp(options: defaultServerOptions);

  final markdown = PageConfig(parsers: [MarkdownParser()]);
  final blogPost = PageConfig(
    parsers: [MarkdownParser()],
    layouts: [BlogLayout()],
  );

  runApp(ContentApp.custom(
    loaders: [FilesystemLoader('content')],
    configResolver: PageConfig.match({
      RegExp(r'^posts/'): blogPost,
      RegExp(r''): markdown,
    }),
  ));
}
