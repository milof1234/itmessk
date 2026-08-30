# Деплой «Эфира» на GitHub Pages

## Почему раньше была пустая страница

Сайт на GitHub Pages открывается по адресу `https://ваш-ник.github.io/название-репо/`,
а обычный build ссылается на файлы от корня (`/assets/...`) — они не находятся, и страница белая.
Встроенный workflow собирает проект с флагом `--base=./` (относительные пути) и публикует сам.

## Включение (один раз, ~1 минута)

1. Запушьте **весь проект** в репозиторий на GitHub (вместе с папкой `.github`).
2. В репозитории: **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Откройте вкладку **Actions** — workflow «Deploy to GitHub Pages» запустится сам.
   Дождитесь зелёной галочки (1–2 минуты).
4. Сайт: `https://ваш-ник.github.io/название-репо/`

Каждый следующий `git push` в main/master автоматически пересобирает и обновляет сайт.
Запустить вручную: вкладка Actions → Deploy to GitHub Pages → Run workflow.

## Firebase

- Конфиг проекта `pulsik-d2ff9` уже зашит в приложение — работает сразу.
- Если в правилах Firestore/Storage стоит тестовый режим (`allow read, write: if true`),
  ничего больше настраивать не нужно.
- Если включите проверку `request.auth != null`, добавьте домен
  `ваш-ник.github.io` в Firebase Console → Authentication → Settings → Authorized domains.
