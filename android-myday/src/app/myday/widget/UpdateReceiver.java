package app.myday.widget;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInstaller;

/** Android's installer reports here: it wants the person to confirm, it is done, or it failed. */
public class UpdateReceiver extends BroadcastReceiver {
    static final String ACTION = "app.myday.widget.UPDATE_STATUS";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
        if (status == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = intent.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null && Updater.onScreen) {
                try {
                    ctx.startActivity(confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                    Updater.setStatus(ctx, "Android is asking whether to install the update.");
                    return;
                } catch (RuntimeException e) {
                    // fall through: ask for a tap next time instead
                }
            }
            // An install in the background that Android wants confirmed: drop it and ask for one tap, in the
            // widget and the next time the app is opened.
            int id = intent.getIntExtra(PackageInstaller.EXTRA_SESSION_ID, -1);
            if (id >= 0) {
                try {
                    ctx.getPackageManager().getPackageInstaller().abandonSession(id);
                } catch (RuntimeException ignored) {
                }
            }
            Updater.prefs(ctx).edit().putBoolean("needs_tap", true).apply();
            Updater.setStatus(ctx, "A new version is ready. Tap Check for updates to install it.");
            DayWidget.refresh(ctx);
        } else if (status == PackageInstaller.STATUS_SUCCESS) {
            // Android replaces and restarts the app, so this is rarely reached.
            Updater.prefs(ctx).edit().putBoolean("needs_tap", false).apply();
            Updater.setStatus(ctx, "Updated.");
        } else if (status == PackageInstaller.STATUS_FAILURE_ABORTED) {
            // Either the person said no to Android's question, or it is the echo of abandonSession above.
            Updater.prefs(ctx).edit().putBoolean("needs_tap", true).apply();
            if (Updater.onScreen) {
                Updater.setStatus(ctx, "The update was cancelled. Tap Check for updates to try again.");
            }
            DayWidget.refresh(ctx);
        } else if (status == PackageInstaller.STATUS_FAILURE_STORAGE) {
            Updater.setStatus(ctx, "Not enough free space to install the update.");
        } else {
            String detail = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE);
            Updater.setStatus(ctx, "Android couldn't install the update"
                    + (detail == null || detail.isEmpty() ? "." : " (" + detail + ")."));
        }
    }
}
