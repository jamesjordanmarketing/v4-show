16:34:45.069 Running build in Washington, D.C., USA (East) – iad1 (Turbo Build Machine)
16:34:45.070 Build machine configuration: 30 cores, 60 GB
16:34:45.248 Cloning github.com/jamesjordanmarketing/v4-show (Branch: main, Commit: 2118c2b)
16:34:47.301 Cloning completed: 2.053s
16:34:47.522 Found .vercelignore (repository root)
16:34:47.677 Removed 2379 ignored files defined in .vercelignore
16:34:47.678   /.cursor/commands/src.md
16:34:47.678   /.git/config
16:34:47.678   /.git/description
16:34:47.678   /.git/FETCH_HEAD
16:34:47.678   /.git/HEAD
16:34:47.678   /.git/hooks/applypatch-msg.sample
16:34:47.678   /.git/hooks/commit-msg.sample
16:34:47.678   /.git/hooks/fsmonitor-watchman.sample
16:34:47.678   /.git/hooks/post-update.sample
16:34:47.678   /.git/hooks/pre-applypatch.sample
16:34:47.716 Restored build cache from previous deployment (5iC3gcrHyDSkXYcb869P4CJBa4i5)
16:34:47.977 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
16:34:47.977 Running "vercel build"
16:34:48.461 Vercel CLI 50.22.0
16:34:48.759 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
16:34:48.781 Installing dependencies...
16:34:58.458 npm warn deprecated serialize-error-cjs@0.1.4: Rolling release, please update to 0.2.0
16:35:00.092 
16:35:00.092 > multi-chat@0.1.0 prepare
16:35:00.092 > husky install
16:35:00.092 
16:35:00.139 husky - install command is DEPRECATED
16:35:00.150 .git can't be found
16:35:00.150 changed 154 packages in 11s
16:35:00.151 
16:35:00.151 215 packages are looking for funding
16:35:00.151   run `npm fund` for details
16:35:00.166 Detected Next.js version: 14.2.33
16:35:00.176 Running "npm run build"
16:35:00.290 
16:35:00.291 > multi-chat@0.1.0 build
16:35:00.291 > next build
16:35:00.291 
16:35:00.922   ▲ Next.js 14.2.33
16:35:00.922 
16:35:00.996    Creating an optimized production build ...
16:35:08.931 [baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
16:35:11.181  ✓ Compiled successfully
16:35:11.182    Skipping linting
16:35:11.182    Checking validity of types ...
16:35:27.228 Failed to compile.
16:35:27.228 
16:35:27.228 ./lib/rag/providers/claude-llm-provider.ts:404:32
16:35:27.228 Type error: Type 'Set<any>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
16:35:27.229 
16:35:27.229 [0m [90m 402 |[39m     [36mconst[39m docNameMatches [33m=[39m retrievedContext[33m.[39mmatch([35m/###?\s*From:\s*(.+)/g[39m) [33m||[39m [][33m;[39m[0m
16:35:27.229 [0m [90m 403 |[39m     [36mconst[39m docNames [33m=[39m docNameMatches[33m.[39mmap(m [33m=>[39m m[33m.[39mreplace([35m/###?\s*From:\s*/[39m[33m,[39m [32m''[39m)[33m.[39mtrim())[33m;[39m[0m
16:35:27.229 [0m[31m[1m>[22m[39m[90m 404 |[39m     [36mconst[39m uniqueDocNames [33m=[39m [[33m...[39m[36mnew[39m [33mSet[39m(docNames)][33m;[39m[0m
16:35:27.229 [0m [90m     |[39m                                [31m[1m^[22m[39m[0m
16:35:27.229 [0m [90m 405 |[39m[0m
16:35:27.229 [0m [90m 406 |[39m     [36mconst[39m loraAdjustment [33m=[39m isLoRAMode [33m?[39m [32m`[39m[0m
16:35:27.229 [0m [90m 407 |[39m[0m
16:35:27.279 Next.js build worker exited with code: 1 and signal: null
16:35:27.327 Error: Command "npm run build" exited with 1