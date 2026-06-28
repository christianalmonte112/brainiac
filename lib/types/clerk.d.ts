/**
 * Custom Clerk metadata shape for Brainiac.
 *
 * Declaration merging into Clerk's global `UserPublicMetadata` interface so
 * `auth().sessionClaims?.publicMetadata` and `user.publicMetadata` are typed
 * everywhere instead of falling back to `unknown`.
 *
 * NOTE: `sessionClaims.publicMetadata` is only populated if a custom claim
 * is configured in the Clerk Dashboard under Sessions > Customize session
 * token, e.g. `{ "publicMetadata": "{{user.public_metadata}}" }`. Without
 * that claim, middleware reads of publicMetadata will be undefined even
 * though the value exists on the User object itself.
 */
declare global {
  interface UserPublicMetadata {
    onboardingComplete?: boolean;
  }

  /** Types `auth().sessionClaims` — see the NOTE above for the Dashboard caveat. */
  interface CustomJwtSessionClaims {
    publicMetadata?: {
      onboardingComplete?: boolean;
    };
  }
}

export {};
