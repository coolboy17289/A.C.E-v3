/* ============================================
 * A.C.E Terminal - Native GTK4 Terminal Emulator
 * ============================================ */

#include <gtk/gtk.h>

typedef struct {
    GtkWidget *window;
    GtkWidget *text_view;
    GtkTextBuffer *buffer;
    GtkWidget *entry;
} AceTerminalApp;

static void on_entry_activate(GtkEntry *entry, gpointer user_data) {
    AceTerminalApp *app = (AceTerminalApp *)user_data;
    const char *cmd = gtk_editable_get_text(GTK_EDITABLE(entry));
    if (cmd && *cmd) {
        GtkTextIter end;
        gtk_text_buffer_get_end_iter(app->buffer, &end);

        /* Echo command */
        char prompt[1024];
        snprintf(prompt, sizeof(prompt), "\nace@ace:~$ %s\n", cmd);
        gtk_text_buffer_insert(app->buffer, &end, prompt, -1);

        /* TODO: Actually execute command and capture output */
        gtk_text_buffer_get_end_iter(app->buffer, &end);
        gtk_text_buffer_insert(app->buffer, &end, "(command execution not yet implemented)\n", -1);

        gtk_editable_set_text(GTK_EDITABLE(entry), "");
    }
}

static AceTerminalApp *ace_terminal_app_new(void) {
    AceTerminalApp *app = g_new0(AceTerminalApp, 1);

    app->window = gtk_window_new();
    gtk_window_set_title(GTK_WINDOW(app->window), "ACE Terminal");
    gtk_window_set_default_size(GTK_WINDOW(app->window), 800, 500);
    gtk_widget_add_css_class(app->window, "ace-app-window");

    GtkWidget *vbox = gtk_box_new(GTK_ORIENTATION_VERTICAL, 0);
    gtk_window_set_child(GTK_WINDOW(app->window), vbox);

    /* Header */
    GtkWidget *header = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 8);
    gtk_widget_add_css_class(header, "ace-app-header");
    GtkWidget *title_label = gtk_label_new("🖥️ Terminal");
    gtk_box_append(GTK_BOX(header), title_label);
    gtk_widget_set_hexpand(title_label, TRUE);
    gtk_box_append(GTK_BOX(vbox), header);

    /* Terminal output */
    GtkWidget *scroll = gtk_scrolled_window_new();
    gtk_widget_set_vexpand(scroll, TRUE);
    gtk_widget_set_hexpand(scroll, TRUE);

    app->text_view = gtk_text_view_new();
    gtk_text_view_set_editable(GTK_TEXT_VIEW(app->text_view), FALSE);
    gtk_text_view_set_monospace(GTK_TEXT_VIEW(app->text_view), TRUE);
    gtk_text_view_set_left_margin(GTK_TEXT_VIEW(app->text_view), 12);
    gtk_text_view_set_top_margin(GTK_TEXT_VIEW(app->text_view), 8);
    app->buffer = gtk_text_view_get_buffer(GTK_TEXT_VIEW(app->text_view));

    /* Welcome message */
    GtkTextIter end;
    gtk_text_buffer_get_end_iter(app->buffer, &end);
    gtk_text_buffer_insert(app->buffer, &end,
        "A.C.E Terminal v1.0\n"
        "Academic Companion Engine\n\n"
        "ace@ace:~$ ", -1);

    gtk_scrolled_window_set_child(GTK_SCROLLED_WINDOW(scroll), app->text_view);
    gtk_box_append(GTK_BOX(vbox), scroll);

    /* Input entry */
    app->entry = gtk_entry_new();
    gtk_widget_add_css_class(app->entry, "ace-terminal-input");
    gtk_widget_set_margin_start(app->entry, 8);
    gtk_widget_set_margin_end(app->entry, 8);
    gtk_widget_set_margin_bottom(app->entry, 8);
    g_signal_connect(app->entry, "activate", G_CALLBACK(on_entry_activate), app);
    gtk_box_append(GTK_BOX(vbox), app->entry);

    return app;
}

void ace_terminal_launch(void) {
    AceTerminalApp *app = ace_terminal_app_new();
    gtk_window_present(GTK_WINDOW(app->window));
}
