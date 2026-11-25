package app.myday.widget;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

/** Builds the planner snapshot Claude sees and carries out the actions it returns. */
final class Actions {
    static final class Result {
        int applied;
        final List<Cal.Ev> deletes = new ArrayList<>();
        final List<String> problems = new ArrayList<>();
    }

    private Actions() {}

    /** Snapshot of the next two weeks. Fills {@code index} with the events Claude may refer to by id. */
    static String snapshot(Context ctx, Map<String, Cal.Ev> index) {
        long now = System.currentTimeMillis();
        String today = Day.today();
        JSONObject root = new JSONObject();
        try {
            JSONArray events = new JSONArray();
            for (Cal.Ev e : Cal.range(ctx, Day.addDays(today, -1), 16)) {
                String id = "e" + e.id;
                if (!index.containsKey(id)) index.put(id, e);
                JSONObject o = new JSONObject().put("id", id).put("date", e.date).put("title", e.title);
                if (e.allDay) {
                    o.put("all_day", true);
                } else {
                    o.put("start", Day.hhmm(e.begin)).put("end", Day.hhmm(e.end));
                }
                if (!e.place.isEmpty()) o.put("place", e.place);
                if (!e.editable) o.put("locked", true);
                events.put(o);
            }
            JSONArray todos = new JSONArray();
            for (Store.Todo t : Store.todos(ctx)) {
                if (t.done && !today.equals(t.doneOn)) continue;
                todos.put(new JSONObject().put("id", t.id).put("text", t.text).put("date", t.date)
                        .put("done", t.done));
            }
            JSONArray notes = new JSONArray();
            for (Store.Note n : Store.notesFor(ctx, today)) {
                notes.put(new JSONObject().put("id", n.id).put("text", n.text).put("until", n.until));
            }
            root.put("events", events).put("todos", todos).put("notes", notes);
            if (!Cal.canRead(ctx)) root.put("calendar_access", "off: events cannot be read or added");
        } catch (JSONException ignored) {
        }
        return "Current date: " + today + " (" + Day.weekday(today) + "), local time " + Day.hhmm(now)
                + ", time zone " + TimeZone.getDefault().getID() + ".\n\nPlanner:\n" + root;
    }

    static Result apply(Context ctx, JSONArray actions, Map<String, Cal.Ev> index) {
        Result r = new Result();
        for (int i = 0; actions != null && i < actions.length() && i < 25; i++) {
            JSONObject a = actions.optJSONObject(i);
            if (a == null) continue;
            String op = a.optString("op"), id = a.optString("id");
            String title = clip(a.optString("title"), 200), place = clip(a.optString("place"), 200);
            String date = Day.isDate(a.optString("date")) ? a.optString("date") : "";
            String start = Day.time(a.optString("start")), end = Day.time(a.optString("end"));
            try {
                if ("add_event".equals(op)) {
                    if (title.isEmpty() || date.isEmpty()) continue;
                    if (!Cal.canWrite(ctx)) {
                        problem(r, "Calendar access is off, so events can't be added.");
                        continue;
                    }
                    Cal.insert(ctx, title, date, start, end, place);
                    r.applied++;
                } else if ("update_event".equals(op) || "delete_event".equals(op)) {
                    Cal.Ev e = index.get(id);
                    if (e == null) continue;
                    if (!e.editable || !Cal.canWrite(ctx)) {
                        problem(r, "“" + e.title + "” can only be changed in your calendar app.");
                        continue;
                    }
                    if ("delete_event".equals(op)) {
                        if (!r.deletes.contains(e)) r.deletes.add(e);
                    } else {
                        Cal.update(ctx, e, title, date, start, end, place);
                        r.applied++;
                    }
                } else if ("add_todo".equals(op)) {
                    if (title.isEmpty()) continue;
                    Store.addTodo(ctx, title, date);
                    r.applied++;
                } else if ("complete_todo".equals(op)) {
                    if (Store.setDone(ctx, id, true)) r.applied++;
                } else if ("delete_todo".equals(op)) {
                    if (Store.deleteTodo(ctx, id)) r.applied++;
                } else if ("add_note".equals(op)) {
                    if (title.isEmpty()) continue;
                    Store.addNote(ctx, title, date);
                    r.applied++;
                } else if ("delete_note".equals(op)) {
                    if (Store.deleteNote(ctx, id)) r.applied++;
                }
            } catch (Cal.NoCalendar e) {
                problem(r, "No calendar on this phone can take new events. Add a Google account first.");
            } catch (RuntimeException e) {
                problem(r, "One change couldn't be saved.");
            }
        }
        return r;
    }

    private static void problem(Result r, String text) {
        if (!r.problems.contains(text)) r.problems.add(text);
    }

    private static String clip(String s, int max) {
        s = s == null ? "" : s.trim();
        return s.length() > max ? s.substring(0, max) : s;
    }
}
