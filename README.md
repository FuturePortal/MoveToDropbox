# Move to Dropbox

1) Uploads all files from the mounted folder to dropbox
2) Removes the files after a successful upload

Ideal for back-ups.

Known limitations:

- Breaks when there are folders in your locally mounted folder (this is not supported)

## Create your dropbox app

Creating your own dropbox app is required for this container to work.

- Go to https://www.dropbox.com/developers
- Create a new app
- Make sure your app controls its own folder (not your entire dropbox)
- Make sure your app has read and write access
- Copy the `DROPBOX_APP_KEY` and `DROPBOX_REFRESH_TOKEN`
- Generate a `DROPBOX_REFRESH_TOKEN`:
    - Get your access token from (replace DROPBOX_APP_KEY)
    https://www.dropbox.com/oauth2/authorize?client_id=DROPBOX_APP_KEY&token_access_type=offline&response_type=code
    - ```bash
      curl --location --request POST 'https://api.dropboxapi.com/oauth2/token' \
      --header "Authorization: Basic $BASIC_AUTH" \
      --header 'Content-Type: application/x-www-form-urlencoded' \
      --data-urlencode "code=$ACCESS_CODE_GENERATED" \
      --data-urlencode 'grant_type=authorization_code'
      ```
    - Grab the refresh token from the response.

## Environment variables

- `DROPBOX_APP_KEY`: create your own dropbox app to get this
- `DROPBOX_APP_SECRET`: create your own dropbox app to get this
- `DROPBOX_REFRESH_TOKEN`: See [the secton above](#create-your-dropbox-app)
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
