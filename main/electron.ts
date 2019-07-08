import * as path from 'path';
import * as url from 'url';

/**
 * Electron event dispatcher
 */

const { BrowserWindow, app, dialog, ipcMain } = require('electron');
const { download } = require('electron-dl');

const isDev = process.env['DEV_MODE'] === '1';

// event dispatcher

let theDownloadItem = null;
let theWindow = null;

app.on('ready', () => {
  theWindow = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      scrollBounce: true,
      webSecurity: !isDev
    }  
  });
  if (isDev) {
    require('devtron').install();
    const { default: installExtension } = require('electron-devtools-installer');
    // https://chrome.google.com/webstore/detail/redux-devtools/
    //   lmhkpmbekcpmknklioeibfkpmmfibljd
    installExtension('lmhkpmbekcpmknklioeibfkpmmfibljd')
      .then((name) => console.log(`Added Extension:  ${name}`))
      .catch((err) => console.log('An error occurred: ', err));
    // https://chrome.google.com/webstore/detail/local-storage-explorer/
    //   hglfomidogadbhelcfomenpieffpfaeb?hl=en
    installExtension('hglfomidogadbhelcfomenpieffpfaeb')
      .then((name) => console.log(`Added Extension:  ${name}`))
      .catch((err) => console.log('An error occurred: ', err));
    theWindow.loadURL(url.format({
      hostname: 'localhost',
      pathname: path.join(),
      port: 4200,
      protocol: 'http:',
      query: {isDev: true},
      slashes: true
    }));
    theWindow.webContents.openDevTools();
  }
  else {
    theWindow.loadURL(url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }
  theWindow.setMenu(null);
  const sendBounds = () =>
    theWindow.webContents.send('bounds', theWindow.getBounds());
  theWindow.on('move', sendBounds);
  theWindow.on('resize', sendBounds);
});

ipcMain.on('cancel', () => {
  if (theDownloadItem)
    theDownloadItem.cancel();
});

ipcMain.on('s3download', (event, url) => {
  let progress = 0;
  download(theWindow, url, {
    onCancel: (dl) => {
      theWindow.webContents.send('progress', 100);
      theDownloadItem = null;
    },
    onProgress: (scale) => {
      // NOTE: minimize noise by sending only a max of 100 events
      const percent = Math.round(scale * 100);
      if (percent >= progress) {
        theWindow.webContents.send('progress', percent);
        progress = percent;
      }
    },
    onStarted: (dl) => theDownloadItem = dl,
    openFolderWhenDone: true
  }).then(() => theDownloadItem = null)
    .catch((err) => console.log('An error occurred: ', err));
});

ipcMain.on('s3upload', (event, base) => {
  dialog.showOpenDialog(theWindow, {
    title: 'Select File to Upload'
  }, source => {
    if (source) 
      theWindow.webContents.send('s3upload', base, source[0]);
  });
});
