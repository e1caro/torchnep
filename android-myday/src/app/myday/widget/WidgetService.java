package app.myday.widget;

import android.content.Context;
import android.content.Intent;
import android.os.Binder;
import android.util.Log;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import java.util.ArrayList;
import java.util.List;

/** Supplies the rows of the widget's list. */
public class WidgetService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new Factory(getApplicationContext());
    }

    private static final class Factory implements RemoteViewsFactory {
        private final Context ctx;
        private List<Rows.Row> rows = new ArrayList<>();
        private Style style = Style.ALL[0];

        Factory(Context ctx) {
            this.ctx = ctx;
        }

        @Override
        public void onCreate() {
        }

        @Override
        public void onDestroy() {
        }

        @Override
        public void onDataSetChanged() {
            // The launcher makes this call; drop its identity so the calendar permission check sees ours.
            long token = Binder.clearCallingIdentity();
            try {
                style = Style.current(ctx);
                List<Rows.Row> built = Rows.build(ctx, style);
                int eventsToday = 0;
                for (Rows.Row r : built) {
                    if (r.type == Rows.HEADER) break;
                    if (r.type == Rows.EVENT) eventsToday++;
                }
                rows = built;
                Log.i("MyDay", "widget rows rebuilt: events_today=" + eventsToday + " total=" + built.size());
            } catch (RuntimeException e) {
                Log.e("MyDay", "widget rows failed", e);
                rows = new ArrayList<>();
            } finally {
                Binder.restoreCallingIdentity(token);
            }
        }

        @Override
        public int getCount() {
            return rows.size();
        }

        @Override
        public RemoteViews getViewAt(int position) {
            List<Rows.Row> list = rows;
            if (position < 0 || position >= list.size()) return null;
            return Rows.view(ctx, style, list.get(position), true);
        }

        @Override
        public RemoteViews getLoadingView() {
            return null;
        }

        @Override
        public int getViewTypeCount() {
            return Rows.TYPES;
        }

        @Override
        public long getItemId(int position) {
            return position;
        }

        @Override
        public boolean hasStableIds() {
            return false;
        }
    }
}
