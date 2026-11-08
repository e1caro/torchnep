package io.github.e1caro.fitquest;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.core.content.FileProvider;
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
 * and fetch work like on the web. Links to anything else (an APK download, a web page) open outside the app.
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
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, u));
                } catch (Exception ignored) {
                    // nothing can open it
                }
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                return pickPhoto(cb, params);
            }
        });
        // Android 15+ draws apps edge to edge: the page sits in a frame kept clear of the status bar, the navigation
        // buttons, the camera cutout and the keyboard (a WebView ignores its own padding, so the frame takes it)
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(getColor(R.color.bg));
        root.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 35) {
            root.setOnApplyWindowInsetsListener((v, in) -> {
                Insets bars = in.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
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
        if (picking) picking = false; // back from the camera: the page keeps its photo, a new version waits
        else if (ready) { ready = false; recreate(); } // switch to the new version (the app's data stays in its storage)
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

        // the week as a picture: into the gallery (Pictures/FitQuest); on Android 9 and older, the share sheet instead
        @JavascriptInterface
        public String saveImage(String b64, String name) {
            if (!ownPage) return "no";
            try {
                byte[] png = Base64.decode(b64, Base64.DEFAULT);
                if (Build.VERSION.SDK_INT < 29) { sharePng(png, name); return "shared"; }
                ContentValues v = new ContentValues();
                v.put(MediaStore.Images.Media.DISPLAY_NAME, name);
                v.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/FitQuest");
                Uri u = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
                if (u == null) return "error";
                try (OutputStream o = getContentResolver().openOutputStream(u)) { o.write(png); }
                return "ok";
            } catch (Exception e) {
                return "error";
            }
        }

        @JavascriptInterface
        public void shareImage(String b64, String name) {
            if (!ownPage) return;
            try { sharePng(Base64.decode(b64, Base64.DEFAULT), name); } catch (Exception ignored) { /* nothing to share */ }
        }

        @JavascriptInterface
        public void testReminder() {
            if (ownPage) ReminderReceiver.show(MainActivity.this);
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

    // ---------- photos for the page (a meal photo): the camera, or the gallery ----------
    // The camera app writes into the app's own cache through a FileProvider, so no camera permission is needed.
    private static final int PICK = 8;
    private ValueCallback<Uri[]> picked;
    private Uri shot;
    private boolean picking;

    private boolean pickPhoto(ValueCallback<Uri[]> cb, WebChromeClient.FileChooserParams params) {
        if (picked != null) picked.onReceiveValue(null);
        picked = cb;
        shot = null;
        Intent i = params.createIntent();
        if (params.isCaptureEnabled()) {
            File dir = new File(getCacheDir(), "shots");
            dir.mkdirs();
            shot = FileProvider.getUriForFile(this, getPackageName() + ".files", new File(dir, "meal.jpg"));
            i = new Intent(MediaStore.ACTION_IMAGE_CAPTURE).putExtra(MediaStore.EXTRA_OUTPUT, shot)
                    .addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            i.setClipData(ClipData.newRawUri("", shot));
        }
        try {
            startActivityForResult(i, PICK);
        } catch (Exception noCamera) {
            shot = null;
            try {
                startActivityForResult(params.createIntent(), PICK);
            } catch (Exception none) {
                picked.onReceiveValue(null);
                picked = null;
                return true;
            }
        }
        picking = true;
        return true;
    }

    private void sharePng(byte[] png, String name) throws Exception {
        File dir = new File(getCacheDir(), "share");
        dir.mkdirs();
        File f = new File(dir, name.replaceAll("[^A-Za-z0-9._-]", "_"));
        try (OutputStream o = new FileOutputStream(f)) { o.write(png); }
        Uri u = FileProvider.getUriForFile(this, getPackageName() + ".files", f);
        Intent send = new Intent(Intent.ACTION_SEND).setType("image/png").putExtra(Intent.EXTRA_STREAM, u).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        send.setClipData(ClipData.newRawUri("", u));
        runOnUiThread(() -> startActivity(Intent.createChooser(send, null)));
    }

    @Override
    protected void onActivityResult(int code, int res, Intent data) {
        super.onActivityResult(code, res, data);
        if (code != PICK || picked == null) return;
        Uri[] got = null;
        if (res == RESULT_OK) got = shot != null ? new Uri[] { shot } : WebChromeClient.FileChooserParams.parseResult(res, data);
        picked.onReceiveValue(got);
        picked = null;
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
