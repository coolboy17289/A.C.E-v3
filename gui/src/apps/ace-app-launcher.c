/* ============================================
 * A.C.E App Launcher - Central Dispatcher
 * ============================================ */

#include <gtk/gtk.h>
#include "ace-app-launcher.h"

/* Stub launch functions for unimplemented apps */
static void ace_stub_launch(const char *app_name) {
    GtkWidget *dialog = gtk_message_dialog_new(NULL,
        GTK_DIALOG_MODAL, GTK_MESSAGE_INFO, GTK_BUTTONS_OK,
        "%s is coming soon!", app_name);
    gtk_dialog_run(GTK_DIALOG(dialog));
    gtk_widget_destroy(dialog);
}

void ace_browser_launch(void) { ace_stub_launch("ACE Browser"); }
void ace_ai_assistant_launch(void) { ace_stub_launch("ACE AI Assistant"); }
void ace_code_editor_launch(void) { ace_stub_launch("ACE Code Editor"); }
void ace_store_launch(void) { ace_stub_launch("ACE Store"); }

void ace_app_launch_by_id(const char *app_id) {
    if (!app_id) return;

    if (g_strcmp0(app_id, ACE_APP_FILES) == 0) {
        ace_files_launch();
    } else if (g_strcmp0(app_id, ACE_APP_SETTINGS) == 0) {
        ace_settings_launch();
    } else if (g_strcmp0(app_id, ACE_APP_TERMINAL) == 0) {
        ace_terminal_launch();
    } else if (g_strcmp0(app_id, ACE_APP_CALCULATOR) == 0) {
        ace_calculator_launch();
    } else if (g_strcmp0(app_id, ACE_APP_CLOCK) == 0) {
        ace_clock_launch();
    } else if (g_strcmp0(app_id, ACE_APP_NOTES) == 0) {
        ace_notes_launch();
    } else if (g_strcmp0(app_id, ACE_APP_BROWSER) == 0) {
        ace_browser_launch();
    } else if (g_strcmp0(app_id, ACE_APP_AI_ASSISTANT) == 0) {
        ace_ai_assistant_launch();
    } else if (g_strcmp0(app_id, ACE_APP_CODE_EDITOR) == 0) {
        ace_code_editor_launch();
    } else if (g_strcmp0(app_id, ACE_APP_STORE) == 0) {
        ace_store_launch();
    } else {
        g_warning("[ACE Launcher] Unknown app: %s", app_id);
    }
}
