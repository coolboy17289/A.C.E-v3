/* ============================================
 * A.C.E App Launcher - Central Dispatcher
 * Connects dock/activities UI to app launchers
 * ============================================ */

#ifndef ACE_APP_LAUNCHER_H
#define ACE_APP_LAUNCHER_H

#include <gtk/gtk.h>

/* App launch function declarations */
void ace_files_launch(void);
void ace_settings_launch(void);
void ace_terminal_launch(void);
void ace_calculator_launch(void);
void ace_clock_launch(void);
void ace_notes_launch(void);
void ace_browser_launch(void);
void ace_ai_assistant_launch(void);
void ace_code_editor_launch(void);
void ace_store_launch(void);

/* App IDs */
#define ACE_APP_FILES           "ace-files"
#define ACE_APP_SETTINGS        "ace-settings"
#define ACE_APP_TERMINAL        "ace-terminal"
#define ACE_APP_CALCULATOR      "ace-calculator"
#define ACE_APP_CLOCK           "ace-clock"
#define ACE_APP_NOTES           "ace-notes"
#define ACE_APP_BROWSER         "ace-browser"
#define ACE_APP_AI_ASSISTANT    "ace-ai-assistant"
#define ACE_APP_CODE_EDITOR     "ace-code-editor"
#define ACE_APP_STORE           "ace-store"

/* Launch app by ID */
void ace_app_launch_by_id(const char *app_id);

#endif /* ACE_APP_LAUNCHER_H */
