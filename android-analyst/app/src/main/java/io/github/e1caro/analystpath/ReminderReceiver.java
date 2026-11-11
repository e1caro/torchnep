package io.github.e1caro.analystpath;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

/** Shows the daily reminder; tapping it opens the app. */
public class ReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        if (!Reminder.prefs(c).getBoolean("on", false)) return;
        show(c);
        Reminder.schedule(c);
    }

    static void show(Context c) {
        SharedPreferences p = Reminder.prefs(c);
        Reminder.channel(c);
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, Reminder.CHANNEL) : new Notification.Builder(c);
        b.setSmallIcon(R.drawable.ic_stat_analyst)
                .setContentTitle(p.getString("title", c.getString(R.string.app_name)))
                .setContentText(p.getString("text", c.getString(R.string.reminder_text)))
                .setContentIntent(pi)
                .setAutoCancel(true);
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            try { nm.notify(1, b.build()); } catch (SecurityException ignored) { /* notifications not allowed */ }
        }
    }
}
