// Сборка APK для Android: npm run apk
// Проверяет файлы игры, находит Java 21 и Android SDK, собирает dist/kamen-nozhnicy-bumaga.apk.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = __dirname;
const windows = process.platform === 'win32';

function stop(message) {
  console.error(`\nОШИБКА: ${message}\n`);
  process.exit(1);
}
function run(command, cwd = root) {
  console.log(`\n> ${command}`);
  try {
    execSync(command, { cwd, stdio: 'inherit', env: process.env });
  } catch (_) {
    stop('Команда выше не выполнилась. Причина — в сообщениях над этой строкой.');
  }
}

// 1. Файлы игры
for (const file of ['www/index.html', 'www/lib/tf.min.js', 'www/lib/teachablemachine-image.min.js', 'www/model/model.json', 'www/model/metadata.json']) {
  if (!fs.existsSync(path.join(root, file))) stop(`Нет файла ${file}. Скопируйте игру из прошлого урока в папку www.`);
}

// 2. Java 21: её требует сборщик Capacitor. Java внутри Android Studio новее и не подходит.
const javaHomes = windows
  ? ['Eclipse Adoptium', 'Microsoft', 'Java', 'Zulu'].map(vendor => path.join('C:\\Program Files', vendor))
  : ['/Library/Java/JavaVirtualMachines'];
const jdk21 = javaHomes
  .filter(dir => fs.existsSync(dir))
  .flatMap(dir => fs.readdirSync(dir).filter(name => /^(jdk-?)?21([.\-_]|$)|^temurin-21/.test(name)).map(name => path.join(dir, name)))
  .map(dir => (fs.existsSync(path.join(dir, 'Contents', 'Home')) ? path.join(dir, 'Contents', 'Home') : dir))
  .find(dir => fs.existsSync(path.join(dir, 'bin', windows ? 'java.exe' : 'java')));
if (!jdk21) stop('Не найдена Java 21 (JDK 21). Установите Temurin JDK 21 с adoptium.net и запустите команду снова.');
process.env.JAVA_HOME = jdk21;
console.log(`Java: ${jdk21}`);

// 3. Android SDK, который Android Studio скачивает при первом запуске
const sdkPlaces = windows
  ? [process.env.ANDROID_HOME, path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'), 'C:\\Android\\Sdk']
  : [process.env.ANDROID_HOME, path.join(process.env.HOME || '', 'Library', 'Android', 'sdk')];
const sdk = sdkPlaces.find(place => place && fs.existsSync(path.join(place, 'platform-tools')));
if (!sdk) stop('Не найден Android SDK. Запустите Android Studio и пройдите первый запуск до конца.');
process.env.ANDROID_HOME = sdk;

// Gradle не любит русские буквы и пробелы в пути: при таком имени пользователя кладём его кэш в C:\gradle
if (windows && !process.env.GRADLE_USER_HOME && /[^\x21-\x7e\\:]/.test(require('os').homedir())) process.env.GRADLE_USER_HOME = 'C:\\gradle';
if (/[^\x21-\x7e\\:/]/.test(root)) stop(`В пути к проекту есть русские буквы или пробелы: ${root}. Перенесите папку в C:\\rps-app.`);

// 4. Android-проект (создаётся один раз)
if (!fs.existsSync(path.join(root, 'android'))) run('npx cap add android');

// 5. Разрешение на камеру
const manifest = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
let xml = fs.readFileSync(manifest, 'utf8');
if (!xml.includes('android.permission.CAMERA')) {
  xml = xml.replace('</manifest>', '    <uses-permission android:name="android.permission.CAMERA" />\n</manifest>');
  fs.writeFileSync(manifest, xml);
}

// 6. Копируем свежую игру и собираем
run('npx cap sync android');
const android = path.join(root, 'android');
run(`"${path.join(android, windows ? 'gradlew.bat' : 'gradlew')}" assembleDebug`, android);

const apk = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const result = path.join(root, 'dist', 'kamen-nozhnicy-bumaga.apk');
fs.copyFileSync(apk, result);
console.log(`\nГОТОВО: ${result}\n`);
