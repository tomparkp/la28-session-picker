# Changelog

## [1.6.2](https://github.com/tomparkp/2028-games-guide/compare/28games-v1.6.1...28games-v1.6.2) (2026-04-16)


### Refactors

* drop rule-based ratings in favor of AI-only scorecards ([#103](https://github.com/tomparkp/2028-games-guide/issues/103)) ([aebe4a5](https://github.com/tomparkp/2028-games-guide/commit/aebe4a5b92940406faf96960c8f3f7d87b8eda7c))

## [1.6.1](https://github.com/tomparkp/2028-games-guide/compare/28games-v1.6.0...28games-v1.6.1) (2026-04-16)


### Bug Fixes

* **scripts:** chunk D1 upserts to stay within 100-parameter limit ([#101](https://github.com/tomparkp/2028-games-guide/issues/101)) ([7c7c4cd](https://github.com/tomparkp/2028-games-guide/commit/7c7c4cdd8df75d410f1b97ee4499284336f808fa))

## [1.6.0](https://github.com/tomparkp/2028-games-guide/compare/28games-v1.5.0...28games-v1.6.0) (2026-04-16)


### Features

* rename to 2028 Games Unofficial Guide ([#99](https://github.com/tomparkp/2028-games-guide/issues/99)) ([cb4ffff](https://github.com/tomparkp/2028-games-guide/commit/cb4ffffa1cdc033ac701db396be67bd649a5c123))

## [1.5.0](https://github.com/tomparkp/la28-session-picker/compare/28games-v1.4.2...28games-v1.5.0) (2026-04-16)


### Features

* add app source with routes and components ([49476f9](https://github.com/tomparkp/la28-session-picker/commit/49476f94d8dc853a2fb52dbeeda47d393c9ba993))
* add Cloudflare Workers deployment ([#11](https://github.com/tomparkp/la28-session-picker/issues/11)) ([f3d40c4](https://github.com/tomparkp/la28-session-picker/commit/f3d40c40475edbbaf837174c88807cf64a52c340))
* add gold medal favicon and ICO generation ([1facadd](https://github.com/tomparkp/la28-session-picker/commit/1facaddb76885c944b2dc059f6fa82e6f073e794))
* add group by dropdown for sport, round, zone, and date ([5d10c79](https://github.com/tomparkp/la28-session-picker/commit/5d10c79db8a34d2dcc97ba1b642ada7f71a1e248))
* add navigation with hero header and tab bar ([601c8fa](https://github.com/tomparkp/la28-session-picker/commit/601c8fa4946e634513af18af3bce7d585f7aedd9))
* add rating engine, filtering, and bookmark logic ([dc62327](https://github.com/tomparkp/la28-session-picker/commit/dc6232756013a9d9911f2f253dc11c6e994332a0))
* add rating system methodology page ([a82ac5d](https://github.com/tomparkp/la28-session-picker/commit/a82ac5d86701705c40fbb3b6ff5300d031cf3d8c))
* add session data and types ([3e2e791](https://github.com/tomparkp/la28-session-picker/commit/3e2e791175ecf9d28096fae078e287a6b1b17cd3))
* add session picker components ([fba238b](https://github.com/tomparkp/la28-session-picker/commit/fba238bc2f662a63aaffef38deb37c7f127168d3))
* add venues, calendar, and about pages ([3275767](https://github.com/tomparkp/la28-session-picker/commit/327576750300fb4630c73966029c9b05211eec52))
* **bookmarks:** add save button to session detail panel ([#20](https://github.com/tomparkp/la28-session-picker/issues/20)) ([e5906e4](https://github.com/tomparkp/la28-session-picker/commit/e5906e46a2a89ad0063dc66784ddb2d9ae1415b0))
* **bookmarks:** replace inline table with slide-over saved panel ([#18](https://github.com/tomparkp/la28-session-picker/issues/18)) ([e9d4cc0](https://github.com/tomparkp/la28-session-picker/commit/e9d4cc0e644cb363765fa9b6b882dfed8b768fb4))
* **calendar:** redesign as agenda with timeline view ([247cc9b](https://github.com/tomparkp/la28-session-picker/commit/247cc9b1c3f3c088f2563714f4d2e30cef1f6a75))
* color-code rating pills by tier ([a81c6e3](https://github.com/tomparkp/la28-session-picker/commit/a81c6e39b7bbebb05a45089d5a39079a7954e48c))
* **content:** add curated related news ([#41](https://github.com/tomparkp/la28-session-picker/issues/41)) ([df17d79](https://github.com/tomparkp/la28-session-picker/commit/df17d79b45e6c45cfb1fa56447c277a9209dd884))
* **content:** add perplexity provider ([#40](https://github.com/tomparkp/la28-session-picker/issues/40)) ([20d73eb](https://github.com/tomparkp/la28-session-picker/commit/20d73eb553762ee67c434c215966b122dd6de67a))
* **content:** generate related news per session via Perplexity ([#50](https://github.com/tomparkp/la28-session-picker/issues/50)) ([ace1e0f](https://github.com/tomparkp/la28-session-picker/commit/ace1e0fc0db2f5073d8570b4f8350efce155c5cd))
* **content:** ground session prompts in Paris 2024 medal data ([#78](https://github.com/tomparkp/la28-session-picker/issues/78)) ([e915464](https://github.com/tomparkp/la28-session-picker/commit/e91546444dd35052361696412ca904b28c506517))
* **content:** Haiku scoring + Batches API writing ([#79](https://github.com/tomparkp/la28-session-picker/issues/79)) ([b09fe6f](https://github.com/tomparkp/la28-session-picker/commit/b09fe6f524d0fe104d6a4ebb53609204fdee538a))
* **content:** incremental D1 writes + GHA workflows ([#87](https://github.com/tomparkp/la28-session-picker/issues/87)) ([2d348bc](https://github.com/tomparkp/la28-session-picker/commit/2d348bc5dcf4457b892e28adf2cfdf8ca0f65a2d))
* **content:** two-stage grounding + writing pipeline with parallelization ([#53](https://github.com/tomparkp/la28-session-picker/issues/53)) ([c6ba203](https://github.com/tomparkp/la28-session-picker/commit/c6ba203c5cc4e829531aa28340c42b73e25ce0b5))
* **data:** migrate session storage from JSON to Cloudflare D1 ([#81](https://github.com/tomparkp/la28-session-picker/issues/81)) ([93e0458](https://github.com/tomparkp/la28-session-picker/commit/93e045811161f76c146a98f3a2a15a2e5e255b02))
* **data:** paginate sessions and lazy-load details ([#46](https://github.com/tomparkp/la28-session-picker/issues/46)) ([318e072](https://github.com/tomparkp/la28-session-picker/commit/318e072aa19b9a796577b304ab48575d0650063b))
* **db:** Drizzle Studio + timestamp migration prefix ([#82](https://github.com/tomparkp/la28-session-picker/issues/82)) ([aa6ce7a](https://github.com/tomparkp/la28-session-picker/commit/aa6ce7a9271c6cc5d0cc35cb785e9452926a59bd))
* **detail:** dismiss panel on click outside, switch on event click ([#28](https://github.com/tomparkp/la28-session-picker/issues/28)) ([0ebc064](https://github.com/tomparkp/la28-session-picker/commit/0ebc064d2ef2916c000771159e94bbf89162d230))
* **filters:** add mobile sort dropdown ([#71](https://github.com/tomparkp/la28-session-picker/issues/71)) ([7f98e80](https://github.com/tomparkp/la28-session-picker/commit/7f98e809067721c0a16a325aee720d7bab9f611d))
* **filters:** update toolbar filter controls ([#44](https://github.com/tomparkp/la28-session-picker/issues/44)) ([3142bf3](https://github.com/tomparkp/la28-session-picker/commit/3142bf3d240b9ba64cd7c369ec02954d94eece18))
* **ratings:** AI-generated scorecards with per-dimension explanations ([#77](https://github.com/tomparkp/la28-session-picker/issues/77)) ([51a536a](https://github.com/tomparkp/la28-session-picker/commit/51a536a882925e7b126e38942a00a1667ea08c04))
* redesign rating system with 5 dimensions ([2410e4a](https://github.com/tomparkp/la28-session-picker/commit/2410e4abfc31e6a11f39a9205cbb6b42fd2ab89c))
* **routes:** add URL-addressable session detail panel ([#31](https://github.com/tomparkp/la28-session-picker/issues/31)) ([bdff9db](https://github.com/tomparkp/la28-session-picker/commit/bdff9db9d38193c69ff468961a79ca32e64ed2ae))
* **routes:** rename Agenda to Schedule and redesign with AI ratings ([#3](https://github.com/tomparkp/la28-session-picker/issues/3)) ([77711ca](https://github.com/tomparkp/la28-session-picker/commit/77711ca8e219cbd3741baa2ae81f74a3c7c9ba57))
* **routes:** replace session count with clear filters action ([#65](https://github.com/tomparkp/la28-session-picker/issues/65)) ([785bf02](https://github.com/tomparkp/la28-session-picker/commit/785bf02016b6698a54a50e1c2ecfddfe3d52edb3))
* **routes:** simplify app to sessions only ([#6](https://github.com/tomparkp/la28-session-picker/issues/6)) ([76991af](https://github.com/tomparkp/la28-session-picker/commit/76991af95fe70d2c96db40854f402bd37c8a7e1d))
* **schedule:** add expandable session scorecards ([#5](https://github.com/tomparkp/la28-session-picker/issues/5)) ([11bf3ac](https://github.com/tomparkp/la28-session-picker/commit/11bf3ac4cd57a012016af4bcc12c97bf27529550))
* **scripts:** add pnpm refresh for single-session content ([#76](https://github.com/tomparkp/la28-session-picker/issues/76)) ([82ca301](https://github.com/tomparkp/la28-session-picker/commit/82ca301c9d9c13e9dd72980e03dcabfe7450fe55))
* **scripts:** load .env file in content generation script ([#34](https://github.com/tomparkp/la28-session-picker/issues/34)) ([4b0113b](https://github.com/tomparkp/la28-session-picker/commit/4b0113b412ad67975f9650ffab2c1255043ba58e))
* **session-detail:** add report issue dialog with Resend email ([#55](https://github.com/tomparkp/la28-session-picker/issues/55)) ([b44f121](https://github.com/tomparkp/la28-session-picker/commit/b44f1218e59bd2c8e5a483fe9b19c0d4c39c3e61))
* **session-detail:** swipe-to-close panel on mobile ([#33](https://github.com/tomparkp/la28-session-picker/issues/33)) ([6445a3a](https://github.com/tomparkp/la28-session-picker/commit/6445a3a9594617b9815786d9a323081a2c88cc78))
* **sessions:** replace inline accordion with Notion-style side peek panel ([#8](https://github.com/tomparkp/la28-session-picker/issues/8)) ([2913d3d](https://github.com/tomparkp/la28-session-picker/commit/2913d3dadf689efe670e475a161a4aa761761db3))
* **sessions:** rich sport knowledge base, contenders, and LLM content generation ([#7](https://github.com/tomparkp/la28-session-picker/issues/7)) ([2cdfc5c](https://github.com/tomparkp/la28-session-picker/commit/2cdfc5c278693e89903bc15ee391dad8da95a1ec))
* **ui:** add mobile responsive layout ([#10](https://github.com/tomparkp/la28-session-picker/issues/10)) ([9c0d212](https://github.com/tomparkp/la28-session-picker/commit/9c0d212ab9308475cb409d4cbde7c146819b42c9))
* **ui:** add scroll-to-top button on session list ([#60](https://github.com/tomparkp/la28-session-picker/issues/60)) ([8e8dbba](https://github.com/tomparkp/la28-session-picker/commit/8e8dbbad69d1c0307dc5970bf72b54c96ca9fb2a))
* **ui:** replace custom panel chrome with base ui drawers ([#42](https://github.com/tomparkp/la28-session-picker/issues/42)) ([b1b3df0](https://github.com/tomparkp/la28-session-picker/commit/b1b3df09fddcfb4e662ca0a16a973e184488b40c))
* wire up session picker as home page ([bb8e2d4](https://github.com/tomparkp/la28-session-picker/commit/bb8e2d43db1e06b9201d5af6bc3eb9db83875121))


### Bug Fixes

* **build:** seed local D1 before prerender so `/` ships with real data ([#84](https://github.com/tomparkp/la28-session-picker/issues/84)) ([b4bc32e](https://github.com/tomparkp/la28-session-picker/commit/b4bc32edc9bffb116aee73766f2c01ece1f79706))
* **ci:** make CDN warm step non-fatal ([#23](https://github.com/tomparkp/la28-session-picker/issues/23)) ([21e938d](https://github.com/tomparkp/la28-session-picker/commit/21e938dd56afbaf0946c08000722f23ee223ef56))
* **ci:** pass CLOUDFLARE_DATABASE_ID to content workflows ([#93](https://github.com/tomparkp/la28-session-picker/issues/93)) ([a645d75](https://github.com/tomparkp/la28-session-picker/commit/a645d753355f1271c67b5084529d1acf99c26b6c))
* **ci:** preserve spaces in sport arg for content workflow ([#89](https://github.com/tomparkp/la28-session-picker/issues/89)) ([d84af45](https://github.com/tomparkp/la28-session-picker/commit/d84af456e65f2e7471aa4712a582c3a73a2d8f90))
* **data:** audit event data accuracy and rename contenders to potentialContenders ([#30](https://github.com/tomparkp/la28-session-picker/issues/30)) ([eb0144c](https://github.com/tomparkp/la28-session-picker/commit/eb0144cbfbc54234e7a13c23adf8f13bb30bb2ad))
* **detail:** replace hand-rolled swipe with Base UI Drawer on mobile ([#37](https://github.com/tomparkp/la28-session-picker/issues/37)) ([7e05bf2](https://github.com/tomparkp/la28-session-picker/commit/7e05bf280f4dc2e21418c1eb8539cbb7a0162dd9))
* **drawer:** disable swipe-to-dismiss on desktop ([#57](https://github.com/tomparkp/la28-session-picker/issues/57)) ([f99e7dc](https://github.com/tomparkp/la28-session-picker/commit/f99e7dc8f92e9d8fdac1a664ce7e62410072a9f5))
* resolve typescript and lint errors ([#58](https://github.com/tomparkp/la28-session-picker/issues/58)) ([4bdc854](https://github.com/tomparkp/la28-session-picker/commit/4bdc8541d18989a395eab18c73653697ad9ca05d))
* restore filter selection and add missing content-script deps ([#61](https://github.com/tomparkp/la28-session-picker/issues/61)) ([bccef39](https://github.com/tomparkp/la28-session-picker/commit/bccef3958b8ddcd8be427616c07df795cc0ab542))
* revert rating filter label to "Any Rating" ([25c6273](https://github.com/tomparkp/la28-session-picker/commit/25c6273072704bf14c316341d30bc797925e5a5f))
* **scripts:** bump querySql maxBuffer so full content reads succeed ([#86](https://github.com/tomparkp/la28-session-picker/issues/86)) ([866c899](https://github.com/tomparkp/la28-session-picker/commit/866c89978b40c69c1976fc1c4c53eeb9dc9f887a))
* **scripts:** silence wrangler chatter on D1 upserts ([#90](https://github.com/tomparkp/la28-session-picker/issues/90)) ([9848d07](https://github.com/tomparkp/la28-session-picker/commit/9848d073da3776fe86a609ff6083d2607ee63c1e))
* **scripts:** use `batch` shape for D1 HTTP multi-statement requests ([#95](https://github.com/tomparkp/la28-session-picker/issues/95)) ([c56ad2b](https://github.com/tomparkp/la28-session-picker/commit/c56ad2b647ed2768b7dfe9b6f444c60278df6339))
* **security:** harden app for production readiness ([#12](https://github.com/tomparkp/la28-session-picker/issues/12)) ([61280a2](https://github.com/tomparkp/la28-session-picker/commit/61280a2ac07953a823aca114c30515e48166e29c))
* **security:** harden CSP, URL validation, and input handling ([#54](https://github.com/tomparkp/la28-session-picker/issues/54)) ([8d0c576](https://github.com/tomparkp/la28-session-picker/commit/8d0c5767431bb5a45e2584f2354b1cb29e30fed9))
* **session-detail:** reset scroll when switching sessions ([#73](https://github.com/tomparkp/la28-session-picker/issues/73)) ([4ab2b3e](https://github.com/tomparkp/la28-session-picker/commit/4ab2b3e8f7268cc0fa870fc1b83de05f3232a4a4))
* **sessions:** correct round-type classifications for 42 medal sessions ([#19](https://github.com/tomparkp/la28-session-picker/issues/19)) ([e05c2b3](https://github.com/tomparkp/la28-session-picker/commit/e05c2b3f67db153dbf1ff3adec71249e9e84bf79))
* **sessions:** remove sport classification from ceremonies ([#17](https://github.com/tomparkp/la28-session-picker/issues/17)) ([03938e0](https://github.com/tomparkp/la28-session-picker/commit/03938e0d3d90adb11b2391914126957828b458ad))
* **sessions:** sort date groups chronologically ([#13](https://github.com/tomparkp/la28-session-picker/issues/13)) ([5c9279e](https://github.com/tomparkp/la28-session-picker/commit/5c9279ed12de7552eb4ac810f5cca08ac5b355a1))
* **sort:** include time in date sort and remove price sort ([#69](https://github.com/tomparkp/la28-session-picker/issues/69)) ([b8eecd9](https://github.com/tomparkp/la28-session-picker/commit/b8eecd969fcf6228a27f64a7c86fbe9018543033))
* **theme:** bring all light mode tokens to WCAG AA contrast ([#32](https://github.com/tomparkp/la28-session-picker/issues/32)) ([e176a7c](https://github.com/tomparkp/la28-session-picker/commit/e176a7cd9c87dc3fe1a71af069ec9c22aa7fd050))
* **theme:** make dark/light toggle instant with no transitions ([#14](https://github.com/tomparkp/la28-session-picker/issues/14)) ([53ef860](https://github.com/tomparkp/la28-session-picker/commit/53ef860b863dc57019b287d64fd14818149cfe9b))


### Performance

* **events:** improve interaction responsiveness ([#43](https://github.com/tomparkp/la28-session-picker/issues/43)) ([25a9b8a](https://github.com/tomparkp/la28-session-picker/commit/25a9b8a3eaa71b807d16ff346ca767be9f94be1a))
* harden site for traffic spikes on Cloudflare ([#22](https://github.com/tomparkp/la28-session-picker/issues/22)) ([0c083ed](https://github.com/tomparkp/la28-session-picker/commit/0c083edcb315838c810cc0417bec8ddb4201a032))
* **session-table:** virtualize session list ([#45](https://github.com/tomparkp/la28-session-picker/issues/45)) ([ce437b1](https://github.com/tomparkp/la28-session-picker/commit/ce437b1cb1f3c21b8b1048cdcdc78cf66a31cd0c))
* snappier sessions UI with SSR data, split routes, and virtual tables ([2615a6c](https://github.com/tomparkp/la28-session-picker/commit/2615a6c23ddda671a30095e10261a2616deee38a))


### Refactors

* **content:** per-sport writing batches for progress visibility ([#80](https://github.com/tomparkp/la28-session-picker/issues/80)) ([daa66a2](https://github.com/tomparkp/la28-session-picker/commit/daa66a2cb0aabe7aa87d51abe6a81f9b3ba46210))
* **filters:** simplify filter params to single-select ([#51](https://github.com/tomparkp/la28-session-picker/issues/51)) ([c1be0dd](https://github.com/tomparkp/la28-session-picker/commit/c1be0dd036742263ef211daa3febc642ce9d7f48))
* rebrand from LA28 to 2028 Games Unofficial Session Guide ([#96](https://github.com/tomparkp/la28-session-picker/issues/96)) ([2744118](https://github.com/tomparkp/la28-session-picker/commit/2744118534ce8b075493569e78a5c369b8e7d555))
* remove scaffold components and about route ([f02c1cb](https://github.com/tomparkp/la28-session-picker/commit/f02c1cb927709dd0a6b83f0803faa1cda7b0c44b))
* rename bookmarked to pinned and use pin icon ([9e78cc0](https://github.com/tomparkp/la28-session-picker/commit/9e78cc0b36d03ef0b1029b69f8296ed6bdaffa39))
* revert to bookmark icon from star ([75b9aaf](https://github.com/tomparkp/la28-session-picker/commit/75b9aaf7ca29e48e6b15b894634923033aede04f))
* **scripts:** replace wrangler shellouts with Drizzle over D1 HTTP ([#92](https://github.com/tomparkp/la28-session-picker/issues/92)) ([e76ec05](https://github.com/tomparkp/la28-session-picker/commit/e76ec05418580588d8244fa9edb544da3ea5b769))
* **sessions:** rewrite blurbs with playbook-inspired tone ([#16](https://github.com/tomparkp/la28-session-picker/issues/16)) ([07e4b25](https://github.com/tomparkp/la28-session-picker/commit/07e4b25b4b7ff1434062185cb357b9565a803b01))
* switch to star icon and rename AI Ratings tab ([317b62e](https://github.com/tomparkp/la28-session-picker/commit/317b62e0e6813188184e098ff2a1d5ca70d83cf8))
* **table:** drop virtualization for natural page scroll ([#25](https://github.com/tomparkp/la28-session-picker/issues/25)) ([3cc5225](https://github.com/tomparkp/la28-session-picker/commit/3cc5225c278254ff1e261d9807d82f6fca5ae243))
* **ui:** consolidate session detail panel layout ([#21](https://github.com/tomparkp/la28-session-picker/issues/21)) ([d706330](https://github.com/tomparkp/la28-session-picker/commit/d7063303b424022cf07e84a854086896d8ecc821))
* **ui:** restyle session detail panel layout ([#15](https://github.com/tomparkp/la28-session-picker/issues/15)) ([7bb35a3](https://github.com/tomparkp/la28-session-picker/commit/7bb35a3fe8712d7ff9cd26c779ca03e22136310b))
* update components for new rating dimensions ([1a68840](https://github.com/tomparkp/la28-session-picker/commit/1a68840a23fbb8c53359017d0c546975ee79adfe))


### Documentation

* add privacy policy and terms of use pages ([#63](https://github.com/tomparkp/la28-session-picker/issues/63)) ([a49fa65](https://github.com/tomparkp/la28-session-picker/commit/a49fa654f4b1769cd5d85d4201219e1cb6162dc7))
* add readme, license, and claude.md ([e0718d0](https://github.com/tomparkp/la28-session-picker/commit/e0718d01778f0267b0eb64681e7388b747a2ce3e))
* add Zed and Claude Code to built with list ([87158bb](https://github.com/tomparkp/la28-session-picker/commit/87158bb04901f43fd09e9e9d09e37c6a37bf7cfb))
* **cursor:** document squash workflow and no merge commits on main ([5999939](https://github.com/tomparkp/la28-session-picker/commit/5999939b83617d0d3e21e5745e7565fda65f0d45))
* **cursor:** move agent to worktree root via MCP after create ([99610c7](https://github.com/tomparkp/la28-session-picker/commit/99610c7ff23adec4f1703830fed6dfa88643f4b7))
* document pre-PR CI checks for agents ([#74](https://github.com/tomparkp/la28-session-picker/issues/74)) ([485411a](https://github.com/tomparkp/la28-session-picker/commit/485411a203db9b8911d7a22ba5d15abecf7e66f0))
* move technical details to CONTRIBUTING.md ([2afaf0f](https://github.com/tomparkp/la28-session-picker/commit/2afaf0f9a4e98df171f77438153f9e7c0c63ae95))
* **readme:** rewrite intro and add screenshot ([#9](https://github.com/tomparkp/la28-session-picker/issues/9)) ([a6e43d3](https://github.com/tomparkp/la28-session-picker/commit/a6e43d3cd46dc3cd8dc128eba6ee244ddbd60b25))
* update AI ratings page for v3 methodology ([33b238a](https://github.com/tomparkp/la28-session-picker/commit/33b238adb718eac8f62e27b444f8454f3f8b13ec))
* update disclaimer to open-source with AI rating note ([725e13f](https://github.com/tomparkp/la28-session-picker/commit/725e13ffe0683b6eb62173ced54e0827416954a6))
* update README and contributing info ([#2](https://github.com/tomparkp/la28-session-picker/issues/2)) ([13f1247](https://github.com/tomparkp/la28-session-picker/commit/13f1247841e32d0f9ee5260334d109c552dbdd3b))


### Styles

* adjust nav tab spacing and refine disclaimer copy ([c913eab](https://github.com/tomparkp/la28-session-picker/commit/c913eab865e1068a12df36149291f1317115770a))
* apply oxfmt formatting ([#59](https://github.com/tomparkp/la28-session-picker/issues/59)) ([46842ba](https://github.com/tomparkp/la28-session-picker/commit/46842ba9eaac1e94fecbfd1a0da009c026fbbe56))
* bump root font-size for readability ([#67](https://github.com/tomparkp/la28-session-picker/issues/67)) ([6f13e89](https://github.com/tomparkp/la28-session-picker/commit/6f13e89c0211c5f51c265ffebb694171de1392ab))
* **filter-bar:** widen search input on large desktops ([#27](https://github.com/tomparkp/la28-session-picker/issues/27)) ([8090a73](https://github.com/tomparkp/la28-session-picker/commit/8090a73493d5139d83c6428d887173c25dc80910))
* flatten design and remove visual noise ([190026d](https://github.com/tomparkp/la28-session-picker/commit/190026da781e8ddab3199f825144959d8f41ba71))
* **footer:** replace data-source footer with site-wide tagline ([#24](https://github.com/tomparkp/la28-session-picker/issues/24)) ([3fe50cb](https://github.com/tomparkp/la28-session-picker/commit/3fe50cb8255f10fc77228c630a0f6a6d474a1b9b))
* **theme:** brighten gold token for better 'gold' appearance ([#52](https://github.com/tomparkp/la28-session-picker/issues/52)) ([a099cfb](https://github.com/tomparkp/la28-session-picker/commit/a099cfb306d8c4b81f35a1e4856189b865d5772b))
* **ui:** polish filter bar, detail panel, and bookmark UX ([#26](https://github.com/tomparkp/la28-session-picker/issues/26)) ([a25294c](https://github.com/tomparkp/la28-session-picker/commit/a25294cfca7525e3547e0b5c23e1fab21799909e))


### CI

* add lint, format, typecheck, test, and build workflow ([#62](https://github.com/tomparkp/la28-session-picker/issues/62)) ([65a8da3](https://github.com/tomparkp/la28-session-picker/commit/65a8da3b90bfada6dc2da97be2972c415d62a9cf))
* add release please workflow ([1127438](https://github.com/tomparkp/la28-session-picker/commit/112743891c1a5b657db753a11ad30230f517a77a))
* ignore release-please files and make deploy manual ([#64](https://github.com/tomparkp/la28-session-picker/issues/64)) ([5fe6ed8](https://github.com/tomparkp/la28-session-picker/commit/5fe6ed88d166f79e9531e45c4065940ebe0115cc))
* rename release please workflow for consistency ([01efad0](https://github.com/tomparkp/la28-session-picker/commit/01efad03f7291ecec886c31287ea0470d87578ec))


### Miscellaneous

* add clean script ([#39](https://github.com/tomparkp/la28-session-picker/issues/39)) ([afa1778](https://github.com/tomparkp/la28-session-picker/commit/afa17784dee30d487247e270613c908c7e67cf19))
* add frontend-design and react best-practices agent skills ([#29](https://github.com/tomparkp/la28-session-picker/issues/29)) ([c6ec036](https://github.com/tomparkp/la28-session-picker/commit/c6ec03609b1464fa2a9b789552635d771fa668b9))
* add oxlint and oxfmt with project-wide formatting ([51c205c](https://github.com/tomparkp/la28-session-picker/commit/51c205c50eb2d266f2c65e86d05a07e86906fdb6))
* add rate-sessions script and update config ([6e49f84](https://github.com/tomparkp/la28-session-picker/commit/6e49f84331d7616ff6579ab2bffa150b2f0ad561))
* add static assets ([1039409](https://github.com/tomparkp/la28-session-picker/commit/10394098db2a154e66a3db19dad09882ce58affa))
* add vscode settings ([dd24585](https://github.com/tomparkp/la28-session-picker/commit/dd24585e9607d83fd8dc612021114a7292e02632))
* **agent:** migrate repo guidance to codex ([#4](https://github.com/tomparkp/la28-session-picker/issues/4)) ([f72945b](https://github.com/tomparkp/la28-session-picker/commit/f72945bb369393aee108f665cad7c9d69e46abd6))
* **ci:** include all commit types in release changelogs ([#97](https://github.com/tomparkp/la28-session-picker/issues/97)) ([8ad6603](https://github.com/tomparkp/la28-session-picker/commit/8ad660363eab4173940e3abea337679bbbc540d8))
* **ci:** trigger deploy on release publish ([#47](https://github.com/tomparkp/la28-session-picker/issues/47)) ([65936a1](https://github.com/tomparkp/la28-session-picker/commit/65936a13a707574842def9c0f3e8e16884ea93c8))
* convert styling from custom CSS to Tailwind utilities ([59d744b](https://github.com/tomparkp/la28-session-picker/commit/59d744bf8c86757a12b2b0763af560f23ed8a4ce))
* **cursor:** add rule for pnpm and package scripts ([49d15eb](https://github.com/tomparkp/la28-session-picker/commit/49d15ebea7d63dac23788bec2909459fde926b43))
* **deploy:** use la28.tompark.dev as production hostname ([#38](https://github.com/tomparkp/la28-session-picker/issues/38)) ([790bfab](https://github.com/tomparkp/la28-session-picker/commit/790bfab351164ad0931cd9af5ed5546f4fdffc0b))
* document local git worktrees under .worktrees/ ([7a723c4](https://github.com/tomparkp/la28-session-picker/commit/7a723c4b46e69ff675739d08f92ad71ce9c55056))
* lock down deploys and gate Cloudflare ops ([#83](https://github.com/tomparkp/la28-session-picker/issues/83)) ([bf91c57](https://github.com/tomparkp/la28-session-picker/commit/bf91c572fc1e9e7ad4eedcc0dcbdd933ab357c89))
* **main:** release 1.0.0 ([#1](https://github.com/tomparkp/la28-session-picker/issues/1)) ([fa0363a](https://github.com/tomparkp/la28-session-picker/commit/fa0363ab6e1e7e74584946991f5551c6cee6a6be))
* **main:** release 1.1.0 ([#66](https://github.com/tomparkp/la28-session-picker/issues/66)) ([357d608](https://github.com/tomparkp/la28-session-picker/commit/357d6082050f1b404150ef227ac4d55d089e4f40))
* **main:** release 1.1.1 ([#70](https://github.com/tomparkp/la28-session-picker/issues/70)) ([4d6ef61](https://github.com/tomparkp/la28-session-picker/commit/4d6ef6120d7898ceda2c875c939e670f0a847d8e))
* **main:** release 1.2.0 ([#72](https://github.com/tomparkp/la28-session-picker/issues/72)) ([7d1cad4](https://github.com/tomparkp/la28-session-picker/commit/7d1cad4e78c8553ed49428a318fe639b2301d59c))
* **main:** release 1.3.0 ([#75](https://github.com/tomparkp/la28-session-picker/issues/75)) ([62b4fd9](https://github.com/tomparkp/la28-session-picker/commit/62b4fd96b4ff13c0781d8731c4dda498c01696ae))
* **main:** release 1.3.1 ([#85](https://github.com/tomparkp/la28-session-picker/issues/85)) ([55d7c80](https://github.com/tomparkp/la28-session-picker/commit/55d7c807cf384f0aa4a0000ed1a19990d21a4657))
* **main:** release 1.4.0 ([#88](https://github.com/tomparkp/la28-session-picker/issues/88)) ([15bcfff](https://github.com/tomparkp/la28-session-picker/commit/15bcfff43c90b48cfc1733220011c411d82736cd))
* **main:** release 1.4.1 ([#91](https://github.com/tomparkp/la28-session-picker/issues/91)) ([0409e20](https://github.com/tomparkp/la28-session-picker/commit/0409e209a5c76d8f2f5db08df285d041e96ae84e))
* **main:** release 1.4.2 ([#94](https://github.com/tomparkp/la28-session-picker/issues/94)) ([79f65ab](https://github.com/tomparkp/la28-session-picker/commit/79f65ab8f4d41682ead43c1a1516fb8485432ab8))
* regenerate session ratings with v3 system ([d1d80ba](https://github.com/tomparkp/la28-session-picker/commit/d1d80baf2b017ed4764bf38665a4d69be1716b29))
* remove About page and nav link ([6787d88](https://github.com/tomparkp/la28-session-picker/commit/6787d8892bcd2bcc484903471e401f6c8c694970))
* **rules:** omit test plan from PRs unless requested ([#36](https://github.com/tomparkp/la28-session-picker/issues/36)) ([ab265fe](https://github.com/tomparkp/la28-session-picker/commit/ab265fe2d46c522fcefc3c652c729dce50a40ec2))
* scaffold tanstack start project ([1844840](https://github.com/tomparkp/la28-session-picker/commit/1844840c9676f2031c49c90343d0413e0dabc9ad))
* update agent config and add skills ([#49](https://github.com/tomparkp/la28-session-picker/issues/49)) ([9cc5594](https://github.com/tomparkp/la28-session-picker/commit/9cc559414ac92ee7d6fb98416a1a8ecda89fa6a1))

## [1.4.2](https://github.com/tomparkp/la28-session-picker/compare/v1.4.1...v1.4.2) (2026-04-15)


### Bug Fixes

* **ci:** pass CLOUDFLARE_DATABASE_ID to content workflows ([#93](https://github.com/tomparkp/la28-session-picker/issues/93)) ([a645d75](https://github.com/tomparkp/la28-session-picker/commit/a645d753355f1271c67b5084529d1acf99c26b6c))
* **scripts:** use `batch` shape for D1 HTTP multi-statement requests ([#95](https://github.com/tomparkp/la28-session-picker/issues/95)) ([c56ad2b](https://github.com/tomparkp/la28-session-picker/commit/c56ad2b647ed2768b7dfe9b6f444c60278df6339))

## [1.4.1](https://github.com/tomparkp/la28-session-picker/compare/v1.4.0...v1.4.1) (2026-04-15)


### Bug Fixes

* **scripts:** silence wrangler chatter on D1 upserts ([#90](https://github.com/tomparkp/la28-session-picker/issues/90)) ([9848d07](https://github.com/tomparkp/la28-session-picker/commit/9848d073da3776fe86a609ff6083d2607ee63c1e))

## [1.4.0](https://github.com/tomparkp/la28-session-picker/compare/v1.3.1...v1.4.0) (2026-04-15)


### Features

* **content:** incremental D1 writes + GHA workflows ([#87](https://github.com/tomparkp/la28-session-picker/issues/87)) ([2d348bc](https://github.com/tomparkp/la28-session-picker/commit/2d348bc5dcf4457b892e28adf2cfdf8ca0f65a2d))


### Bug Fixes

* **scripts:** bump querySql maxBuffer so full content reads succeed ([#86](https://github.com/tomparkp/la28-session-picker/issues/86)) ([866c899](https://github.com/tomparkp/la28-session-picker/commit/866c89978b40c69c1976fc1c4c53eeb9dc9f887a))

## [1.3.1](https://github.com/tomparkp/la28-session-picker/compare/v1.3.0...v1.3.1) (2026-04-14)


### Bug Fixes

* **build:** seed local D1 before prerender so `/` ships with real data ([#84](https://github.com/tomparkp/la28-session-picker/issues/84)) ([b4bc32e](https://github.com/tomparkp/la28-session-picker/commit/b4bc32edc9bffb116aee73766f2c01ece1f79706))

## [1.3.0](https://github.com/tomparkp/la28-session-picker/compare/v1.2.0...v1.3.0) (2026-04-14)


### Features

* **content:** ground session prompts in Paris 2024 medal data ([#78](https://github.com/tomparkp/la28-session-picker/issues/78)) ([e915464](https://github.com/tomparkp/la28-session-picker/commit/e91546444dd35052361696412ca904b28c506517))
* **content:** Haiku scoring + Batches API writing ([#79](https://github.com/tomparkp/la28-session-picker/issues/79)) ([b09fe6f](https://github.com/tomparkp/la28-session-picker/commit/b09fe6f524d0fe104d6a4ebb53609204fdee538a))
* **data:** migrate session storage from JSON to Cloudflare D1 ([#81](https://github.com/tomparkp/la28-session-picker/issues/81)) ([93e0458](https://github.com/tomparkp/la28-session-picker/commit/93e045811161f76c146a98f3a2a15a2e5e255b02))
* **db:** Drizzle Studio + timestamp migration prefix ([#82](https://github.com/tomparkp/la28-session-picker/issues/82)) ([aa6ce7a](https://github.com/tomparkp/la28-session-picker/commit/aa6ce7a9271c6cc5d0cc35cb785e9452926a59bd))
* **ratings:** AI-generated scorecards with per-dimension explanations ([#77](https://github.com/tomparkp/la28-session-picker/issues/77)) ([51a536a](https://github.com/tomparkp/la28-session-picker/commit/51a536a882925e7b126e38942a00a1667ea08c04))
* **scripts:** add pnpm refresh for single-session content ([#76](https://github.com/tomparkp/la28-session-picker/issues/76)) ([82ca301](https://github.com/tomparkp/la28-session-picker/commit/82ca301c9d9c13e9dd72980e03dcabfe7450fe55))


### Bug Fixes

* **session-detail:** reset scroll when switching sessions ([#73](https://github.com/tomparkp/la28-session-picker/issues/73)) ([4ab2b3e](https://github.com/tomparkp/la28-session-picker/commit/4ab2b3e8f7268cc0fa870fc1b83de05f3232a4a4))

## [1.2.0](https://github.com/tomparkp/la28-session-picker/compare/v1.1.1...v1.2.0) (2026-04-12)


### Features

* **filters:** add mobile sort dropdown ([#71](https://github.com/tomparkp/la28-session-picker/issues/71)) ([7f98e80](https://github.com/tomparkp/la28-session-picker/commit/7f98e809067721c0a16a325aee720d7bab9f611d))

## [1.1.1](https://github.com/tomparkp/la28-session-picker/compare/v1.1.0...v1.1.1) (2026-04-12)


### Bug Fixes

* **sort:** include time in date sort and remove price sort ([#69](https://github.com/tomparkp/la28-session-picker/issues/69)) ([b8eecd9](https://github.com/tomparkp/la28-session-picker/commit/b8eecd969fcf6228a27f64a7c86fbe9018543033))

## [1.1.0](https://github.com/tomparkp/la28-session-picker/compare/v1.0.0...v1.1.0) (2026-04-12)


### Features

* **routes:** replace session count with clear filters action ([#65](https://github.com/tomparkp/la28-session-picker/issues/65)) ([785bf02](https://github.com/tomparkp/la28-session-picker/commit/785bf02016b6698a54a50e1c2ecfddfe3d52edb3))

## 1.0.0 (2026-04-12)

### Features

- add app source with routes and components ([49476f9](https://github.com/tomparkp/la28-session-picker/commit/49476f94d8dc853a2fb52dbeeda47d393c9ba993))
- add Cloudflare Workers deployment ([#11](https://github.com/tomparkp/la28-session-picker/issues/11)) ([f3d40c4](https://github.com/tomparkp/la28-session-picker/commit/f3d40c40475edbbaf837174c88807cf64a52c340))
- add gold medal favicon and ICO generation ([1facadd](https://github.com/tomparkp/la28-session-picker/commit/1facaddb76885c944b2dc059f6fa82e6f073e794))
- add group by dropdown for sport, round, zone, and date ([5d10c79](https://github.com/tomparkp/la28-session-picker/commit/5d10c79db8a34d2dcc97ba1b642ada7f71a1e248))
- add navigation with hero header and tab bar ([601c8fa](https://github.com/tomparkp/la28-session-picker/commit/601c8fa4946e634513af18af3bce7d585f7aedd9))
- add rating engine, filtering, and bookmark logic ([dc62327](https://github.com/tomparkp/la28-session-picker/commit/dc6232756013a9d9911f2f253dc11c6e994332a0))
- add rating system methodology page ([a82ac5d](https://github.com/tomparkp/la28-session-picker/commit/a82ac5d86701705c40fbb3b6ff5300d031cf3d8c))
- add session data and types ([3e2e791](https://github.com/tomparkp/la28-session-picker/commit/3e2e791175ecf9d28096fae078e287a6b1b17cd3))
- add session picker components ([fba238b](https://github.com/tomparkp/la28-session-picker/commit/fba238bc2f662a63aaffef38deb37c7f127168d3))
- add venues, calendar, and about pages ([3275767](https://github.com/tomparkp/la28-session-picker/commit/327576750300fb4630c73966029c9b05211eec52))
- **bookmarks:** add save button to session detail panel ([#20](https://github.com/tomparkp/la28-session-picker/issues/20)) ([e5906e4](https://github.com/tomparkp/la28-session-picker/commit/e5906e46a2a89ad0063dc66784ddb2d9ae1415b0))
- **bookmarks:** replace inline table with slide-over saved panel ([#18](https://github.com/tomparkp/la28-session-picker/issues/18)) ([e9d4cc0](https://github.com/tomparkp/la28-session-picker/commit/e9d4cc0e644cb363765fa9b6b882dfed8b768fb4))
- **calendar:** redesign as agenda with timeline view ([247cc9b](https://github.com/tomparkp/la28-session-picker/commit/247cc9b1c3f3c088f2563714f4d2e30cef1f6a75))
- color-code rating pills by tier ([a81c6e3](https://github.com/tomparkp/la28-session-picker/commit/a81c6e39b7bbebb05a45089d5a39079a7954e48c))
- **content:** add curated related news ([#41](https://github.com/tomparkp/la28-session-picker/issues/41)) ([df17d79](https://github.com/tomparkp/la28-session-picker/commit/df17d79b45e6c45cfb1fa56447c277a9209dd884))
- **content:** add perplexity provider ([#40](https://github.com/tomparkp/la28-session-picker/issues/40)) ([20d73eb](https://github.com/tomparkp/la28-session-picker/commit/20d73eb553762ee67c434c215966b122dd6de67a))
- **content:** generate related news per session via Perplexity ([#50](https://github.com/tomparkp/la28-session-picker/issues/50)) ([ace1e0f](https://github.com/tomparkp/la28-session-picker/commit/ace1e0fc0db2f5073d8570b4f8350efce155c5cd))
- **content:** two-stage grounding + writing pipeline with parallelization ([#53](https://github.com/tomparkp/la28-session-picker/issues/53)) ([c6ba203](https://github.com/tomparkp/la28-session-picker/commit/c6ba203c5cc4e829531aa28340c42b73e25ce0b5))
- **data:** paginate sessions and lazy-load details ([#46](https://github.com/tomparkp/la28-session-picker/issues/46)) ([318e072](https://github.com/tomparkp/la28-session-picker/commit/318e072aa19b9a796577b304ab48575d0650063b))
- **detail:** dismiss panel on click outside, switch on event click ([#28](https://github.com/tomparkp/la28-session-picker/issues/28)) ([0ebc064](https://github.com/tomparkp/la28-session-picker/commit/0ebc064d2ef2916c000771159e94bbf89162d230))
- **filters:** update toolbar filter controls ([#44](https://github.com/tomparkp/la28-session-picker/issues/44)) ([3142bf3](https://github.com/tomparkp/la28-session-picker/commit/3142bf3d240b9ba64cd7c369ec02954d94eece18))
- redesign rating system with 5 dimensions ([2410e4a](https://github.com/tomparkp/la28-session-picker/commit/2410e4abfc31e6a11f39a9205cbb6b42fd2ab89c))
- **routes:** add URL-addressable session detail panel ([#31](https://github.com/tomparkp/la28-session-picker/issues/31)) ([bdff9db](https://github.com/tomparkp/la28-session-picker/commit/bdff9db9d38193c69ff468961a79ca32e64ed2ae))
- **routes:** rename Agenda to Schedule and redesign with AI ratings ([#3](https://github.com/tomparkp/la28-session-picker/issues/3)) ([77711ca](https://github.com/tomparkp/la28-session-picker/commit/77711ca8e219cbd3741baa2ae81f74a3c7c9ba57))
- **routes:** simplify app to sessions only ([#6](https://github.com/tomparkp/la28-session-picker/issues/6)) ([76991af](https://github.com/tomparkp/la28-session-picker/commit/76991af95fe70d2c96db40854f402bd37c8a7e1d))
- **schedule:** add expandable session scorecards ([#5](https://github.com/tomparkp/la28-session-picker/issues/5)) ([11bf3ac](https://github.com/tomparkp/la28-session-picker/commit/11bf3ac4cd57a012016af4bcc12c97bf27529550))
- **scripts:** load .env file in content generation script ([#34](https://github.com/tomparkp/la28-session-picker/issues/34)) ([4b0113b](https://github.com/tomparkp/la28-session-picker/commit/4b0113b412ad67975f9650ffab2c1255043ba58e))
- **session-detail:** add report issue dialog with Resend email ([#55](https://github.com/tomparkp/la28-session-picker/issues/55)) ([b44f121](https://github.com/tomparkp/la28-session-picker/commit/b44f1218e59bd2c8e5a483fe9b19c0d4c39c3e61))
- **session-detail:** swipe-to-close panel on mobile ([#33](https://github.com/tomparkp/la28-session-picker/issues/33)) ([6445a3a](https://github.com/tomparkp/la28-session-picker/commit/6445a3a9594617b9815786d9a323081a2c88cc78))
- **sessions:** replace inline accordion with Notion-style side peek panel ([#8](https://github.com/tomparkp/la28-session-picker/issues/8)) ([2913d3d](https://github.com/tomparkp/la28-session-picker/commit/2913d3dadf689efe670e475a161a4aa761761db3))
- **sessions:** rich sport knowledge base, contenders, and LLM content generation ([#7](https://github.com/tomparkp/la28-session-picker/issues/7)) ([2cdfc5c](https://github.com/tomparkp/la28-session-picker/commit/2cdfc5c278693e89903bc15ee391dad8da95a1ec))
- **ui:** add mobile responsive layout ([#10](https://github.com/tomparkp/la28-session-picker/issues/10)) ([9c0d212](https://github.com/tomparkp/la28-session-picker/commit/9c0d212ab9308475cb409d4cbde7c146819b42c9))
- **ui:** add scroll-to-top button on session list ([#60](https://github.com/tomparkp/la28-session-picker/issues/60)) ([8e8dbba](https://github.com/tomparkp/la28-session-picker/commit/8e8dbbad69d1c0307dc5970bf72b54c96ca9fb2a))
- **ui:** replace custom panel chrome with base ui drawers ([#42](https://github.com/tomparkp/la28-session-picker/issues/42)) ([b1b3df0](https://github.com/tomparkp/la28-session-picker/commit/b1b3df09fddcfb4e662ca0a16a973e184488b40c))
- wire up session picker as home page ([bb8e2d4](https://github.com/tomparkp/la28-session-picker/commit/bb8e2d43db1e06b9201d5af6bc3eb9db83875121))

### Bug Fixes

- **ci:** make CDN warm step non-fatal ([#23](https://github.com/tomparkp/la28-session-picker/issues/23)) ([21e938d](https://github.com/tomparkp/la28-session-picker/commit/21e938dd56afbaf0946c08000722f23ee223ef56))
- **data:** audit event data accuracy and rename contenders to potentialContenders ([#30](https://github.com/tomparkp/la28-session-picker/issues/30)) ([eb0144c](https://github.com/tomparkp/la28-session-picker/commit/eb0144cbfbc54234e7a13c23adf8f13bb30bb2ad))
- **detail:** replace hand-rolled swipe with Base UI Drawer on mobile ([#37](https://github.com/tomparkp/la28-session-picker/issues/37)) ([7e05bf2](https://github.com/tomparkp/la28-session-picker/commit/7e05bf280f4dc2e21418c1eb8539cbb7a0162dd9))
- **drawer:** disable swipe-to-dismiss on desktop ([#57](https://github.com/tomparkp/la28-session-picker/issues/57)) ([f99e7dc](https://github.com/tomparkp/la28-session-picker/commit/f99e7dc8f92e9d8fdac1a664ce7e62410072a9f5))
- resolve typescript and lint errors ([#58](https://github.com/tomparkp/la28-session-picker/issues/58)) ([4bdc854](https://github.com/tomparkp/la28-session-picker/commit/4bdc8541d18989a395eab18c73653697ad9ca05d))
- restore filter selection and add missing content-script deps ([#61](https://github.com/tomparkp/la28-session-picker/issues/61)) ([bccef39](https://github.com/tomparkp/la28-session-picker/commit/bccef3958b8ddcd8be427616c07df795cc0ab542))
- revert rating filter label to "Any Rating" ([25c6273](https://github.com/tomparkp/la28-session-picker/commit/25c6273072704bf14c316341d30bc797925e5a5f))
- **security:** harden app for production readiness ([#12](https://github.com/tomparkp/la28-session-picker/issues/12)) ([61280a2](https://github.com/tomparkp/la28-session-picker/commit/61280a2ac07953a823aca114c30515e48166e29c))
- **security:** harden CSP, URL validation, and input handling ([#54](https://github.com/tomparkp/la28-session-picker/issues/54)) ([8d0c576](https://github.com/tomparkp/la28-session-picker/commit/8d0c5767431bb5a45e2584f2354b1cb29e30fed9))
- **sessions:** correct round-type classifications for 42 medal sessions ([#19](https://github.com/tomparkp/la28-session-picker/issues/19)) ([e05c2b3](https://github.com/tomparkp/la28-session-picker/commit/e05c2b3f67db153dbf1ff3adec71249e9e84bf79))
- **sessions:** remove sport classification from ceremonies ([#17](https://github.com/tomparkp/la28-session-picker/issues/17)) ([03938e0](https://github.com/tomparkp/la28-session-picker/commit/03938e0d3d90adb11b2391914126957828b458ad))
- **sessions:** sort date groups chronologically ([#13](https://github.com/tomparkp/la28-session-picker/issues/13)) ([5c9279e](https://github.com/tomparkp/la28-session-picker/commit/5c9279ed12de7552eb4ac810f5cca08ac5b355a1))
- **theme:** bring all light mode tokens to WCAG AA contrast ([#32](https://github.com/tomparkp/la28-session-picker/issues/32)) ([e176a7c](https://github.com/tomparkp/la28-session-picker/commit/e176a7cd9c87dc3fe1a71af069ec9c22aa7fd050))
- **theme:** make dark/light toggle instant with no transitions ([#14](https://github.com/tomparkp/la28-session-picker/issues/14)) ([53ef860](https://github.com/tomparkp/la28-session-picker/commit/53ef860b863dc57019b287d64fd14818149cfe9b))

### Performance Improvements

- **events:** improve interaction responsiveness ([#43](https://github.com/tomparkp/la28-session-picker/issues/43)) ([25a9b8a](https://github.com/tomparkp/la28-session-picker/commit/25a9b8a3eaa71b807d16ff346ca767be9f94be1a))
- harden site for traffic spikes on Cloudflare ([#22](https://github.com/tomparkp/la28-session-picker/issues/22)) ([0c083ed](https://github.com/tomparkp/la28-session-picker/commit/0c083edcb315838c810cc0417bec8ddb4201a032))
- **session-table:** virtualize session list ([#45](https://github.com/tomparkp/la28-session-picker/issues/45)) ([ce437b1](https://github.com/tomparkp/la28-session-picker/commit/ce437b1cb1f3c21b8b1048cdcdc78cf66a31cd0c))
- snappier sessions UI with SSR data, split routes, and virtual tables ([2615a6c](https://github.com/tomparkp/la28-session-picker/commit/2615a6c23ddda671a30095e10261a2616deee38a))
