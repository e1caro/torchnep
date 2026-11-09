package io.github.e1caro.analystpath;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
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

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

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
 *  - pick a file (import a backup), and show confirm / alert boxes.
 * The web side finds these through window.AnalystNative (see ui.native in js/ui.js).
 */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/assets/www/index.html";
    private static final int REQ_SAVE = 41;
    private static final int REQ_PICK = 42;

    private WebView web;
    private ValueCallback<Uri[]> chooser;
    private byte[] pendingSave;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        // The assets are served by the app itself. The default handler has no type for .wasm, which stops the
        // browser from compiling the SQL engine while it downloads; give it the right one.
        final WebViewAssetLoader.AssetsPathHandler assets = new WebViewAssetLoader.AssetsPathHandler(this);
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", path -> {
                    WebResourceResponse r = assets.handle(path);
                    if (r != null && path.endsWith(".wasm")) r.setMimeType("application/wasm");
                    return r;
                })
                .build();

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setUserAgentString(s.getUserAgentString() + " AnalystPathApp/1");
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
        if (Build.VERSION.SDK_INT >= 35) {
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

        if (state == null || web.restoreState(state) == null) web.loadUrl(START);
    }

    private void goBackOrFinish() {
        if (web.canGoBack()) web.goBack();
        else finish();
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
