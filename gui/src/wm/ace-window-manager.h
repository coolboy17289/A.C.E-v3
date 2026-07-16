/* ============================================
 * A.C.E Window Manager - High-level API Header
 * ============================================ */

#ifndef ACE_WINDOW_MANAGER_H
#define ACE_WINDOW_MANAGER_H

#include <gtk/gtk.h>

#define ACE_WINDOW_MANAGER_TYPE (ace_window_manager_get_type())
G_DECLARE_FINAL_TYPE(AceWindowManager, ace_window_manager, ACE, WINDOW_MANAGER, GObject)

AceWindowManager *ace_window_manager_new(void);
void ace_window_manager_set_desktop(AceWindowManager *self, GtkWidget *desktop);
void ace_window_manager_launch_app(AceWindowManager *self,
                                     const char *app_id,
                                     const char *title,
                                     const char *icon,
                                     int width, int height);

#endif /* ACE_WINDOW_MANAGER_H */
