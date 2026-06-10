/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly SITE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
