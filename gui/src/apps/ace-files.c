/* ============================================
 * A.C.E Files - Native GTK4 File Manager
 * ============================================ */

#include <gtk/gtk.h>
#include "../shell/ace-theme.h"

typedef struct {
    GtkWidget *window;
    GtkWidget *file_list;
    GtkWidget *path_bar;
    GtkWidget *status_bar;
    char *current_path;
} AceFilesApp;

static void on_back_clicked(GtkButton *btn, gpointer user_data) {
    (void)btn; (void)user_data;
    /* TODO: Navigate up */
}

static AceFilesApp *ace_files_app_new(void) {
    AceFilesApp *app = g_new0(AceFilesApp, 1);
    app->current_path = g_strdup("/home/ace");

    /* Create window */
    app->window = gtk_window_new();
    gtk_window_set_title(GTK_WINDOW(app->window), "ACE Files");
    gtk_window_set_default_size(GTK_WINDOW(app->window), 800, 550);
    gtk_widget_add_css_class(app->window, "ace-app-window");

    GtkWidget *vbox = gtk_box_new(GTK_ORIENTATION_VERTICAL, 0);
    gtk_window_set_child(GTK_WINDOW(app->window), vbox);

    /* Header bar */
    GtkWidget *header = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 8);
    gtk_widget_add_css_class(header, "ace-app-header");
    gtk_widget_set_margin_top(header, 4);
    gtk_widget_set_margin_bottom(header, 4);

    GtkWidget *back_btn = gtk_button_new_with_label("◀");
    g_signal_connect(back_btn, "clicked", G_CALLBACK(on_back_clicked), app);
    gtk_box_append(GTK_BOX(header), back_btn);

    app->path_bar = gtk_label_new("/home/ace");
    gtk_widget_set_hexpand(app->path_bar, TRUE);
    gtk_widget_set_halign(app->path_bar, GTK_ALIGN_START);
    gtk_box_append(GTK_BOX(header), app->path_bar);

    gtk_box_append(GTK_BOX(vbox), header);

    /* File list (using ListBox) */
    GtkWidget *scroll = gtk_scrolled_window_new();
    gtk_widget_set_vexpand(scroll, TRUE);
    gtk_widget_set_hexpand(scroll, TRUE);

    app->file_list = gtk_list_box_new();
    gtk_widget_add_css_class(app->file_list, "ace-file-list");

    /* Add sample entries */
    const char *entries[][3] = {
        {"📁", "Documents",  "Folder"},
        {"📁", "Downloads",  "Folder"},
        {"📁", "Pictures",   "Folder"},
        {"📁", "Projects",   "Folder"},
        {"📄", "readme.md",  "2.4 KB"},
        {"📝", "notes.txt",  "8.1 KB"},
        {"🖼️", "photo.png",  "245 KB"},
        {NULL, NULL, NULL}
    };

    for (int i = 0; entries[i][0] != NULL; i++) {
        GtkWidget *row = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 12);
        gtk_widget_set_margin_top(row, 6);
        gtk_widget_set_margin_bottom(row, 6);
        gtk_widget_set_margin_start(row, 12);
        gtk_widget_set_margin_end(row, 12);

        GtkWidget *icon = gtk_label_new(entries[i][0]);
        gtk_box_append(GTK_BOX(row), icon);

        GtkWidget *name = gtk_label_new(entries[i][1]);
        gtk_widget_set_halign(name, GTK_ALIGN_START);
        gtk_widget_set_hexpand(name, TRUE);
        gtk_box_append(GTK_BOX(row), name);

        GtkWidget *info = gtk_label_new(entries[i][2]);
        gtk_widget_add_css_class(info, "ace-file-info");
        gtk_box_append(GTK_BOX(row), info);

        gtk_list_box_append(GTK_LIST_BOX(app->file_list), row);
    }

    gtk_scrolled_window_set_child(GTK_SCROLLED_WINDOW(scroll), app->file_list);
    gtk_box_append(GTK_BOX(vbox), scroll);

    /* Status bar */
    app->status_bar = gtk_label_new("7 items");
    gtk_widget_set_halign(app->status_bar, GTK_ALIGN_START);
    gtk_widget_set_margin_start(app->status_bar, 12);
    gtk_widget_set_margin_top(app->status_bar, 4);
    gtk_widget_set_margin_bottom(app->status_bar, 4);
    gtk_box_append(GTK_BOX(vbox), app->status_bar);

    return app;
}

void ace_files_launch(void) {
    AceFilesApp *app = ace_files_app_new();
    gtk_window_present(GTK_WINDOW(app->window));
}
