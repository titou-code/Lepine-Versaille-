#!/bin/sh
# ------------------------------------------------------------
# Sauvegarde périodique de la base PostgreSQL.
#  - Dump compressé (pg_dump -Fc) toutes les 24 h.
#  - Validation : code retour de pg_dump ET taille du fichier (> 10 Ko).
#  - En cas d'échec : le fichier raté est supprimé, les anciens backups
#    ne sont PAS touchés, l'échec est écrit dans le fichier d'état.
#  - En cas de succès uniquement : rotation (> 30 jours) puis écriture
#    du succès dans le fichier d'état.
#  - Fichier d'état backups/status.json réécrit à chaque cycle, initialisé
#    depuis l'existant au démarrage : last_success / last_error sont préservés
#    d'un cycle et d'un redémarrage à l'autre, jamais écrasés par null.
# ------------------------------------------------------------

BACKUP_DIR=/backups
STATUS_FILE="$BACKUP_DIR/status.json"
MIN_SIZE=10240   # 10 Ko

# Lit la valeur brute d'une clé (null ou "chaîne") dans le status.json ;
# n'affiche rien si le fichier est absent, la clé introuvable ou la valeur malformée.
read_status_value() {
  key="$1"
  [ -f "$STATUS_FILE" ] || return 0
  raw=$(grep "\"$key\"" "$STATUS_FILE" 2>/dev/null | head -n1 | sed 's/^[^:]*:[[:space:]]*//; s/[[:space:]]*,[[:space:]]*$//')
  case "$raw" in
    null)   printf 'null' ;;
    \"*\")  printf '%s' "$raw" ;;
    *)      : ;;
  esac
}

# État initialisé depuis le status.json existant (préservé entre cycles ET redémarrages).
# Règle : last_success n'est mis à jour QUE lors d'un succès, last_error/message QUE lors
# d'un échec ; aucun des deux n'écrase jamais l'autre avec null.
LAST_SUCCESS=null
LAST_ERROR=null
LAST_ERROR_MESSAGE=null
v=$(read_status_value last_success);        [ -n "$v" ] && LAST_SUCCESS="$v"
v=$(read_status_value last_error);          [ -n "$v" ] && LAST_ERROR="$v"
v=$(read_status_value last_error_message);  [ -n "$v" ] && LAST_ERROR_MESSAGE="$v"

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
