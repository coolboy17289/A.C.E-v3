/* ============================================
 * A.C.E Utilities - Common Helpers
 * ============================================ */

#include <gtk/gtk.h>
#include "ace-utils.h"

void ace_show_error_dialog(GtkWindow *parent, const char *message) {
    GtkWidget *dialog;
    dialog = gtk_message_dialog_new(parent,
        GTK_DIALOG_MODAL,
        GTK_MESSAGE_ERROR,
        GTK_BUTTONS_OK,
        "%s", message);
    gtk_dialog_run(GTK_DIALOG(dialog));
    gtk_widget_destroy(dialog);
}

char *ace_get_home_dir(void) {
    const char *home = g_get_home_dir();
    return g_strdup(home ? home : "/home/ace");
}
