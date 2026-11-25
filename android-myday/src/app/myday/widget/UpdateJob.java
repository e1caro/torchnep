package app.myday.widget;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;

/** Looks for a newer version twice a day while the phone is online, so the widget stays current unopened. */
public class UpdateJob extends JobService {
    private static final int JOB_ID = 4102;

    /** Books the job unless it is already booked. */
    static void schedule(Context ctx) {
        JobScheduler js = (JobScheduler) ctx.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (js == null || js.getPendingJob(JOB_ID) != null) return;
        JobInfo job = new JobInfo.Builder(JOB_ID, new ComponentName(ctx, UpdateJob.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPeriodic(12 * Day.HOUR)
                .build();
        try {
            js.schedule(job);
        } catch (RuntimeException ignored) {
            // The app still checks whenever it is opened.
        }
    }

    @Override
    public boolean onStartJob(final JobParameters params) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    Updater.run(UpdateJob.this);
                } finally {
                    jobFinished(params, false);
                }
            }
        }).start();
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        return false;
    }
}
