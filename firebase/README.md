# Firebase environments

`pnpm emu` explicitly uses `firebase.emulators.json`. The permissive
`firestore.rules` file is only for local emulators. Predeploy hooks reject
attempts to deploy that emulator configuration.

`firebase.json` deploys Storage, Firestore indexes and the separate
`firestore.production.rules`. Never substitute the permissive emulator file.

Production audit (2026-11-12): the retrieved Firestore rules allowed anonymous
reads/writes to all documents. The production rules now require authentication,
preserving existing signed-in client behavior as immediate containment. **This
is not tenant isolation**: signed-in clients still have broad access. Farm/module
authorization and protection of server-owned collections require a separate,
tested migration before this policy can be considered fully hardened.

The previous Storage release contained rules for the wrong service
(`cloud.firestore`). The tested Storage rules in this repository replace it.
The index manifest incorporates all 16 existing production composite indexes;
do not remove remote indexes accidentally when adding new ones.

Deploy explicitly from the repository root:

```sh
pnpm test:security
pnpm exec firebase deploy --config firebase/firebase.json --project mi-granja-app --only storage,firestore:rules,firestore:indexes --non-interactive
```

App releases are separate Vercel deployments. Firebase deployment does not
publish the dashboard or landing.

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
