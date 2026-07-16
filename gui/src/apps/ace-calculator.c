/* ============================================
 * A.C.E Calculator - Native GTK4 Calculator App
 * ============================================ */

#include <gtk/gtk.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    GtkWidget *window;
    GtkWidget *display;
    char expression[256];
    double result;
    int expr_len;
} AceCalcApp;

static void update_display(AceCalcApp *app) {
    gtk_label_set_text(GTK_LABEL(app->display), app->expression);
}

static void on_digit(GtkButton *btn, gpointer user_data) {
    AceCalcApp *app = (AceCalcApp *)user_data;
    const char *digit = gtk_button_get_label(btn);
    if (app->expr_len < 250) {
        strcat(app->expression, digit);
        app->expr_len += strlen(digit);
        update_display(app);
    }
}

static void on_operator(GtkButton *btn, gpointer user_data) {
    AceCalcApp *app = (AceCalcApp *)user_data;
    const char *op = gtk_button_get_label(btn);
    if (app->expr_len < 248) {
        strcat(app->expression, op);
        app->expr_len += strlen(op);
        update_display(app);
    }
}

static void on_clear(GtkButton *btn, gpointer user_data) {
    (void)btn;
    AceCalcApp *app = (AceCalcApp *)user_data;
    app->expression[0] = '\0';
    app->expr_len = 0;
    update_display(app);
}

static void on_equals(GtkButton *btn, gpointer user_data) {
    (void)btn;
    AceCalcApp *app = (AceCalcApp *)user_data;
    /* Simple eval placeholder */
    gtk_label_set_text(GTK_LABEL(app->display), "Result: (eval TODO)");
}

static AceCalcApp *ace_calc_app_new(void) {
    AceCalcApp *app = g_new0(AceCalcApp, 1);

    app->window = gtk_window_new();
    gtk_window_set_title(GTK_WINDOW(app->window), "ACE Calculator");
    gtk_window_set_default_size(GTK_WINDOW(app->window), 320, 450);
    gtk_widget_add_css_class(app->window, "ace-app-window");

    GtkWidget *vbox = gtk_box_new(GTK_ORIENTATION_VERTICAL, 4);
    gtk_widget_set_margin_start(vbox, 8);
    gtk_widget_set_margin_end(vbox, 8);
    gtk_widget_set_margin_bottom(vbox, 8);
    gtk_window_set_child(GTK_WINDOW(app->window), vbox);

    /* Display */
    app->display = gtk_label_new("0");
    gtk_widget_add_css_class(app->display, "ace-calc-display");
    gtk_widget_set_size_request(app->display, -1, 60);
    gtk_widget_set_halign(app->display, GTK_ALIGN_END);
    gtk_widget_set_margin_end(app->display, 12);
    gtk_widget_set_margin_top(app->display, 8);
    gtk_widget_set_margin_bottom(app->display, 8);
    gtk_box_append(GTK_BOX(vbox), app->display);

    /* Button grid */
    const char *buttons[][4] = {
        {"C",  "±",  "%",  "÷"},
        {"7",  "8",  "9",  "×"},
        {"4",  "5",  "6",  "−"},
        {"1",  "2",  "3",  "+"},
        {"0",  ".",  "⌫",  "="},
    };

    for (int r = 0; r < 5; r++) {
        GtkWidget *row = gtk_box_new(GTK_ORIENTATION_HORIZONTAL, 4);
        for (int c = 0; c < 4; c++) {
            GtkWidget *btn = gtk_button_new_with_label(buttons[r][c]);
            gtk_widget_add_css_class(btn, "ace-calc-btn");
            if (c == 3)
                gtk_widget_add_css_class(btn, "ace-calc-btn-op");

            if (strcmp(buttons[r][c], "C") == 0)
                g_signal_connect(btn, "clicked", G_CALLBACK(on_clear), app);
            else if (strcmp(buttons[r][c], "=") == 0)
                g_signal_connect(btn, "clicked", G_CALLBACK(on_equals), app);
            else if (strchr("+-×÷%", buttons[r][c][0]))
                g_signal_connect(btn, "clicked", G_CALLBACK(on_operator), app);
            else
                g_signal_connect(btn, "clicked", G_CALLBACK(on_digit), app);

            gtk_widget_set_hexpand(btn, TRUE);
            gtk_box_append(GTK_BOX(row), btn);
        }
        gtk_box_append(GTK_BOX(vbox), row);
    }

    return app;
}

void ace_calculator_launch(void) {
    AceCalcApp *app = ace_calc_app_new();
    gtk_window_present(GTK_WINDOW(app->window));
}
