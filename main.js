// Окно Windows-приложения. Показывает игру из папки www так же, как браузер на localhost.
const { app, BrowserWindow, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

// Своя «безопасная» схема app:// — на ней работают камера, fetch и localStorage.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

app.whenReady().then(() => {
  const www = path.join(__dirname, 'www');
  protocol.handle('app', request => {
    const relative = decodeURIComponent(new URL(request.url).pathname);
    const file = path.normalize(path.join(www, relative === '/' ? 'index.html' : relative));
    if (!file.startsWith(www)) return new Response('Нет доступа', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  // Разрешаем игре только камеру.
  const session = require('electron').session.defaultSession;
  session.setPermissionRequestHandler((_, permission, callback, details) => {
    callback(permission === 'media' && (details.mediaTypes || []).every(type => type === 'video'));
  });
  const win = new BrowserWindow({ width: 1100, height: 800, autoHideMenuBar: true, title: 'Камень, ножницы, бумага' });
  win.loadURL('app://game/index.html');
});

app.on('window-all-closed', () => app.quit());
