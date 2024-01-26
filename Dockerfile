FROM php:8.3-cli AS base

COPY ./src /opt/dropbox-uploader

WORKDIR /opt/dropbox-uploader

FROM base AS local

RUN apt update && apt install zip unzip

COPY --from=composer:latest /usr/bin/composer /usr/local/bin/composer

FROM local as dependencies

COPY ./src /opt/dropbox-uploader

RUN composer install --no-scripts --ignore-platform-reqs --no-ansi --no-interaction --optimize-autoloader

FROM base AS production

COPY ./src /opt/dropbox-uploader

COPY --from=dependencies /opt/dropbox-uploader/vendor /opt/dropbox-uploader/vendor

ENTRYPOINT ["php", "/opt/dropbox-uploader/cli.php"]

CMD ["upload"]
