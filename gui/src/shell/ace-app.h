/* ============================================
 * A.C.E GUI - Application Header
 * ============================================ */

#ifndef ACE_APP_H
#define ACE_APP_H

#include <gtk/gtk.h>

#define ACE_APP_TYPE (ace_app_get_type())
G_DECLARE_FINAL_TYPE(AceApp, ace_app, ACE, APP, GtkApplication)

AceApp *ace_app_new(void);

#endif /* ACE_APP_H */
