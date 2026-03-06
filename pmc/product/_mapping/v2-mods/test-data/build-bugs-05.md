18:47:23.083 Running build in Washington, D.C., USA (East) – iad1 (Turbo Build Machine)
18:47:23.083 Build machine configuration: 30 cores, 60 GB
18:47:23.166 Cloning github.com/jamesjordanmarketing/v4-show (Branch: main, Commit: 8368821)
18:47:24.683 Cloning completed: 1.517s
18:47:24.856 Found .vercelignore (repository root)
18:47:25.004 Removed 2243 ignored files defined in .vercelignore
18:47:25.005   /.cursor/commands/src.md
18:47:25.005   /.git/config
18:47:25.005   /.git/description
18:47:25.005   /.git/FETCH_HEAD
18:47:25.005   /.git/HEAD
18:47:25.005   /.git/hooks/applypatch-msg.sample
18:47:25.005   /.git/hooks/commit-msg.sample
18:47:25.005   /.git/hooks/fsmonitor-watchman.sample
18:47:25.005   /.git/hooks/post-update.sample
18:47:25.005   /.git/hooks/pre-applypatch.sample
18:47:25.039 Restored build cache from previous deployment (GhL7cA25QhNnwVbRjQHDvueMi9am)
18:47:25.269 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
18:47:25.269 Running "vercel build"
18:47:25.693 Vercel CLI 50.15.1
18:47:25.950 Warning: Due to "engines": { "node": "20.x" } in your `package.json` file, the Node.js Version defined in your Project Settings ("24.x") will not apply, Node.js Version "20.x" will be used instead. Learn More: https://vercel.link/node-version
18:47:25.965 Installing dependencies...
18:47:27.834 
18:47:27.835 > multi-chat@0.1.0 prepare
18:47:27.835 > husky install
18:47:27.835 
18:47:27.878 husky - install command is DEPRECATED
18:47:27.885 .git can't be found
18:47:27.886 up to date in 2s
18:47:27.886 
18:47:27.886 211 packages are looking for funding
18:47:27.886   run `npm fund` for details
18:47:27.893 Detected Next.js version: 14.2.33
18:47:27.898 Running "npm run build"
18:47:28.001 
18:47:28.001 > multi-chat@0.1.0 build
18:47:28.002 > next build
18:47:28.002 
18:47:28.563   ▲ Next.js 14.2.33
18:47:28.564 
18:47:28.631    Creating an optimized production build ...
18:47:35.915 Failed to compile.
18:47:35.916 
18:47:35.916 ./app/api/inngest/route.ts
18:47:35.916 Module not found: Can't resolve 'inngest/next'
18:47:35.916 
18:47:35.916 https://nextjs.org/docs/messages/module-not-found
18:47:35.916 
18:47:35.916 ./inngest/client.ts
18:47:35.916 Module not found: Can't resolve 'inngest'
18:47:35.916 
18:47:35.916 https://nextjs.org/docs/messages/module-not-found
18:47:35.916 
18:47:35.916 Import trace for requested module:
18:47:35.917 ./app/api/rag/documents/[id]/upload/route.ts
18:47:35.917 
18:47:35.917 
18:47:35.917 > Build failed because of webpack errors
18:47:36.008 Error: Command "npm run build" exited with 1