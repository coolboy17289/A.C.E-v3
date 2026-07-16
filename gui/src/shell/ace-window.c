/* ============================================
 * A.C.E GUI - Main Desktop Window
 * The root window containing top bar, dock,
 * desktop area, and activities overlay
 * ============================================ */

#include <gtk/gtk.h>
#include "ace-window.h"
#include "ace-topbar.h"
#include "ace-dock.h"
#include "ace-activities.h"
#include "ace-desktop.h"

struct _AceWindow {
    GtkApplicationWindow parent_instance;

    /* Main layout */
    GtkWidget *main_box;
    GtkWidget *topbar;
    GtkWidget *desktop;
    GtkWidget *dock;
    GtkWidget *activities_overlay;

    /* State */
    gboolean activities_visible;
};

G_DEFINE_TYPE(AceWindow, ace_window, GTK_TYPE_APPLICATION_WINDOW)

/* Forward declarations */
static void on_activities_clicked(GtkButton *button, gpointer user_data);
static void on_close_clicked(GtkButton *button, gpointer user_data);

static void ace_window_class_init(AceWindowClass *klass) {
    /* No special class methods needed for now */
}

static void ace_window_init(AceWindow *self) {
    self->activities_visible = FALSE;
}

AceWindow *ace_window_new(AceApp *app) {
    AceWindow *self;

    self = g_object_new(ACE_WINDOW_TYPE,
                        "application", app,
                        "title", "A.C.E Desktop",
                        "fullscreened", TRUE,
                        NULL);

    /* Build the UI */
    ace_window_build_ui(self);

    return self;
}

static void ace_window_build_ui(AceWindow *self) {
    /* Main vertical box */
    self->main_box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 0);
    gtk_window_set_child(GTK_WINDOW(self), self->main_box);

    /* Top bar */
    self->topbar = ace_topbar_new();
    gtk_box_append(GTK_BOX(self->main_box), self->topbar);

    /* Desktop area (fills remaining space) */
    self->desktop = ace_desktop_new();
    GtkWidget *desktop_holder = gtk_box_new(GTK_ORIENTATION_VERTICAL, 0);
    gtk_widget_set_vexpand(desktop_holder, TRUE);
    gtk_widget_set_hexpand(desktop_holder, TRUE);
    gtk_box_append(GTK_BOX(desktop_holder), self->desktop);
    gtk_box_append(GTK_BOX(self->main_box), desktop_holder);

    /* Dock at the bottom */
    self->dock = ace_dock_new();
    gtk_box_append(GTK_BOX(self->main_box), self->dock);

    /* Activities overlay (hidden by default) */
    self->activities_overlay = ace_activities_new();
    gtk_widget_set_visible(self->activities_overlay, FALSE);
    gtk_widget_set_margin_top(self->activities_overlay, 40);
    gtk_widget_set_margin_bottom(self->activities_overlay, 80);
    gtk_widget_set_margin_start(self->activities_overlay, 60);
    gtk_widget_set_margin_end(self->activities_overlay, 60);
}
