/**
 * @type {import("electron-builder").Configuration}
 */
export default {
  appId: "com.wnote.app",
  productName: "WNote",
  directories: {
    output: "release/${version}",
  },
  icon: "resources/icon.png",
  files: [
    "packages/main/dist/**",
    "packages/preload/dist/**",
    "packages/renderer/dist/**",
    "package.json",
  ],
  extraMetadata: {
    main: "packages/main/dist/index.js",
  },
  mac: {
    target: [
      { target: "dmg", arch: ["arm64"] },
      { target: "zip", arch: ["arm64"] },
    ],
    category: "public.app-category.productivity",
    artifactName: "${productName}-${version}-mac-${arch}.${ext}",
  },
  win: {
    target: [
      { target: "nsis", arch: ["x64"] },
      { target: "zip", arch: ["x64"] },
    ],
    artifactName: "${productName}-${version}-win-${arch}.${ext}",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    shortcutName: "WNote",
  },
  linux: {
    target: [
      { target: "AppImage", arch: ["x64"] },
      { target: "deb", arch: ["x64"] },
    ],
    category: "Office",
    artifactName: "${productName}-${version}-linux-${arch}.${ext}",
  },
  asar: true,
  asarUnpack: ["**/node_modules/better-sqlite3/**"],
};
