16:08:50.744 Running build in Washington, D.C., USA (East) – iad1 (Turbo Build Machine)
16:08:50.745 Build machine configuration: 30 cores, 60 GB
16:08:50.836 Cloning github.com/jamesjordanmarketing/v4-show (Branch: main, Commit: 1c9aabc)
16:08:52.278 Cloning completed: 1.442s
16:08:52.461 Found .vercelignore (repository root)
16:08:52.590 Removed 2219 ignored files defined in .vercelignore
16:08:52.590   /.cursor/commands/src.md
16:08:52.590   /.git/config
16:08:52.590   /.git/description
16:08:52.590   /.git/FETCH_HEAD
16:08:52.590   /.git/HEAD
16:08:52.590   /.git/hooks/applypatch-msg.sample
16:08:52.590   /.git/hooks/commit-msg.sample
16:08:52.590   /.git/hooks/fsmonitor-watchman.sample
16:08:52.590   /.git/hooks/post-update.sample
16:08:52.590   /.git/hooks/pre-applypatch.sample
16:08:52.622 Restored build cache from previous deployment (N8zN4WhT4sZtDW6c4X2r1Xo7vwjR)
16:08:52.850 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
16:08:52.850 Running "vercel build"
16:08:53.287 Vercel CLI 50.17.0
16:08:53.545 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
16:08:53.560 Installing dependencies...
16:08:55.395 
16:08:55.395 > multi-chat@0.1.0 prepare
16:08:55.395 > husky install
16:08:55.395 
16:08:55.439 husky - install command is DEPRECATED
16:08:55.448 .git can't be found
16:08:55.448 up to date in 2s
16:08:55.448 
16:08:55.448 211 packages are looking for funding
16:08:55.448   run `npm fund` for details
16:08:55.456 Detected Next.js version: 14.2.33
16:08:55.461 Running "npm run build"
16:08:55.565 
16:08:55.565 > multi-chat@0.1.0 build
16:08:55.565 > next build
16:08:55.565 
16:08:56.134   ▲ Next.js 14.2.33
16:08:56.134 
16:08:56.202    Creating an optimized production build ...
16:09:03.540 Failed to compile.
16:09:03.541 
16:09:03.541 ./app/api/rag/documents/[id]/process/route.ts
16:09:03.541 Module not found: Can't resolve '@vercel/functions'
16:09:03.541 
16:09:03.541 https://nextjs.org/docs/messages/module-not-found
16:09:03.541 
16:09:03.541 ./app/api/rag/documents/[id]/upload/route.ts
16:09:03.541 Module not found: Can't resolve '@vercel/functions'
16:09:03.541 
16:09:03.541 https://nextjs.org/docs/messages/module-not-found
16:09:03.541 
16:09:03.541 
16:09:03.541 > Build failed because of webpack errors
16:09:03.632 Error: Command "npm run build" exited with 1