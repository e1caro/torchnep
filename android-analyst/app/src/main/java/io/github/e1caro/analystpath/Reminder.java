package io.github.e1caro.analystpath;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import java.util.Calendar;

/**
 * The daily reminder: one local notification at the time chosen in Settings. It is scheduled on the phone for the
 * next day each time it shows, in a 15-minute window (no server, no exact-alarm permission).
 */
public final class Reminder {
    static final String CHANNEL = "daily";
    static final long WINDOW = 15 * 60 * 1000L;
    private Reminder() { }

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("reminder", Context.MODE_PRIVATE); }

    static void save(Context c, boolean on, int hour, int minute, String title, String text) {
        prefs(c).edit().putBoolean("on", on).putInt("h", hour).putInt("m", minute).putString("title", title).putString("text", text).apply();
        schedule(c);
    }

    static PendingIntent intent(Context c) {
        return PendingIntent.getBroadcast(c, 1, new Intent(c, ReminderReceiver.class), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void schedule(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        am.cancel(intent(c));
        SharedPreferences p = prefs(c);
        if (!p.getBoolean("on", false)) return;
        Calendar t = Calendar.getInstance();
        t.set(Calendar.HOUR_OF_DAY, p.getInt("h", 19));
        t.set(Calendar.MINUTE, p.getInt("m", 0));
        t.set(Calendar.SECOND, 0);
        t.set(Calendar.MILLISECOND, 0);
        if (t.getTimeInMillis() <= System.currentTimeMillis()) t.add(Calendar.DAY_OF_YEAR, 1);
        am.setWindow(AlarmManager.RTC_WAKEUP, t.getTimeInMillis(), WINDOW, intent(c));
    }

    static void channel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null && nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, c.getString(R.string.channel_name), NotificationManager.IMPORTANCE_DEFAULT));
        }
    }
}
