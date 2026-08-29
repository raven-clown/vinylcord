// electron-builder's own icon-embedding step needs a bundled tool
// (winCodeSign) that fails to extract without Windows Developer Mode
// or admin rights. We skip that step (win.signAndEditExecutable:
// false) and set the icon ourselves here instead, with the standalone
// `rcedit` package, which needs neither.
const path = require('path');
// rcedit is an ESM-only package exporting a named `rcedit` function.
const { rcedit } = require('rcedit');

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  await rcedit(exePath, {
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
  });
  console.log('[afterPack] set icon on', exePath);
};
