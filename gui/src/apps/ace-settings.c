/* ============================================
 * A.C.E Settings - System Configuration App
 * ============================================ */

#include <gtk/gtk.h>

typedef struct {
    GtkWidget *window;
    GtkWidget *stack;
} AceSettingsApp;

static void on_sidebar_row_activated(GtkListBox *box, GtkListBoxRow *row, gpointer user_data) {
    AceSettingsApp *app = (AceSettingsApp *)user_data;
    int idx = gtk_list_box_row_get_index(row);
    const char *pages[] = {"display", "network", "bluetooth", "sound", "power", "appearance", "about"};
    if (idx >= 0 && idx < 7) {
        gtk_stack_set_visible_child_name(GTK_STACK(app->stack), pages[idx]);
    }
}

static AceSettingsApp *ace_settings_app_new(void) {
    AceSettingsApp *app = g_new0(AceSettingsApp, 1);

    app->window = gtk_window_new();
    gtk_window_set_title(GTK_WINDOW(app->window), "ACE Settings");
    gtk_window_set_default_size(GTK_WINDOW(app->window), 850, 550);
    gtk_widget_add_css_class(app->window, "ace-app-window");

    GtkWidget *hbox = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 0);

    /* Sidebar */
    GtkWidget *sidebar_scroll = gtk_scrolled_window_new();
    gtk_widget_set_size_request(sidebar_scroll, 200, -1);
    gtk_scrolled_window_set_policy(GTK_SCROLLED_WINDOW(sidebar_scroll),
        GTK_POLICY_NEVER, GTK_POLICY_AUTOMATIC);

    GtkWidget *sidebar = gtk_list_box_new();
    gtk_widget_add_css_class(sidebar, "ace-settings-sidebar");

    const char *items[][2] = {
        {"🖥️", "Display"}, {"📶", "Network"}, {"📡", "Bluetooth"},
        {"🔊", "Sound"},   {"🔋", "Power"},   {"🎨", "Appearance"},
        {"ℹ️", "About"}, {NULL, NULL}
    };

    for (int i = 0; items[i][0] != NULL; i++) {
        char label[64];
        snprintf(label, sizeof(label), "%s  %s", items[i][0], items[i][1]);
        GtkWidget *row = gtk_label_new(label);
        gtk_widget_set_halign(row, GTK_ALIGN_START);
        gtk_widget_set_margin_start(row, 12);
        gtk_widget_set_margin_top(row, 8);
        gtk_widget_set_margin_bottom(row, 8);
        gtk_list_box_append(GTK_LIST_BOX(sidebar), row);
    }

    g_signal_connect(sidebar, "row-activated", G_CALLBACK(on_sidebar_row_activated), app);
    gtk_scrolled_window_set_child(GTK_SCROLLED_WINDOW(sidebar_scroll), sidebar);
    gtk_box_append(GTK_BOX(hbox), sidebar_scroll);

    /* Separator */
    GtkWidget *sep = gtk_separator_new(GTK_ORIENTATION_VERTICAL);
    gtk_box_append(GTK_BOX(hbox), sep);

    /* Content area */
    app->stack = gtk_stack_new();
    gtk_widget_set_hexpand(app->stack, TRUE);
    gtk_stack_set_transition_type(GTK_STACK(app->stack), GTK_STACK_TRANSITION_TYPE_SLIDE_LEFT_RIGHT);

    /* Appearance page */
    GtkWidget *appearance_box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 12);
    gtk_widget_set_margin_top(appearance_box, 24);
    gtk_widget_set_margin_start(appearance_box, 24);

    GtkWidget *title = gtk_label_new(NULL);
    gtk_label_set_markup(GTK_LABEL(title), "<span size='large' weight='bold'>Appearance</span>");
    gtk_widget_set_halign(title, GTK_ALIGN_START);
    gtk_box_append(GTK_BOX(appearance_box), title);

    GtkWidget *theme_label = gtk_label_new("ACE Theme Color");
    gtk_widget_set_halign(theme_label, GTK_ALIGN_START);
    gtk_box_append(GTK_BOX(appearance_box), theme_label);

    GtkWidget *color_box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 12);
    const char *colors[] = {"#00ff88", "#4488ff", "#ff44aa", "#ffaa00"};
    (void)colors;
    for (int i = 0; i < 4; i++) {
        GtkWidget *btn = gtk_button_new();
        gtk_widget_set_size_request(btn, 40, 40);
        gtk_widget_add_css_class(btn, "ace-color-swatch");
        gtk_box_append(GTK_BOX(color_box), btn);
    }
    gtk_box_append(GTK_BOX(appearance_box), color_box);

    gtk_stack_add_named(GTK_STACK(app->stack), appearance_box, "appearance");

    /* About page */
    GtkWidget *about_box = gtk_box_new(GTK_ORIENTATION_VERTICAL, 8);
    gtk_widget_set_margin_top(about_box, 24);
    gtk_widget_set_margin_start(about_box, 24);
    gtk_widget_set_halign(about_box, GTK_ALIGN_START);

    GtkWidget *about_title = gtk_label_new(NULL);
    gtk_label_set_markup(GTK_LABEL(about_title),
        "<span size='xx-large' weight='bold'>A.C.E</span>\n"
        "<span size='medium'>Academic Companion Engine</span>");
    gtk_widget_set_halign(about_title, GTK_ALIGN_START);
    gtk_box_append(GTK_BOX(about_box), about_title);

    GtkWidget *version = gtk_label_new("Version 1.0.0-alpha");
    gtk_widget_set_halign(version, GTK_ALIGN_START);
    gtk_box_append(GTK_BOX(about_box), version);

    gtk_stack_add_named(GTK_STACK(app->stack), about_box, "about");

    /* Add placeholder pages */
    const char *placeholders[] = {"display", "network", "bluetooth", "sound", "power"};
    for (int i = 0; i < 5; i++) {
        GtkWidget *label = gtk_label_new("Coming soon...");
        gtk_stack_add_named(GTK_STACK(app->stack), label, placeholders[i]);
    }

    gtk_stack_set_visible_child_name(GTK_STACK(app->stack), "appearance");

    gtk_box_append(GTK_BOX(hbox), app->stack);
    gtk_window_set_child(GTK_WINDOW(app->window), hbox);

    return app;
}

void ace_settings_launch(void) {
    AceSettingsApp *app = ace_settings_app_new();
    gtk_window_present(GTK_WINDOW(app->window));
}
