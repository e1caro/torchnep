package io.github.e1caro.bloomdoku;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedDispatcher;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
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
 * Bloomdoku as an Android app.
 *
 * The whole web app (the bloomdoku folder) is packed inside the APK under assets/www and shown full screen from
 * https://appassets.androidplatform.net, a secure origin served by the app itself, so storage and fetch work exactly
 * like on the web and the game needs no network. Links to other sites open in the browser.
 *
 * A WebView lacks a few things a browser has, so the app adds them as window.BloomNative (used by BD.native in
 * js/app.js): the share sheet (the daily bouquet, the friend code), the clipboard, a short vibration, and the
 * update controls of Settings (js/update.js): which version is shown, "Check now", and switching to a downloaded
 * version without leaving the app.
 *
 * Updates itself, like Analyst Path (android-analyst/): each release (tag bloomdoku-N) carries web.zip, the whole web
 * app. When one is newer than what the app shows, it is downloaded in the background into the app's own storage and
 * used the next time the app comes back to the screen. Progress is kept: it lives in the WebView's storage for the
 * same origin. The APK only needs reinstalling when this native part changes (a release with a shell-S higher than
 * SHELL).
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String RELEASES = "https://api.github.com/repos/e1caro/torchnep/releases?per_page=30";

    private WebView web;
    private String home; // the app's own page: packed in the APK, or a newer downloaded copy
    private int shown; // the web version on screen (the APK's own one is its versionCode)
    private volatile boolean ready; // a newer web version is downloaded and waits for the next resume
    private volatile int readyVersion;
    private volatile int apkVersion; // a newer release that this shell cannot show: it needs a new APK
    private volatile String apkUrl = "";
    private volatile long lastCheck;
    private volatile boolean checking; // one check at a time: two would unpack into the same folder

    private SharedPreferences webPrefs() { return getSharedPreferences("web", MODE_PRIVATE); }
    private File webDir(int v) { return new File(getFilesDir(), "web/" + v); }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        final WebViewAssetLoader.AssetsPathHandler assets = new WebViewAssetLoader.AssetsPathHandler(this);
        // a downloaded web version newer than the one packed in this APK is shown instead of it
        int saved = webPrefs().getInt("ver", 0);
        final boolean local = saved > BuildConfig.VERSION_CODE && new File(webDir(saved), "index.html").exists();
        shown = local ? saved : BuildConfig.VERSION_CODE;
        WebViewAssetLoader.Builder lb = new WebViewAssetLoader.Builder().addPathHandler("/assets/", assets);
        if (local) lb.addPathHandler("/local/", new WebViewAssetLoader.InternalStoragePathHandler(this, webDir(saved)));
        final WebViewAssetLoader loader = lb.build();
        home = "https://" + HOST + (local ? "/local/index.html" : "/assets/www/index.html");

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false); // the notes of the musical garden play from taps anyway
        // the web app reads these: which web version it shows, which native shell and which APK it runs in
        s.setUserAgentString(s.getUserAgentString() + " BloomdokuApp/1 BloomdokuWeb/" + shown
                + " BloomdokuShell/" + BuildConfig.SHELL + " BloomdokuApk/" + BuildConfig.VERSION_CODE);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER); // no stretch or glow when you swipe past the top or bottom
        web.addJavascriptInterface(new Bridge(), "BloomNative");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return loader.shouldInterceptRequest(req.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOST.equals(u.getHost())) return false; // the app's own pages stay inside
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u)); // anything else opens in the browser
                } catch (Exception ignored) {
                    // nothing on the phone can open it
                }
                return true;
            }
        });

        // Android 15+ draws apps edge to edge: keep the page clear of the status bar, the navigation buttons,
        // the camera cutout and the keyboard (a WebView ignores its own padding, so the frame takes it).
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(getColor(R.color.bg));
        root.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 30) {
            root.setOnApplyWindowInsetsListener((v, in) -> {
                Insets bars = in.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return WindowInsets.CONSUMED;
            });
        }

        // Back closes an open sheet, then goes to the previous page of the app, and leaves the app from the first one.
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::goBackOrFinish);
        }

        // a saved page is only restored when it belongs to the web version now shown
        if (state == null || state.getInt("webVer", 0) != shown || web.restoreState(state) == null) web.loadUrl(home);
        cleanOld(shown);
        new Thread(() -> checkUpdate(false)).start();
    }

    private void goBackOrFinish() {
        if (web == null) {
            finish();
            return;
        }
        web.evaluateJavascript(
            "(function() {" +
            "  if (document.querySelector('.sheet-back') && window.BD && BD.closeSheets) { BD.closeSheets(); return 'handled'; }" +
            "  return 'none';" +
            "})()",
            result -> {
                if ("\"handled\"".equals(result)) return; // a sheet was closed
                if (web.canGoBack()) web.goBack();
                else finish();
            }
        );
    }

    // Older Android (and any version that does not use the callback above) calls this instead.
    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        goBackOrFinish();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
        out.putInt("webVer", shown);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        // switch to a downloaded version, else look for one
        if (ready) { ready = false; recreate(); }
        else new Thread(() -> checkUpdate(false)).start();
    }

    // ---------- updates (the same scheme as Analyst Path's MainActivity) ----------

    /** Looks for a newer release and downloads its web app. force: skip the ten-minute pause (the "Check now" button). */
    private void checkUpdate(boolean force) {
        if (checking || (!force && System.currentTimeMillis() - lastCheck < 10 * 60e3)) return;
        checking = true;
        lastCheck = System.currentTimeMillis();
        try {
            JSONArray rs = new JSONArray(read(RELEASES));
            int best = Math.max(shown, webPrefs().getInt("ver", 0));
            String zip = null;
            Pattern tag = Pattern.compile("^bloomdoku-(\\d+)$"), shell = Pattern.compile("^shell-(\\d+)$");
            for (int i = 0; i < rs.length(); i++) {
                JSONObject r = rs.getJSONObject(i);
                Matcher m = tag.matcher(r.optString("tag_name"));
                if (!m.find() || r.optBoolean("draft")) continue;
                int n = Integer.parseInt(m.group(1));
                if (n <= best) continue;
                JSONArray as = r.getJSONArray("assets");
                String url = null, apk = null;
                int needs = 1;
                for (int j = 0; j < as.length(); j++) {
                    JSONObject a = as.getJSONObject(j);
                    String name = a.optString("name");
                    if (name.equals("web.zip")) url = a.optString("browser_download_url");
                    if (name.endsWith(".apk")) apk = a.optString("browser_download_url");
                    Matcher sm = shell.matcher(name);
                    if (sm.find()) needs = Integer.parseInt(sm.group(1));
                }
                if (url == null) continue;
                if (needs <= BuildConfig.SHELL) { best = n; zip = url; }
                else if (n > apkVersion) { apkVersion = n; apkUrl = apk != null ? apk : r.optString("html_url"); } // this shell is too old for it
            }
            if (zip == null) { tell(ready ? "ready" : apkVersion > shown ? "needsApk" : "current"); return; }
            File dir = webDir(best), tmp = new File(getFilesDir(), "web/tmp");
            deleteAll(tmp);
            unzip(zip, tmp);
            if (!new File(tmp, "index.html").exists() || !new File(tmp, "js/app.js").exists()) { deleteAll(tmp); tell("error"); return; }
            deleteAll(dir);
            if (!tmp.renameTo(dir)) { tell("error"); return; }
            webPrefs().edit().putInt("ver", best).commit();
            readyVersion = best;
            ready = true;
            tell("ready");
        } catch (Exception ignored) {
            if (force) tell("error"); // offline or GitHub busy: the next check tries again (said only when asked)
        } finally {
            checking = false;
        }
    }

    /** Tells the web app (js/update.js) how the last check went. Older web versions have no such function: then nothing happens. */
    private void tell(final String status) {
        final JSONObject o = new JSONObject();
        try {
            o.put("status", status);
            o.put("version", "ready".equals(status) ? readyVersion : "needsApk".equals(status) ? apkVersion : shown);
            o.put("apk", "needsApk".equals(status) ? apkUrl : "");
        } catch (Exception ignored) {
            return;
        }
        runOnUiThread(() -> {
            if (web != null) web.evaluateJavascript("window.BD&&BD.update&&BD.update.fromNative&&BD.update.fromNative(" + o + ")", null);
        });
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
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            for (int k; (k = in.read(buf)) > 0; ) out.write(buf, 0, k);
            return out.toString("UTF-8");
        } finally { c.disconnect(); }
    }

    private static void unzip(String url, File into) throws Exception {
        HttpURLConnection c = open(url);
        String rootPath = into.getCanonicalPath() + File.separator;
        try (ZipInputStream z = new ZipInputStream(new BufferedInputStream(c.getInputStream()))) {
            byte[] buf = new byte[16384];
            for (ZipEntry e; (e = z.getNextEntry()) != null; ) {
                File f = new File(into, e.getName());
                if (!f.getCanonicalPath().startsWith(rootPath)) throw new SecurityException("bad entry"); // stay inside the folder
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
        if (f == null || !f.exists()) return;
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteAll(k);
        f.delete();
    }

    @Override
    protected void onDestroy() {
        web.destroy();
        super.onDestroy();
    }

    /** What the web app can call as window.BloomNative.* (these run on a background thread). */
    private class Bridge {
        @JavascriptInterface
        public void copy(final String text) {
            runOnUiThread(() -> {
                ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("Bloomdoku", text));
            });
        }

        @JavascriptInterface
        public void share(final String text) {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text);
                try {
                    startActivity(Intent.createChooser(i, null));
                } catch (Exception ignored) {
                    // no app can share text
                }
            });
        }

        /** "Check for updates" in Settings: looks now, and answers through BD.update.fromNative. */
        @JavascriptInterface
        public void checkUpdate() {
            new Thread(() -> MainActivity.this.checkUpdate(true)).start();
        }

        /** "Update now": shows the downloaded web version at once (the page is rebuilt; progress is saved). */
        @JavascriptInterface
        public void restart() {
            runOnUiThread(() -> {
                if (ready) { ready = false; recreate(); }
            });
        }

        @JavascriptInterface
        public void vibrate(final long ms) {
            try {
                android.os.Vibrator v = (android.os.Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (v != null && v.hasVibrator()) {
                    long duration = Math.max(5, Math.min(ms, 400));
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        v.vibrate(android.os.VibrationEffect.createOneShot(duration, android.os.VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        v.vibrate(duration);
                    }
                }
            } catch (Exception ignored) {
                // no vibration on this phone
            }
        }
    }
}
