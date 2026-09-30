# Mobile builds

The app uses `react-native-webrtc`, so it cannot run in Expo Go: every test
build is a real native build. Every profile below points the app at the test
API (`https://test.worldofweddingz.com/api`); change `EXPO_PUBLIC_API_URL` in
`mobile/eas.json` when a production API exists.

## iOS (EAS Build)

iOS builds run on Expo's macOS machines, so no Mac is needed. They need:

- an Expo account (free), and
- an Apple Developer Program membership (paid) for anything that installs on a
  real iPhone. The simulator profile needs neither Apple account nor device.

One-time setup, from `mobile/`:

```bash
npx eas-cli login
npx eas-cli init          # links the project; writes owner + projectId into app.json
```

Commit the `app.json` change `eas init` makes.

### Profiles (`mobile/eas.json`)

| Profile | What it makes | Who can install it |
|---|---|---|
| `preview` | Ad hoc `.ipa` (iOS), `.apk` (Android) | iPhones registered on the Apple account |
| `simulator` | `.app` for the iOS Simulator | Anybody with a Mac and Xcode |
| `production` | App Store build, build number auto-incremented | TestFlight, then the App Store |

### Testing on an iPhone (ad hoc)

```bash
npx eas-cli device:create     # gives a link/QR to open on each test iPhone
npm run build:ios:preview
```

EAS creates the certificate and provisioning profile on the first run (sign in
with the Apple ID when asked) and prints an install link. A phone registered
after the build needs a new build. iOS 16+ also asks the tester to turn on
Settings → Privacy & Security → Developer Mode.

### TestFlight

```bash
npm run build:ios:production
npm run submit:ios
```

The first submit asks for the App Store Connect app to be created (bundle id
`com.worldofweddings.app`). `ios.config.usesNonExemptEncryption` is `false` in
`app.json` — the app only uses standard HTTPS — so uploads are not held for the
export-compliance question. Revisit that if the app ever adds its own
encryption.

## Android

`npx eas-cli build --platform android --profile preview` produces an `.apk`
the same way. Local Docker builds (no Expo account) are also possible with the
`reactnativecommunity/react-native-android` image: copy `mobile/` and
`frontend/` side by side, then `npm ci`, `npx expo prebuild --platform android
--no-install`, and `./gradlew assembleRelease` in `android/` with
`EXPO_PUBLIC_API_URL` set. Test APKs are served to testers from
`docker/downloads` (see `frontend/nginx.conf`).

## Automated builds (GitHub Actions)

`.github/workflows/mobile-builds.yml` runs every day at 02:30 IST. It builds
only when `main` has changed `mobile/` or `frontend/src/lib/` since its last
successful run; otherwise it stops after a few seconds. To build on demand,
open **Actions → Mobile builds → Run workflow** (tick *force* to build with no
changes, and pick Android, iOS or both).

- **Android**: built on the GitHub runner and published as the release
  `android-latest`, replaced on each build. The download link never changes:
  `https://github.com/RohithTadiparti/WOW-MD/releases/download/android-latest/wow.apk`.
- **iOS**: started on EAS with the `production` profile and `--auto-submit`, so
  it goes to TestFlight when it finishes. Build numbers are kept by EAS, so
  nothing is committed back to the repository.

One-time setup for the iOS half (until it is done the iOS job skips itself and
Android still builds):

1. Create an Expo access token (expo.dev → Account settings → Access tokens)
   and add it to the repository as the secret `EXPO_TOKEN`
   (GitHub → Settings → Secrets and variables → Actions).
2. Create the app in App Store Connect with bundle id `com.worldofweddings.app`.
3. From `mobile/`, run one production build interactively so EAS creates and
   stores the distribution certificate and provisioning profile, and add an
   App Store Connect API key for submissions when it asks:
   ```bash
   npx eas-cli build --platform ios --profile production --auto-submit
   ```
   (`npx eas-cli credentials` sets up the same things without building.)

After that the daily run needs nothing from anybody.

## Notes

- `ios/` and `android/` are git-ignored on purpose: EAS generates them on each
  build from `app.json` and the config plugins. Do not commit them, or EAS will
  use the committed copies and ignore config changes.
- EAS uploads the whole repository, which the app needs: it reads a few
  modules from `frontend/src` (see `mobile/metro.config.js`).
