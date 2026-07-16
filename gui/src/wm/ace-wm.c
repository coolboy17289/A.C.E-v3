/* ============================================
 * A.C.E GUI - Window Manager
 * Manages floating app windows, drag, resize,
 * minimize, maximize, close, z-ordering
 * ============================================ */

#include <gtk/gtk.h>
#include "ace-wm.h"

typedef struct {
    char *app_id;
    char *title;
    char *icon;
    int x, y;
    int width, height;
    int min_width, min_height;
    gboolean maximized;
    gboolean minimized;
    gboolean focused;
    int z_index;
    GtkWidget *window_widget;
} AceWMWindow;

struct _AceWM {
    GObject parent_instance;
    GList *windows;
    int next_z;
    GtkWidget *desktop_container;
};

G_DEFINE_TYPE(AceWM, ace_wm, G_TYPE_OBJECT)

static AceWMWindow *wm_window_new(const char *app_id, const char *title,
                                    const char *icon, int w, int h) {
    AceWMWindow *win = g_new0(AceWMWindow, 1);
    win->app_id = g_strdup(app_id);
    win->title = g_strdup(title);
    win->icon = g_strdup(icon);
    win->x = 100;
    win->y = 60;
    win->width = w;
    win->height = h;
    win->min_width = 400;
    win->min_height = 300;
    win->maximized = FALSE;
    win->minimized = FALSE;
    win->focused = TRUE;
    win->z_index = 0;
    return win;
}

static void wm_window_free(AceWMWindow *win) {
    if (!win) return;
    g_free(win->app_id);
    g_free(win->title);
    g_free(win->icon);
    if (win->window_widget)
        gtk_widget_unparent(win->window_widget);
    g_free(win);
}

static void ace_wm_class_init(AceWMClass *klass) {
    (void)klass;
}

static void ace_wm_init(AceWM *self) {
    self->windows = NULL;
    self->next_z = 100;
    self->desktop_container = NULL;
}

AceWM *ace_wm_new(void) {
    return g_object_new(ACE_WM_TYPE, NULL);
}

void ace_wm_set_container(AceWM *self, GtkWidget *container) {
    self->desktop_container = container;
}

AceWMWindow *ace_wm_open_window(AceWM *self, const char *app_id,
                                  const char *title, const char *icon,
                                  int width, int height) {
    AceWMWindow *win = wm_window_new(app_id, title, icon, width, height);
    win->z_index = self->next_z++;

    self->windows = g_list_prepend(self->windows, win);

    /* TODO: Create actual GTK window widget and add to desktop_container */

    return win;
}

void ace_wm_close_window(AceWM *self, AceWMWindow *win) {
    self->windows = g_list_remove(self->windows, win);
    wm_window_free(win);
}

void ace_wm_focus_window(AceWM *self, AceWMWindow *win) {
    GList *l;
    for (l = self->windows; l; l = l->next) {
        AceWMWindow *w = l->data;
        w->focused = (w == win);
        if (w == win)
            w->z_index = self->next_z++;
    }
}

void ace_wm_minimize_window(AceWM *self, AceWMWindow *win) {
    (void)self;
    win->minimized = TRUE;
    win->focused = FALSE;
}

void ace_wm_maximize_window(AceWM *self, AceWMWindow *win) {
    (void)self;
    win->maximized = !win->maximized;
}

void ace_wm_move_window(AceWM *self, AceWMWindow *win, int x, int y) {
    (void)self;
    win->x = x > 0 ? x : 0;
    win->y = y > 0 ? y : 0;
}

void ace_wm_resize_window(AceWM *self, AceWMWindow *win, int w, int h) {
    (void)self;
    win->width = w > win->min_width ? w : win->min_width;
    win->height = h > win->min_height ? h : win->min_height;
}

GList *ace_wm_get_windows(AceWM *self) {
    return self->windows;
}
