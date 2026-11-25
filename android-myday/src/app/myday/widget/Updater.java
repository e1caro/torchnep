package app.myday.widget;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import org.json.JSONException;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Updating the app from inside the app: reads the project's public list of releases on GitHub, downloads a newer
 * APK and hands it to Android's installer, which replaces the app and keeps its data. Every release is signed
 * with the same key; Android refuses anything else. Nothing is sent.
 */
final class Updater {
    static final long AUTO_CHECK_EVERY = 6 * Day.HOUR;

    /** Whether the app's screen is showing: Android's "update this app?" question can only be shown then. */
    static volatile boolean onScreen;

    private static final Object LOCK = new Object();

    private Updater() {}

    static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences("update", Context.MODE_PRIVATE);
    }

    /** The installed version: the N of "1.N". */
    static int currentVersion(Context ctx) {
        try {
            PackageInfo info = ctx.getPackageManager().getPackageInfo(ctx.getPackageName(), 0);
            return Build.VERSION.SDK_INT >= 28 ? (int) info.getLongVersionCode() : info.versionCode;
        } catch (PackageManager.NameNotFoundException e) {
            return 0;
        }
    }

    /** True when a newer version is downloaded and Android wants the person to confirm installing it. */
    static boolean needsTap(Context ctx) {
        SharedPreferences p = prefs(ctx);
        return p.getBoolean("needs_tap", false) && p.getInt("ready_version", 0) > currentVersion(ctx);
    }

    static boolean autoCheckDue(Context ctx) {
        return System.currentTimeMillis() - prefs(ctx).getLong("checked_at", 0) > AUTO_CHECK_EVERY;
    }

    /** Tidies up after an update went in: called when the app's screen opens. */
    static void settle(Context ctx) {
        SharedPreferences p = prefs(ctx);
        int ready = p.getInt("ready_version", 0);
        if (ready != 0 && currentVersion(ctx) >= ready) {
            p.edit().remove("ready_version").putBoolean("needs_tap", false)
                    .putString("status", "Updated to version 1." + currentVersion(ctx) + ".").apply();
        }
    }

    static String status(Context ctx) {
        return prefs(ctx).getString("status", "");
    }

    static void setStatus(Context ctx, String text) {
        prefs(ctx).edit().putString("status", text).apply();
    }

    /**
     * Looks for a newer version and, if there is one, downloads it and starts the install. Blocks; call from a
     * background thread. What happened is left in {@link #status} for the screen to show.
     */
    static void run(Context context) {
        Context ctx = context.getApplicationContext();
        synchronized (LOCK) {
            prefs(ctx).edit().putLong("checked_at", System.currentTimeMillis()).apply();
            try {
                Updates.Update update = check(ctx);
                if (update == null) {
                    prefs(ctx).edit().putBoolean("needs_tap", false).apply();
                    setStatus(ctx, "You have the latest version.");
                    return;
                }
                setStatus(ctx, "Downloading version 1." + update.version + "…");
                File apk = download(ctx, update);
                prefs(ctx).edit().putInt("ready_version", update.version).apply();
                setStatus(ctx, "Installing version 1." + update.version + "…");
                install(ctx, apk);
            } catch (IOException | JSONException e) {
                setStatus(ctx, "Couldn't check for updates. Check your connection and try again.");
            } catch (RuntimeException e) {
                Log.e("MyDay", "update failed", e);
                setStatus(ctx, "The update couldn't be installed.");
            }
        }
    }

    private static HttpURLConnection open(String url) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setRequestProperty("User-Agent", "MyDay-Android");
        c.setRequestProperty("Accept", "application/vnd.github+json");
        return c;
    }

    static Updates.Update check(Context ctx) throws IOException, JSONException {
        HttpURLConnection c = open(Updates.RELEASES_URL);
        try {
            if (c.getResponseCode() != 200) throw new IOException("GitHub answered " + c.getResponseCode());
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            copy(c.getInputStream(), buf);
            return Updates.newer(new String(buf.toByteArray(), StandardCharsets.UTF_8), currentVersion(ctx));
        } finally {
            c.disconnect();
        }
    }

    static File download(Context ctx, Updates.Update update) throws IOException {
        if (!update.apkUrl.startsWith(Updates.DOWNLOAD_PREFIX)) throw new IOException("Unexpected download address");
        File dir = new File(ctx.getCacheDir(), "update");
        if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("No room for the download");
        File apk = new File(dir, "MyDay-1." + update.version + ".apk");
        if (apk.exists() && update.size > 0 && apk.length() == update.size) return apk;
        File[] old = dir.listFiles();
        if (old != null) for (File f : old) f.delete();
        File part = new File(dir, apk.getName() + ".part");
        HttpURLConnection c = open(update.apkUrl);
        c.setRequestProperty("Accept", "application/octet-stream");
        try {
            if (c.getResponseCode() != 200) throw new IOException("The download answered " + c.getResponseCode());
            FileOutputStream out = new FileOutputStream(part);
            try {
                copy(c.getInputStream(), out);
            } finally {
                out.close();
            }
            if (update.size > 0 && part.length() != update.size) throw new IOException("The download was cut short");
            if (!part.renameTo(apk)) throw new IOException("Could not save the download");
            return apk;
        } finally {
            c.disconnect();
            if (part.exists()) part.delete();
        }
    }

    /** Hands the APK to Android's installer. The result arrives at {@link UpdateReceiver}. */
    static void install(Context ctx, File apk) throws IOException {
        PackageManager pm = ctx.getPackageManager();
        PackageInfo info = pm.getPackageArchiveInfo(apk.getPath(), 0);
        if (info == null || !ctx.getPackageName().equals(info.packageName)) {
            apk.delete();
            throw new IOException("The download is not this app");
        }
        PackageInstaller installer = pm.getPackageInstaller();
        for (PackageInstaller.SessionInfo old : installer.getMySessions()) {
            try {
                installer.abandonSession(old.getSessionId());
            } catch (RuntimeException ignored) {
            }
        }
        PackageInstaller.SessionParams params =
                new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        params.setAppPackageName(ctx.getPackageName());
        params.setSize(apk.length());
        // An app updating itself may be allowed to do it without asking (Android 12+, once the person has let
        // it install apps). Where Android still wants a yes, UpdateReceiver deals with it.
        if (Build.VERSION.SDK_INT >= 31) {
            params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED);
        }
        int id = installer.createSession(params);
        PackageInstaller.Session session = installer.openSession(id);
        try {
            OutputStream out = session.openWrite("myday.apk", 0, apk.length());
            FileInputStream in = new FileInputStream(apk);
            try {
                byte[] buf = new byte[1 << 16];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                session.fsync(out);
            } finally {
                in.close();
                out.close();
            }
            Intent result = new Intent(ctx, UpdateReceiver.class).setAction(UpdateReceiver.ACTION);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= 31) flags |= PendingIntent.FLAG_MUTABLE;
            session.commit(PendingIntent.getBroadcast(ctx, id, result, flags).getIntentSender());
        } finally {
            session.close();
        }
    }

    private static void copy(InputStream in, OutputStream out) throws IOException {
        try {
            byte[] buf = new byte[1 << 16];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        } finally {
            in.close();
        }
    }
}
