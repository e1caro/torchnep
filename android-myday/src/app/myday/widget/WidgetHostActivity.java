package app.myday.widget;

import android.app.Activity;
import android.appwidget.AppWidgetHost;
import android.appwidget.AppWidgetHostView;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.os.Bundle;
import android.util.Log;
import android.view.ViewGroup;
import android.widget.FrameLayout;

/**
 * Hosts the real widget inside the app, the way a home screen does, so the emulator check can watch it react
 * to calendar changes. It only works after "adb shell appwidget grantbind --package app.myday.widget"; on a
 * phone it closes straight away.
 */
public class WidgetHostActivity extends Activity {
    private AppWidgetHost host;
    private int widgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        AppWidgetManager mgr = AppWidgetManager.getInstance(this);
        host = new AppWidgetHost(this, 7);
        widgetId = host.allocateAppWidgetId();
        if (!mgr.bindAppWidgetIdIfAllowed(widgetId, new ComponentName(this, DayWidget.class))) {
            Log.w("MyDay", "widget host: binding is not allowed");
            host.deleteAppWidgetId(widgetId);
            widgetId = AppWidgetManager.INVALID_APPWIDGET_ID;
            finish();
            return;
        }
        AppWidgetHostView view = host.createView(this, widgetId, mgr.getAppWidgetInfo(widgetId));
        float density = getResources().getDisplayMetrics().density;
        int pad = Math.round(16 * density);
        FrameLayout frame = new FrameLayout(this);
        frame.setBackgroundResource(R.drawable.preview_wall);
        frame.setPadding(pad, pad * 3, pad, pad);
        frame.addView(view, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                Math.round(300 * density)));
        setContentView(frame);
        Log.i("MyDay", "widget host: showing widget " + widgetId);
        DayWidget.refresh(this, "widget host");
    }

    @Override
    protected void onStart() {
        super.onStart();
        if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) host.startListening();
    }

    @Override
    protected void onStop() {
        if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) host.stopListening();
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        if (widgetId != AppWidgetManager.INVALID_APPWIDGET_ID) host.deleteAppWidgetId(widgetId);
        super.onDestroy();
    }
}
