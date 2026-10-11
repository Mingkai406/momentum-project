import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from "amazon-cognito-identity-js";
function pool() {
  const UserPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const ClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  if (!UserPoolId || !ClientId) throw new Error("Cognito is not configured");
  return new CognitoUserPool({
    UserPoolId,
    ClientId,
    Storage: window.sessionStorage,
  });
}
export async function getToken(): Promise<string | null> {
  const demo = sessionStorage.getItem("momentum-demo");
  if (demo) return demo;
  if (!process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID) return null;
  const user = pool().getCurrentUser();
  if (!user) return null;
  return new Promise((resolve, reject) =>
    user.getSession((error: Error | null, session: CognitoUserSession) => {
      if (error) {
        user.signOut();
        resolve(null);
        return;
      }
      if (!session?.isValid()) {
        reject(new Error("Please sign in again"));
        return;
      }
      resolve(session.getIdToken().getJwtToken());
    }),
  );
}
export async function signIn(email: string, password: string): Promise<void> {
  const user = new CognitoUser({
    Username: email,
    Pool: pool(),
    Storage: window.sessionStorage,
  });
  return new Promise((resolve, reject) =>
    user.authenticateUser(
      new AuthenticationDetails({ Username: email, Password: password }),
      {
        onSuccess: () => {
          sessionStorage.removeItem("momentum-demo");
          resolve();
        },
        onFailure: reject,
        newPasswordRequired: () =>
          reject(
            new Error(
              "Complete the password reset with your administrator before signing in.",
            ),
          ),
      },
    ),
  );
}
export async function signUp(email: string, password: string): Promise<void> {
  return new Promise((resolve, reject) =>
    pool().signUp(
      email,
      password,
      [new CognitoUserAttribute({ Name: "email", Value: email })],
      [],
      (error) => (error ? reject(error) : resolve()),
    ),
  );
}
export async function confirm(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) =>
    new CognitoUser({
      Username: email,
      Pool: pool(),
      Storage: window.sessionStorage,
    }).confirmRegistration(code, true, (error) =>
      error ? reject(error) : resolve(),
    ),
  );
}
export function signOut() {
  sessionStorage.removeItem("momentum-demo");
  if (process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID)
    pool().getCurrentUser()?.signOut();
  window.location.assign(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/login/`);
}
