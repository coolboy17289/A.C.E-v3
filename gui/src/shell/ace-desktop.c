/* ============================================
 * A.C.E GUI - Desktop Area
 * The main desktop surface where app windows live
 * ============================================ */

#include <gtk/gtk.h>
#include "ace-desktop.h"

struct _AceDesktop {
    GtkWidget parent_instance;
};

G_DEFINE_TYPE(AceDesktop, ace_desktop, GTK_TYPE_WIDGET)

static void ace_desktop_class_init(AceDesktopClass *klass) {
    /* Widget class setup */
}

static void ace_desktop_init(AceDesktop *self) {
    gtk_widget_set_layout_manager(GTK_WIDGET(self),
        gtk_box_layout_new(GTK_ORIENTATION_VERTICAL));
    gtk_widget_add_css_class(GTK_WIDGET(self), "ace-desktop");
    gtk_widget_set_vexpand(GTK_WIDGET(self), TRUE);
    gtk_widget_set_hexpand(GTK_WIDGET(self), TRUE);

    /* Desktop wallpaper with subtle gradient */
    GtkWidget *wallpaper = gtk_drawing_area_new();
    gtk_widget_set_vexpand(wallpaper, TRUE);
    gtk_widget_set_hexpand(wallpaper, TRUE);
    /* Note: ace-desktop is a container widget, children managed by parent */
}

GtkWidget *ace_desktop_new(void) {
    return g_object_new(ACE_DESKTOP_TYPE, NULL);
}
