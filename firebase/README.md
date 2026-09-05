# Firebase environments

`pnpm emu` explicitly uses `firebase.emulators.json`. The permissive
`firestore.rules` file is only for local emulators. Predeploy hooks reject
attempts to deploy that emulator configuration.

`firebase.json` configures **Storage only**. It deliberately does not deploy
Firestore rules: the live Firestore rules have not been retrieved or audited.
Export/review those rules before adding them to this deployment configuration;
do not substitute the permissive emulator file.

Storage rules isolate new animal photos by uploader UID. Existing animal photos
use the animal's farm and its owner/member IDs for access. Download URLs already
stored in records remain bearer links; possession of a link grants access until
its token is revoked. These changes do not revoke existing download tokens.

Storage cross-service lookups require enabling the Storage-to-Firestore service
permission when deploying for the first time. See the official documentation:
https://firebase.google.com/docs/storage/security/rules-conditions#enhance_with_firestore

No production deployment is performed by the tests or by `pnpm emu`.

## Regression checks

Run `pnpm test:security` from the repository root. It starts isolated Firestore
and Storage emulators for `demo-granja-security`, checks authorized/unauthorized
reads and writes, upload immutability and atomic request limits, then shuts down.
It does not import or export the development dataset. Java must be installed.
