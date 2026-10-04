# CLASS-APP Android app

An Android app (Capacitor 8) for CLASS-APP. It opens the live app at
`https://class-app-1.onrender.com` inside a native shell. Anything pushed to the
website (new pages, games, fixes) shows up in the app automatically, with no new APK.

| Detail | Value |
|---|---|
| App name | My School Portfolio |
| Package id | `com.plummz.classapp` |
| Version | 1.0 (versionCode 1) |
| Android | 7.0+ (minSdk 24), targets Android 16 (SDK 36) |
| Signed with | Debug key of this PC (`%USERPROFILE%\.android\debug.keystore`) |
| Built APK | `release/CLASS-APP.apk` (checksum in `release/CLASS-APP.apk.sha256`) |
| Shared copy | Google Drive → My Drive → `ANDROID APPS` → `CLASS-APP.apk` ([link](https://drive.google.com/file/d/1kGbmX0cip2kOptTg2UOQF2Y8J1V83aj6/view)) |

## Install on a phone

Open `CLASS-APP.apk` from Drive on the phone, allow **Install unknown apps** for Drive or
your browser when asked, then tap **Install**.

## What is in this folder

- `capacitor.config.json`: app id, name, and the live site URL the app opens
- `www/`: fallback files packed into the APK; `offline.html` shows when there's no internet
- `android/`: the Android Studio project (open this folder in Android Studio)
  - `app/src/main/java/com/plummz/classapp/MainActivity.java`: sends file downloads to the phone's browser
- `make-icons.ps1`: rebuilds the launcher icons and splash screens from `../icons/icon-512.png`
- `release/`: the latest built APK (ignored by git; the shared copy lives in Drive)

## Rebuild the APK

Only needed for native changes (name, icon, URL, Android code). Website changes don't need a rebuild.

```bash
cd native-app
npm install                      # first time only
npx cap sync android
cd android
JAVA_HOME="D:/Android/jdk-21" ./gradlew.bat assembleDebug     # Git Bash
# PowerShell: $env:JAVA_HOME="D:\Android\jdk-21"; .\gradlew.bat assembleDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`. Copy it to
`release/CLASS-APP.apk` and over `G:\My Drive\ANDROID APPS\CLASS-APP.apk` (Google Drive for
desktop). Overwriting it there keeps the same Drive link. Bump `versionCode` and `versionName`
in `android/app/build.gradle` first, so phones accept it as an update.

Keep building on this PC, or back up `%USERPROFILE%\.android\debug.keystore`. Android only
installs an update signed with the same key as the installed app. A Play Store release needs
a proper release keystore (Android Studio → Build → Generate Signed App Bundle).

## Known limits

- Needs internet; the app content comes from Render.
- Web push notifications (the alarm push feature) don't work inside an Android WebView.
  The rest of the app works the same as in a browser.
- The dungeon's **Full screen** button may open the game in the phone's browser if the
  WebView refuses fullscreen. Rotating the phone to landscape works either way.
