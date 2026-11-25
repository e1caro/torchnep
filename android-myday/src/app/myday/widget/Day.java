package app.myday.widget;

import android.content.Context;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/** Date helpers. Dates are "yyyy-MM-dd" strings in local time, times are "HH:mm". */
final class Day {
    static final long MINUTE = 60_000L;
    static final long HOUR = 60 * MINUTE;
    static final long DAY = 24 * HOUR;
    private static final int[] PERIOD_START = {5, 11, 17, 21};

    private Day() {}

    static String iso(long millis) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        return f.format(new Date(millis));
    }

    static String utcIso(long millis) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        return f.format(new Date(millis));
    }

    static String today() {
        return iso(System.currentTimeMillis());
    }

    static boolean isDate(String s) {
        return s != null && s.matches("\\d{4}-\\d{2}-\\d{2}");
    }

    /** Returns "HH:mm" for inputs like "9:30" or "09:30", or "" if it is not a time. */
    static String time(String s) {
        if (s == null) return "";
        s = s.trim();
        if (!s.matches("\\d{1,2}:\\d{2}")) return "";
        int colon = s.indexOf(':');
        int h = Integer.parseInt(s.substring(0, colon));
        int m = Integer.parseInt(s.substring(colon + 1));
        if (h > 23 || m > 59) return "";
        return String.format(Locale.US, "%02d:%02d", h, m);
    }

    private static Calendar local(String date, int hour, int minute) {
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(Integer.parseInt(date.substring(0, 4)), Integer.parseInt(date.substring(5, 7)) - 1,
                Integer.parseInt(date.substring(8, 10)), hour, minute, 0);
        return c;
    }

    static long localMillis(String date, String hhmm) {
        return local(date, Integer.parseInt(hhmm.substring(0, 2)), Integer.parseInt(hhmm.substring(3, 5)))
                .getTimeInMillis();
    }

    static long startOf(String date) {
        return local(date, 0, 0).getTimeInMillis();
    }

    static long utcMidnight(String date) {
        Calendar c = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        c.clear();
        c.set(Integer.parseInt(date.substring(0, 4)), Integer.parseInt(date.substring(5, 7)) - 1,
                Integer.parseInt(date.substring(8, 10)), 0, 0, 0);
        return c.getTimeInMillis();
    }

    static String addDays(String date, int n) {
        Calendar c = local(date, 12, 0);
        c.add(Calendar.DAY_OF_MONTH, n);
        return iso(c.getTimeInMillis());
    }

    /** Julian day number as used by CalendarContract.Instances. */
    static int julian(String date) {
        long noon = local(date, 12, 0).getTimeInMillis();
        long offset = TimeZone.getDefault().getOffset(noon);
        return (int) ((noon + offset) / DAY) + 2440588;
    }

    static long nextMidnight(long now) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(now);
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        c.add(Calendar.DAY_OF_MONTH, 1);
        return c.getTimeInMillis();
    }

    /** 0 morning, 1 day, 2 evening, 3 night. */
    static int period(long now) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(now);
        int h = c.get(Calendar.HOUR_OF_DAY);
        if (h >= 5 && h < 11) return 0;
        if (h >= 11 && h < 17) return 1;
        if (h >= 17 && h < 21) return 2;
        return 3;
    }

    static long nextPeriodChange(long now) {
        for (int add = 0; add <= 1; add++) {
            for (int h : PERIOD_START) {
                Calendar c = Calendar.getInstance();
                c.setTimeInMillis(now);
                c.add(Calendar.DAY_OF_MONTH, add);
                c.set(Calendar.HOUR_OF_DAY, h);
                c.set(Calendar.MINUTE, 0);
                c.set(Calendar.SECOND, 0);
                c.set(Calendar.MILLISECOND, 0);
                if (c.getTimeInMillis() > now) return c.getTimeInMillis();
            }
        }
        return now + 6 * HOUR;
    }

    /** Time in the phone's 12/24-hour style. */
    static String clock(Context ctx, long millis) {
        return android.text.format.DateFormat.getTimeFormat(ctx).format(new Date(millis));
    }

    /** Short form for narrow columns: "17:00", or "5:00pm" on 12-hour phones. */
    static String compactClock(Context ctx, long millis) {
        if (android.text.format.DateFormat.is24HourFormat(ctx)) return hhmm(millis);
        return new SimpleDateFormat("h:mma", Locale.US).format(new Date(millis)).toLowerCase(Locale.US);
    }

    /** "Fri 27" */
    static String dayLabel(String date) {
        return new SimpleDateFormat("EEE d", Locale.getDefault())
                .format(new Date(local(date, 12, 0).getTimeInMillis()));
    }

    static String weekdayLetter(String date) {
        String name = new SimpleDateFormat("EEE", Locale.getDefault())
                .format(new Date(local(date, 12, 0).getTimeInMillis()));
        return name.isEmpty() ? "" : name.substring(0, 1).toUpperCase(Locale.getDefault());
    }

    static String dayOfMonth(String date) {
        return String.valueOf(Integer.parseInt(date.substring(8, 10)));
    }

    static String hhmm(long millis) {
        return new SimpleDateFormat("HH:mm", Locale.US).format(new Date(millis));
    }

    static String weekday(String date) {
        return new SimpleDateFormat("EEEE", Locale.US).format(new Date(local(date, 12, 0).getTimeInMillis()));
    }

    static String shortDate(String date) {
        return new SimpleDateFormat("EEE d MMM", Locale.getDefault())
                .format(new Date(local(date, 12, 0).getTimeInMillis()));
    }

    static String longDate(long millis) {
        return new SimpleDateFormat("EEEE d MMMM", Locale.getDefault()).format(new Date(millis));
    }
}
