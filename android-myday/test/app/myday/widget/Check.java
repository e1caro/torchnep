package app.myday.widget;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Calendar;
import java.util.TimeZone;
import java.util.concurrent.atomic.AtomicInteger;

/** JVM checks for the parts that do not need a phone: dates and the Claude request/response handling. */
public class Check {
    static int failures;

    static void eq(String what, Object expected, Object actual) {
        boolean ok = expected == null ? actual == null : expected.equals(actual);
        if (!ok) failures++;
        System.out.println((ok ? "ok    " : "FAIL  ") + what + (ok ? "" : "  expected=" + expected + " actual=" + actual));
    }

    static JSONObject release(String tag, boolean draft, String assetUrl) throws Exception {
        return new JSONObject().put("tag_name", tag).put("name", tag).put("draft", draft).put("prerelease", false)
                .put("assets", new JSONArray().put(new JSONObject().put("browser_download_url", assetUrl)
                        .put("size", 90000)));
    }

    static long at(int y, int mo, int d, int h, int mi) {
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(y, mo - 1, d, h, mi, 0);
        return c.getTimeInMillis();
    }

    public static void main(String[] args) throws Exception {
        TimeZone.setDefault(TimeZone.getTimeZone("Europe/Madrid"));

        eq("time 9:30", "09:30", Day.time("9:30"));
        eq("time 17:05", "17:05", Day.time(" 17:05 "));
        eq("time 25:00 rejected", "", Day.time("25:00"));
        eq("time words rejected", "", Day.time("noon"));
        eq("isDate", true, Day.isDate("2026-11-25"));
        eq("isDate bad", false, Day.isDate("25/11/2026"));
        eq("addDays month end", "2026-12-01", Day.addDays("2026-11-30", 1));
        eq("addDays year end", "2027-01-01", Day.addDays("2026-12-31", 1));
        eq("addDays back over DST start", "2026-03-28", Day.addDays("2026-03-29", -1));
        eq("addDays over DST end", "2026-10-26", Day.addDays("2026-10-25", 1));
        eq("iso roundtrip", "2026-11-25", Day.iso(Day.localMillis("2026-11-25", "23:59")));
        eq("startOf", at(2026, 11, 25, 0, 0), Day.startOf("2026-11-25"));
        eq("julian epoch", 2440588, Day.julian("1970-01-01"));
        eq("julian step", Day.julian("2026-11-25") + 1, Day.julian("2026-11-26"));
        eq("julian across DST day", Day.julian("2026-03-28") + 2, Day.julian("2026-03-30"));
        eq("utcMidnight -> utcIso", "2026-11-25", Day.utcIso(Day.utcMidnight("2026-11-25")));
        eq("weekday", "Wednesday", Day.weekday("2026-11-25"));
        eq("hhmm", "07:05", Day.hhmm(at(2026, 11, 25, 7, 5)));
        eq("period morning", 0, Day.period(at(2026, 11, 25, 9, 0)));
        eq("period day", 1, Day.period(at(2026, 11, 25, 11, 0)));
        eq("period evening", 2, Day.period(at(2026, 11, 25, 20, 59)));
        eq("period night late", 3, Day.period(at(2026, 11, 25, 23, 0)));
        eq("period night early", 3, Day.period(at(2026, 11, 25, 4, 59)));
        eq("next period from 9:00", at(2026, 11, 25, 11, 0), Day.nextPeriodChange(at(2026, 11, 25, 9, 0)));
        eq("next period from 22:00", at(2026, 11, 26, 5, 0), Day.nextPeriodChange(at(2026, 11, 25, 22, 0)));
        eq("next midnight", at(2026, 11, 26, 0, 0), Day.nextMidnight(at(2026, 11, 25, 15, 30)));

        eq("dayOfMonth", "1", Day.dayOfMonth("2026-12-01"));
        eq("dayLabel", true, Day.dayLabel("2026-11-27").endsWith(" 27"));
        eq("weekdayLetter is one letter", 1, Day.weekdayLetter("2026-11-27").length());

        // Styles: every key resolves, unknown keys fall back, and each style is complete.
        eq("style count", 6, Style.ALL.length);
        eq("unknown style falls back", "sky", Style.byKey("nope").key);
        for (Style s : Style.ALL) {
            eq("style " + s.key + " resolves", s, Style.byKey(s.key));
            eq("style " + s.key + " has backgrounds", true, s.rootBg != 0 && s.nowBg != 0 && s.noteBg != 0 && s.checkOn != 0);
            eq("style " + s.key + " has button unless sky", true, s.skyHeader || s.buttonBg != 0);
            eq("style " + s.key + " week needs pill", true, !s.week || s.pill != 0);
            eq("style " + s.key + " opaque ink", 0xFF, (s.inkL >>> 24) & (s.inkD >>> 24));
        }
        eq("lift white stays white", 0xFFFFFFFF, Style.lift(0xFFFFFFFF));
        eq("lift black becomes grey", 0xFF666666, Style.lift(0xFF000000));
        eq("sample rows", 6, Rows.sample().size());

        // Self-update: only this app's releases count, and only APKs from the project's own downloads.
        String base = Updates.DOWNLOAD_PREFIX;
        String releases = new JSONArray()
                .put(release("kaidoneta-50", false, base + "kaidoneta-50/Kaidoneta-1.50.apk"))
                .put(release("myday-9", true, base + "myday-9/MyDay-1.9.apk"))
                .put(release("myday-8", false, "https://example.com/MyDay-1.8.apk"))
                .put(release("myday-7", false, base + "myday-7/notes.txt"))
                .put(release("myday-5", false, base + "myday-5/MyDay-1.5.apk"))
                .put(release("myday-6", false, base + "myday-6/MyDay-1.6.apk"))
                .put(release("myday-x", false, base + "myday-x/MyDay.apk"))
                .toString();
        Updates.Update found = Updates.newer(releases, 2);
        eq("update: newest valid release wins", 6, found == null ? -1 : found.version);
        eq("update: its APK address", base + "myday-6/MyDay-1.6.apk", found == null ? null : found.apkUrl);
        eq("update: size carried", 90000L, found == null ? -1L : found.size);
        eq("update: none when already newest", null, Updates.newer(releases, 6));
        eq("update: none in an empty list", null, Updates.newer("[]", 1));

        // Request body shape.
        JSONObject body = new JSONObject(Claude.body("Current date: 2026-11-25", "dentist friday 5pm"));
        eq("model", "claude-opus-5-5", body.getString("model"));
        eq("no sampling params", false, body.has("temperature") || body.has("top_p"));
        eq("no thinking override", false, body.has("thinking"));
        eq("effort", "low", body.getJSONObject("output_config").getString("effort"));
        JSONObject format = body.getJSONObject("output_config").getJSONObject("format");
        eq("format type", "json_schema", format.getString("type"));
        JSONObject item = format.getJSONObject("schema").getJSONObject("properties").getJSONObject("actions")
                .getJSONObject("items");
        eq("root additionalProperties", false, format.getJSONObject("schema").getBoolean("additionalProperties"));
        eq("item additionalProperties", false, item.getBoolean("additionalProperties"));
        eq("item required count", 7, item.getJSONArray("required").length());
        eq("op enum count", 8, item.getJSONObject("properties").getJSONObject("op").getJSONArray("enum").length());
        eq("single user turn", "user", body.getJSONArray("messages").getJSONObject(0).getString("role"));
        eq("message carried", true, body.getJSONArray("messages").getJSONObject(0).getString("content")
                .endsWith("dentist friday 5pm"));

        // Response parsing.
        String good = new JSONObject().put("stop_reason", "end_turn").put("content", new JSONArray()
                .put(new JSONObject().put("type", "thinking").put("thinking", ""))
                .put(new JSONObject().put("type", "text").put("text",
                        "{\"reply\":\"Added dentist on Friday at 17:00.\",\"actions\":[{\"op\":\"add_event\",\"id\":\"\","
                                + "\"title\":\"Dentist\",\"date\":\"2026-11-27\",\"start\":\"17:00\",\"end\":\"\",\"place\":\"\"}]}")))
                .toString();
        JSONObject parsed = Claude.parse(good);
        eq("parsed reply", "Added dentist on Friday at 17:00.", parsed.getString("reply"));
        eq("parsed action op", "add_event", parsed.getJSONArray("actions").getJSONObject(0).getString("op"));
        String refused = new JSONObject().put("stop_reason", "refusal").put("content", new JSONArray()).toString();
        try {
            Claude.parse(refused);
            eq("refusal throws", true, false);
        } catch (Claude.Failure f) {
            eq("refusal message", "Claude declined that request.", f.getMessage());
        }
        try {
            Claude.parse("<html>gateway</html>");
            eq("garbage throws", true, false);
        } catch (Claude.Failure f) {
            eq("garbage message", "Claude's answer couldn't be read. Try again.", f.getMessage());
        }
        eq("401 text", "That API key was rejected. Check it under Settings.", Claude.explain(401, "{}"));
        eq("400 text carries API detail", "Claude returned an error (400). bad field",
                Claude.explain(400, "{\"type\":\"error\",\"error\":{\"type\":\"invalid_request_error\",\"message\":\"bad field\"}}"));

        // End to end against a local stand-in for the API: headers, one retry on 529, then success.
        final AtomicInteger calls = new AtomicInteger();
        final String[] seen = new String[5];
        final String reply = good;
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1/messages", new HttpHandler() {
            @Override
            public void handle(HttpExchange ex) throws java.io.IOException {
                int n = calls.incrementAndGet();
                seen[0] = ex.getRequestMethod();
                seen[1] = ex.getRequestHeaders().getFirst("x-api-key");
                seen[2] = ex.getRequestHeaders().getFirst("anthropic-version");
                seen[3] = ex.getRequestHeaders().getFirst("anthropic-beta");
                InputStream in = ex.getRequestBody();
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                byte[] chunk = new byte[4096];
                int r;
                while ((r = in.read(chunk)) > 0) buf.write(chunk, 0, r);
                seen[4] = new String(buf.toByteArray(), StandardCharsets.UTF_8);
                byte[] out = (n == 1 ? "{\"type\":\"error\",\"error\":{\"type\":\"overloaded_error\",\"message\":\"Overloaded\"}}"
                        : reply).getBytes(StandardCharsets.UTF_8);
                ex.sendResponseHeaders(n == 1 ? 529 : 200, out.length);
                ex.getResponseBody().write(out);
                ex.close();
            }
        });
        server.start();
        Claude.endpoint = "http://127.0.0.1:" + server.getAddress().getPort() + "/v1/messages";
        JSONObject viaHttp = Claude.ask("test-key", "Current date: 2026-11-25", "dentist friday 5pm");
        eq("http: retried once after 529", 2, calls.get());
        eq("http: method", "POST", seen[0]);
        eq("http: key header", "test-key", seen[1]);
        eq("http: version header", "2026-10-21", seen[2]);
        eq("http: beta header", "server-side-fallback-2026-07-01", seen[3]);
        eq("http: body is the JSON request", "claude-opus-5-5", new JSONObject(seen[4]).getString("model"));
        eq("http: result", "Dentist", viaHttp.getJSONArray("actions").getJSONObject(0).getString("title"));
        server.stop(0);

        System.out.println(failures == 0 ? "\nALL PASSED" : "\n" + failures + " FAILED");
        System.exit(failures == 0 ? 0 : 1);
    }
}
