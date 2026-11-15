package io.github.e1caro.analystpath;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.window.OnBackInvokedDispatcher;

import androidx.core.content.FileProvider;
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
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Data Analyst Path as an Android app.
 *
 * The whole web app (the data-analyst-path folder) is packed inside the APK under assets/www and shown full screen
 * from https://appassets.androidplatform.net, a secure origin served by the app itself, so storage, fetch and
 * WebAssembly (the SQL Lab) work exactly like on the web, with no network. Links to other sites open in the browser.
 *
 * A WebView cannot do a few things a browser does, so the app adds them:
 *  - save files (CSV practice data, backups): the system "save as" screen, no storage permission needed;
 *  - open the calendar reminder (.ics) straight in the calendar app;
 *  - copy to the clipboard and the system share sheet (to send the progress code to your other device);
 *  - pick a file (import a backup), and show confirm / alert boxes;
 *  - one optional notification a day at the time chosen in Settings (Reminder, ReminderReceiver, BootReceiver).
 * The web side finds these through window.AnalystNative (see ui.native in js/ui.js).
 *
 * Updates itself, like FitQuest (android/): each release (tag analyst-N) carries web.zip, the whole web app. When one
 * is newer than what the app shows, it is downloaded in the background into the app's own storage and used the next
 * time the app comes back to the screen. Progress is kept: it lives in the WebView's storage for the same origin.
 * The APK only needs reinstalling when this native part changes (a release with a shell-S higher than SHELL).
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String RELEASES = "https://api.github.com/repos/e1caro/torchnep/releases?per_page=30";
    private static final int REQ_SAVE = 41;
    private static final int REQ_PICK = 42;
    private static final int REQ_NOTIFY = 43;

    private WebView web;
    private String home; // the app's own page: packed in the APK, or a newer downloaded copy
    private int shown; // the web version on screen (the APK's own one is its versionCode)
    private volatile boolean ready; // a newer web version is downloaded and waits for the next resume
    private long lastCheck;

    private SharedPreferences webPrefs() { return getSharedPreferences("web", MODE_PRIVATE); }
    private File webDir(int v) { return new File(getFilesDir(), "web/" + v); }
    private ValueCallback<Uri[]> chooser;
    private byte[] pendingSave;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        // The assets are served by the app itself. The default handler has no type for .wasm, which stops the
        // browser from compiling the SQL engine while it downloads; give it the right one.
        final WebViewAssetLoader.AssetsPathHandler assets = new WebViewAssetLoader.AssetsPathHandler(this);
        // a downloaded web version newer than the one packed in this APK is shown instead of it
        int saved = webPrefs().getInt("ver", 0);
        final boolean local = saved > BuildConfig.VERSION_CODE && new File(webDir(saved), "index.html").exists();
        shown = local ? saved : BuildConfig.VERSION_CODE;
        WebViewAssetLoader.Builder lb = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", path -> {
                    WebResourceResponse r = assets.handle(path);
                    if (r != null && path.endsWith(".wasm")) r.setMimeType("application/wasm");
                    return r;
                });
        if (local) {
            final WebViewAssetLoader.InternalStoragePathHandler files = new WebViewAssetLoader.InternalStoragePathHandler(this, webDir(saved));
            lb.addPathHandler("/local/", path -> {
                WebResourceResponse r = files.handle(path);
                if (r != null && path.endsWith(".wasm")) r.setMimeType("application/wasm");
                return r;
            });
        }
        final WebViewAssetLoader loader = lb.build();
        home = "https://" + HOST + (local ? "/local/index.html" : "/assets/www/index.html");

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setUserAgentString(s.getUserAgentString() + " AnalystPathApp/1 AnalystPathWeb/" + shown);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER); // no stretch or glow when you swipe past the top or bottom
        web.addJavascriptInterface(new Bridge(), "AnalystNative");

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

        web.setWebChromeClient(new WebChromeClient() {
            // the "Import backup" button is a file input
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (chooser != null) chooser.onReceiveValue(null);
                chooser = callback;
                try {
                    startActivityForResult(params.createIntent(), REQ_PICK);
                } catch (Exception e) {
                    chooser = null;
                    return false;
                }
                return true;
            }

            // a WebView shows no confirm() or alert() boxes unless the app does (used by "Reset everything")
            @Override
            public boolean onJsConfirm(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setPositiveButton(android.R.string.ok, (d, w) -> result.confirm())
                        .setNegativeButton(android.R.string.cancel, (d, w) -> result.cancel())
                        .setOnCancelListener(d -> result.cancel())
                        .show();
                return true;
            }

            @Override
            public boolean onJsAlert(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                        .setMessage(message)
                        .setPositiveButton(android.R.string.ok, (d, w) -> result.confirm())
                        .setOnCancelListener(d -> result.confirm())
                        .show();
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

        // Back goes to the previous page of the app, and leaves the app from the first one.
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::goBackOrFinish);
        }

        Reminder.schedule(this); // keeps the daily reminder alive if the system dropped it
        // a saved page is only restored when it belongs to the web version now shown
        if (state == null || state.getInt("webVer", 0) != shown || web.restoreState(state) == null) web.loadUrl(home);
        cleanOld(shown);
        new Thread(this::checkUpdate).start();
    }

    private void goBackOrFinish() {
        if (web == null) {
            finish();
            return;
        }
        web.evaluateJavascript(
            "(function() {" +
            "  if (document.body.classList.contains('menu-open')) {" +
            "    document.body.classList.remove('menu-open');" +
            "    var mb = document.getElementById('menuBtn'); if (mb) mb.setAttribute('aria-expanded', 'false');" +
            "    return 'handled';" +
            "  }" +
            "  var modals = document.querySelectorAll('.modal-overlay:not(.hidden), [role=\"dialog\"]:not(.hidden)');" +
            "  if (modals && modals.length > 0) {" +
            "    for (var i = 0; i < modals.length; i++) modals[i].classList.add('hidden');" +
            "    return 'handled';" +
            "  }" +
            "  return 'none';" +
            "})()",
            result -> {
                if ("\"handled\"".equals(result)) {
                    // Handled within page (closed drawer / modal)
                } else if (web.canGoBack()) {
                    web.goBack();
                } else {
                    finish();
                }
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
        // switch to a downloaded version when nothing is half done (a file being picked or saved), else look for one
        if (ready && chooser == null && pendingSave == null) { ready = false; recreate(); }
        else if (!ready) new Thread(this::checkUpdate).start();
    }

    // ---------- updates (the same scheme as FitQuest's MainActivity) ----------

    private void checkUpdate() {
        if (System.currentTimeMillis() - lastCheck < 10 * 60e3) return;
        lastCheck = System.currentTimeMillis();
        try {
            JSONArray rs = new JSONArray(read(RELEASES));
            int best = Math.max(shown, webPrefs().getInt("ver", 0));
            String zip = null;
            Pattern tag = Pattern.compile("^analyst-(\\d+)$"), shell = Pattern.compile("^shell-(\\d+)$");
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
            if (!new File(tmp, "index.html").exists() || !new File(tmp, "js/app.js").exists()) { deleteAll(tmp); return; }
            deleteAll(dir);
            if (!tmp.renameTo(dir)) return;
            webPrefs().edit().putInt("ver", best).commit();
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
        if (chooser != null) { chooser.onReceiveValue(null); chooser = null; }
        web.destroy();
        super.onDestroy();
    }

    @SuppressWarnings("deprecation")
    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_PICK) {
            if (chooser != null) {
                chooser.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
                chooser = null;
            }
        } else if (req == REQ_SAVE) {
            byte[] bytes = pendingSave;
            pendingSave = null;
            if (res == RESULT_OK && data != null && data.getData() != null && bytes != null) {
                try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                    out.write(bytes);
                    toast(getString(R.string.saved));
                } catch (Exception e) {
                    toast(getString(R.string.save_failed));
                }
            }
        }
    }

    private SharedPreferences prefs() { return getSharedPreferences("app", MODE_PRIVATE); }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] res) {
        super.onRequestPermissionsResult(code, perms, res);
        if (code != REQ_NOTIFY) return;
        boolean ok = res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED;
        web.evaluateJavascript("window.onNativePermission&&onNativePermission(" + ok + ")", null);
    }

    private void toast(String text) { Toast.makeText(this, text, Toast.LENGTH_SHORT).show(); }

    /** Asks where to save the file (the system "save as" screen: works on every Android version, no permission). */
    @SuppressWarnings("deprecation")
    private void askWhereToSave(String name, String mime, byte[] bytes) {
        pendingSave = bytes;
        Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType(baseMime(mime))
                .putExtra(Intent.EXTRA_TITLE, name);
        try {
            startActivityForResult(i, REQ_SAVE);
        } catch (Exception e) {
            pendingSave = null;
            toast(getString(R.string.save_failed));
        }
    }

    /** Hands a file to the app that can open it (the calendar for a .ics). Returns false if none can. */
    private boolean openWithApp(String name, String mime, byte[] bytes) {
        try {
            File dir = new File(getCacheDir(), "shared");
            //noinspection ResultOfMethodCallIgnored
            dir.mkdirs();
            File f = new File(dir, name.replaceAll("[^A-Za-z0-9._-]", "_"));
            try (FileOutputStream out = new FileOutputStream(f)) { out.write(bytes); }
            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".files", f);
            Intent i = new Intent(Intent.ACTION_VIEW)
                    .setDataAndType(uri, baseMime(mime))
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(i);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private static String baseMime(String mime) {
        String m = mime == null ? "" : mime.split(";")[0].trim();
        return m.isEmpty() ? "application/octet-stream" : m;
    }

    /** What the web app can call as window.AnalystNative.* (these run on a background thread). */
    private class Bridge {
        @JavascriptInterface
        public void copy(final String text) {
            runOnUiThread(() -> {
                ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("Analyst Path", text));
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

        // ---------- the daily reminder ----------
        @JavascriptInterface
        public void setReminder(boolean on, int hour, int minute, String title, String text) {
            Reminder.save(MainActivity.this, on, Math.max(0, Math.min(23, hour)), Math.max(0, Math.min(59, minute)), title, text);
        }

        @JavascriptInterface
        public void testReminder() {
            ReminderReceiver.show(MainActivity.this);
        }

        /** "granted", "ask" (the system will show its question) or "denied" (only the phone's settings can change it). */
        @JavascriptInterface
        public String notificationPermission() {
            if (Build.VERSION.SDK_INT < 33) return "granted";
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return "granted";
            return shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS) || !prefs().getBoolean("asked", false) ? "ask" : "denied";
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            if (Build.VERSION.SDK_INT < 33) return;
            prefs().edit().putBoolean("asked", true).apply();
            runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFY));
        }

        @JavascriptInterface
        public void vibrate(final long ms) {
            try {
                android.os.Vibrator v = (android.os.Vibrator) getSystemService(VIBRATOR_SERVICE);
                if (v != null && v.hasVibrator()) {
                    long duration = Math.max(10, Math.min(ms, 400));
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        v.vibrate(android.os.VibrationEffect.createOneShot(duration, android.os.VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        v.vibrate(duration);
                    }
                }
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void saveBinaryFile(final String name, final String mime, final String base64) {
            try {
                final byte[] bytes = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
                runOnUiThread(() -> askWhereToSave(name, mime, bytes));
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void saveFile(final String name, final String mime, final String text) {
            final byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
            runOnUiThread(() -> {
                if (mime != null && mime.startsWith("text/calendar") && openWithApp(name, mime, bytes)) return;
                askWhereToSave(name, mime, bytes);
            });
        }
    }
}
