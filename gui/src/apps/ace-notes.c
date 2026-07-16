/* ============================================
 * A.C.E Notes - Native GTK4 Notes App
 * ============================================ */

#include <gtk/gtk.h>

typedef struct {
    GtkWidget *window;
    GtkWidget *text_view;
    GtkTextBuffer *buffer;
} AceNotesApp;

static void on_save_clicked(GtkButton *btn, gpointer user_data) {
    (void)btn;
    AceNotesApp *app = (AceNotesApp *)user_data;
    GtkTextIter start, end;
    gtk_text_buffer_get_bounds(app->buffer, &start, &end);
    char *text = gtk_text_buffer_get_text(app->buffer, &start, &end, FALSE);
    /* TODO: Save to file */
    g_print("[ACE Notes] Saved %zu bytes\n", strlen(text));
    g_free(text);
}

static AceNotesApp *ace_notes_app_new(void) {
    AceNotesApp *app = g_new0(AceNotesApp, 1);

    app->window = gtk_window_new();
    gtk_window_set_title(GTK_WINDOW(app->window), "ACE Notes");
    gtk_window_set_default_size(GTK_WINDOW(app->window), 700, 500);
    gtk_widget_add_css_class(app->window, "ace-app-window");

    GtkWidget *vbox = gtk_box_new(GTK_ORIENTATION_VERTICAL, 0);
    gtk_window_set_child(GTK_WINDOW(app->window), vbox);

    /* Header */
    GtkWidget *header = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 8);
    gtk_widget_add_css_class(header, "ace-app-header");
    GtkWidget *save_btn = gtk_button_new_with_label("💾 Save");
    g_signal_connect(save_btn, "clicked", G_CALLBACK(on_save_clicked), app);
    gtk_box_append(GTK_BOX(header), save_btn);
    gtk_box_append(GTK_BOX(vbox), header);

    /* Text view */
    GtkWidget *scroll = gtk_scrolled_window_new();
    gtk_widget_set_vexpand(scroll, TRUE);
    gtk_widget_set_hexpand(scroll, TRUE);

    app->text_view = gtk_text_view_new();
    gtk_text_view_set_wrap_mode(GTK_TEXT_VIEW(app->text_view), GTK_WRAP_WORD_CHAR);
    gtk_text_view_set_left_margin(GTK_TEXT_VIEW(app->text_view), 12);
    gtk_text_view_set_top_margin(GTK_TEXT_VIEW(app->text_view), 8);
    gtk_text_view_set_right_margin(GTK_TEXT_VIEW(app->text_view), 12);
    app->buffer = gtk_text_view_get_buffer(GTK_TEXT_VIEW(app->text_view));

    /* Default text */
    gtk_text_buffer_set_text(app->buffer,
        "A.C.E Notes\n\nStart typing here...\n", -1);

    gtk_scrolled_window_set_child(GTK_SCROLLED_WINDOW(scroll), app->text_view);
    gtk_box_append(GTK_BOX(vbox), scroll);

    return app;
}

void ace_notes_launch(void) {
    AceNotesApp *app = ace_notes_app_new();
    gtk_window_present(GTK_WINDOW(app->window));
}
