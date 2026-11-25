package app.myday.widget;

import android.Manifest;
import android.content.ContentUris;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract.Attendees;
import android.provider.CalendarContract.Calendars;
import android.provider.CalendarContract.Events;
import android.provider.CalendarContract.Instances;

import java.util.ArrayList;
import java.util.List;
import java.util.TimeZone;

/** Reads and writes the phone's calendars (Google Calendar and any other synced account). */
final class Cal {
    static final class Ev {
        long id, calendarId, begin, end;
        String title, place, date;
        boolean allDay, editable;
        int color;
    }

    static final class Info {
        long id;
        String name, account, accountType;
        boolean primary;
    }

    static final class NoCalendar extends Exception {
        NoCalendar() {
            super("no writable calendar");
        }
    }

    private static final String[] PROJECTION = {
            Instances.EVENT_ID, Instances.TITLE, Instances.EVENT_LOCATION, Instances.BEGIN, Instances.END,
            Instances.ALL_DAY, Instances.DISPLAY_COLOR, Instances.CALENDAR_ID, Instances.RRULE,
            Instances.ORIGINAL_ID, Instances.CALENDAR_ACCESS_LEVEL
    };

    private Cal() {}

    static boolean canRead(Context ctx) {
        return ctx.checkSelfPermission(Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED;
    }

    static boolean canWrite(Context ctx) {
        return ctx.checkSelfPermission(Manifest.permission.WRITE_CALENDAR) == PackageManager.PERMISSION_GRANTED;
    }

    /** Everything on one local day, all-day items first, then by start time. */
    static List<Ev> day(Context ctx, String date) {
        return query(ctx, date, 1);
    }

    /** Every instance in [from, from + days). */
    static List<Ev> range(Context ctx, String from, int days) {
        return query(ctx, from, days);
    }

    private static List<Ev> query(Context ctx, String from, int days) {
        List<Ev> out = new ArrayList<>();
        if (!canRead(ctx)) return out;
        int start = Day.julian(from);
        Uri.Builder b = Instances.CONTENT_BY_DAY_URI.buildUpon();
        ContentUris.appendId(b, start);
        ContentUris.appendId(b, start + days - 1);
        Uri uri = b.build();
        String order = Instances.ALL_DAY + " DESC, " + Instances.BEGIN + " ASC";
        String full = Instances.VISIBLE + "=1 AND (" + Instances.SELF_ATTENDEE_STATUS + " IS NULL OR "
                + Instances.SELF_ATTENDEE_STATUS + "!=" + Attendees.ATTENDEE_STATUS_DECLINED + ") AND ("
                + Instances.STATUS + " IS NULL OR " + Instances.STATUS + "!=" + Events.STATUS_CANCELED + ")";
        Cursor c = null;
        try {
            try {
                c = ctx.getContentResolver().query(uri, PROJECTION, full, null, order);
            } catch (RuntimeException e) {
                if (e instanceof SecurityException) throw e;
                c = ctx.getContentResolver().query(uri, PROJECTION, Instances.VISIBLE + "=1", null, order);
            }
            while (c != null && c.moveToNext()) {
                Ev e = new Ev();
                e.id = c.getLong(0);
                e.title = c.isNull(1) || c.getString(1).trim().isEmpty() ? "(No title)" : c.getString(1).trim();
                e.place = c.isNull(2) ? "" : c.getString(2).trim();
                e.begin = c.getLong(3);
                e.end = c.getLong(4);
                e.allDay = c.getInt(5) != 0;
                e.color = c.isNull(6) ? 0xFF8B8F98 : (c.getInt(6) | 0xFF000000);
                e.calendarId = c.getLong(7);
                boolean recurring = (!c.isNull(8) && !c.getString(8).isEmpty()) || !c.isNull(9);
                e.editable = !recurring && c.getInt(10) >= Calendars.CAL_ACCESS_CONTRIBUTOR;
                e.date = e.allDay ? Day.utcIso(e.begin) : Day.iso(e.begin);
                out.add(e);
            }
        } catch (RuntimeException e) {
            // A missing provider or revoked permission just means no events.
            android.util.Log.e("MyDay", "calendar query failed", e);
        } finally {
            if (c != null) c.close();
        }
        return out;
    }

    /** Calendars the app may add events to, the primary Google calendar first. */
    static List<Info> writable(Context ctx) {
        List<Info> out = new ArrayList<>();
        if (!canRead(ctx) || !canWrite(ctx)) return out;
        String[] proj = {Calendars._ID, Calendars.CALENDAR_DISPLAY_NAME, Calendars.ACCOUNT_NAME,
                Calendars.ACCOUNT_TYPE, Calendars.IS_PRIMARY};
        String sel = Calendars.CALENDAR_ACCESS_LEVEL + ">=" + Calendars.CAL_ACCESS_CONTRIBUTOR
                + " AND " + Calendars.SYNC_EVENTS + "=1";
        Cursor c = null;
        try {
            c = ctx.getContentResolver().query(Calendars.CONTENT_URI, proj, sel, null, Calendars._ID + " ASC");
            while (c != null && c.moveToNext()) {
                Info i = new Info();
                i.id = c.getLong(0);
                i.name = c.isNull(1) ? "Calendar" : c.getString(1);
                i.account = c.isNull(2) ? "" : c.getString(2);
                i.accountType = c.isNull(3) ? "" : c.getString(3);
                i.primary = !c.isNull(4) && c.getInt(4) != 0;
                out.add(i);
            }
        } catch (RuntimeException ignored) {
        } finally {
            if (c != null) c.close();
        }
        // Primary Google calendar first, then other primaries, then the rest.
        List<Info> sorted = new ArrayList<>();
        for (int pass = 0; pass < 3; pass++) {
            for (Info i : out) {
                boolean google = "com.google".equals(i.accountType);
                boolean pick = pass == 0 ? (i.primary && google) : pass == 1 ? (i.primary && !google) : !i.primary;
                if (pick) sorted.add(i);
            }
        }
        return sorted;
    }

    /** The calendar chosen in settings, or the best default. -1 if there is none. */
    static long target(Context ctx) {
        List<Info> all = writable(ctx);
        long chosen = Store.calendarId(ctx);
        for (Info i : all) if (i.id == chosen) return chosen;
        return all.isEmpty() ? -1 : all.get(0).id;
    }

    static void insert(Context ctx, String title, String date, String start, String end, String place)
            throws NoCalendar {
        long cal = target(ctx);
        if (cal < 0) throw new NoCalendar();
        ContentValues v = new ContentValues();
        v.put(Events.CALENDAR_ID, cal);
        v.put(Events.TITLE, title);
        if (!place.isEmpty()) v.put(Events.EVENT_LOCATION, place);
        if (start.isEmpty()) {
            long s = Day.utcMidnight(date);
            v.put(Events.DTSTART, s);
            v.put(Events.DTEND, s + Day.DAY);
            v.put(Events.ALL_DAY, 1);
            v.put(Events.EVENT_TIMEZONE, "UTC");
        } else {
            long s = Day.localMillis(date, start);
            long e = end.isEmpty() ? s + Day.HOUR : Day.localMillis(date, end);
            if (e <= s) e += Day.DAY;
            v.put(Events.DTSTART, s);
            v.put(Events.DTEND, e);
            v.put(Events.ALL_DAY, 0);
            v.put(Events.EVENT_TIMEZONE, TimeZone.getDefault().getID());
        }
        ctx.getContentResolver().insert(Events.CONTENT_URI, v);
    }

    /** Changes only the fields given; empty strings mean "leave as is". */
    static void update(Context ctx, Ev e, String title, String date, String start, String end, String place) {
        ContentValues v = new ContentValues();
        if (!title.isEmpty()) v.put(Events.TITLE, title);
        if (!place.isEmpty()) v.put(Events.EVENT_LOCATION, place);
        if (!date.isEmpty() || !start.isEmpty() || !end.isEmpty()) {
            String d = date.isEmpty() ? e.date : date;
            if (e.allDay && start.isEmpty()) {
                long len = Math.max(1, Math.round((e.end - e.begin) / (double) Day.DAY));
                long s = Day.utcMidnight(d);
                v.put(Events.DTSTART, s);
                v.put(Events.DTEND, s + len * Day.DAY);
            } else {
                String st = !start.isEmpty() ? start : (e.allDay ? "09:00" : Day.hhmm(e.begin));
                long s = Day.localMillis(d, st);
                long en;
                if (!end.isEmpty()) {
                    en = Day.localMillis(d, end);
                    if (en <= s) en += Day.DAY;
                } else {
                    en = s + (e.allDay ? Day.HOUR : Math.max(Day.MINUTE * 15, e.end - e.begin));
                }
                v.put(Events.DTSTART, s);
                v.put(Events.DTEND, en);
                v.put(Events.ALL_DAY, 0);
                v.put(Events.EVENT_TIMEZONE, TimeZone.getDefault().getID());
            }
        }
        if (v.size() == 0) return;
        ctx.getContentResolver().update(ContentUris.withAppendedId(Events.CONTENT_URI, e.id), v, null, null);
    }

    static void delete(Context ctx, long eventId) {
        ctx.getContentResolver().delete(ContentUris.withAppendedId(Events.CONTENT_URI, eventId), null, null);
    }
}
