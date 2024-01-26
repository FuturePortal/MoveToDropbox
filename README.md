# Upload To Dropbox

1) Uploads all files from the mounted folder to dropbox
2) Removes the files after a successful upload

Ideal for back-ups.

Known limitations:

- Breaks when there are folders in your locally mounted folder (this is not supported)

## Environment variables

- `DROPBOX_APP_KEY`: create your own dropbox app to get this
- `DROPBOX_APP_SECRET`: create your own dropbox app to get this
- `DROPBOX_REFRESH_TOKEN`: generate using `<this container> authorize`
- Mount the folder (of which you want to move its files to dropbox) to `/opt/dropbox-uploader/uploads/`

## Running locally

- `./Taskfile`

Create file `./src/.env` with the environment variables above.

## Running with docker

Run the following docker command. In this example we mounted to `./backups` folder.

```bash
docker run \
    --rm \
    --tty \
    --interactive \
    --volume ./backups:/opt/dropbox-uploader/uploads \
    --env DROPBOX_APP_KEY=redacted \
    --env DROPBOX_APP_SECRET=redacted \
    --env DROPBOX_REFRESH_TOKEN=redacted \
    rickvdstaaij/move-to-dropbox:latest
```

## Running with docker compose

Add this to `docker-compose.yml`, and run `docker compose up`. In this example we mounted to `./backups` folder.

```yml
version: '3'

services:
  dropbox:
    image: rickvdstaaij/move-to-dropbox:latest
    container_name: dropbox-backup-upload
    environment:
      - DROPBOX_APP_KEY=redacted
      - DROPBOX_APP_SECRET=redacted
      - DROPBOX_REFRESH_TOKEN=redacted
    volumes:
      - ./backups:/opt/dropbox-uploader/uploads
```
