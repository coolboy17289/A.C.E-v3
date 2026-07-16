/* ============================================
 * A.C.E GUI - Theme Manager
 * Manages ACE green theme, dark mode, CSS
 * ============================================ */

#include <gtk/gtk.h>
#include "ace-theme.h"

struct _AceTheme {
    GObject parent_instance;
    GtkCssProvider *css_provider;
};

G_DEFINE_TYPE(AceTheme, ace_theme, G_TYPE_OBJECT)

static const char *ace_css = """
    /* A.C.E Desktop Theme */

    .ace-topbar {
        background-color: rgba(13, 13, 43, 0.85);
        border-bottom: 1px solid rgba(0, 255, 136, 0.15);
    }

    .ace-topbar-btn {
        background: transparent;
        color: #e0e0e0;
        border: none;
        padding: 2px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
    }
    .ace-topbar-btn:hover {
        background: rgba(0, 255, 136, 0.1);
        color: #00ff88;
    }

    .ace-topbar-clock {
        color: #a0a0a0;
        font-size: 12px;
        font-weight: 500;
    }

    .ace-dock {
        background: transparent;
    }

    .ace-dock-bg {
        background: rgba(10, 10, 26, 0.75);
        border: 1px solid rgba(0, 255, 136, 0.1);
        border-radius: 16px;
        padding: 4px 8px;
        backdrop-filter: blur(20px);
    }

    .ace-dock-btn {
        background: transparent;
        border: none;
        padding: 6px 10px;
        border-radius: 10px;
        min-width: 40px;
        min-height: 40px;
    }
    .ace-dock-btn:hover {
        background: rgba(0, 255, 136, 0.12);
    }

    .ace-activities {
        background: rgba(10, 10, 26, 0.92);
        border-radius: 16px;
        border: 1px solid rgba(0, 255, 136, 0.1);
    }

    .ace-search {
        background: rgba(26, 26, 46, 0.8);
        border: 1px solid rgba(0, 255, 136, 0.2);
        border-radius: 24px;
        color: #e0e0e0;
        padding: 8px 20px;
        font-size: 14px;
    }
    .ace-search:focus {
        border-color: #00ff88;
        box-shadow: 0 0 12px rgba(0, 255, 136, 0.2);
    }

    .ace-app-btn {
        background: rgba(26, 26, 46, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 14px;
        min-width: 80px;
        min-height: 80px;
        padding: 12px;
    }
    .ace-app-btn:hover {
        background: rgba(0, 255, 136, 0.08);
        border-color: rgba(0, 255, 136, 0.2);
    }

    .ace-app-name {
        color: #c0c0c0;
        font-size: 11px;
    }

    .ace-desktop {
        background: linear-gradient(135deg, #0a0a2a 0%, #0d1a3a 50%, #0a0a1a 100%);
    }

    .ace-app-window {
        background: rgba(13, 13, 43, 0.95);
        border: 1px solid rgba(0, 255, 136, 0.15);
        border-radius: 12px;
    }

    .ace-app-header {
        background: rgba(10, 10, 26, 0.8);
        border-bottom: 1px solid rgba(0, 255, 136, 0.1);
        padding: 8px 12px;
    }

    .ace-btn-close {
        background: #ff4444;
        border: none;
        border-radius: 50%;
        min-width: 14px;
        min-height: 14px;
        padding: 0;
    }
    .ace-btn-close:hover {
        background: #ff6666;
    }

    .ace-btn-minimize {
        background: #ffaa00;
        border: none;
        border-radius: 50%;
        min-width: 14px;
        min-height: 14px;
        padding: 0;
    }
    .ace-btn-minimize:hover {
        background: #ffcc44;
    }

    .ace-btn-maximize {
        background: #00ff88;
        border: none;
        border-radius: 50%;
        min-width: 14px;
        min-height: 14px;
        padding: 0;
    }
    .ace-btn-maximize:hover {
        background: #44ffaa;
    }
""";

static void ace_theme_class_init(AceThemeClass *klass) {
    (void)klass;
}

static void ace_theme_init(AceTheme *self) {
    self->css_provider = gtk_css_provider_new();
}

AceTheme *ace_theme_new(void) {
    return g_object_new(ACE_THEME_TYPE, NULL);
}

void ace_theme_apply(AceTheme *self) {
    gtk_css_provider_load_from_string(self->css_provider, ace_css);
    gtk_style_context_add_provider_for_display(
        gdk_display_get_default(),
        GTK_STYLE_PROVIDER(self->css_provider),
        GTK_STYLE_PROVIDER_PRIORITY_APPLICATION
    );
}
