import { app, BrowserWindow, session, shell, dialog } from 'electron';
import { join } from 'node:path';
import { startLocal } from './server.mjs';
app.setPath(
  'userData',
  process.env.REFIKA_USER_DATA_DIR || join(app.getPath('appData'), 'REFIKA'),
);
let service,
  window,
  quitting = false;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
  app
    .whenReady()
    .then(async () => {
      app.setAppUserModelId('tr.refika.coordinator');
      session.defaultSession.setPermissionRequestHandler(
        (_contents, _permission, callback) => callback(false),
      );
      service = await startLocal({
        dataDir:
          process.env.REFIKA_DATA_DIR ||
          join(app.getPath('userData'), 'workspace'),
        staticDir: join(app.getAppPath(), 'ui'),
      });
      window = new BrowserWindow({
        width: 1380,
        height: 900,
        minWidth: 760,
        minHeight: 600,
        title: 'REFİKA · İl çalışma alanı',
        backgroundColor: '#f5f6fa',
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        },
      });
      window.webContents.on('will-navigate', (event, url) => {
        if (new URL(url).origin !== service.url) event.preventDefault();
      });
      window.webContents.setWindowOpenHandler(({ url }) => {
        try {
          const target = new URL(url);
          if (
            target.protocol === 'https:' &&
            target.hostname === 'school-education.ec.europa.eu'
          )
            void shell.openExternal(target.href);
        } catch {}
        return { action: 'deny' };
      });
      await window.loadURL(service.url);
      if (process.argv.includes('--refika-smoke-test')) {
        console.log('REFIKA_SMOKE_OK');
        app.quit();
      }
    })
    .catch((error) => {
      dialog.showErrorBox('REFİKA açılamadı', error.message);
      app.quit();
    });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', (event) => {
    if (service && !quitting) {
      event.preventDefault();
      quitting = true;
      service.close().finally(() => app.quit());
    }
  });
}
