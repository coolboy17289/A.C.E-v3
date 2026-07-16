/* ============================================
 * A.C.E GUI - Application Object
 * GTK Application lifecycle management
 * ============================================ */

#include <gtk/gtk.h>
#include "ace-app.h"
#include "ace-window.h"
#include "ace-theme.h"

struct _AceApp {
    GtkApplication parent_instance;
    AceWindow *window;
    AceTheme *theme;
};

G_DEFINE_TYPE(AceApp, ace_app, GTK_TYPE_APPLICATION)

static void ace_app_activate(GApplication *app) {
    AceApp *self = ACE_APP(app);
    GtkWindow *win;

    /* Check if window already exists */
    win = gtk_application_get_active_window(GTK_APPLICATION(app));
    if (win == NULL) {
        /* Create main desktop window */
        self->window = ace_window_new(ACE_APP(app));
        win = GTK_WINDOW(self->window);
    }

    gtk_window_present(win);
}

static void ace_app_startup(GApplication *app) {
    AceApp *self = ACE_APP(app);

    /* Call parent startup */
    G_APPLICATION_CLASS(ace_app_parent_class)->startup(app);

    /* Initialize theme */
    self->theme = ace_theme_new();
    ace_theme_apply(self->theme);

    /* Set application metadata */
    g_application_set_application_id(app, "com.ace.desktop");
    g_application_set_flags(app, G_APPLICATION_DEFAULT_FLAGS);
}

static void ace_app_class_init(AceAppClass *klass) {
    GApplicationClass *app_class = G_APPLICATION_CLASS(klass);

    app_class->activate = ace_app_activate;
    app_class->startup = ace_app_startup;
}

static void ace_app_init(AceApp *self) {
    self->window = NULL;
    self->theme = NULL;
}

AceApp *ace_app_new(void) {
    return g_object_new(ACE_APP_TYPE,
                        "application-id", "com.ace.desktop",
                        "flags", G_APPLICATION_DEFAULT_FLAGS,
                        NULL);
}
