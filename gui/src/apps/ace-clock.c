/* ============================================
 * A.C.E Clock - Native GTK4 Clock & Timer App
 * ============================================ */

#include <gtk/gtk.h>

typedef struct {
    GtkWidget *window;
    GtkWidget *time_label;
    GtkWidget *date_label;
    guint timer_id;
} AceClockApp;

static gboolean update_clock(gpointer user_data) {
    AceClockApp *app = (AceClockApp *)user_data;
    GDateTime *now = g_date_time_new_now_local();
    gchar *time_str = g_date_time_format(now, "%H:%M:%S");
    gchar *date_str = g_date_time_format(now, "%A, %B %d, %Y");
    gtk_label_set_text(GTK_LABEL(app->time_label), time_str);
    gtk_label_set_text(GTK_LABEL(app->date_label), date_str);
    g_free(time_str);
    g_free(date_str);
    g_date_time_unref(now);
    return G_SOURCE_CONTINUE;
}

static AceClockApp *ace_clock_app_new(void) {
    AceClockApp *app = g_new0(AceClockApp, 1);

    app->window = gtk_window_new();
    gtk_window_set_title(GTK_WINDOW(app->window), "ACE Clock");
    gtk_window_set_default_size(GTK_WINDOW(app->window), 400, 300);
    gtk_widget_add_css_class(app->window, "ace-app-window");

    GtkWidget *vbox = gtk_box_new(GTK_ORIENTATION_VERTICAL, 12);
    gtk_widget_set_valign(vbox, GTK_ALIGN_CENTER);
    gtk_widget_set_halign(vbox, GTK_ALIGN_CENTER);
    gtk_window_set_child(GTK_WINDOW(app->window), vbox);

    /* Time */
    app->time_label = gtk_label_new("00:00:00");
    gtk_widget_add_css_class(app->time_label, "ace-clock-time");
    gtk_box_append(GTK_BOX(vbox), app->time_label);

    /* Date */
    app->date_label = gtk_label_new("");
    gtk_widget_add_css_class(app->date_label, "ace-clock-date");
    gtk_box_append(GTK_BOX(vbox), app->date_label);

    /* Start timer */
    update_clock(app);
    app->timer_id = g_timeout_add_seconds(1, update_clock, app);

    return app;
}

void ace_clock_launch(void) {
    AceClockApp *app = ace_clock_app_new();
    gtk_window_present(GTK_WINDOW(app->window));
}
