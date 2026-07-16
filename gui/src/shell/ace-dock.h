/* ============================================
 * A.C.E GUI - Dock Header
 * ============================================ */

#ifndef ACE_DOCK_H
#define ACE_DOCK_H

#include <gtk/gtk.h>

#define ACE_DOCK_TYPE (ace_dock_get_type())
G_DECLARE_FINAL_TYPE(AceDock, ace_dock, ACE, DOCK, GtkWidget)

GtkWidget *ace_dock_new(void);

#endif /* ACE_DOCK_H */
