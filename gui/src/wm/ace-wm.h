/* ============================================
 * A.C.E GUI - Window Manager Header
 * ============================================ */

#ifndef ACE_WM_H
#define ACE_WM_H

#include <gtk/gtk.h>

#define ACE_WM_TYPE (ace_wm_get_type())
G_DECLARE_FINAL_TYPE(AceWM, ace_wm, ACE, WM, GObject)

/* Forward declare opaque window handle */
typedef struct _AceWMWindow AceWMWindow;

AceWM *ace_wm_new(void);
void ace_wm_set_container(AceWM *self, GtkWidget *container);

AceWMWindow *ace_wm_open_window(AceWM *self, const char *app_id,
                                  const char *title, const char *icon,
                                  int width, int height);
void ace_wm_close_window(AceWM *self, AceWMWindow *win);
void ace_wm_focus_window(AceWM *self, AceWMWindow *win);
void ace_wm_minimize_window(AceWM *self, AceWMWindow *win);
void ace_wm_maximize_window(AceWM *self, AceWMWindow *win);
void ace_wm_move_window(AceWM *self, AceWMWindow *win, int x, int y);
void ace_wm_resize_window(AceWM *self, AceWMWindow *win, int w, int h);
GList *ace_wm_get_windows(AceWM *self);

#endif /* ACE_WM_H */
