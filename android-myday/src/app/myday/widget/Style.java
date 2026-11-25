package app.myday.widget;

import android.content.Context;
import android.content.res.Configuration;
import android.os.Build;
import android.widget.RemoteViews;

/**
 * A widget look. Colours come in light/dark pairs; a style whose pairs differ follows the phone's
 * dark mode, and one whose pairs match looks the same at any time.
 */
final class Style {
    final String key, name;
    int rootBg, buttonBg, nowBg, noteBg, checkOn, pill;
    int inkL, inkD, muteL, muteD, accentL, accentD, pillInkL, pillInkD;
    boolean skyHeader, bigDate, bigDateAccent, summary, week, hairline, alwaysDark;

    private Style(String key, String name) {
        this.key = key;
        this.name = name;
    }

    private Style ink(int light, int dark) {
        inkL = light;
        inkD = dark;
        return this;
    }

    private Style mute(int light, int dark) {
        muteL = light;
        muteD = dark;
        return this;
    }

    private Style accent(int light, int dark) {
        accentL = light;
        accentD = dark;
        return this;
    }

    private static final int INK_L = 0xFF16171A, INK_D = 0xFFF1F1F3, MUTE_L = 0xFF6B6E76, MUTE_D = 0xFF9C9FA8;

    static final Style[] ALL = build();

    private static Style[] build() {
        Style sky = new Style("sky", "Sky").ink(INK_L, INK_D).mute(MUTE_L, MUTE_D).accent(0xFFD4420C, 0xFFFF7A45);
        sky.rootBg = R.drawable.widget_bg;
        sky.skyHeader = true;
        sky.summary = true;
        sky.nowBg = R.drawable.now_tangerine;
        sky.noteBg = R.drawable.note_bg;
        sky.checkOn = R.drawable.ic_check_accent;

        Style cal = new Style("calendar", "Calendar").ink(INK_L, INK_D).mute(MUTE_L, MUTE_D)
                .accent(0xFFD93036, 0xFFFF6369);
        cal.rootBg = R.drawable.widget_bg;
        cal.buttonBg = R.drawable.btn_card;
        cal.week = true;
        cal.pill = R.drawable.pill_red;
        cal.pillInkL = 0xFFFFFFFF;
        cal.pillInkD = 0xFF1A1B1F;
        cal.nowBg = R.drawable.now_red;
        cal.noteBg = R.drawable.note_bg;
        cal.checkOn = R.drawable.ic_check_red;

        Style glass = new Style("glass", "Glass").ink(0xFFFFFFFF, 0xFFFFFFFF).mute(0xD9FFFFFF, 0xD9FFFFFF)
                .accent(0xFFFFD43B, 0xFFFFD43B);
        glass.rootBg = R.drawable.bg_glass;
        glass.buttonBg = R.drawable.btn_on_dark;
        glass.summary = true;
        glass.alwaysDark = true;
        glass.nowBg = R.drawable.now_white12;
        glass.noteBg = R.drawable.chip_white12;
        glass.checkOn = R.drawable.ic_check_yellow;

        Style midnight = new Style("midnight", "Midnight").ink(0xFFF4F4F5, 0xFFF4F4F5).mute(0xFF9A9CA5, 0xFF9A9CA5)
                .accent(0xFFFF7A45, 0xFFFF7A45);
        midnight.rootBg = R.drawable.bg_midnight;
        midnight.buttonBg = R.drawable.btn_white12;
        midnight.bigDate = true;
        midnight.bigDateAccent = true;
        midnight.week = true;
        midnight.alwaysDark = true;
        midnight.pill = R.drawable.pill_ember;
        midnight.pillInkL = midnight.pillInkD = 0xFF0B0C10;
        midnight.nowBg = R.drawable.now_ember;
        midnight.noteBg = R.drawable.chip_white8;
        midnight.checkOn = R.drawable.ic_check_ember;

        Style emerald = new Style("emerald", "Emerald").ink(0xFFFFFFFF, 0xFFFFFFFF).mute(0xDEFFFFFF, 0xDEFFFFFF)
                .accent(0xFFD9F99D, 0xFFD9F99D);
        emerald.rootBg = R.drawable.bg_emerald;
        emerald.buttonBg = R.drawable.btn_on_dark;
        emerald.summary = true;
        emerald.alwaysDark = true;
        emerald.nowBg = R.drawable.now_white14;
        emerald.noteBg = R.drawable.chip_white14;
        emerald.checkOn = R.drawable.ic_check_lime;

        Style minimal = new Style("minimal", "Minimal").ink(INK_L, INK_D).mute(MUTE_L, MUTE_D).accent(INK_L, INK_D);
        minimal.rootBg = R.drawable.widget_bg;
        minimal.buttonBg = R.drawable.btn_card;
        minimal.bigDate = true;
        minimal.summary = true;
        minimal.hairline = true;
        minimal.nowBg = R.drawable.now_card;
        minimal.noteBg = R.drawable.note_bg;
        minimal.checkOn = R.drawable.ic_check_ink;

        return new Style[]{sky, cal, glass, midnight, emerald, minimal};
    }

    static Style byKey(String key) {
        for (Style s : ALL) if (s.key.equals(key)) return s;
        return ALL[0];
    }

    static Style current(Context ctx) {
        return byKey(Store.style(ctx));
    }

    static boolean night(Context ctx) {
        int mode = ctx.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        return mode == Configuration.UI_MODE_NIGHT_YES;
    }

    /** Sets a text colour that switches with dark mode on the home screen where Android supports it. */
    static void text(Context ctx, RemoteViews v, int id, int light, int dark) {
        if (light != dark && Build.VERSION.SDK_INT >= 31) v.setColorInt(id, "setTextColor", light, dark);
        else v.setTextColor(id, night(ctx) ? dark : light);
    }

    static void tint(Context ctx, RemoteViews v, int id, int light, int dark) {
        if (light != dark && Build.VERSION.SDK_INT >= 31) v.setColorInt(id, "setColorFilter", light, dark);
        else v.setInt(id, "setColorFilter", night(ctx) ? dark : light);
    }

    /** Calendar colours are picked for white paper; this lifts them so they read on dark backgrounds. */
    static int lift(int color) {
        int r = (color >> 16) & 0xFF, g = (color >> 8) & 0xFF, b = color & 0xFF;
        r += (255 - r) * 2 / 5;
        g += (255 - g) * 2 / 5;
        b += (255 - b) * 2 / 5;
        return 0xFF000000 | (r << 16) | (g << 8) | b;
    }
}
