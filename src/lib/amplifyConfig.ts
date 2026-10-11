export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'us-east-1_uz1r1r',
      userPoolClientId: 'ponkeiq9o9rf448sl2kjbdo9g',
      signUpVerificationMethod: 'code' as const,
      loginWith: {
        email: true
      }
    }
  }
};
