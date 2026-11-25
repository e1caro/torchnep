package app.myday.widget;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Finding a newer version of the app in the project's public list of releases on GitHub. The repository holds
 * other apps too, so only releases tagged myday-N count; N is the APK's version code.
 */
final class Updates {
    static final String RELEASES_URL = "https://api.github.com/repos/e1caro/torchnep/releases?per_page=100";

    /** APKs are only ever taken from the project's own release downloads. */
    static final String DOWNLOAD_PREFIX = "https://github.com/e1caro/torchnep/releases/download/";

    private static final Pattern TAG = Pattern.compile("^myday-(\\d+)$");

    static final class Update {
        int version;
        String name, apkUrl;
        long size;
    }

    private Updates() {}

    /** The newest published My Day release if it is newer than {@code current}, else null. */
    static Update newer(String releasesJson, int current) throws JSONException {
        JSONArray all = new JSONArray(releasesJson);
        Update best = null;
        for (int i = 0; i < all.length(); i++) {
            JSONObject r = all.optJSONObject(i);
            if (r == null || r.optBoolean("draft") || r.optBoolean("prerelease")) continue;
            Matcher m = TAG.matcher(r.optString("tag_name"));
            if (!m.matches()) continue;
            int version;
            try {
                version = Integer.parseInt(m.group(1));
            } catch (NumberFormatException e) {
                continue;
            }
            if (version <= current || (best != null && version <= best.version)) continue;
            JSONArray assets = r.optJSONArray("assets");
            for (int j = 0; assets != null && j < assets.length(); j++) {
                JSONObject a = assets.optJSONObject(j);
                String url = a == null ? "" : a.optString("browser_download_url");
                if (url.startsWith(DOWNLOAD_PREFIX) && url.endsWith(".apk")) {
                    Update u = new Update();
                    u.version = version;
                    u.name = r.optString("name", "My Day 1." + version);
                    u.apkUrl = url;
                    u.size = a.optLong("size");
                    best = u;
                    break;
                }
            }
        }
        return best;
    }
}
