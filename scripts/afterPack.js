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

  const { appInfo } = context.packager;
  const exePath = path.join(context.appOutDir, `${appInfo.productFilename}.exe`);

  await rcedit(exePath, {
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    'version-string': {
      FileDescription: appInfo.description || appInfo.productName,
      ProductName: appInfo.productName,
      CompanyName: appInfo.companyName || appInfo.productName,
      LegalCopyright: appInfo.copyright,
    },
    'file-version': appInfo.version,
    'product-version': appInfo.version,
  });
  console.log('[afterPack] set icon and version info on', exePath);
};
