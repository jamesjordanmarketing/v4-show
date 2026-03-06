14:26:13.513 Running build in Washington, D.C., USA (East) – iad1
14:26:13.513 Build machine configuration: 2 cores, 8 GB
14:26:13.647 Cloning github.com/jamesjordanmarketing/v4-show (Branch: main, Commit: dfc3d44)
14:26:15.673 Cloning completed: 2.026s
14:26:15.978 Found .vercelignore (repository root)
14:26:16.172 Removed 2211 ignored files defined in .vercelignore
14:26:16.173   /.cursor/commands/src.md
14:26:16.173   /.git/config
14:26:16.173   /.git/description
14:26:16.173   /.git/FETCH_HEAD
14:26:16.173   /.git/HEAD
14:26:16.173   /.git/hooks/applypatch-msg.sample
14:26:16.173   /.git/hooks/commit-msg.sample
14:26:16.173   /.git/hooks/fsmonitor-watchman.sample
14:26:16.173   /.git/hooks/post-update.sample
14:26:16.173   /.git/hooks/pre-applypatch.sample
14:26:16.228 Restored build cache from previous deployment (A2mQchwoXwSTPkUjHatQpJdM3eDW)
14:26:16.524 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
14:26:16.524 Running "vercel build"
14:26:17.152 Vercel CLI 50.15.1
14:26:17.521 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
14:26:17.543 Installing dependencies...
14:26:20.437 
14:26:20.437 > multi-chat@0.1.0 prepare
14:26:20.437 > husky install
14:26:20.437 
14:26:20.486 husky - install command is DEPRECATED
14:26:20.497 .git can't be found
14:26:20.497 up to date in 3s
14:26:20.497 
14:26:20.497 211 packages are looking for funding
14:26:20.498   run `npm fund` for details
14:26:20.506 Detected Next.js version: 14.2.33
14:26:20.512 Running "npm run build"
14:26:20.637 
14:26:20.638 > multi-chat@0.1.0 build
14:26:20.638 > next build
14:26:20.638 
14:26:21.339   ▲ Next.js 14.2.33
14:26:21.340 
14:26:21.427    Creating an optimized production build ...
14:26:38.196 [baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
14:26:44.965  ✓ Compiled successfully
14:26:44.968    Skipping linting
14:26:44.971    Checking validity of types ...
14:27:14.419 Failed to compile.
14:27:14.420 
14:27:14.421 ./app/(dashboard)/rag/[id]/page.tsx:120:14
14:27:14.421 Type error: This comparison appears to be unintentional because the types 'RAGDocumentStatus' and '"verified"' have no overlap.
14:27:14.421 
14:27:14.421 [0m [90m 118 |[39m[0m
14:27:14.421 [0m [90m 119 |[39m           [33m<[39m[33mTabsContent[39m value[33m=[39m[32m"chat"[39m className[33m=[39m[32m"mt-4"[39m[33m>[39m[0m
14:27:14.421 [0m[31m[1m>[22m[39m[90m 120 |[39m             {document[33m.[39mstatus [33m===[39m [32m'verified'[39m [33m||[39m document[33m.[39mstatus [33m===[39m [32m'ready'[39m [33m?[39m ([0m
14:27:14.421 [0m [90m     |[39m              [31m[1m^[22m[39m[0m
14:27:14.422 [0m [90m 121 |[39m               [33m<[39m[33mRAGChat[39m documentId[33m=[39m{documentId} documentName[33m=[39m{document[33m.[39mfileName} [33m/[39m[33m>[39m[0m
14:27:14.422 [0m [90m 122 |[39m             ) [33m:[39m ([0m
14:27:14.422 [0m [90m 123 |[39m               [33m<[39m[33mp[39m className[33m=[39m[32m"text-sm text-muted-foreground py-8 text-center"[39m[33m>[39m[0m
14:27:14.473 Next.js build worker exited with code: 1 and signal: null
14:27:14.532 Error: Command "npm run build" exited with 1