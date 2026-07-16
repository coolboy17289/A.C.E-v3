/* ============================================
 * A.C.E GUI - Dock
 * Bottom application dock with app icons
 * ============================================ */

#include <gtk/gtk.h>
#include "ace-dock.h"
#include "../apps/ace-app-launcher.h"

struct _AceDock {
    GtkWidget parent_instance;
    GtkWidget *dock_box;
};

G_DEFINE_TYPE(AceDock, ace_dock, GTK_TYPE_WIDGET)

typedef struct {
    const char *icon;
    const char *name;
    const char *app_id;
} DockApp;

static DockApp default_dock_apps[] = {
    { "📁", "Files",     "ace-files"     },
    { "🖥️", "Terminal",  "ace-terminal"  },
    { "⚙️", "Settings",  "ace-settings"  },
    { "🧮", "Calculator","ace-calculator" },
    { "📝", "Notes",     "ace-notes"     },
    { "🕐", "Clock",     "ace-clock"     },
    { NULL, NULL, NULL }
};

static void on_dock_app_clicked(GtkButton *button, gpointer user_data) {
    (void)button;
    const char *app_id = (const char *)user_data;
    ace_app_launch_by_id(app_id);
}

static void ace_dock_class_init(AceDockClass *klass) {
    /* Widget class setup */
}

static void ace_dock_init(AceDock *self) {
    /* Set layout */
    gtk_widget_set_layout_manager(GTK_WIDGET(self),
        gtkBoxLayout_new(GTK_ORIENTATION_HORIZONTAL, 0));
    gtk_widget_set_halign(GTK_WIDGET(self), GTK_ALIGN_CENTER);
    gtk_widget_set_valign(GTK_WIDGET(self), GTK_ALIGN_END);
    gtk_widget_add_css_class(GTK_WIDGET(self), "ace-dock");

    /* Background container */
    GtkWidget *bg = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 4);
    gtk_widget_add_css_class(bg, "ace-dock-bg");
    gtk_widget_set_margin_top(bg, 6);
    gtk_widget_set_margin_bottom(bg, 6);
    gtk_widget_set_margin_start(bg, 12);
    gtk_widget_set_margin_end(bg, 12);
    gtk_widget_set_parent(bg, GTK_WIDGET(self));
    self->dock_box = bg;

    /* Separator helper */
    GtkWidget *sep = gtk_separator_new(GTK_ORIENTATION_VERTICAL);
    gtk_widget_set_margin_start(sep, 4);
    gtk_widget_set_margin_end(sep, 4);

    /* Add dock apps */
    for (int i = 0; default_dock_apps[i].icon != NULL; i++) {
        DockApp *app = &default_dock_apps[i];

        GtkWidget *btn = gtk_button_new();
        gtk_widget_add_css_class(btn, "ace-dock-btn");
        gtk_widget_set_tooltip_text(btn, app->name);

        /* Icon label */
        GtkWidget *icon_label = gtk_label_new(app->icon);
        gtk_widget_set_markup(icon_label,
            g_markup_printf_escaped("<span size='x-large'>%s</span>", app->icon));
        gtk_button_set_child(GTK_BUTTON(btn), icon_label);

        g_signal_connect(btn, "clicked",
            G_CALLBACK(on_dock_app_clicked), (gpointer)app->app_id);

        gtk_box_append(GTK_BOX(bg), btn);
    }

    /* App launcher button */
    GtkWidget *launcher_sep = gtk_separator_new(GTK_ORIENTATION_VERTICAL);
    gtk_widget_set_margin_start(launcher_sep, 8);
    gtk_widget_set_margin_end(launcher_sep, 8);
    gtk_box_append(GTK_BOX(bg), launcher_sep);

    GtkWidget *launcher_btn = gtk_button_new_with_label("📱");
    gtk_widget_add_css_class(launcher_btn, "ace-dock-btn");
    gtk_widget_set_tooltip_text(launcher_btn, "All Apps");
    gtk_box_append(GTK_BOX(bg), launcher_btn);
}

GtkWidget *ace_dock_new(void) {
    return g_object_new(ACE_DOCK_TYPE, NULL);
}
