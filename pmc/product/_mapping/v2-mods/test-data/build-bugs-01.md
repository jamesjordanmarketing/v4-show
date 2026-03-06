14:14:33.526 Running build in Washington, D.C., USA (East) – iad1
14:14:33.526 Build machine configuration: 2 cores, 8 GB
14:14:33.657 Cloning github.com/jamesjordanmarketing/v4-show (Branch: main, Commit: 6abc2c4)
14:14:35.553 Cloning completed: 1.896s
14:14:35.865 Found .vercelignore (repository root)
14:14:36.059 Removed 2209 ignored files defined in .vercelignore
14:14:36.060   /.cursor/commands/src.md
14:14:36.060   /.git/config
14:14:36.060   /.git/description
14:14:36.060   /.git/FETCH_HEAD
14:14:36.060   /.git/HEAD
14:14:36.061   /.git/hooks/applypatch-msg.sample
14:14:36.061   /.git/hooks/commit-msg.sample
14:14:36.061   /.git/hooks/fsmonitor-watchman.sample
14:14:36.061   /.git/hooks/post-update.sample
14:14:36.061   /.git/hooks/pre-applypatch.sample
14:14:36.114 Restored build cache from previous deployment (A2mQchwoXwSTPkUjHatQpJdM3eDW)
14:14:36.436 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
14:14:36.437 Running "vercel build"
14:14:36.980 Vercel CLI 50.15.1
14:14:37.330 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
14:14:37.350 Installing dependencies...
14:14:39.892 
14:14:39.893 > multi-chat@0.1.0 prepare
14:14:39.893 > husky install
14:14:39.893 
14:14:39.940 husky - install command is DEPRECATED
14:14:39.950 .git can't be found
14:14:39.950 up to date in 2s
14:14:39.950 
14:14:39.950 211 packages are looking for funding
14:14:39.951   run `npm fund` for details
14:14:39.964 Detected Next.js version: 14.2.33
14:14:39.970 Running "npm run build"
14:14:40.707 
14:14:40.708 > multi-chat@0.1.0 build
14:14:40.708 > next build
14:14:40.709 
14:14:41.494   ▲ Next.js 14.2.33
14:14:41.495 
14:14:41.576    Creating an optimized production build ...
14:14:57.804 [baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
14:15:03.852  ✓ Compiled successfully
14:15:03.854    Skipping linting
14:15:03.854    Checking validity of types ...
14:15:32.812 Failed to compile.
14:15:32.813 
14:15:32.813 ./app/(dashboard)/rag/[id]/page.tsx:65:29
14:15:32.813 Type error: Property 'sourceType' does not exist on type 'RAGDocument'.
14:15:32.814 
14:15:32.814 [0m [90m 63 |[39m                 [33m<[39m[33mh1[39m className[33m=[39m[32m"text-xl font-bold"[39m[33m>[39m{document[33m.[39mfileName}[33m<[39m[33m/[39m[33mh1[39m[33m>[39m[0m
14:15:32.814 [0m [90m 64 |[39m                 [33m<[39m[33mp[39m className[33m=[39m[32m"text-sm text-muted-foreground"[39m[33m>[39m[0m
14:15:32.814 [0m[31m[1m>[22m[39m[90m 65 |[39m                   {document[33m.[39msourceType} · {document[33m.[39msectionCount} sections · {document[33m.[39mfactCount} facts[0m
14:15:32.815 [0m [90m    |[39m                             [31m[1m^[22m[39m[0m
14:15:32.815 [0m [90m 66 |[39m                 [33m<[39m[33m/[39m[33mp[39m[33m>[39m[0m
14:15:32.815 [0m [90m 67 |[39m               [33m<[39m[33m/[39m[33mdiv[39m[33m>[39m[0m
14:15:32.815 [0m [90m 68 |[39m             [33m<[39m[33m/[39m[33mdiv[39m[33m>[39m[0m
14:15:32.863 Next.js build worker exited with code: 1 and signal: null
14:15:32.904 Error: Command "npm run build" exited with 1