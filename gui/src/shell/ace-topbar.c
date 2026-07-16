/* ============================================
 * A.C.E GUI - Top Bar
 * Activities button, clock, system tray
 * Inspired by GNOME top bar
 * ============================================ */

#include <gtk/gtk.h>
#include "ace-topbar.h"

struct _AceWidget {
    GtkWidget parent_instance;
    GtkWidget *time_label;
    guint timer_id;
};

G_DEFINE_TYPE(AceTopbar, ace_topbar, GTK_TYPE_WIDGET)

static gboolean update_clock(gpointer user_data) {
    AceTopbar *self = ACE_TOPBAR(user_data);
    GDateTime *now = g_date_time_new_now_local();
    gchar *time_str = g_date_time_format(now, "%A, %B %d  %H:%M");
    gtk_label_set_text(GTK_LABEL(self->time_label), time_str);
    g_free(time_str);
    g_date_time_unref(now);
    return G_SOURCE_CONTINUE;
}

static void on_activities_clicked(GtkButton *button, gpointer user_data) {
    /* Emit signal to toggle activities overlay */
    AceTopbar *self = ACE_TOPBAR(user_data);
    (void)self;
    g_print("Activities clicked\n");
}

static void ace_topbar_class_init(AceTopbarClass *klass) {
    GtkWidgetClass *widget_class = GTK_WIDGET_CLASS(klass);
    gtk_widget_class_set_template_from_resource(widget_class, NULL);
}

static void ace_topbar_init(AceTopbar *self) {
    GtkWidget *left_box, *center_box, *right_box;

    gtk_widget_set_layout_manager(GTK_WIDGET(self),
        gtkBoxLayout_new(GTK_ORIENTATION_HORIZONTAL, 0));
    gtk_widget_add_css_class(GTK_WIDGET(self), "ace-topbar");

    /* Set height */
    gtk_widget_set_size_request(GTK_WIDGET(self), -1, 32);

    /* Left: Activities button */
    left_box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 0);
    gtk_widget_set_halign(left_box, GTK_ALIGN_START);
    gtk_widget_set_valign(left_box, GTK_ALIGN_CENTER);

    GtkWidget *activities_btn = gtk_button_new_with_label("Activities");
    gtk_widget_add_css_class(activities_btn, "ace-topbar-btn");
    g_signal_connect(activities_btn, "clicked", G_CALLBACK(on_activities_clicked), self);
    gtk_box_append(GTK_BOX(left_box), activities_btn);

    gtk_widget_set_parent(left_box, GTK_WIDGET(self));

    /* Center: Clock */
    center_box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 0);
    gtk_widget_set_halign(center_box, GTK_ALIGN_CENTER);
    gtk_widget_set_valign(center_box, GTK_ALIGN_CENTER);
    gtk_widget_set_hexpand(center_box, TRUE);

    self->time_label = gtk_label_new("");
    gtk_widget_add_css_class(self->time_label, "ace-topbar-clock");
    gtk_box_append(GTK_BOX(center_box), self->time_label);

    gtk_widget_set_parent(center_box, GTK_WIDGET(self));

    /* Right: System indicators */
    right_box = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 8);
    gtk_widget_set_halign(right_box, GTK_ALIGN_END);
    gtk_widget_set_valign(right_box, GTK_ALIGN_CENTER);

    GtkWidget *vol_label = gtk_label_new("🔊");
    GtkWidget *net_label = gtk_label_new("📶");
    GtkWidget *pwr_label = gtk_label_new("🔋");
    gtk_box_append(GTK_BOX(right_box), vol_label);
    gtk_box_append(GTK_BOX(right_box), net_label);
    gtk_box_append(GTK_BOX(right_box), pwr_label);

    gtk_widget_set_parent(right_box, GTK_WIDGET(self));

    /* Start clock timer */
    update_clock(self);
    self->timer_id = g_timeout_add_seconds(1, update_clock, self);
}

void ace_topbar_new(void) {
    /* Constructor wrapper - returns GtkWidget* */
}
