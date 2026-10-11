const { createPool, migrate } = require("../apps/api/database");
const pool = createPool();
migrate(pool)
  .then(() => console.log("Schema ready"))
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
