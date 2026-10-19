#!/bin/sh
# Backup diario de la base y de los archivos subidos (videos, materiales, imágenes).
# Programalo con cron en el servidor, por ejemplo a las 4 AM:
#   0 4 * * * cd /ruta/al/proyecto && sh deploy/backup.sh >> backups/backup.log 2>&1
# Guardá una copia fuera del servidor (S3, Backblaze, Google Drive con rclone, etc.).
set -e
DEST=${BACKUP_DIR:-./backups}
STAMP=$(date +%Y-%m-%d_%H%M)
mkdir -p "$DEST"
docker compose --env-file .env.production exec -T db pg_dump -U tuki -d tuki --format=custom > "$DEST/db_$STAMP.dump"
docker compose --env-file .env.production run --rm -v "$(pwd)/$DEST:/backup" --entrypoint sh app -c "tar czf /backup/storage_$STAMP.tar.gz -C /app storage"
# conserva los últimos 14 backups
ls -1t "$DEST"/db_*.dump 2>/dev/null | tail -n +15 | xargs -r rm --
ls -1t "$DEST"/storage_*.tar.gz 2>/dev/null | tail -n +15 | xargs -r rm --
echo "Backup listo: $STAMP"
