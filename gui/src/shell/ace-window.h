/* ============================================
 * A.C.E GUI - Main Desktop Window Header
 * ============================================ */

#ifndef ACE_WINDOW_H
#define ACE_WINDOW_H

#include <gtk/gtk.h>
#include "ace-app.h"

#define ACE_WINDOW_TYPE (ace_window_get_type())
G_DECLARE_FINAL_TYPE(AceWindow, ace_window, ACE, WINDOW, GtkApplicationWindow)

AceWindow *ace_window_new(AceApp *app);

/* Launch an app by id into the desktop */
void ace_window_launch_app(AceWindow *win, const char *app_id);

#endif /* ACE_WINDOW_H */
