/* ============================================
 * A.C.E GUI - Theme Manager Header
 * ============================================ */

#ifndef ACE_THEME_H
#define ACE_THEME_H

#include <gtk/gtk.h>

#define ACE_THEME_TYPE (ace_theme_get_type())
G_DECLARE_FINAL_TYPE(AceTheme, ace_theme, ACE, THEME, GObject)

AceTheme *ace_theme_new(void);
void ace_theme_apply(AceTheme *self);

#endif /* ACE_THEME_H */
