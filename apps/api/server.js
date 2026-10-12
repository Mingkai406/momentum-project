const { createApp } = require("./app");
const { createAuth } = require("./auth");
const { createPool, migrate } = require("./database");
async function main() {
  const auth = createAuth();
  const pool = createPool();
  if (process.env.RUN_MIGRATIONS === "true") await migrate(pool);
  const app = createApp({
    pool,
    auth,
    followupProvider: require("./followup-provider").createFollowupProvider(),
    origin: process.env.WEB_ORIGIN || "http://localhost:3000",
  });
  const server = app.listen(
    Number(process.env.PORT || 3001),
    process.env.HOST || "127.0.0.1",
    () => console.log("Momentum API ready"),
  );
  const stop = () => server.close(() => pool.end().then(() => process.exit(0)));
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
