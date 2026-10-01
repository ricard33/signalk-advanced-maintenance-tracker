/**
 * French interface strings (§7.11), keyed by the English source text passed
 * to `tr()`. Wording follows the e-mail alerts (src/signalk/email.ts):
 * "Échue", "Échéance proche", "Heures moteur", "Étiquettes".
 *
 * frontend/test/i18n.test.js fails when a `tr()` key is missing here, or when
 * an entry here is no longer used.
 */

/** @type {Record<string, string>} */
export const fr = {
  // ---- shell ----
  Home: 'Accueil',
  Tasks: 'Tâches',
  Schedule: 'Programme',
  Equipment: 'Équipements',
  Log: 'Journal',
  'Log in': 'Connexion',
  'Log out': 'Déconnexion',
  'Switch to dark theme': 'Passer au thème sombre',
  'Switch to light theme': 'Passer au thème clair',
  'Dark theme': 'Thème sombre',
  'Light theme': 'Thème clair',

  // ---- common ----
  'Loading…': 'Chargement…',
  Cancel: 'Annuler',
  Close: 'Fermer',
  Delete: 'Supprimer',
  Edit: 'Modifier',
  Remove: 'Retirer',
  'Saving…': 'Enregistrement…',
  'Save changes': 'Enregistrer',
  'Save failed': "Échec de l'enregistrement",
  'Operation failed': "Échec de l'opération",
  'Working…': 'En cours…',
  'This cannot be undone.': 'Cette action est irréversible.',
  'Nothing here yet.': 'Rien pour le moment.',
  'Request failed ({status})': 'Échec de la requête ({status})',
  '{first}–{last} of {total}': '{first}–{last} sur {total}',
  'Previous page': 'Page précédente',
  'Next page': 'Page suivante',
  Filters: 'Filtres',
  'Clear all': 'Tout effacer',
  'TAGS:': 'ÉTIQUETTES :',
  'STATUS:': 'STATUT :',
  'EQUIPMENT:': 'ÉQUIPEMENT :',
  '— None —': '— Aucun —',

  // ---- statuses ----
  Overdue: 'Échue',
  'Due Soon': 'Échéance proche',
  'Due soon': 'Échéance proche',
  Todo: 'À faire',
  OK: 'OK',
  Pending: 'En attente',
  Archived: 'Archivée',
  'Out of stock': 'Rupture de stock',
  'Low stock': 'Stock bas',
  'In stock': 'En stock',
  "Stock status for this task's linked parts":
    'État du stock des pièces liées à cette tâche',
  'Could not check stowage-mgmt stock levels for a task.':
    "Impossible de vérifier les niveaux de stock stowage-mgmt d'une tâche.",

  // ---- durations and intervals ----
  '{n} day': '{n} jour',
  '{n} days': '{n} jours',
  '{n} hour': '{n} heure',
  '{n} hours': '{n} heures',
  '< 1 hour': '< 1 heure',
  '{span} overdue': 'en retard de {span}',
  'in {span}': 'dans {span}',
  days: 'jours',
  weeks: 'semaines',
  months: 'mois',
  years: 'ans',
  'every {n} days': 'tous les {n} jours',
  'every {n} weeks': 'toutes les {n} semaines',
  'every {n} months': 'tous les {n} mois',
  'every {n} years': 'tous les {n} ans',
  'every {hours}': 'toutes les {hours}',
  never: 'jamais',

  // ---- auth ----
  Username: "Nom d'utilisateur",
  Password: 'Mot de passe',
  'Remember me': 'Se souvenir de moi',
  'Logging in…': 'Connexion…',
  'Logged in as {name}': 'Connecté en tant que {name}',
  'Login failed': 'Échec de la connexion',
  'Login failed ({status})': 'Échec de la connexion ({status})',
  'Invalid username or password': "Nom d'utilisateur ou mot de passe incorrect",
  'Please log in to load maintenance data.':
    'Connectez-vous pour charger les données de maintenance.',

  // ---- dashboard ----
  'Next up': 'À venir',
  'Recent log': 'Journal récent',
  'Nothing due right now.': 'Rien à faire pour le moment.',
  'No maintenance logged yet.': 'Aucune maintenance enregistrée.',

  // ---- task list ----
  'Search tasks': 'Rechercher des tâches',
  'Search tasks…': 'Rechercher des tâches…',
  'New Task': 'Nouvelle tâche',
  'New Todo': 'Nouvelle tâche ponctuelle',
  Status: 'Statut',
  Name: 'Nom',
  Tags: 'Étiquettes',
  'Runtime Left': 'Heures restantes',
  'Time left': 'Temps restant',
  'Complete {name}': 'Terminer {name}',
  'Mark complete': 'Marquer comme faite',
  'Failed to load tasks: {error}': 'Échec du chargement des tâches : {error}',
  'No tasks match your filters.': 'Aucune tâche ne correspond à vos filtres.',
  'No maintenance tasks yet.': 'Aucune tâche de maintenance.',

  // ---- task detail ----
  'Failed to load task: {error}': 'Échec du chargement de la tâche : {error}',
  Archive: 'Archiver',
  Unarchive: 'Désarchiver',
  'Task archived.': 'Tâche archivée.',
  'Task unarchived.': 'Tâche désarchivée.',
  'Task deleted.': 'Tâche supprimée.',
  'Equipment:': 'Équipement :',
  Description: 'Description',
  Consumables: 'Consommables',
  Runtime: 'Heures moteur',
  Interval: 'Intervalle',
  Deadline: 'Date limite',
  Today: "Aujourd'hui",
  Last: 'Dernière',
  Elapsed: 'Écoulé',
  Next: 'Prochaine',
  Remaining: 'Restant',
  Current: 'Actuel',
  'No interval or due date configured.':
    'Aucun intervalle ni échéance configuré.',
  'No due-soon warning.': "Pas d'alerte d'échéance proche.",
  'Warns {n}d early.': 'Alerte {n} j avant.',
  'Warns {n}h early.': 'Alerte {n} h avant.',
  'Maintenance log': 'Journal de maintenance',
  'Download log': 'Télécharger le journal',
  'Download Log': 'Télécharger le journal',
  'Download log — {name}': 'Télécharger le journal — {name}',
  'Download maintenance log': 'Télécharger le journal de maintenance',
  Download: 'Télécharger',
  'Preparing…': 'Préparation…',
  'Download failed': 'Échec du téléchargement',
  Format: 'Format',
  Date: 'Date',
  By: 'Par',
  'Delete task': 'Supprimer la tâche',
  'Delete "{name}" and its entire maintenance log? This cannot be undone.':
    'Supprimer « {name} » et tout son journal de maintenance ? Cette action est irréversible.',
  'Delete log entry': "Supprimer l'entrée du journal",
  'Edit log entry': "Modifier l'entrée du journal",
  "Delete this log entry? The task's last-maintenance data will be recomputed.":
    'Supprimer cette entrée du journal ? Les données de dernière maintenance de la tâche seront recalculées.',
  'Delete this log entry? This cannot be undone.':
    'Supprimer cette entrée du journal ? Cette action est irréversible.',
  'Log entry deleted.': 'Entrée du journal supprimée.',

  // ---- schedule ----
  'Maintenance schedule': 'Programme de maintenance',
  Task: 'Tâche',
  'Runtime interval': 'Intervalle moteur',
  'Time interval': 'Intervalle calendaire',
  'Last done': 'Dernière réalisation',
  'No equipment': 'Sans équipement',
  'No recurring tasks yet.': 'Aucune tâche récurrente.',
  'Showing {shown} of {total} tasks.': '{shown} tâches affichées sur {total}.',
  'Load more tasks': 'Charger plus de tâches',
  'Failed to load the schedule: {error}':
    'Échec du chargement du programme : {error}',

  // ---- master log ----
  'Search log': 'Rechercher dans le journal',
  'Search log…': 'Rechercher dans le journal…',
  'New Entry': 'Nouvelle entrée',
  more: 'plus',
  less: 'moins',
  'Failed to load log: {error}': 'Échec du chargement du journal : {error}',
  'No log entries match your search.':
    'Aucune entrée ne correspond à votre recherche.',

  // ---- equipment ----
  'Search equipment': 'Rechercher un équipement',
  'Search equipment…': 'Rechercher un équipement…',
  'New Equipment': 'Nouvel équipement',
  'New equipment': 'Nouvel équipement',
  'Edit equipment': "Modifier l'équipement",
  'Add equipment': "Ajouter l'équipement",
  'Delete equipment': "Supprimer l'équipement",
  'Edit {name}': 'Modifier {name}',
  'Delete {name}': 'Supprimer {name}',
  'Delete "{name}"?': 'Supprimer « {name} » ?',
  '{tasks} task(s) and {logs} log entr(ies) will be unlinked (their history is kept).':
    '{tasks} tâche(s) et {logs} entrée(s) du journal seront dissociées (leur historique est conservé).',
  'Equipment added.': 'Équipement ajouté.',
  'Equipment updated.': 'Équipement mis à jour.',
  'Equipment deleted.': 'Équipement supprimé.',
  'Failed to load equipment: {error}':
    "Échec du chargement de l'équipement : {error}",
  'No equipment matches your filters.':
    'Aucun équipement ne correspond à vos filtres.',
  'No equipment yet.': 'Aucun équipement.',
  Details: 'Détails',
  Brand: 'Marque',
  Model: 'Modèle',
  'Serial number': 'Numéro de série',
  Purchased: 'Acheté le',
  Price: 'Prix',
  'Purchase date': "Date d'achat",
  'Purchase price': "Prix d'achat",
  'Warranty until': "Garantie jusqu'au",
  'No details recorded.': 'Aucun détail renseigné.',
  'Tasks ({n})': 'Tâches ({n})',
  'Log entries ({n})': 'Entrées du journal ({n})',
  'No tasks linked to this equipment.': 'Aucune tâche liée à cet équipement.',
  'No log entries linked to this equipment.':
    'Aucune entrée du journal liée à cet équipement.',
  'Purchase price must be a non-negative number.':
    "Le prix d'achat doit être un nombre positif ou nul.",
  "Used in the equipment's URL.": "Utilisé dans l'URL de l'équipement.",
  'Changing the slug breaks existing deep links to this equipment.':
    'Modifier le slug casse les liens existants vers cet équipement.',

  // ---- task form ----
  'New task': 'Nouvelle tâche',
  'New todo': 'Nouvelle tâche ponctuelle',
  'Edit task': 'Modifier la tâche',
  'Create task': 'Créer la tâche',
  'Create todo': 'Créer la tâche ponctuelle',
  'Task created.': 'Tâche créée.',
  'Todo created.': 'Tâche ponctuelle créée.',
  'Task updated.': 'Tâche mise à jour.',
  'Name is required.': 'Le nom est obligatoire.',
  Slug: 'Slug',
  'Used in URLs and SignalK notifications.':
    'Utilisé dans les URL et les notifications SignalK.',
  'Changing the slug breaks existing deep links to this task.':
    'Modifier le slug casse les liens existants vers cette tâche.',
  'Description (markdown)': 'Description (markdown)',
  edit: 'modifier',
  preview: 'aperçu',
  '_Nothing to preview._': '_Rien à prévisualiser._',
  'The boat component this task maintains. Picking one adds its tags.':
    "L'élément du bateau entretenu par cette tâche. En choisir un ajoute ses étiquettes.",
  'Add tag and press Enter': 'Ajouter une étiquette puis Entrée',
  'Remove tag': "Retirer l'étiquette",
  'Decrements stock in stowage management when this task is marked complete.':
    'Décrémente le stock dans la gestion du rangement quand cette tâche est marquée comme faite.',
  'Search stowage-mgmt items to add':
    'Rechercher des articles stowage-mgmt à ajouter',
  'Quantity per service for {name}': 'Quantité par intervention pour {name}',
  'Remove {name}': 'Retirer {name}',
  "Could not reach signalk-stowage-mgmt — existing parts above can still be edited or removed, but new ones can't be added right now.":
    "Impossible de joindre signalk-stowage-mgmt — les pièces ci-dessus restent modifiables ou supprimables, mais il n'est pas possible d'en ajouter pour le moment.",
  'Each linked part needs a quantity greater than 0.':
    'Chaque pièce liée doit avoir une quantité supérieure à 0.',
  'Recurring task': 'Tâche récurrente',
  'Recurring tasks come due on an interval. Unchecked = a one-off todo that archives itself when completed.':
    "Les tâches récurrentes arrivent à échéance selon un intervalle. Décoché = une tâche ponctuelle qui s'archive une fois faite.",
  'Due date': 'Échéance',
  'One-time deadline (e.g. registration, renewal). Cleared when the task is completed. Empty = none.':
    'Échéance unique (ex. immatriculation, renouvellement). Effacée quand la tâche est faite. Vide = aucune.',
  'Runtime interval (hours)': 'Intervalle moteur (heures)',
  'Empty = no runtime tracking.': 'Vide = pas de suivi des heures moteur.',
  'Time interval unit': "Unité de l'intervalle calendaire",
  'Empty = no calendar tracking.': 'Vide = pas de suivi calendaire.',
  'Runtime warning window (hours)': "Délai d'alerte moteur (heures)",
  'Time warning window (days)': "Délai d'alerte calendaire (jours)",
  'Default: {value}': 'Par défaut : {value}',
  'How early runtime tasks flag "due soon". Empty = plugin default; 0 = no warning.':
    "Avance avec laquelle les tâches à heures moteur passent en « échéance proche ». Vide = valeur par défaut du plugin ; 0 = pas d'alerte.",
  'How early time & due-date tasks flag "due soon". Empty = plugin default; 0 = no warning.':
    "Avance avec laquelle les tâches calendaires et à échéance passent en « échéance proche ». Vide = valeur par défaut du plugin ; 0 = pas d'alerte.",
  'How early the due date flags "due soon". Empty = plugin default; 0 = no warning.':
    "Avance avec laquelle l'échéance passe en « échéance proche ». Vide = valeur par défaut du plugin ; 0 = pas d'alerte.",
  'Runtime path (SignalK)': 'Chemin des heures moteur (SignalK)',
  'e.g. propulsion.port.runTime': 'ex. propulsion.port.runTime',
  'Could not load paths from SignalK — free text still works.':
    'Impossible de charger les chemins depuis SignalK — la saisie libre reste possible.',
  'Last maintenance': 'Dernière maintenance',
  'Last maintenance (optional seed)':
    'Dernière maintenance (valeur initiale facultative)',
  'Runtime at last maintenance': 'Heures moteur à la dernière maintenance',
  'Runtime at last maintenance (h)':
    'Heures moteur à la dernière maintenance (h)',
  "These come from the task's most recent log entry, so they aren't editable here. Use":
    'Ces valeurs proviennent de la dernière entrée du journal de la tâche et ne sont donc pas modifiables ici. Utilisez',
  'to record work — it accepts a past date and runtime — or edit the latest entry in the maintenance log to correct them.':
    'pour enregistrer une intervention — une date et des heures moteur passées sont acceptées — ou modifiez la dernière entrée du journal de maintenance pour les corriger.',
  'Runtime interval must be a positive number of hours.':
    "L'intervalle moteur doit être un nombre d'heures positif.",
  'Time interval must be a positive whole number.':
    "L'intervalle calendaire doit être un nombre entier positif.",
  'A recurring task needs a runtime or time interval.':
    'Une tâche récurrente doit avoir un intervalle moteur ou calendaire.',
  'Runtime warning window must be 0 or a positive number.':
    "Le délai d'alerte moteur doit être 0 ou un nombre positif.",
  'Time warning window must be 0 or a positive number.':
    "Le délai d'alerte calendaire doit être 0 ou un nombre positif.",
  'Seed runtime must be a non-negative number of hours.':
    "Les heures moteur initiales doivent être un nombre d'heures positif ou nul.",

  // ---- log entry form ----
  'New log entry': 'Nouvelle entrée du journal',
  'Mark complete — {name}': 'Marquer comme faite — {name}',
  'Add entry': "Ajouter l'entrée",
  'For quick log entries not tied to any task. For better record-keeping, use':
    'Pour des entrées rapides sans lien avec une tâche. Pour un meilleur suivi, utilisez',
  'on an existing task.': 'sur une tâche existante.',
  'Maintenance date': 'Date de maintenance',
  Title: 'Titre',
  'Runtime hours': 'Heures moteur',
  'Notes (markdown)': 'Notes (markdown)',
  "Update signalk-stowage-mgmt stock for this task's linked parts":
    'Mettre à jour le stock signalk-stowage-mgmt des pièces liées à cette tâche',
  'Title is required.': 'Le titre est obligatoire.',
  'Maintenance date is required.': 'La date de maintenance est obligatoire.',
  'Runtime hours must be a non-negative number.':
    'Les heures moteur doivent être un nombre positif ou nul.',
  'Pick a location for all of the {name} used before marking this complete.':
    'Choisissez un emplacement pour toute la quantité de {name} utilisée avant de marquer la tâche comme faite.',
  'Completed "{name}" — moved to archive.': '« {name} » terminée — archivée.',
  'Marked "{name}" complete.': '« {name} » marquée comme faite.',
  'Stock not fully updated: {details}':
    'Stock partiellement mis à jour : {details}',
  'Log entry added.': 'Entrée du journal ajoutée.',
  'Log entry updated.': 'Entrée du journal mise à jour.',
  'Where did the {qty} × {name} come from?':
    "D'où proviennent les {qty} × {name} ?",
  'Location {n} for {name}': 'Emplacement {n} pour {name}',
  'Select a location…': 'Choisir un emplacement…',
  'Unspecified location': 'Emplacement non précisé',
  '{location} ({qty} available)': '{location} ({qty} disponibles)',
  'Remove location {n}': "Retirer l'emplacement {n}",
  'Not enough stock across known locations to cover this amount.':
    'Stock insuffisant dans les emplacements connus pour couvrir cette quantité.',
  '{n} still needs a location.': '{n} reste à affecter à un emplacement.',
  'Fully allocated.': 'Entièrement affecté.',
};
