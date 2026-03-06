13:07:38.829 Running build in Washington, D.C., USA (East) – iad1 (Turbo Build Machine)
13:07:38.830 Build machine configuration: 30 cores, 60 GB
13:07:38.913 Cloning github.com/jamesjordanmarketing/v4-show (Branch: main, Commit: 2f93316)
13:07:40.664 Cloning completed: 1.751s
13:07:40.872 Found .vercelignore (repository root)
13:07:41.008 Removed 2314 ignored files defined in .vercelignore
13:07:41.008   /.cursor/commands/src.md
13:07:41.008   /.git/config
13:07:41.008   /.git/description
13:07:41.008   /.git/FETCH_HEAD
13:07:41.008   /.git/HEAD
13:07:41.008   /.git/hooks/applypatch-msg.sample
13:07:41.008   /.git/hooks/commit-msg.sample
13:07:41.008   /.git/hooks/fsmonitor-watchman.sample
13:07:41.008   /.git/hooks/post-update.sample
13:07:41.008   /.git/hooks/pre-applypatch.sample
13:07:41.042 Restored build cache from previous deployment (2tGBme4Bt5RzuZvEZi8RpD5TvGet)
13:07:41.277 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
13:07:41.278 Running "vercel build"
13:07:41.725 Vercel CLI 50.18.2
13:07:41.982 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
13:07:41.997 Installing dependencies...
13:07:52.212 npm warn deprecated serialize-error-cjs@0.1.4: Rolling release, please update to 0.2.0
13:07:53.648 
13:07:53.648 > multi-chat@0.1.0 prepare
13:07:53.648 > husky install
13:07:53.648 
13:07:53.692 husky - install command is DEPRECATED
13:07:53.701 .git can't be found
13:07:53.701 changed 154 packages in 12s
13:07:53.701 
13:07:53.701 215 packages are looking for funding
13:07:53.701   run `npm fund` for details
13:07:53.716 Detected Next.js version: 14.2.33
13:07:53.721 Running "npm run build"
13:07:53.824 
13:07:53.825 > multi-chat@0.1.0 build
13:07:53.825 > next build
13:07:53.825 
13:07:54.393   ▲ Next.js 14.2.33
13:07:54.393 
13:07:54.459    Creating an optimized production build ...
13:08:02.187 [baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
13:08:04.583  ✓ Compiled successfully
13:08:04.583    Skipping linting
13:08:04.584    Checking validity of types ...
13:08:21.620 Failed to compile.
13:08:21.620 
13:08:21.620 ./lib/rag/providers/claude-llm-provider.ts:434:25
13:08:21.620 Type error: A type predicate's type must be assignable to its parameter's type.
13:08:21.621   Type '{ type: "text"; text: string; }' is not assignable to type 'ContentBlock'.
13:08:21.621     Property 'citations' is missing in type '{ type: "text"; text: string; }' but required in type 'TextBlock'.
13:08:21.621 
13:08:21.621 [0m [90m 432 |[39m[0m
13:08:21.621 [0m [90m 433 |[39m     [36mconst[39m responseText [33m=[39m response[33m.[39mcontent[0m
13:08:21.621 [0m[31m[1m>[22m[39m[90m 434 |[39m       [33m.[39mfilter((b)[33m:[39m b is { type[33m:[39m [32m'text'[39m[33m;[39m text[33m:[39m string } [33m=>[39m b[33m.[39mtype [33m===[39m [32m'text'[39m)[0m
13:08:21.621 [0m [90m     |[39m                         [31m[1m^[22m[39m[0m
13:08:21.621 [0m [90m 435 |[39m       [33m.[39mmap(b [33m=>[39m b[33m.[39mtext)[0m
13:08:21.621 [0m [90m 436 |[39m       [33m.[39mjoin([32m''[39m)[33m;[39m[0m
13:08:21.621 [0m [90m 437 |[39m[0m
13:08:21.670 Next.js build worker exited with code: 1 and signal: null
13:08:21.698 Error: Command "npm run build" exited with 1