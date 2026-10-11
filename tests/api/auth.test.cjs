const { test } = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { generateKeyPairSync } = require("node:crypto");
const { createAuth } = require("../../apps/api/auth");
const env = {
  AUTH_MODE: "demo",
  DEMO_SECRET: "long-test-secret-for-local-signing-only",
};
test("demo mode fails closed in production or on public interfaces", () => {
  assert.throws(() => createAuth({ ...env, NODE_ENV: "production" }));
  assert.throws(() => createAuth({ ...env, HOST: "0.0.0.0" }));
  assert.throws(() => createAuth({ ...env, DEMO_SECRET: "short" }));
  assert.throws(() => createAuth({ AUTH_MODE: "unknown" }));
  assert.throws(() => createAuth({}));
});
test("demo tokens verify signature, expiry, issuer and audience", async () => {
  const auth = createAuth(env);
  assert.equal((await auth.verify(auth.issue("student"))).role, "student");
  for (const options of [
    { expiresIn: -1, issuer: "momentum-local", audience: "momentum-local" },
    { expiresIn: 60, issuer: "wrong", audience: "momentum-local" },
    { expiresIn: 60, issuer: "momentum-local", audience: "wrong" },
  ]) {
    await assert.rejects(
      auth.verify(jwt.sign({ sub: "demo-student" }, env.DEMO_SECRET, options)),
    );
  }
  await assert.rejects(
    auth.verify(jwt.sign({ sub: "demo-student" }, "another-signing-secret")),
  );
});
test("Cognito verifier checks real RSA signatures, issuer, client, token type and email verification", async () => {
  const config = {
    COGNITO_USER_POOL_ID: "us-east-1_TestPool",
    COGNITO_CLIENT_ID: "test-client",
  };
  const auth = createAuth(config);
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwk = publicKey.export({ format: "jwk" });
  jwk.kid = "test-key";
  jwk.use = "sig";
  jwk.alg = "RS256";
  auth.verifier.cacheJwks({ keys: [jwk] });
  const claims = {
    sub: "user-1",
    email: "mentor@example.test",
    email_verified: true,
    token_use: "id",
    "cognito:groups": ["mentors"],
  };
  const options = {
    algorithm: "RS256",
    keyid: "test-key",
    expiresIn: 60,
    issuer: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_TestPool",
    audience: "test-client",
  };
  const sign = (extra = {}, opts = {}) =>
    jwt.sign({ ...claims, ...extra }, privateKey, { ...options, ...opts });
  assert.equal((await auth.verify(sign())).role, "mentor");
  assert.equal(
    (await auth.verify(sign({ "cognito:groups": [] }))).role,
    "student",
  );
  for (const token of [
    sign({ email_verified: false }),
    sign({ token_use: "access" }),
    sign({}, { audience: "wrong" }),
    sign({}, { issuer: "https://wrong" }),
    sign({}, { expiresIn: -1 }),
  ])
    await assert.rejects(auth.verify(token));
  const badKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
  await assert.rejects(auth.verify(jwt.sign(claims, badKey, options)));
});
