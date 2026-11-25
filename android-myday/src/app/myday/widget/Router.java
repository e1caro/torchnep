package app.myday.widget;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentUris;
import android.content.Intent;
import android.os.Bundle;
import android.provider.CalendarContract;

/** Invisible stop for taps on the widget: ticks a to-do, or opens an event, a day or the app. */
public class Router extends Activity {
    static final String KIND = "kind", ID = "id", TODO_ID = "todo_id", BEGIN = "begin", END = "end";
    static final String EVENT = "event", TODO = "todo", OPEN = "open", DAY = "day";

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Intent in = getIntent();
        String kind = in == null ? null : in.getStringExtra(KIND);
        if (TODO.equals(kind)) {
            Store.toggle(this, in.getStringExtra(TODO_ID));
            DayWidget.refresh(this);
        } else if (EVENT.equals(kind)) {
            Intent view = new Intent(Intent.ACTION_VIEW,
                    ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, in.getLongExtra(ID, 0)))
                    .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, in.getLongExtra(BEGIN, 0))
                    .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, in.getLongExtra(END, 0))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                startActivity(view);
            } catch (ActivityNotFoundException | SecurityException e) {
                openApp();
            }
        } else if (DAY.equals(kind)) {
            Intent view = new Intent(Intent.ACTION_VIEW, ContentUris.withAppendedId(
                    CalendarContract.CONTENT_URI.buildUpon().appendPath("time").build(), in.getLongExtra(BEGIN, 0)))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                startActivity(view);
            } catch (ActivityNotFoundException | SecurityException e) {
                openApp();
            }
        } else {
            openApp();
        }
        finish();
    }

    private void openApp() {
        startActivity(new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
    }
}
