package app.myday.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.RemoteViews;

import java.util.List;

/**
 * The home-screen widget: a header, optionally a week strip, and a scrolling list below.
 *
 * It redraws when the calendar provider broadcasts a change (the main route: delivered even while the app is in
 * the background), when the content-trigger job fires, at the next event boundary, on a 15-minute heartbeat, on
 * the phone's own half-hourly widget update, and when the refresh button is tapped. Several routes on purpose:
 * each one can be held back by a phone's battery rules.
 */
public class DayWidget extends AppWidgetProvider {
    static final String ACTION_REFRESH = "app.myday.widget.REFRESH";
    private static final String REASON = "reason";

    /** The longest the widget goes without redrawing while the phone is awake, whatever else fails. */
    private static final long HEARTBEAT = 15 * Day.MINUTE;

    private static final int[] SKY_BG = {R.drawable.header_morning, R.drawable.header_day,
            R.drawable.header_evening, R.drawable.header_night};
    private static final int[] SKY_INK = {0xFF2B1B00, 0xFFFFFFFF, 0xFFFFFFFF, 0xFFE8EAFF};
    private static final int[] SKY_BUTTON = {R.drawable.btn_on_light, R.drawable.btn_on_dark,
            R.drawable.btn_on_dark, R.drawable.btn_white12};

    private static final int[] CELL = {R.id.w0, R.id.w1, R.id.w2, R.id.w3, R.id.w4, R.id.w5, R.id.w6};
    private static final int[] LETTER = {R.id.w0l, R.id.w1l, R.id.w2l, R.id.w3l, R.id.w4l, R.id.w5l, R.id.w6l};
    private static final int[] NUMBER = {R.id.w0n, R.id.w1n, R.id.w2n, R.id.w3n, R.id.w4n, R.id.w5n, R.id.w6n};
    private static final int[] DOT = {R.id.w0d, R.id.w1d, R.id.w2d, R.id.w3d, R.id.w4d, R.id.w5d, R.id.w6d};

    /** What the header shows; gathered once per refresh and shared by every widget on screen. */
    static final class Head {
        String today = Day.today();
        String summary = "";
        boolean[] busy = new boolean[7];
        long nextChange;
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        refresh(ctx, "phone's regular update");
    }

    @Override
    public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle options) {
        refresh(ctx, "widget resized");
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String action = intent.getAction();
        if (ACTION_REFRESH.equals(action)) {
            String reason = intent.getStringExtra(REASON);
            refresh(ctx, reason == null ? "timer" : reason);
        } else if (Intent.ACTION_PROVIDER_CHANGED.equals(action)) {
            Log.i("MyDay", "calendar changed");
            refresh(ctx, "calendar changed");
        } else if (Intent.ACTION_TIME_CHANGED.equals(action) || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            refresh(ctx, "clock changed");
        } else if (Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            refresh(ctx, "app updated");
        } else {
            super.onReceive(ctx, intent);
        }
    }

    @Override
    public void onDisabled(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(alarmIntent(ctx));
        CalendarJob.cancel(ctx);
    }

    static void refresh(Context context) {
        refresh(context, "app");
    }

    /** Redraws every My Day widget and books the next redraw. Safe to call from anywhere. */
    static void refresh(Context context, String reason) {
        Context ctx = context.getApplicationContext();
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        if (mgr == null) return;
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, DayWidget.class));
        if (ids == null || ids.length == 0) return;

        Head head = head(ctx);
        Style style = Style.current(ctx);
        for (int id : ids) {
            RemoteViews v = shell(ctx, style, head);

            v.setOnClickPendingIntent(R.id.refresh, refreshIntent(ctx, 31, "refresh button"));
            v.setOnClickPendingIntent(R.id.add, open(ctx, MainActivity.ACTION_COMPOSE, 10));
            v.setOnClickPendingIntent(R.id.mic, open(ctx, MainActivity.ACTION_VOICE, 11));
            v.setOnClickPendingIntent(R.id.header, open(ctx, Intent.ACTION_MAIN, 12));
            if (style.week) {
                for (int i = 0; i < 7; i++) {
                    Intent day = new Intent(ctx, Router.class).putExtra(Router.KIND, Router.DAY)
                            .putExtra(Router.BEGIN, Day.startOf(Day.addDays(head.today, i)) + 9 * Day.HOUR);
                    v.setOnClickPendingIntent(CELL[i], PendingIntent.getActivity(ctx, 40 + i, day,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
                }
            }

            Intent adapter = new Intent(ctx, WidgetService.class);
            adapter.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
            adapter.setData(Uri.parse(adapter.toUri(Intent.URI_INTENT_SCHEME)));
            v.setRemoteAdapter(R.id.list, adapter);
            v.setEmptyView(R.id.list, R.id.empty);

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= 31) flags |= PendingIntent.FLAG_MUTABLE;
            v.setPendingIntentTemplate(R.id.list,
                    PendingIntent.getActivity(ctx, 20, new Intent(ctx, Router.class), flags));

            mgr.updateAppWidget(id, v);
        }
        mgr.notifyAppWidgetViewDataChanged(ids, R.id.list);

        Store.noteRefresh(ctx, reason);

        // Redraw again at the next moment the header changes, and in any case within the heartbeat.
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        long next = Math.min(head.nextChange + 2000, System.currentTimeMillis() + HEARTBEAT);
        if (am != null) am.set(AlarmManager.RTC, next, alarmIntent(ctx));
        CalendarJob.schedule(ctx);
        UpdateJob.schedule(ctx);
    }

    /** Reads the calendar for the header line and the week strip. */
    static Head head(Context ctx) {
        Head h = new Head();
        long now = System.currentTimeMillis();
        h.nextChange = Math.min(Day.nextMidnight(now), Day.nextPeriodChange(now));
        if (!Cal.canRead(ctx)) {
            h.summary = "Tap + to connect your calendar";
            return h;
        }
        List<Cal.Ev> week = Cal.range(ctx, h.today, 7);
        Cal.Ev current = null, next = null;
        boolean anyToday = false;
        for (Cal.Ev e : week) {
            for (int i = 0; i < 7; i++) {
                if (e.date.equals(Day.addDays(h.today, i))) h.busy[i] = true;
            }
            if (!e.date.equals(h.today)) continue;
            anyToday = true;
            if (e.allDay) continue;
            if (e.begin <= now && now < e.end) {
                if (current == null) current = e;
                h.nextChange = Math.min(h.nextChange, e.end);
            } else if (e.begin > now) {
                if (next == null) next = e;
                h.nextChange = Math.min(h.nextChange, e.begin);
            }
        }
        if (current != null) {
            h.summary = "Now: " + current.title + " · until " + Day.clock(ctx, current.end);
        } else if (next != null) {
            h.summary = "Next: " + next.title + " · " + Day.clock(ctx, next.begin);
        } else {
            h.summary = anyToday ? "Nothing else on today" : "Nothing scheduled today";
        }
        return h;
    }

    /** The widget's frame in the given style, without the list or any tap targets. */
    static RemoteViews shell(Context ctx, Style s, Head h) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget);
        int period = Day.period(System.currentTimeMillis());
        int inkL = s.skyHeader ? SKY_INK[period] : s.inkL, inkD = s.skyHeader ? SKY_INK[period] : s.inkD;
        int softL = s.skyHeader ? SKY_INK[period] : s.muteL, softD = s.skyHeader ? SKY_INK[period] : s.muteD;
        int buttonBg = s.skyHeader ? SKY_BUTTON[period] : s.buttonBg;

        v.setInt(R.id.root, "setBackgroundResource", s.rootBg);
        v.setInt(R.id.header, "setBackgroundResource", s.skyHeader ? SKY_BG[period] : 0);
        Style.text(ctx, v, R.id.day, inkL, inkD);
        Style.text(ctx, v, R.id.date, softL, softD);
        Style.text(ctx, v, R.id.next, inkL, inkD);
        v.setTextViewText(R.id.next, h.summary);
        v.setViewVisibility(R.id.next, s.summary ? View.VISIBLE : View.GONE);
        for (int button : new int[]{R.id.add, R.id.mic, R.id.refresh}) {
            v.setInt(button, "setBackgroundResource", buttonBg);
            Style.tint(ctx, v, button, inkL, inkD);
        }

        v.setViewVisibility(R.id.bigdate, s.bigDate ? View.VISIBLE : View.GONE);
        if (s.bigDate) {
            if (s.bigDateAccent) Style.text(ctx, v, R.id.bigdate, s.accentL, s.accentD);
            else Style.text(ctx, v, R.id.bigdate, inkL, inkD);
        }
        String dateFormat = s.bigDate ? "MMMM" : "d MMMM";
        v.setCharSequence(R.id.date, "setFormat12Hour", dateFormat);
        v.setCharSequence(R.id.date, "setFormat24Hour", dateFormat);

        v.setViewVisibility(R.id.week, s.week ? View.VISIBLE : View.GONE);
        if (s.week) {
            for (int i = 0; i < 7; i++) {
                String date = Day.addDays(h.today, i);
                v.setTextViewText(LETTER[i], Day.weekdayLetter(date));
                v.setTextViewText(NUMBER[i], Day.dayOfMonth(date));
                Style.text(ctx, v, LETTER[i], s.muteL, s.muteD);
                if (i == 0) {
                    v.setInt(NUMBER[i], "setBackgroundResource", s.pill);
                    Style.text(ctx, v, NUMBER[i], s.pillInkL, s.pillInkD);
                } else {
                    v.setInt(NUMBER[i], "setBackgroundResource", 0);
                    Style.text(ctx, v, NUMBER[i], s.inkL, s.inkD);
                }
                Style.tint(ctx, v, DOT[i], s.accentL, s.accentD);
                v.setViewVisibility(DOT[i], h.busy[i] ? View.VISIBLE : View.INVISIBLE);
            }
        }

        v.setViewVisibility(R.id.hair, s.hairline ? View.VISIBLE : View.GONE);
        Style.text(ctx, v, R.id.empty_title, s.inkL, s.inkD);
        Style.text(ctx, v, R.id.empty_sub, s.muteL, s.muteD);
        return v;
    }

    /** A stand-alone copy with sample content, for the style picker in the app. */
    static RemoteViews preview(Context ctx, Style s) {
        Head h = new Head();
        h.summary = "Now: Team sync · until 11:00";
        h.busy = new boolean[]{true, false, true, true, false, false, true};
        RemoteViews v = shell(ctx, s, h);
        v.setViewVisibility(R.id.list, View.GONE);
        v.setViewVisibility(R.id.empty, View.GONE);
        v.setViewVisibility(R.id.preview_rows, View.VISIBLE);
        for (Rows.Row r : Rows.sample()) v.addView(R.id.preview_rows, Rows.view(ctx, s, r, false));
        return v;
    }

    private static PendingIntent open(Context ctx, String action, int requestCode) {
        Intent i = new Intent(ctx, MainActivity.class).setAction(action)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, requestCode, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent alarmIntent(Context ctx) {
        return refreshIntent(ctx, 30, "timer");
    }

    private static PendingIntent refreshIntent(Context ctx, int requestCode, String reason) {
        Intent i = new Intent(ctx, DayWidget.class).setAction(ACTION_REFRESH).putExtra(REASON, reason);
        return PendingIntent.getBroadcast(ctx, requestCode, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
