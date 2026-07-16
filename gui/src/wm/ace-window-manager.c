/* ============================================
 * A.C.E Window Manager - High-level API
 * Wraps ace-wm.c with app-launch integration
 * ============================================ */

#include <gtk/gtk.h>
#include "ace-wm.h"
#include "ace-window-manager.h"

struct _AceWindowManager {
    GObject parent_instance;
    AceWM *wm;
};

G_DEFINE_TYPE(AceWindowManager, ace_window_manager, G_TYPE_OBJECT)

static void ace_window_manager_class_init(AceWindowManagerClass *klass) {
    (void)klass;
}

static void ace_window_manager_init(AceWindowManager *self) {
    self->wm = ace_wm_new();
}

AceWindowManager *ace_window_manager_new(void) {
    return g_object_new(ACE_WINDOW_MANAGER_TYPE, NULL);
}

void ace_window_manager_set_desktop(AceWindowManager *self, GtkWidget *desktop) {
    ace_wm_set_container(self->wm, desktop);
}

void ace_window_manager_launch_app(AceWindowManager *self,
                                     const char *app_id,
                                     const char *title,
                                     const char *icon,
                                     int width, int height) {
    ace_wm_open_window(self->wm, app_id, title, icon, width, height);
}
