/* ============================================
 * A.C.E Utilities Header
 * ============================================ */

#ifndef ACE_UTILS_H
#define ACE_UTILS_H

#include <gtk/gtk.h>

void ace_show_error_dialog(GtkWindow *parent, const char *message);
char *ace_get_home_dir(void);

#endif /* ACE_UTILS_H */
