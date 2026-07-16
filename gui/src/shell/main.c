/* ============================================
 * A.C.E GUI - Main Entry Point
 * ============================================ */

#include <gtk/gtk.h>
#include "ace-app.h"

int main(int argc, char *argv[]) {
    (void)argc; (void)argv;
    AceApp *app = ace_app_new();
    int status = g_application_run(G_APPLICATION(app), 0, NULL);
    g_object_unref(app);
    return status;
}
