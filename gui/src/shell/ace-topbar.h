/* ============================================
 * A.C.E GUI - Top Bar Header
 * ============================================ */

#ifndef ACE_TOPBAR_H
#define ACE_TOPBAR_H

#include <gtk/gtk.h>

#define ACE_TOPBAR_TYPE (ace_topbar_get_type())
G_DECLARE_FINAL_TYPE(AceTopbar, ace_topbar, ACE, TOPBAR, GtkWidget)

GtkWidget *ace_topbar_new(void);

#endif /* ACE_TOPBAR_H */
