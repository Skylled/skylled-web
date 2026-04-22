/// Entry point for static site generation via jaspr_content.
///
/// `jaspr build` pre-renders each page in `content/` using [ContentApp].
library;

import 'package:jaspr/server.dart';
import 'package:jaspr_content/jaspr_content.dart';

import 'layouts/article_layout.dart';
import 'layouts/home_layout.dart';
import 'layouts/tools_layout.dart';
import 'main.server.options.dart';

void main() {
  Jaspr.initializeApp(options: defaultServerOptions);

  final home = PageConfig(
    parsers: [MarkdownParser()],
    layouts: [HomeLayout()],
  );
  final article = PageConfig(
    parsers: [MarkdownParser()],
    layouts: [ArticleLayout()],
  );
  final tools = PageConfig(
    parsers: [MarkdownParser()],
    layouts: [ToolsLayout()],
  );

  runApp(ContentApp.custom(
    loaders: [FilesystemLoader('content')],
    eagerlyLoadAllPages: true,
    configResolver: PageConfig.match({
      RegExp(r'^posts/'): article,
      RegExp(r'^tools/'): tools,
      RegExp(r''): home,
    }),
  ));
}
