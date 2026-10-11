const { CognitoJwtVerifier } = require("aws-jwt-verify");
const jwt = require("jsonwebtoken");
const DEMO_USERS = Object.freeze({
  student: {
    sub: "demo-student",
    email: "student@example.test",
    role: "student",
  },
  mentor: { sub: "demo-mentor", email: "mentor@example.test", role: "mentor" },
  other: { sub: "demo-other", email: "other@example.test", role: "student" },
  otherMentor: {
    sub: "demo-other-mentor",
    email: "other-mentor@example.test",
    role: "mentor",
  },
});
function createAuth(env = process.env) {
  const mode = env.AUTH_MODE || "cognito";
  if (mode === "demo") {
    if (
      env.NODE_ENV === "production" ||
      !["127.0.0.1", "localhost", "::1"].includes(env.HOST || "127.0.0.1")
    ) {
      throw new Error(
        "Demo authentication requires a non-production, loopback-only server",
      );
    }
    if (!env.DEMO_SECRET || env.DEMO_SECRET.length < 32)
      throw new Error("DEMO_SECRET must have at least 32 characters");
    return {
      mode,
      issue(account) {
        const user = DEMO_USERS[account];
        if (!user) throw new Error("Unknown demo account");
        return jwt.sign(user, env.DEMO_SECRET, {
          algorithm: "HS256",
          expiresIn: "1h",
          issuer: "momentum-local",
          audience: "momentum-local",
        });
      },
      async verify(token) {
        const payload = jwt.verify(token, env.DEMO_SECRET, {
          algorithms: ["HS256"],
          issuer: "momentum-local",
          audience: "momentum-local",
        });
        const user = Object.values(DEMO_USERS).find(
          (u) => u.sub === payload.sub,
        );
        if (!user) throw new Error("Unknown account");
        return user;
      },
    };
  }
  if (mode !== "cognito") throw new Error("Unsupported AUTH_MODE");
  if (!env.COGNITO_USER_POOL_ID || !env.COGNITO_CLIENT_ID)
    throw new Error("Cognito configuration is required");
  const verifier = CognitoJwtVerifier.create({
    userPoolId: env.COGNITO_USER_POOL_ID,
    tokenUse: "id",
    clientId: env.COGNITO_CLIENT_ID,
  });
  return {
    mode,
    verifier,
    async verify(token) {
      const payload = await verifier.verify(token);
      if (payload.email_verified !== true || typeof payload.email !== "string")
        throw new Error("Verified email required");
      const role = (payload["cognito:groups"] || []).includes(
        env.COGNITO_MENTOR_GROUP || "mentors",
      )
        ? "mentor"
        : "student";
      return { sub: payload.sub, email: payload.email.toLowerCase(), role };
    },
  };
}
module.exports = { createAuth, DEMO_USERS };
