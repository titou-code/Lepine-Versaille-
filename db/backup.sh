#!/bin/sh
# ------------------------------------------------------------
# Sauvegarde périodique de la base PostgreSQL.
#  - Dump compressé (pg_dump -Fc) toutes les 24 h.
#  - Validation : code retour de pg_dump ET taille du fichier (> 10 Ko).
#  - En cas d'échec : le fichier raté est supprimé, les anciens backups
#    ne sont PAS touchés, l'échec est écrit dans le fichier d'état.
#  - En cas de succès uniquement : rotation (> 30 jours) puis écriture
#    du succès dans le fichier d'état.
#  - Fichier d'état backups/status.json réécrit à chaque cycle.
# ------------------------------------------------------------

BACKUP_DIR=/backups
STATUS_FILE="$BACKUP_DIR/status.json"
MIN_SIZE=10240   # 10 Ko

# État conservé d'un cycle à l'autre
LAST_SUCCESS=null
LAST_ERROR=null
LAST_ERROR_MESSAGE=null

write_status() {
cat > "$STATUS_FILE" <<EOF
{
  "last_success": $LAST_SUCCESS,
  "last_error": $LAST_ERROR,
  "last_error_message": $LAST_ERROR_MESSAGE
}
EOF
}

while true; do
  TS=$(date +%Y%m%d_%H%M%S)
  NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  FILE="$BACKUP_DIR/backup_${TS}.dump"

  if pg_dump -h db -U "$POSTGRES_USER" -Fc archives > "$FILE" 2>/tmp/pgdump_err; then
    SIZE=$(wc -c < "$FILE" 2>/dev/null || echo 0)
    if [ "$SIZE" -gt "$MIN_SIZE" ]; then
      # Succès : rotation puis état
      find "$BACKUP_DIR" -name '*.dump' -mtime +30 -delete
      LAST_SUCCESS="\"$NOW\""
      write_status
      echo "[BACKUP] Succès : $FILE ($SIZE octets)"
    else
      rm -f "$FILE"
      LAST_ERROR="\"$NOW\""
      LAST_ERROR_MESSAGE="\"Fichier de sauvegarde trop petit ($SIZE octets)\""
      write_status
      echo "[BACKUP] Échec : fichier trop petit ($SIZE octets)"
    fi
  else
    ERRMSG=$(tr '\n' ' ' < /tmp/pgdump_err | sed 's/"/'"'"'/g')
    rm -f "$FILE"
    LAST_ERROR="\"$NOW\""
    LAST_ERROR_MESSAGE="\"$ERRMSG\""
    write_status
    echo "[BACKUP] Échec pg_dump : $ERRMSG"
  fi

  sleep 86400
done
