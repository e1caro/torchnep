package io.github.e1caro.eighthrank;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.DisplayCutout;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
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
 * Eighth Rank as an Android app (the same scheme as android-blackjack/ and android-kaidoneta/).
 *
 * The whole web app (the chess folder, with its fonts) is packed inside the APK under assets/www and shown full screen from
 * https://appassets.androidplatform.net, a secure origin served by the app itself, so storage works exactly like on
 * the web and the app needs no network. Links to other sites open in the browser.
 *
 * The app takes the whole screen: the status bar and the navigation buttons are hidden and come back for a moment
 * with a swipe from the edge. The page tells the app its background colour (window.ChessNative.bars), which is
 * used around a camera cutout and behind the bars while they show.
 *
 * A WebView has no clipboard of its own for pages, so the app adds one as window.ChessNative.copy.
 *
 * Updates itself: each release (tag chess-N) carries web.zip, the whole web app. When one is newer than what the app
 * shows, it is downloaded in the background into the app's own storage and used the next time the app comes back to
 * the screen. Your level, lessons, puzzles, opening lines and style are kept: they live in the
 * WebView's storage for the same origin. The APK only needs reinstalling when this native part changes (a release with
 * a shell-S higher than SHELL).
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String RELEASES = "https://api.github.com/repos/e1caro/torchnep/releases?per_page=100";

    private WebView web;
    private FrameLayout root;
    private String home; // the app's own page: packed in the APK, or a newer downloaded copy
    private int shown; // the web version on screen (the APK's own one is its versionCode)
    private volatile boolean ready; // a newer web version is downloaded and waits for the next resume
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
        s.setUserAgentString(s.getUserAgentString() + " EighthRankApp/1 EighthRankWeb/" + shown
                + " EighthRankShell/" + BuildConfig.SHELL + " EighthRankApk/" + BuildConfig.VERSION_CODE);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new Bridge(), "ChessNative");

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

        // The page is drawn edge to edge under hidden bars: keep it clear of the camera cutout and the keyboard, and
        // of the bars on a phone that will not hide them (a WebView ignores its own padding, so the frame takes it).
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = Build.VERSION.SDK_INT >= 30
                    ? WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
                    : WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        root = new FrameLayout(this);
        root.setBackgroundColor(getColor(R.color.bg));
        root.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 30) {
            root.setOnApplyWindowInsetsListener((v, in) -> {
                Insets bars = in.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return WindowInsets.CONSUMED;
            });
        } else if (Build.VERSION.SDK_INT >= 28) {
            root.setOnApplyWindowInsetsListener((v, in) -> {
                DisplayCutout cut = in.getDisplayCutout();
                if (cut != null) v.setPadding(cut.getSafeInsetLeft(), cut.getSafeInsetTop(), cut.getSafeInsetRight(), cut.getSafeInsetBottom());
                return in;
            });
        }
        fullScreen();

        // Back closes the style menu, goes from a lesson or an opening to its list, then to Learn, and leaves from there.
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::goBackOrFinish);
        }

        if (state == null || state.getInt("webVer", 0) != shown || web.restoreState(state) == null) web.loadUrl(home);
        cleanOld(shown);
        new Thread(this::checkUpdate).start();
    }

    /** Hides the status bar and the navigation buttons; a swipe from the edge shows them for a moment. */
    @SuppressWarnings("deprecation")
    private void fullScreen() {
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c == null) return;
            c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            c.hide(WindowInsets.Type.systemBars());
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean has) {
        super.onWindowFocusChanged(has);
        if (has) fullScreen(); // the bars come back with a dialog, the keyboard or another app on top
    }

    private void goBackOrFinish() {
        if (web == null) {
            finish();
            return;
        }
        web.evaluateJavascript("(window.__er && __er.back && __er.back()) ? 'handled' : 'none'", result -> {
            if (!"\"handled\"".equals(result)) finish();
        });
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
        fullScreen();
        // switch to a downloaded version (progress is saved after every step), else look for one
        if (ready) { ready = false; recreate(); }
        else new Thread(this::checkUpdate).start();
    }

    // ---------- updates (the same scheme as the Blackjack and Kaidoneta apps) ----------

    /** Looks for a newer release (at most every ten minutes) and downloads its web app. */
    private void checkUpdate() {
        if (checking || System.currentTimeMillis() - lastCheck < 10 * 60e3) return;
        checking = true;
        lastCheck = System.currentTimeMillis();
        try {
            JSONArray rs = new JSONArray(read(RELEASES));
            int best = Math.max(shown, webPrefs().getInt("ver", 0));
            String zip = null;
            Pattern tag = Pattern.compile("^chess-(\\d+)$"), shell = Pattern.compile("^shell-(\\d+)$");
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
                if (url != null && needs <= BuildConfig.SHELL) { best = n; zip = url; } // else this shell is too old for it
            }
            if (zip == null) return;
            File dir = webDir(best), tmp = new File(getFilesDir(), "web/tmp");
            deleteAll(tmp);
            unzip(zip, tmp);
            if (!new File(tmp, "index.html").exists() || !new File(tmp, "app.js").exists() || !new File(tmp, "engine.js").exists()) { deleteAll(tmp); return; }
            deleteAll(dir);
            if (!tmp.renameTo(dir)) return;
            webPrefs().edit().putInt("ver", best).commit();
            ready = true;
        } catch (Exception ignored) {
            // offline or GitHub busy: the next check tries again
        } finally {
            checking = false;
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
        web.destroy();
        super.onDestroy();
    }

    /** What the web app can call as window.ChessNative.* (these run on a background thread). */
    private class Bridge {
        /** The colour of the page ("#0d1320") and whether it is a dark one, sent whenever the style changes. */
        @JavascriptInterface
        public void bars(final String color, final boolean dark) {
            runOnUiThread(() -> {
                try {
                    int c = Color.parseColor(color);
                    root.setBackgroundColor(c);
                    getWindow().setStatusBarColor(c);
                    getWindow().setNavigationBarColor(c);
                    if (Build.VERSION.SDK_INT >= 30) {
                        WindowInsetsController ic = getWindow().getInsetsController();
                        int light = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                        if (ic != null) ic.setSystemBarsAppearance(dark ? 0 : light, light);
                    }
                } catch (Exception ignored) {
                    // not a colour: the bars keep the one they have
                }
            });
        }

        @JavascriptInterface
        public void copy(final String text) {
            runOnUiThread(() -> {
                ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("Eighth Rank", text));
            });
        }
    }
}
