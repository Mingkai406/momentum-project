import { spawnSync } from "node:child_process";
const result = spawnSync("npm", ["run", "build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_PLAYGROUND: "true",
    NEXT_PUBLIC_BASE_PATH: "/momentum-project",
  },
});
process.exit(result.status ?? 1);
