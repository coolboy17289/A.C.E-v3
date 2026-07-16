/* ============================================
 * A.C.E GUI - Activities Overlay
 * Full-screen app launcher with search bar
 * and application grid
 * ============================================ */

#include <gtk/gtk.h>
#include "ace-activities.h"
#include "../apps/ace-app-launcher.h"

struct _AceActivities {
    GtkWidget parent_instance;
    GtkWidget *search_entry;
    GtkWidget *app_grid;
};

G_DEFINE_TYPE(AceActivities, ace_activities, GTK_TYPE_WIDGET)

typedef struct {
    const char *app_id;
    const char *name;
    const char *icon;
    const char *category;
} AppInfo;

static AppInfo all_apps[] = {
    { "ace-files",       "Files",       "📁", "Core"      },
    { "ace-settings",    "Settings",    "⚙️", "Core"      },
    { "ace-terminal",    "Terminal",    "🖥️", "Core"      },
    { "ace-calculator",  "Calculator",  "🧮", "Productivity" },
    { "ace-clock",       "Clock",       "🕐", "Productivity" },
    { "ace-notes",       "Notes",       "📝", "Productivity" },
    { "ace-browser",     "Browser",     "🌐", "Internet"  },
    { "ace-ai-assistant","AI Assistant","🤖", "AI"        },
    { "ace-code-editor", "Code Editor", "💻", "Development" },
    { "ace-store",       "Store",       "🏪", "System"    },
    { NULL, NULL, NULL, NULL }
};

static void on_search_changed(GtkSearchEntry *entry, gpointer user_data) {
    AceActivities *self = ACE_ACTIVITIES(user_data);
    const char *text = gtk_editable_get_text(GTK_EDITABLE(entry));
    (void)self;
    (void)text;
    /* TODO: Filter app grid by search text */
}

static void on_app_clicked(GtkButton *button, gpointer user_data) {
    (void)button;
    const char *app_id = (const char *)user_data;
    ace_app_launch_by_id(app_id);
}

static void ace_activities_class_init(AceActivitiesClass *klass) {
    /* Widget class setup */
}

static void ace_activities_init(AceActivities *self) {
    gtk_widget_set_layout_manager(GTK_WIDGET(self),
        gtk_box_layout_new(GTK_ORIENTATION_VERTICAL));
    gtk_widget_add_css_class(GTK_WIDGET(self), "ace-activities");

    /* Search bar */
    GtkWidget *search_box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 0);
    gtk_widget_set_halign(search_box, GTK_ALIGN_CENTER);
    gtk_widget_set_margin_top(search_box, 20);

    self->search_entry = gtk_search_entry_new();
    gtk_widget_set_size_request(self->search_entry, 500, -1);
    gtk_widget_add_css_class(self->search_entry, "ace-search");
    g_signal_connect(self->search_entry, "search-changed",
        G_CALLBACK(on_search_changed), self);
    gtk_box_append(GTK_BOX(search_box), self->search_entry);
    gtk_box_append(GTK_BOX(self), search_box);

    /* App grid */
    GtkWidget *grid_scroll = gtk_scrolled_window_new();
    gtk_widget_set_vexpand(grid_scroll, TRUE);
    gtk_widget_set_hexpand(grid_scroll, TRUE);
    gtk_scrolled_window_set_policy(GTK_SCROLLED_WINDOW(grid_scroll),
        GTK_POLICY_NEVER, GTK_POLICY_AUTOMATIC);

    self->app_grid = gtk_grid_new();
    gtk_widget_add_css_class(self->app_grid, "ace-app-grid");
    gtk_grid_set_column_spacing(GTK_GRID(self->app_grid), 16);
    gtk_grid_set_row_spacing(GTK_GRID(self->app_grid), 16);
    gtk_widget_set_halign(self->app_grid, GTK_ALIGN_CENTER);
    gtk_widget_set_margin_top(self->app_grid, 20);
    gtk_widget_set_margin_start(self->app_grid, 40);
    gtk_widget_set_margin_end(self->app_grid, 40);

    /* Add apps to grid */
    int col = 0, row = 0;
    for (int i = 0; all_apps[i].name != NULL; i++) {
        AppInfo *app = &all_apps[i];

        GtkWidget *btn_box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 4);
        gtk_widget_set_halign(btn_box, GTK_ALIGN_CENTER);

        GtkWidget *btn = gtk_button_new();
        gtk_widget_add_css_class(btn, "ace-app-btn");

        GtkWidget *icon_label = gtk_label_new(app->icon);
        gtk_label_set_markup(GTK_LABEL(icon_label),
            g_markup_printf_escaped("<span size='xx-large'>%s</span>", app->icon));
        gtk_button_set_child(GTK_BUTTON(btn), icon_label);

        g_signal_connect(btn, "clicked",
            G_CALLBACK(on_app_clicked), (gpointer)app->app_id);

        GtkWidget *name_label = gtk_label_new(app->name);
        gtk_widget_add_css_class(name_label, "ace-app-name");

        gtk_box_append(GTK_BOX(btn_box), btn);
        gtk_box_append(GTK_BOX(btn_box), name_label);

        gtk_grid_attach(GTK_GRID(self->app_grid), btn_box, col, row, 1, 1);

        col++;
        if (col >= 6) {
            col = 0;
            row++;
        }
    }

    gtk_scrolled_window_set_child(GTK_SCROLLED_WINDOW(grid_scroll), self->app_grid);
    gtk_box_append(GTK_BOX(self), grid_scroll);
}

GtkWidget *ace_activities_new(void) {
    return g_object_new(ACE_ACTIVITIES_TYPE, NULL);
}
