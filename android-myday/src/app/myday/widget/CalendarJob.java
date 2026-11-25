package app.myday.widget;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;
import android.provider.CalendarContract;

/** Redraws the widget shortly after anything in the phone's calendar changes. */
public class CalendarJob extends JobService {
    private static final int JOB_ID = 4101;

    static void schedule(Context ctx) {
        if (!Cal.canRead(ctx)) return;
        JobScheduler js = (JobScheduler) ctx.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (js == null) return;
        JobInfo job = new JobInfo.Builder(JOB_ID, new ComponentName(ctx, CalendarJob.class))
                .addTriggerContentUri(new JobInfo.TriggerContentUri(CalendarContract.CONTENT_URI,
                        JobInfo.TriggerContentUri.FLAG_NOTIFY_FOR_DESCENDANTS))
                .setTriggerContentUpdateDelay(1500)
                .setTriggerContentMaxDelay(6000)
                .build();
        try {
            js.schedule(job);
        } catch (RuntimeException ignored) {
            // The half-hourly system update still redraws the widget.
        }
    }

    static void cancel(Context ctx) {
        JobScheduler js = (JobScheduler) ctx.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (js != null) js.cancel(JOB_ID);
    }

    @Override
    public boolean onStartJob(JobParameters params) {
        // refresh() books this job again, which is how a content-trigger job keeps watching.
        DayWidget.refresh(this, "calendar changed");
        return false;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return false;
    }
}
