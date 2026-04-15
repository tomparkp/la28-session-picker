# Changelog

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
