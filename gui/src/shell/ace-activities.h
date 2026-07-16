/* ============================================
 * A.C.E GUI - Activities Overlay Header
 * ============================================ */

#ifndef ACE_ACTIVITIES_H
#define ACE_ACTIVITIES_H

#include <gtk/gtk.h>

#define ACE_ACTIVITIES_TYPE (ace_activities_get_type())
G_DECLARE_FINAL_TYPE(AceActivities, ace_activities, ACE, ACTIVITIES, GtkWidget)

GtkWidget *ace_activities_new(void);

#endif /* ACE_ACTIVITIES_H */
