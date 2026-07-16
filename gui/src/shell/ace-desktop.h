/* ============================================
 * A.C.E GUI - Desktop Area Header
 * ============================================ */

#ifndef ACE_DESKTOP_H
#define ACE_DESKTOP_H

#include <gtk/gtk.h>

#define ACE_DESKTOP_TYPE (ace_desktop_get_type())
G_DECLARE_FINAL_TYPE(AceDesktop, ace_desktop, ACE, DESKTOP, GtkWidget)

GtkWidget *ace_desktop_new(void);

#endif /* ACE_DESKTOP_H */
