/* ============================================
 * A.C.E Utilities - Common Helpers
 * ============================================ */

#include <gtk/gtk.h>
#include "ace-utils.h"

void ace_show_error_dialog(GtkWindow *parent, const char *message) {
    GtkAlertDialog *dialog = gtk_alert_dialog_new("%s", message);
    gtk_alert_dialog_show(dialog, parent);
    g_object_unref(dialog);
}

char *ace_get_home_dir(void) {
    const char *home = g_get_home_dir();
    return g_strdup(home ? home : "/home/ace");
}
