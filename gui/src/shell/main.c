/* ============================================
 * A.C.E GUI - Main Entry Point
 * Native GTK4 Desktop Environment
 * Built for Raspberry Pi 4
 * ============================================ */

#include <gtk/gtk.h>
#include "ace-app.h"

int main(int argc, char *argv[]) {
    AceApp *app;
    int status;

    /* Initialize GTK */
    gtk_init(&argc, &argv);

    /* Create the application */
    app = ace_app_new();

    /* Run the application */
    status = g_application_run(G_APPLICATION(app), argc, argv);

    g_object_unref(app);
    return status;
}
