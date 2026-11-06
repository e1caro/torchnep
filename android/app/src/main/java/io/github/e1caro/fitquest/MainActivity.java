package io.github.e1caro.fitquest;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * FitQuest as an Android app: the web app is shown full screen from https://appassets.androidplatform.net, so storage
 * and fetch work like on the web. Links to anything else (Spotify, an APK download) open outside the app.
 *
 * Updates itself: each release (tag app-N) carries web.zip, the whole web app. When one is newer than what the app
 * shows, it is downloaded in the background into the app's own storage and used from the next time the app comes back
 * to the screen. The APK itself only needs reinstalling when this native part changes (SHELL goes up).
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String RELEASES = "https://api.github.com/repos/e1caro/torchnep/releases?per_page=30";
    private WebView web;
    private String home; // the app's own page
    private int shown; // the web version on screen (the APK's own one is its versionCode)
    private volatile boolean ready; // a newer web version is downloaded and waits for the next resume

    private SharedPreferences prefs() { return getSharedPreferences("web", MODE_PRIVATE); }
    private File webDir(int v) { return new File(getFilesDir(), "web/" + v); }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        int saved = prefs().getInt("ver", 0);
        boolean local = saved > BuildConfig.VERSION_CODE && new File(webDir(saved), "index.html").exists();
        shown = local ? saved : BuildConfig.VERSION_CODE;
        WebViewAssetLoader.Builder b = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this));
        if (local) b.addPathHandler("/local/", new WebViewAssetLoader.InternalStoragePathHandler(this, webDir(saved)));
        final WebViewAssetLoader loader = b.build();
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        // the web app reads these: it runs in the APK, which web version it shows, which native shell it has, and
        // whether it came from Google Play (no self-updates there)
        s.setUserAgentString(s.getUserAgentString() + " FitQuestApp/" + shown + " FitQuestShell/" + BuildConfig.SHELL
                + (BuildConfig.SELF_UPDATE ? "" : " FitQuestStore/play"));
        web.addJavascriptInterface(new Bridge(), "FitQuestNative");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return loader.shouldInterceptRequest(req.getUrl());
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                ownPage = url != null && url.startsWith("https://" + HOST + "/");
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                String h = u.getHost() == null ? "" : u.getHost();
                if (HOST.equals(h)) return false;
                // linking Spotify: its sign-in pages stay in the app, and the way back (the web app's address with
                // ?code=...) is brought home to the app's own page, where the sign-in started
                if (h.equals("e1caro.github.io") && u.getPath() != null && u.getPath().startsWith("/torchnep/fitcoach")
                        && (u.getQueryParameter("code") != null || u.getQueryParameter("error") != null)) {
                    view.loadUrl(home + "?" + u.getEncodedQuery());
                    return true;
                }
                if (h.endsWith("spotify.com") && !h.equals("open.spotify.com")) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception ignored) {
                    // nothing can open it
                }
                return true;
            }
        });
        setContentView(web);
        // Android 15+ draws apps edge to edge: keep the page clear of the status and navigation bars
        if (Build.VERSION.SDK_INT >= 30) {
            web.setOnApplyWindowInsetsListener((v, in) -> {
                Insets b = in.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                v.setPadding(b.left, b.top, b.right, b.bottom);
                return WindowInsets.CONSUMED;
            });
        }
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(0, () -> { if (web.canGoBack()) web.goBack(); else finish(); });
        }
        Reminder.schedule(this);
        home = "https://" + HOST + (local ? "/local/index.html" : "/assets/www/index.html");
        web.loadUrl(home);
        cleanOld(shown);
        if (BuildConfig.SELF_UPDATE) new Thread(this::checkUpdate).start();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (ready) { ready = false; recreate(); } // switch to the new version (the app's data stays in its storage)
        else if (BuildConfig.SELF_UPDATE) new Thread(this::checkUpdate).start();
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    // ---------- bridge to the web app: the daily reminder and the notification permission ----------
    // Only the app's own pages may use it (not a sign-in page opened in the same view).
    private volatile boolean ownPage = true;

    private class Bridge {
        @JavascriptInterface
        public void setReminder(boolean on, int hour, int minute, String title, String text) {
            if (!ownPage) return;
            Reminder.save(MainActivity.this, on, Math.max(0, Math.min(23, hour)), Math.max(0, Math.min(59, minute)), title, text);
        }

        @JavascriptInterface
        public String notificationPermission() {
            if (Build.VERSION.SDK_INT < 33) return "granted";
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return "granted";
            return shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS) || !prefs().getBoolean("asked", false) ? "ask" : "denied";
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            if (!ownPage || Build.VERSION.SDK_INT < 33) return;
            prefs().edit().putBoolean("asked", true).apply();
            runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7));
        }
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (code != 7) return;
        boolean ok = res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED;
        web.evaluateJavascript("window.onNativePermission&&onNativePermission(" + ok + ")", null);
    }

    // ---------- updates ----------
    private long lastCheck;

    private void checkUpdate() {
        if (System.currentTimeMillis() - lastCheck < 10 * 60e3) return;
        lastCheck = System.currentTimeMillis();
        try {
            JSONArray rs = new JSONArray(read(RELEASES));
            int best = Math.max(shown, prefs().getInt("ver", 0));
            String zip = null;
            Pattern tag = Pattern.compile("^app-(\\d+)$"), shell = Pattern.compile("^shell-(\\d+)$");
            for (int i = 0; i < rs.length(); i++) {
                JSONObject r = rs.getJSONObject(i);
                Matcher m = tag.matcher(r.optString("tag_name"));
                if (!m.find() || r.optBoolean("draft")) continue;
                int n = Integer.parseInt(m.group(1));
                if (n <= best) continue;
                JSONArray as = r.getJSONArray("assets");
                String url = null;
                int needs = 1;
                for (int j = 0; j < as.length(); j++) {
                    JSONObject a = as.getJSONObject(j);
                    String name = a.optString("name");
                    if (name.equals("web.zip")) url = a.optString("browser_download_url");
                    Matcher sm = shell.matcher(name);
                    if (sm.find()) needs = Integer.parseInt(sm.group(1));
                }
                if (url != null && needs <= BuildConfig.SHELL) { best = n; zip = url; }
            }
            if (zip == null) return;
            File dir = webDir(best), tmp = new File(getFilesDir(), "web/tmp");
            deleteAll(tmp);
            unzip(zip, tmp);
            if (!new File(tmp, "index.html").exists()) { deleteAll(tmp); return; }
            deleteAll(dir);
            if (!tmp.renameTo(dir)) return;
            prefs().edit().putInt("ver", best).commit();
            ready = true;
        } catch (Exception ignored) {
            // offline or GitHub busy: try again later
        }
    }

    private static HttpURLConnection open(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setRequestProperty("Accept", "application/vnd.github+json");
        c.setInstanceFollowRedirects(true);
        return c;
    }

    private static String read(String url) throws Exception {
        HttpURLConnection c = open(url);
        try (InputStream in = new BufferedInputStream(c.getInputStream())) {
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            for (int k; (k = in.read(buf)) > 0; ) out.write(buf, 0, k);
            return out.toString("UTF-8");
        } finally { c.disconnect(); }
    }

    private static void unzip(String url, File into) throws Exception {
        HttpURLConnection c = open(url);
        String root = into.getCanonicalPath() + File.separator;
        try (ZipInputStream z = new ZipInputStream(new BufferedInputStream(c.getInputStream()))) {
            byte[] buf = new byte[16384];
            for (ZipEntry e; (e = z.getNextEntry()) != null; ) {
                File f = new File(into, e.getName());
                if (!f.getCanonicalPath().startsWith(root)) throw new SecurityException("bad entry"); // stay inside the folder
                if (e.isDirectory()) { f.mkdirs(); continue; }
                f.getParentFile().mkdirs();
                try (OutputStream out = new FileOutputStream(f)) {
                    for (int k; (k = z.read(buf)) > 0; ) out.write(buf, 0, k);
                }
            }
        } finally { c.disconnect(); }
    }

    // keep only the version on screen (and a newer one that may be waiting)
    private void cleanOld(int keep) {
        File[] ds = new File(getFilesDir(), "web").listFiles();
        if (ds == null) return;
        for (File d : ds) {
            try { if (Integer.parseInt(d.getName()) < keep) deleteAll(d); } catch (NumberFormatException ignored) { /* tmp */ }
        }
    }

    private static void deleteAll(File f) {
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteAll(k);
        f.delete();
    }
}
