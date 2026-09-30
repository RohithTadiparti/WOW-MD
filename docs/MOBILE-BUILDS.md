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

## Notes

- `ios/` and `android/` are git-ignored on purpose: EAS generates them on each
  build from `app.json` and the config plugins. Do not commit them, or EAS will
  use the committed copies and ignore config changes.
- EAS uploads the whole repository, which the app needs: it reads a few
  modules from `frontend/src` (see `mobile/metro.config.js`).
