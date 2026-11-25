package app.myday.widget;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/** To-dos and notes, kept on the phone as JSON in SharedPreferences. */
final class Store {
    static final class Todo {
        String id, text, date, doneOn;
        boolean done;
        long created;
    }

    static final class Note {
        String id, text, until;
        long created;
    }

    private Store() {}

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences("myday", Context.MODE_PRIVATE);
    }

    private static String newId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    // ---- to-dos ----

    static synchronized List<Todo> todos(Context ctx) {
        List<Todo> out = new ArrayList<>();
        try {
            JSONArray a = new JSONArray(prefs(ctx).getString("todos", "[]"));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                Todo t = new Todo();
                t.id = o.optString("id");
                t.text = o.optString("text");
                t.date = o.optString("date");
                t.done = o.optBoolean("done");
                t.doneOn = o.optString("doneOn");
                t.created = o.optLong("created");
                out.add(t);
            }
        } catch (JSONException ignored) {
        }
        Collections.sort(out, new Comparator<Todo>() {
            @Override
            public int compare(Todo x, Todo y) {
                if (x.done != y.done) return x.done ? 1 : -1;
                return Long.compare(x.created, y.created);
            }
        });
        return out;
    }

    private static void saveTodos(Context ctx, List<Todo> list) {
        String cutoff = Day.addDays(Day.today(), -30);
        JSONArray a = new JSONArray();
        try {
            for (Todo t : list) {
                if (t.done && !t.doneOn.isEmpty() && t.doneOn.compareTo(cutoff) < 0) continue;
                a.put(new JSONObject().put("id", t.id).put("text", t.text).put("date", t.date)
                        .put("done", t.done).put("doneOn", t.doneOn).put("created", t.created));
            }
        } catch (JSONException ignored) {
        }
        prefs(ctx).edit().putString("todos", a.toString()).apply();
    }

    static synchronized void addTodo(Context ctx, String text, String date) {
        List<Todo> list = todos(ctx);
        Todo t = new Todo();
        t.id = newId();
        t.text = text;
        t.date = Day.isDate(date) ? date : "";
        t.done = false;
        t.doneOn = "";
        t.created = System.currentTimeMillis();
        list.add(t);
        saveTodos(ctx, list);
    }

    static synchronized boolean setDone(Context ctx, String id, boolean done) {
        List<Todo> list = todos(ctx);
        for (Todo t : list) {
            if (t.id.equals(id)) {
                t.done = done;
                t.doneOn = done ? Day.today() : "";
                saveTodos(ctx, list);
                return true;
            }
        }
        return false;
    }

    static synchronized boolean toggle(Context ctx, String id) {
        for (Todo t : todos(ctx)) {
            if (t.id.equals(id)) return setDone(ctx, id, !t.done);
        }
        return false;
    }

    static synchronized boolean deleteTodo(Context ctx, String id) {
        List<Todo> list = todos(ctx);
        for (int i = 0; i < list.size(); i++) {
            if (list.get(i).id.equals(id)) {
                list.remove(i);
                saveTodos(ctx, list);
                return true;
            }
        }
        return false;
    }

    /** To-dos to show on a day: that day's, undated open ones, overdue open ones, and ones ticked that day. */
    static List<Todo> todosFor(Context ctx, String day) {
        List<Todo> out = new ArrayList<>();
        for (Todo t : todos(ctx)) {
            boolean dated = Day.isDate(t.date);
            boolean relevant = !dated || t.date.equals(day) || (t.date.compareTo(day) < 0 && !t.done);
            boolean visible = !t.done || day.equals(t.doneOn);
            if (relevant && visible) out.add(t);
        }
        return out;
    }

    // ---- notes ----

    static synchronized List<Note> notes(Context ctx) {
        List<Note> out = new ArrayList<>();
        try {
            JSONArray a = new JSONArray(prefs(ctx).getString("notes", "[]"));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                Note n = new Note();
                n.id = o.optString("id");
                n.text = o.optString("text");
                n.until = o.optString("until");
                n.created = o.optLong("created");
                out.add(n);
            }
        } catch (JSONException ignored) {
        }
        return out;
    }

    private static void saveNotes(Context ctx, List<Note> list) {
        String cutoff = Day.addDays(Day.today(), -30);
        JSONArray a = new JSONArray();
        try {
            for (Note n : list) {
                if (Day.isDate(n.until) && n.until.compareTo(cutoff) < 0) continue;
                a.put(new JSONObject().put("id", n.id).put("text", n.text).put("until", n.until)
                        .put("created", n.created));
            }
        } catch (JSONException ignored) {
        }
        prefs(ctx).edit().putString("notes", a.toString()).apply();
    }

    static synchronized void addNote(Context ctx, String text, String until) {
        List<Note> list = notes(ctx);
        Note n = new Note();
        n.id = newId();
        n.text = text;
        n.until = Day.isDate(until) ? until : "";
        n.created = System.currentTimeMillis();
        list.add(n);
        saveNotes(ctx, list);
    }

    static synchronized boolean deleteNote(Context ctx, String id) {
        List<Note> list = notes(ctx);
        for (int i = 0; i < list.size(); i++) {
            if (list.get(i).id.equals(id)) {
                list.remove(i);
                saveNotes(ctx, list);
                return true;
            }
        }
        return false;
    }

    static List<Note> notesFor(Context ctx, String day) {
        List<Note> out = new ArrayList<>();
        for (Note n : notes(ctx)) {
            if (!Day.isDate(n.until) || n.until.compareTo(day) >= 0) out.add(n);
        }
        return out;
    }

    // ---- settings ----

    /**
     * Remembers the last time the widget redrew without the app's screen asking for it. Shown under Settings,
     * so it is possible to tell whether the phone is letting the widget keep itself current.
     */
    static void noteRefresh(Context ctx, String reason) {
        if ("app".equals(reason)) return;
        prefs(ctx).edit().putLong("widget_refreshed_at", System.currentTimeMillis())
                .putString("widget_refresh_reason", reason).apply();
    }

    static long refreshedAt(Context ctx) {
        return prefs(ctx).getLong("widget_refreshed_at", 0);
    }

    static String refreshReason(Context ctx) {
        return prefs(ctx).getString("widget_refresh_reason", "");
    }

    static String style(Context ctx) {
        return prefs(ctx).getString("style", "sky");
    }

    static void setStyle(Context ctx, String key) {
        prefs(ctx).edit().putString("style", key).apply();
    }

    static long calendarId(Context ctx) {
        return prefs(ctx).getLong("calendar_id", -1);
    }

    static void setCalendarId(Context ctx, long id) {
        prefs(ctx).edit().putLong("calendar_id", id).apply();
    }
}
