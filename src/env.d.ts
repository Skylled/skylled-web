/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly DEFAULT_LOCALE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}