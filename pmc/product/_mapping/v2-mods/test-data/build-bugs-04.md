17:46:11.830 Running build in Washington, D.C., USA (East) – iad1 (Turbo Build Machine)
17:46:11.831 Build machine configuration: 30 cores, 60 GB
17:46:11.913 Cloning github.com/jamesjordanmarketing/v4-show (Branch: main, Commit: 5f9fdd5)
17:46:13.445 Cloning completed: 1.531s
17:46:13.614 Found .vercelignore (repository root)
17:46:13.735 Removed 2231 ignored files defined in .vercelignore
17:46:13.735   /.cursor/commands/src.md
17:46:13.735   /.git/config
17:46:13.735   /.git/description
17:46:13.735   /.git/FETCH_HEAD
17:46:13.735   /.git/HEAD
17:46:13.735   /.git/hooks/applypatch-msg.sample
17:46:13.736   /.git/hooks/commit-msg.sample
17:46:13.736   /.git/hooks/fsmonitor-watchman.sample
17:46:13.736   /.git/hooks/post-update.sample
17:46:13.736   /.git/hooks/pre-applypatch.sample
17:46:13.770 Restored build cache from previous deployment (2GNNQakBAqGrwvQi9nKEcWFYbED5)
17:46:14.021 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
17:46:14.022 Running "vercel build"
17:46:14.488 Vercel CLI 50.17.0
17:46:14.767 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
17:46:14.783 Installing dependencies...
17:46:16.757 
17:46:16.757 > multi-chat@0.1.0 prepare
17:46:16.757 > husky install
17:46:16.757 
17:46:16.803 husky - install command is DEPRECATED
17:46:16.810 .git can't be found
17:46:16.810 up to date in 2s
17:46:16.810 
17:46:16.810 211 packages are looking for funding
17:46:16.810   run `npm fund` for details
17:46:16.818 Detected Next.js version: 14.2.33
17:46:16.823 Running "npm run build"
17:46:16.924 
17:46:16.925 > multi-chat@0.1.0 build
17:46:16.925 > next build
17:46:16.925 
17:46:17.487   ▲ Next.js 14.2.33
17:46:17.487 
17:46:17.554    Creating an optimized production build ...
17:46:25.727 [baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
17:46:28.759  ✓ Compiled successfully
17:46:28.760    Skipping linting
17:46:28.760    Checking validity of types ...
17:46:45.588 Failed to compile.
17:46:45.588 
17:46:45.588 ./app/api/rag/documents/[id]/diagnostic-test/route.ts:104:20
17:46:45.589 Type error: Cannot find name 'timeout1'.
17:46:45.589 
17:46:45.589 [0m [90m 102 |[39m       [0m
17:46:45.589 [0m [90m 103 |[39m     } [36mcatch[39m (error[33m:[39m any) {[0m
17:46:45.589 [0m[31m[1m>[22m[39m[90m 104 |[39m       clearTimeout(timeout1)[33m;[39m[0m
17:46:45.589 [0m [90m     |[39m                    [31m[1m^[22m[39m[0m
17:46:45.589 [0m [90m 105 |[39m       [36mconst[39m test1Elapsed [33m=[39m [33mDate[39m[33m.[39mnow() [33m-[39m test1Start[33m;[39m[0m
17:46:45.589 [0m [90m 106 |[39m       [0m
17:46:45.589 [0m [90m 107 |[39m       results[33m.[39mpush({[0m
17:46:45.635 Next.js build worker exited with code: 1 and signal: null
17:46:45.683 Error: Command "npm run build" exited with 1