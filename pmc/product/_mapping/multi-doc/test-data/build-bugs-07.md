21:12:46.255 Running build in Washington, D.C., USA (East) – iad1 (Turbo Build Machine)
21:12:46.256 Build machine configuration: 30 cores, 60 GB
21:12:46.362 Cloning github.com/jamesjordanmarketing/v4-show (Branch: main, Commit: c8ec0ec)
21:12:48.220 Cloning completed: 1.857s
21:12:48.380 Found .vercelignore (repository root)
21:12:48.507 Removed 2360 ignored files defined in .vercelignore
21:12:48.507   /.cursor/commands/src.md
21:12:48.507   /.git/config
21:12:48.507   /.git/description
21:12:48.507   /.git/FETCH_HEAD
21:12:48.507   /.git/HEAD
21:12:48.507   /.git/hooks/applypatch-msg.sample
21:12:48.508   /.git/hooks/commit-msg.sample
21:12:48.508   /.git/hooks/fsmonitor-watchman.sample
21:12:48.508   /.git/hooks/post-update.sample
21:12:48.508   /.git/hooks/pre-applypatch.sample
21:12:48.542 Restored build cache from previous deployment (Hx2PLzLbEE453NFLEeqjmb6w7src)
21:12:48.784 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
21:12:48.784 Running "vercel build"
21:12:49.217 Vercel CLI 50.22.0
21:12:49.465 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
21:12:49.484 Installing dependencies...
21:12:57.556 npm warn deprecated serialize-error-cjs@0.1.4: Rolling release, please update to 0.2.0
21:12:59.052 
21:12:59.052 > multi-chat@0.1.0 prepare
21:12:59.052 > husky install
21:12:59.052 
21:12:59.096 husky - install command is DEPRECATED
21:12:59.105 .git can't be found
21:12:59.105 changed 154 packages in 10s
21:12:59.105 
21:12:59.105 215 packages are looking for funding
21:12:59.105   run `npm fund` for details
21:12:59.120 Detected Next.js version: 14.2.33
21:12:59.129 Running "npm run build"
21:12:59.233 
21:12:59.234 > multi-chat@0.1.0 build
21:12:59.234 > next build
21:12:59.234 
21:12:59.809   ▲ Next.js 14.2.33
21:12:59.809 
21:12:59.876    Creating an optimized production build ...
21:13:07.812 [baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
21:13:09.880  ✓ Compiled successfully
21:13:09.881    Skipping linting
21:13:09.881    Checking validity of types ...
21:13:25.240 Failed to compile.
21:13:25.240 
21:13:25.240 ./lib/rag/services/rag-retrieval-service.ts:297:31
21:13:25.240 Type error: Type 'MapIterator<(RAGSection & { similarity: number; })[]>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
21:13:25.241 
21:13:25.241 [0m [90m 295 |[39m[0m
21:13:25.241 [0m [90m 296 |[39m     [90m// Sort each document's sections by similarity (descending) internally[39m[0m
21:13:25.241 [0m[31m[1m>[22m[39m[90m 297 |[39m     [36mfor[39m ([36mconst[39m docSections [36mof[39m sectionsByDoc[33m.[39mvalues()) {[0m
21:13:25.241 [0m [90m     |[39m                               [31m[1m^[22m[39m[0m
21:13:25.241 [0m [90m 298 |[39m       docSections[33m.[39msort((a[33m,[39m b) [33m=>[39m b[33m.[39msimilarity [33m-[39m a[33m.[39msimilarity)[33m;[39m[0m
21:13:25.241 [0m [90m 299 |[39m     }[0m
21:13:25.241 [0m [90m 300 |[39m[0m
21:13:25.286 Next.js build worker exited with code: 1 and signal: null
21:13:25.313 Error: Command "npm run build" exited with 1