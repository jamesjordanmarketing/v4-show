23:10:40.913 Running build in Washington, D.C., USA (East) – iad1
23:10:40.914 Build machine configuration: 2 cores, 8 GB
23:10:41.063 Cloning github.com/jamesjordanmarketing/v4-show (Branch: main, Commit: b8992ab)
23:10:58.142 Cloning completed: 17.079s
23:10:58.544 Found .vercelignore (repository root)
23:10:58.852 Removed 3449 ignored files defined in .vercelignore
23:10:58.852   /.cursor/commands/src.md
23:10:58.853   /.git/config
23:10:58.853   /.git/description
23:10:58.853   /.git/FETCH_HEAD
23:10:58.853   /.git/HEAD
23:10:58.853   /.git/hooks/applypatch-msg.sample
23:10:58.853   /.git/hooks/commit-msg.sample
23:10:58.853   /.git/hooks/fsmonitor-watchman.sample
23:10:58.853   /.git/hooks/post-update.sample
23:10:58.853   /.git/hooks/pre-applypatch.sample
23:10:58.914 Restored build cache from previous deployment (DxYNJNxUSnNJJQJ59njLdEwj5k2s)
23:10:59.430 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
23:10:59.432 Running "vercel build"
23:11:00.993 Vercel CLI 50.4.4
23:11:01.342 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
23:11:01.357 Installing dependencies...
23:11:03.854 
23:11:03.855 > cat-module@0.1.0 prepare
23:11:03.855 > husky install
23:11:03.855 
23:11:03.903 husky - install command is DEPRECATED
23:11:03.915 .git can't be found
23:11:03.915 up to date in 2s
23:11:03.915 
23:11:03.915 211 packages are looking for funding
23:11:03.916   run `npm fund` for details
23:11:03.927 Detected Next.js version: 14.2.33
23:11:03.932 Running "npm run build"
23:11:04.069 
23:11:04.069 > cat-module@0.1.0 build
23:11:04.069 > next build
23:11:04.070 
23:11:04.776   ▲ Next.js 14.2.33
23:11:04.777 
23:11:04.857    Creating an optimized production build ...
23:11:16.249 [baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
23:11:20.240  ✓ Compiled successfully
23:11:20.242    Skipping linting
23:11:20.242    Checking validity of types ...
23:11:48.188 Failed to compile.
23:11:48.188 
23:11:48.189 ./components/pipeline/DeployAdapterButton.tsx:164:15
23:11:48.189 Type error: Type '(forceRedeploy?: boolean) => Promise<void>' is not assignable to type 'MouseEventHandler<HTMLButtonElement>'.
23:11:48.189   Types of parameters 'forceRedeploy' and 'event' are incompatible.
23:11:48.189     Type 'MouseEvent<HTMLButtonElement, MouseEvent>' is not assignable to type 'boolean'.
23:11:48.189 
23:11:48.189 [0m [90m 162 |[39m           [33m<[39m[33mTooltipTrigger[39m asChild[33m>[39m[0m
23:11:48.190 [0m [90m 163 |[39m             [33m<[39m[33mButton[39m[0m
23:11:48.190 [0m[31m[1m>[22m[39m[90m 164 |[39m               onClick[33m=[39m{handleDeploy}[0m
23:11:48.190 [0m [90m     |[39m               [31m[1m^[22m[39m[0m
23:11:48.190 [0m [90m 165 |[39m               variant[33m=[39m[32m"destructive"[39m[0m
23:11:48.190 [0m [90m 166 |[39m               className[33m=[39m[32m"gap-2"[39m[0m
23:11:48.190 [0m [90m 167 |[39m               disabled[33m=[39m{disabled}[0m
23:11:48.241 Next.js build worker exited with code: 1 and signal: null
23:11:48.294 Error: Command "npm run build" exited with 1