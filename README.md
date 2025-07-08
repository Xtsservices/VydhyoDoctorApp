This is a new [React Native](https://reactnative.dev) project, bootstrapped using [@react-native-community/cli](https://github.com/react-native-community/cli).

# Getting Started

<!-- Reference video how to set up -->

https://youtu.be/kOoGj5LfSvY?si=fKDlEeUJ6n7LrHGP
npx @react-native-community/cli@latest init AwesomeProject

<!-- the below is current project but the abive one is foloow -->

npx react-native init Vitalz

> Note: Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions till "Creating a new application" step, before proceeding.

## Step 1: Start the Metro Server

First, you will need to start Metro, the JavaScript bundler that ships with React Native.

To start Metro, run the following command from the root of your React Native project:

bash
# using npm
npx react-native run-android

npm start

# OR using Yarn
yarn start


## Step 2: Start your Application

Let Metro Bundler run in its own terminal. Open a new terminal from the root of your React Native project. Run the following command to start your Android or iOS app:

### For Android

bash
# using npm
npm run android

# OR using Yarn
yarn android


### For iOS

bash
# using npm
npm run ios

# OR using Yarn
yarn ios


If everything is set up correctly, you should see your new app running in your Android Emulator or iOS Simulator shortly provided you have set up your emulator/simulator correctly.

This is one way to run your app — you can also run it directly from within Android Studio and Xcode respectively.

## Step 3: Modifying your App

Now that you have successfully run the app, let's modify it.

1. Open App.tsx in your text editor of choice and edit some lines.
2. For Android: Press the <kbd>R</kbd> key twice or select *"Reload" from the *Developer Menu (<kbd>Ctrl</kbd> + <kbd>M</kbd> (on Window and Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (on macOS)) to see your changes!

   For iOS: Hit <kbd>Cmd ⌘</kbd> + <kbd>R</kbd> in your iOS Simulator to reload the app and see your changes!

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [Introduction to React Native](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you can't get this to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an overview of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a guided tour of the React Native basics.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native Blog posts.
- [@facebook/react-native](https://github.com/facebook/react-native) - the Open Source; GitHub repository for React Native.

<!-- deleted apk recovery cmd start-->

cd android

./gradlew uninstallAll

incase any error run below
./gradlew clean

<!-- deleted apk recovery cmd end-->

<!-- how to check the pakages are outdated -->

npm outdated

<!-- how to to update the uptdate one -->

npm update

<!-- ====================for icons============== -->

<!-- Manually Create the Fonts Directory -->
<!-- Create the following directories within your android/app/src/main directory: -->

mkdir -p android/app/src/main/assets/fonts
cp node_modules/react-native-vector-icons/Fonts/\* android/app/src/main/assets/fonts/

<!-- In android/app/build.gradle, verify that the following line is included in the dependencies block: -->

dependencies {
implementation project(':react-native-vector-icons')
// Other dependencies...
}

<!-- Update settings.gradle -->

include ':react-native-vector-icons'
project(':react-native-vector-icons').projectDir = new File(rootProject.projectDir, '../node_modules/react-native-vector-icons/android')

<!-- ===================want to run locl backend=========================== -->

ipconfig

IPv4 Address. . . . . . . . . . . :  192.168.29.107
const BASE_URL = 'http://  192.168.29.107:3000/api/v1'

<!-- ==================how to kill terminal======================= -->

netstat -ano | findstr :8081
taskkill /PID 13824 /F

<!-- ==reset cachee run=================== -->

npx react-native start --reset-cache

<!-- ==============how to reduce apk file size============== -->

directory==> android/app/build.gradle

def enableSeperateBuildPerCPUArchitecture = true // Ensure APKs are split per architecture
def enableProguardInReleaseBuilds = true
def enableHermes = true // Enable Hermes if you haven't already

use apk = app-arm64-v8a-release

<!-- ==================apk build  commads======================= -->
<!-- https://reactnative.dev/docs/signed-apk-android ===========> reference doc -->
<!-- npx react-native doctor ==========> this cmd not mandatory incase build failed use this cmd u can under somewhat -->

Step0:===> npx react-native doctor
Step1: In generating the release AAB( above the link) run this below cmds

Step 1.1:===> npx react-native build-android --mode=release
Step 1.2:===> cd .\android/
Step 1.3: ./gradlew assembleRelease

Step2: finally open this below path in ur code

android\app\build\outputs\apk\release app-release.apk  
open reveal in file explorer and u find that apk.

<!-- ===clear cache---------- -->

npx react-native start --reset-cache

<!-- ==ex storsage data===== -->

[
{
"time": "2024-10-24 12:15:00",
"temperature": 29.5
}
]

Approximately 18,725 records would fit into 1 MB of storage.

<!-- this cmd for deployemnt link apk use -->

android/app/src/main/AndroidManifest.xml
<application
...
android:usesCleartextTraffic="true"

   </application>

<!-- ====how to add logo for apk with name====== -->

directory
step:1 open this ===> https://www.appicon.co/ ==========> open this in browser
step:2 drag and drop image in tha above link
step:3 download that and open select last 4 files copy
step:4 ope the below path in filemanger and replace that
android/app/src/main/res/ ========> mdpi,xhdpi,xxhdpi.xxxhdpi this files replace with latest one with downloaded files
step5: android/app/src/main/res/values/strings.xml ===> keep app name

import AnimatedLoader from "react-native-animated-loader";