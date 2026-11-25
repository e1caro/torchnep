package app.myday.widget;

import android.content.Context;
import android.content.Intent;
import android.graphics.Paint;
import android.view.View;
import android.widget.RemoteViews;

import java.util.ArrayList;
import java.util.List;

/** The rows under the widget's header: what they are and how each style draws them. */
final class Rows {
    static final int EVENT = 0, TODO = 1, NOTE = 2, HEADER = 3, MESSAGE = 4;
    static final int TYPES = 5;

    static final class Row {
        int type;
        String id = "", text = "", sub = "", time = "", time2 = "";
        long eventId, begin, end;
        int color = 0xFF8B8F98;
        boolean past, current, done, accent;
    }

    private Rows() {}

    /** Today's events, to-dos, notes, then the next few events of the coming week. */
    static List<Row> build(Context ctx, Style style) {
        List<Row> out = new ArrayList<>();
        long now = System.currentTimeMillis();
        String today = Day.today();
        boolean calendar = Cal.canRead(ctx);
        boolean nothingToday = false;

        if (Updater.needsTap(ctx)) {
            Row u = message("New version ready \u00b7 tap to install");
            u.accent = true;
            out.add(u);
        }
        if (!calendar) {
            Row m = message("Tap here to show your calendar");
            m.accent = true;
            out.add(m);
        } else {
            List<Cal.Ev> events = Cal.day(ctx, today);
            for (Cal.Ev e : events) out.add(event(ctx, e, now, true));
            if (events.isEmpty() && !style.summary) {
                out.add(message("Nothing scheduled today"));
                nothingToday = true;
            }
        }

        List<Store.Todo> todos = Store.todosFor(ctx, today);
        if (!todos.isEmpty()) {
            out.add(header("To-do"));
            for (Store.Todo t : todos) {
                boolean overdue = !t.done && Day.isDate(t.date) && t.date.compareTo(today) < 0;
                out.add(todo(t.id, overdue ? t.text + " · from " + Day.shortDate(t.date) : t.text, t.done));
            }
        }

        List<Store.Note> notes = Store.notesFor(ctx, today);
        if (!notes.isEmpty()) {
            out.add(header("Keep in mind"));
            for (Store.Note n : notes) out.add(note(n.text));
        }

        if (calendar) {
            List<Cal.Ev> coming = Cal.range(ctx, Day.addDays(today, 1), 7);
            if (!coming.isEmpty()) {
                out.add(header("Coming up"));
                for (int i = 0; i < coming.size() && i < 6; i++) out.add(event(ctx, coming.get(i), now, false));
            }
        }
        // A lone "nothing today" line reads worse than the centred empty state, so let that show instead.
        if (nothingToday && out.size() == 1) out.clear();
        return out;
    }

    /** Fixed rows for the style previews in the app. */
    static List<Row> sample() {
        List<Row> out = new ArrayList<>();
        Row gym = new Row();
        gym.type = EVENT;
        gym.time = "08:00";
        gym.time2 = "09:00";
        gym.text = "Gym";
        gym.color = 0xFF0B8043;
        gym.past = true;
        out.add(gym);
        Row sync = new Row();
        sync.type = EVENT;
        sync.time = "10:00";
        sync.time2 = "11:00";
        sync.text = "Team sync";
        sync.sub = "Now · Room 3";
        sync.color = 0xFF4285F4;
        sync.current = true;
        out.add(sync);
        Row lunch = new Row();
        lunch.type = EVENT;
        lunch.time = "14:00";
        lunch.time2 = "15:30";
        lunch.text = "Lunch with Ana";
        lunch.sub = "La Taberna";
        lunch.color = 0xFFF4511E;
        out.add(lunch);
        out.add(header("To-do"));
        out.add(todo("", "Call the bank", false));
        out.add(todo("", "Buy milk", true));
        return out;
    }

    private static Row header(String text) {
        Row r = new Row();
        r.type = HEADER;
        r.text = text;
        return r;
    }

    private static Row message(String text) {
        Row r = new Row();
        r.type = MESSAGE;
        r.text = text;
        return r;
    }

    private static Row todo(String id, String text, boolean done) {
        Row r = new Row();
        r.type = TODO;
        r.id = id;
        r.text = text;
        r.done = done;
        return r;
    }

    private static Row note(String text) {
        Row r = new Row();
        r.type = NOTE;
        r.text = text;
        return r;
    }

    private static Row event(Context ctx, Cal.Ev e, long now, boolean isToday) {
        Row r = new Row();
        r.type = EVENT;
        r.eventId = e.id;
        r.begin = e.begin;
        r.end = e.end;
        r.text = e.title;
        r.color = e.color;
        r.sub = e.place;
        if (isToday) {
            if (e.allDay) {
                r.time = "All day";
            } else {
                r.time = Day.compactClock(ctx, e.begin);
                r.time2 = Day.compactClock(ctx, e.end);
                r.past = e.end <= now;
                r.current = e.begin <= now && now < e.end;
                if (r.current) r.sub = e.place.isEmpty() ? "Now" : "Now · " + e.place;
            }
        } else {
            r.time = Day.dayLabel(e.date);
            r.time2 = e.allDay ? "All day" : Day.compactClock(ctx, e.begin);
        }
        return r;
    }

    /** Draws one row. With {@code clickable} false (previews) no tap target is attached. */
    static RemoteViews view(Context ctx, Style s, Row r, boolean clickable) {
        String pkg = ctx.getPackageName();
        RemoteViews v;
        Intent fill = new Intent();
        switch (r.type) {
            case EVENT:
                v = new RemoteViews(pkg, R.layout.row_event);
                v.setTextViewText(R.id.time, r.time);
                v.setTextViewText(R.id.time2, r.time2);
                v.setViewVisibility(R.id.time2, r.time2.isEmpty() ? View.GONE : View.VISIBLE);
                v.setTextViewText(R.id.title, r.text);
                v.setTextViewText(R.id.sub, r.sub);
                v.setViewVisibility(R.id.sub, r.sub.isEmpty() ? View.GONE : View.VISIBLE);
                if (r.current) Style.text(ctx, v, R.id.time, s.accentL, s.accentD);
                else if (r.past) Style.text(ctx, v, R.id.time, s.muteL, s.muteD);
                else Style.text(ctx, v, R.id.time, s.inkL, s.inkD);
                Style.text(ctx, v, R.id.time2, s.muteL, s.muteD);
                if (r.past) Style.text(ctx, v, R.id.title, s.muteL, s.muteD);
                else Style.text(ctx, v, R.id.title, s.inkL, s.inkD);
                if (r.current) Style.text(ctx, v, R.id.sub, s.accentL, s.accentD);
                else Style.text(ctx, v, R.id.sub, s.muteL, s.muteD);
                int solid = r.color | 0xFF000000;
                Style.tint(ctx, v, R.id.bar, s.alwaysDark ? Style.lift(solid) : solid, Style.lift(solid));
                v.setInt(R.id.bar, "setImageAlpha", r.past ? 115 : 255);
                v.setInt(R.id.row, "setBackgroundResource", r.current ? s.nowBg : 0);
                fill.putExtra(Router.KIND, Router.EVENT).putExtra(Router.ID, r.eventId)
                        .putExtra(Router.BEGIN, r.begin).putExtra(Router.END, r.end);
                break;
            case TODO:
                v = new RemoteViews(pkg, R.layout.row_todo);
                v.setTextViewText(R.id.text, r.text);
                if (r.done) {
                    v.setImageViewResource(R.id.check, s.checkOn);
                    v.setInt(R.id.check, "setColorFilter", 0);
                    Style.text(ctx, v, R.id.text, s.muteL, s.muteD);
                } else {
                    v.setImageViewResource(R.id.check, R.drawable.ic_check_off);
                    Style.tint(ctx, v, R.id.check, s.muteL, s.muteD);
                    Style.text(ctx, v, R.id.text, s.inkL, s.inkD);
                }
                v.setInt(R.id.text, "setPaintFlags",
                        Paint.ANTI_ALIAS_FLAG | (r.done ? Paint.STRIKE_THRU_TEXT_FLAG : 0));
                fill.putExtra(Router.KIND, Router.TODO).putExtra(Router.TODO_ID, r.id);
                break;
            case NOTE:
                v = new RemoteViews(pkg, R.layout.row_note);
                v.setTextViewText(R.id.text, r.text);
                v.setInt(R.id.text, "setBackgroundResource", s.noteBg);
                Style.text(ctx, v, R.id.text, s.inkL, s.inkD);
                fill.putExtra(Router.KIND, Router.OPEN);
                break;
            case HEADER:
                v = new RemoteViews(pkg, R.layout.row_header);
                v.setTextViewText(R.id.row, r.text);
                Style.text(ctx, v, R.id.row, s.accentL, s.accentD);
                return v;
            default:
                v = new RemoteViews(pkg, R.layout.row_message);
                v.setTextViewText(R.id.row, r.text);
                if (r.accent) Style.text(ctx, v, R.id.row, s.accentL, s.accentD);
                else Style.text(ctx, v, R.id.row, s.muteL, s.muteD);
                fill.putExtra(Router.KIND, Router.OPEN);
                break;
        }
        if (clickable) v.setOnClickFillInIntent(R.id.row, fill);
        return v;
    }
}
