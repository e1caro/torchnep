package app.myday.widget;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DatePickerDialog;
import android.app.TimePickerDialog;
import android.content.ActivityNotFoundException;
import android.content.ContentUris;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.provider.CalendarContract;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import android.text.InputType;
import android.text.format.DateFormat;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.DatePicker;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.TimePicker;
import android.widget.Toast;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** The app screen: tell Claude something, add things by hand, see today, and settings. */
public class MainActivity extends Activity {
    static final String ACTION_COMPOSE = "app.myday.widget.COMPOSE";
    static final String ACTION_VOICE = "app.myday.widget.VOICE";
    private static final int REQ_CALENDAR = 1, REQ_VOICE = 2;

    private EditText input, apiKey;
    private TextView reply, keyHint, keyState, dateView, versionText, updateStatus;
    private boolean updating;
    private final SharedPreferences.OnSharedPreferenceChangeListener updateListener =
            new SharedPreferences.OnSharedPreferenceChangeListener() {
                @Override
                public void onSharedPreferenceChanged(SharedPreferences prefs, String key) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            showUpdateStatus();
                        }
                    });
                }
            };
    private View permCard, clearKey;
    private LinearLayout todayList, todoList, noteList, styleList;
    private final List<View> styleFrames = new ArrayList<>();
    private final List<TextView> styleLabels = new ArrayList<>();
    private Spinner calendarSpinner;
    private ProgressBar busy;
    private Button send;
    private boolean sending, sendAfterVoice;
    private List<Cal.Info> calendars = new ArrayList<>();

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(R.layout.activity_main);
        input = findViewById(R.id.input);
        apiKey = findViewById(R.id.apiKey);
        reply = findViewById(R.id.reply);
        keyHint = findViewById(R.id.keyHint);
        keyState = findViewById(R.id.keyState);
        dateView = findViewById(R.id.date);
        permCard = findViewById(R.id.permCard);
        clearKey = findViewById(R.id.clearKey);
        todayList = findViewById(R.id.todayList);
        todoList = findViewById(R.id.todoList);
        noteList = findViewById(R.id.noteList);
        styleList = findViewById(R.id.styleList);
        versionText = findViewById(R.id.versionText);
        updateStatus = findViewById(R.id.updateStatus);
        findViewById(R.id.checkUpdate).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                checkForUpdate();
            }
        });
        calendarSpinner = findViewById(R.id.calendar);
        busy = findViewById(R.id.busy);
        send = findViewById(R.id.send);

        send.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                send();
            }
        });
        findViewById(R.id.mic).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startVoice(false);
            }
        });
        findViewById(R.id.allow).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                askForCalendar();
            }
        });
        findViewById(R.id.addEvent).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                eventDialog("");
            }
        });
        findViewById(R.id.addTodo).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                textDialog(true);
            }
        });
        findViewById(R.id.addNote).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                textDialog(false);
            }
        });
        findViewById(R.id.saveKey).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                saveKey();
            }
        });
        clearKey.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Secret.clear(MainActivity.this);
                apiKey.setText("");
                render();
            }
        });
        calendarSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                if (position >= 0 && position < calendars.size()) {
                    Store.setCalendarId(MainActivity.this, calendars.get(position).id);
                }
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {
            }
        });
        buildStylePicker();
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    @Override
    protected void onResume() {
        super.onResume();
        Updater.onScreen = true;
        Updater.settle(this);
        Updater.prefs(this).registerOnSharedPreferenceChangeListener(updateListener);
        render();
        DayWidget.refresh(this);
        UpdateJob.schedule(this);
        if (Updater.needsTap(this) || Updater.autoCheckDue(this)) checkForUpdate();
    }

    @Override
    protected void onPause() {
        Updater.onScreen = false;
        Updater.prefs(this).unregisterOnSharedPreferenceChangeListener(updateListener);
        super.onPause();
    }

    // ---- updates ----

    private void checkForUpdate() {
        if (updating) return;
        updating = true;
        Updater.setStatus(this, "Checking for updates\u2026");
        final Context app = getApplicationContext();
        new Thread(new Runnable() {
            @Override
            public void run() {
                Updater.run(app);
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        updating = false;
                        showUpdateStatus();
                    }
                });
            }
        }).start();
    }

    private void showUpdateStatus() {
        int version = Updater.currentVersion(this);
        versionText.setText("Version 1." + version);
        updateStatus.setText(Updater.status(this));
    }

    private void handleIntent(Intent intent) {
        String action = intent == null ? null : intent.getAction();
        if (ACTION_VOICE.equals(action)) {
            intent.setAction(Intent.ACTION_MAIN);
            startVoice(true);
        } else if (ACTION_COMPOSE.equals(action)) {
            intent.setAction(Intent.ACTION_MAIN);
            input.requestFocus();
            getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE
                    | WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        }
    }

    // ---- calendar permission ----

    private SharedPreferences ui() {
        return getSharedPreferences("ui", Context.MODE_PRIVATE);
    }

    private void askForCalendar() {
        boolean askedBefore = ui().getBoolean("asked_calendar", false);
        if (askedBefore && !shouldShowRequestPermissionRationale(Manifest.permission.READ_CALENDAR)) {
            // Android stops showing the prompt after two refusals; the app's settings page is the way back.
            startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.fromParts("package", getPackageName(), null)));
            return;
        }
        ui().edit().putBoolean("asked_calendar", true).apply();
        requestPermissions(new String[]{Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR},
                REQ_CALENDAR);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        render();
        DayWidget.refresh(this);
    }

    // ---- telling Claude ----

    private void send() {
        final String text = input.getText().toString().trim();
        if (text.isEmpty() || sending) return;
        hideKeyboard();
        final String key = Secret.get(this);
        if (key == null) {
            sortByHand(text);
            return;
        }
        setSending(true);
        showReply("Thinking…", true);
        final Context app = getApplicationContext();
        new Thread(new Runnable() {
            @Override
            public void run() {
                String message;
                Actions.Result result = null;
                boolean ok = false;
                try {
                    Map<String, Cal.Ev> index = new HashMap<>();
                    String context = Actions.snapshot(app, index);
                    JSONObject out = Claude.ask(key, context, text);
                    result = Actions.apply(app, out.optJSONArray("actions"), index);
                    message = out.optString("reply").trim();
                    if (message.isEmpty()) message = result.applied > 0 ? "Done." : "Nothing to change.";
                    ok = true;
                } catch (Claude.Failure e) {
                    message = e.getMessage();
                } catch (RuntimeException e) {
                    message = "Something went wrong. Try again.";
                }
                final String finalMessage = message;
                final Actions.Result finalResult = result;
                final boolean finalOk = ok;
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        DayWidget.refresh(app);
                        if (isFinishing() || isDestroyed()) return;
                        setSending(false);
                        StringBuilder sb = new StringBuilder(finalMessage);
                        if (finalResult != null) {
                            for (String p : finalResult.problems) sb.append("\n").append(p);
                        }
                        showReply(sb.toString(), false);
                        if (finalOk) input.setText("");
                        render();
                        if (finalResult != null && !finalResult.deletes.isEmpty()) confirmDeletes(finalResult.deletes);
                    }
                });
            }
        }).start();
    }

    private void confirmDeletes(final List<Cal.Ev> events) {
        StringBuilder sb = new StringBuilder();
        for (Cal.Ev e : events) {
            if (sb.length() > 0) sb.append("\n");
            sb.append("• ").append(e.title).append(" · ").append(Day.shortDate(e.date));
            if (!e.allDay) sb.append(", ").append(Day.clock(this, e.begin));
        }
        new AlertDialog.Builder(this)
                .setTitle(events.size() == 1 ? "Delete this event from your calendar?"
                        : "Delete these events from your calendar?")
                .setMessage(sb.toString())
                .setNegativeButton("Keep", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        showReply("Kept. Nothing was deleted.", false);
                    }
                })
                .setPositiveButton("Delete", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        try {
                            for (Cal.Ev e : events) Cal.delete(MainActivity.this, e.id);
                        } catch (RuntimeException e) {
                            toast("Couldn't delete that event.");
                        }
                        render();
                        DayWidget.refresh(MainActivity.this);
                    }
                })
                .show();
    }

    /** Without an API key there is nobody to sort the sentence, so the person picks. */
    private void sortByHand(final String text) {
        new AlertDialog.Builder(this)
                .setTitle("Save as")
                .setItems(new String[]{"Event", "To-do", "Note"}, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        if (which == 0) {
                            eventDialog(text);
                            return;
                        }
                        if (which == 1) Store.addTodo(MainActivity.this, text, "");
                        else Store.addNote(MainActivity.this, text, "");
                        input.setText("");
                        showReply(which == 1 ? "Added to your to-dos." : "Added to Keep in mind.", false);
                        render();
                        DayWidget.refresh(MainActivity.this);
                    }
                })
                .show();
    }

    private void setSending(boolean on) {
        sending = on;
        send.setEnabled(!on);
        send.setAlpha(on ? 0.5f : 1f);
        busy.setVisibility(on ? View.VISIBLE : View.GONE);
    }

    private void showReply(String text, boolean muted) {
        reply.setText(text);
        reply.setTextColor(getColor(muted ? R.color.mute : R.color.ink));
        reply.setVisibility(View.VISIBLE);
    }

    // ---- voice ----

    private void startVoice(boolean sendWhenDone) {
        sendAfterVoice = sendWhenDone;
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                .putExtra(RecognizerIntent.EXTRA_PROMPT, "What should I add or change?");
        try {
            startActivityForResult(i, REQ_VOICE);
        } catch (ActivityNotFoundException e) {
            toast("This phone has no voice input. Type it instead.");
            input.requestFocus();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_VOICE || resultCode != RESULT_OK || data == null) return;
        ArrayList<String> results = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        if (results == null || results.isEmpty()) return;
        String existing = input.getText().toString().trim();
        input.setText(existing.isEmpty() ? results.get(0) : existing + " " + results.get(0));
        input.setSelection(input.getText().length());
        if (sendAfterVoice && Secret.has(this)) send();
    }

    // ---- adding by hand ----

    private void textDialog(final boolean todo) {
        final EditText field = new EditText(this);
        field.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        field.setHint(todo ? "Call the bank" : "Parcel arriving Thursday");
        LinearLayout box = new LinearLayout(this);
        box.setPadding(dp(20), dp(8), dp(20), 0);
        box.addView(field, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));
        AlertDialog d = new AlertDialog.Builder(this)
                .setTitle(todo ? "New to-do" : "New note")
                .setView(box)
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Add", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        String text = field.getText().toString().trim();
                        if (text.isEmpty()) return;
                        if (todo) Store.addTodo(MainActivity.this, text, "");
                        else Store.addNote(MainActivity.this, text, "");
                        render();
                        DayWidget.refresh(MainActivity.this);
                    }
                })
                .create();
        if (d.getWindow() != null) {
            d.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE);
        }
        d.show();
        field.requestFocus();
    }

    private void eventDialog(final String presetTitle) {
        if (!Cal.canWrite(this) || !Cal.canRead(this)) {
            toast("Allow calendar access first.");
            askForCalendar();
            return;
        }
        final String[] date = {Day.today()};
        final String[] start = {nextHour()};
        final String[] end = {""};

        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(20), dp(8), dp(20), 0);

        final EditText title = new EditText(this);
        title.setHint("What");
        title.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        title.setText(presetTitle);
        box.addView(title);

        final Button dateBtn = new Button(this);
        final Button startBtn = new Button(this);
        final Button endBtn = new Button(this);
        final CheckBox allDay = new CheckBox(this);
        allDay.setText("All day");
        for (Button b : new Button[]{dateBtn, startBtn, endBtn}) b.setAllCaps(false);

        final Runnable relabel = new Runnable() {
            @Override
            public void run() {
                dateBtn.setText(Day.shortDate(date[0]));
                startBtn.setText("Starts " + Day.clock(MainActivity.this, Day.localMillis(date[0], start[0])));
                endBtn.setText(end[0].isEmpty() ? "Ends: 1 hour later"
                        : "Ends " + Day.clock(MainActivity.this, Day.localMillis(date[0], end[0])));
                startBtn.setVisibility(allDay.isChecked() ? View.GONE : View.VISIBLE);
                endBtn.setVisibility(allDay.isChecked() ? View.GONE : View.VISIBLE);
            }
        };
        dateBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                int y = Integer.parseInt(date[0].substring(0, 4));
                int m = Integer.parseInt(date[0].substring(5, 7)) - 1;
                int d = Integer.parseInt(date[0].substring(8, 10));
                new DatePickerDialog(MainActivity.this, new DatePickerDialog.OnDateSetListener() {
                    @Override
                    public void onDateSet(DatePicker view, int year, int month, int day) {
                        date[0] = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, day);
                        relabel.run();
                    }
                }, y, m, d).show();
            }
        });
        startBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                pickTime(start[0], new TimePickerDialog.OnTimeSetListener() {
                    @Override
                    public void onTimeSet(TimePicker view, int hour, int minute) {
                        start[0] = String.format(Locale.US, "%02d:%02d", hour, minute);
                        relabel.run();
                    }
                });
            }
        });
        endBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                pickTime(end[0].isEmpty() ? start[0] : end[0], new TimePickerDialog.OnTimeSetListener() {
                    @Override
                    public void onTimeSet(TimePicker view, int hour, int minute) {
                        end[0] = String.format(Locale.US, "%02d:%02d", hour, minute);
                        relabel.run();
                    }
                });
            }
        });
        allDay.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton button, boolean checked) {
                relabel.run();
            }
        });
        box.addView(dateBtn);
        box.addView(allDay);
        box.addView(startBtn);
        box.addView(endBtn);

        final EditText place = new EditText(this);
        place.setHint("Where (optional)");
        place.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        box.addView(place);
        relabel.run();

        new AlertDialog.Builder(this)
                .setTitle("New event")
                .setView(box)
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Add", new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        String t = title.getText().toString().trim();
                        if (t.isEmpty()) {
                            toast("Give the event a name.");
                            return;
                        }
                        try {
                            Cal.insert(MainActivity.this, t, date[0], allDay.isChecked() ? "" : start[0],
                                    allDay.isChecked() ? "" : end[0], place.getText().toString().trim());
                            if (!presetTitle.isEmpty()) input.setText("");
                            showReply("Added “" + t + "” on " + Day.shortDate(date[0]) + ".", false);
                        } catch (Cal.NoCalendar e) {
                            toast("No calendar on this phone can take new events. Add a Google account first.");
                        } catch (RuntimeException e) {
                            toast("Couldn't save that event.");
                        }
                        render();
                        DayWidget.refresh(MainActivity.this);
                    }
                })
                .show();
    }

    private void pickTime(String hhmm, TimePickerDialog.OnTimeSetListener listener) {
        new TimePickerDialog(this, listener, Integer.parseInt(hhmm.substring(0, 2)),
                Integer.parseInt(hhmm.substring(3, 5)), DateFormat.is24HourFormat(this)).show();
    }

    private static String nextHour() {
        int h = java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY);
        return String.format(Locale.US, "%02d:00", Math.min(23, h + 1));
    }

    // ---- widget style ----

    /** A row of live miniatures: each is the real widget layout drawn with sample content. */
    private void buildStylePicker() {
        styleList.removeAllViews();
        styleFrames.clear();
        styleLabels.clear();
        final int width = dp(320), height = dp(288), inset = dp(8), border = dp(5);
        final float scale = 0.5f;
        for (final Style s : Style.ALL) {
            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setGravity(Gravity.CENTER_HORIZONTAL);
            LinearLayout.LayoutParams cardLp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            cardLp.rightMargin = dp(6);
            card.setLayoutParams(cardLp);

            FrameLayout frame = new FrameLayout(this);
            frame.setBackgroundResource(R.drawable.preview_frame);
            frame.setPadding(border, border, border, border);

            FrameLayout wall = new FrameLayout(this);
            wall.setBackgroundResource(R.drawable.preview_wall);
            wall.setPadding(inset, inset, inset, inset);
            int wallW = Math.round(width * scale) + 2 * inset, wallH = Math.round(height * scale) + 2 * inset;
            try {
                View widget = DayWidget.preview(this, s).apply(this, wall);
                widget.setLayoutParams(new FrameLayout.LayoutParams(width, height));
                widget.setPivotX(0);
                widget.setPivotY(0);
                widget.setScaleX(scale);
                widget.setScaleY(scale);
                wall.addView(widget);
            } catch (RuntimeException e) {
                // A preview that cannot be drawn still leaves the style selectable by name.
                android.util.Log.e("MyDay", "preview failed: " + s.key, e);
            }
            frame.addView(wall, new FrameLayout.LayoutParams(wallW, wallH));

            View tap = new View(this);
            tap.setContentDescription(s.name + " style");
            tap.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Store.setStyle(MainActivity.this, s.key);
                    markStyle();
                    DayWidget.refresh(MainActivity.this);
                }
            });
            frame.addView(tap, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT));
            card.addView(frame);

            TextView label = new TextView(this);
            label.setTextSize(15);
            label.setGravity(Gravity.CENTER);
            label.setPadding(0, dp(4), 0, dp(4));
            card.addView(label);

            styleList.addView(card);
            styleFrames.add(frame);
            styleLabels.add(label);
        }
        markStyle();
    }

    private void markStyle() {
        String chosen = Style.current(this).key;
        for (int i = 0; i < Style.ALL.length && i < styleFrames.size(); i++) {
            boolean on = Style.ALL[i].key.equals(chosen);
            styleFrames.get(i).setSelected(on);
            TextView label = styleLabels.get(i);
            label.setText(on ? "\u2713 " + Style.ALL[i].name : Style.ALL[i].name);
            label.setTypeface(Typeface.create("sans-serif", on ? Typeface.BOLD : Typeface.NORMAL));
            label.setTextColor(getColor(on ? R.color.ink : R.color.mute));
        }
    }

    // ---- settings ----

    private void saveKey() {
        String key = apiKey.getText().toString().trim();
        if (key.isEmpty()) {
            toast("Paste your key first.");
            return;
        }
        if (!Secret.set(this, key)) {
            toast("This phone couldn't store the key.");
            return;
        }
        apiKey.setText("");
        hideKeyboard();
        toast("Key saved on this phone.");
        render();
    }

    // ---- drawing ----

    private void render() {
        long now = System.currentTimeMillis();
        String today = Day.today();
        dateView.setText(Day.longDate(now));
        boolean calendarOk = Cal.canRead(this) && Cal.canWrite(this);
        permCard.setVisibility(calendarOk ? View.GONE : View.VISIBLE);

        boolean hasKey = Secret.has(this);
        keyHint.setVisibility(hasKey ? View.GONE : View.VISIBLE);
        keyState.setText(hasKey ? "A key is saved on this phone." : "No key saved.");
        clearKey.setVisibility(hasKey ? View.VISIBLE : View.GONE);

        todayList.removeAllViews();
        if (!Cal.canRead(this)) {
            todayList.addView(emptyLine("Calendar access is off."));
        } else {
            List<Cal.Ev> events = Cal.day(this, today);
            if (events.isEmpty()) todayList.addView(emptyLine("Nothing scheduled today."));
            for (Cal.Ev e : events) todayList.addView(eventRow(e, now));
        }

        todoList.removeAllViews();
        List<Store.Todo> todos = Store.todosFor(this, today);
        if (todos.isEmpty()) todoList.addView(emptyLine("No to-dos."));
        for (Store.Todo t : todos) todoList.addView(todoRow(t, today));

        noteList.removeAllViews();
        List<Store.Note> notes = Store.notesFor(this, today);
        if (notes.isEmpty()) noteList.addView(emptyLine("Nothing pinned."));
        for (Store.Note n : notes) noteList.addView(noteRow(n));

        showUpdateStatus();

        calendars = Cal.writable(this);
        List<String> names = new ArrayList<>();
        int selected = 0;
        long target = Cal.target(this);
        for (int i = 0; i < calendars.size(); i++) {
            Cal.Info c = calendars.get(i);
            names.add(c.account.isEmpty() || c.account.equals(c.name) ? c.name : c.name + " · " + c.account);
            if (c.id == target) selected = i;
        }
        if (names.isEmpty()) names.add(calendarOk ? "No calendar found" : "Allow calendar access first");
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, names);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        calendarSpinner.setAdapter(adapter);
        calendarSpinner.setEnabled(!calendars.isEmpty());
        calendarSpinner.setSelection(selected);
    }

    private TextView emptyLine(String text) {
        TextView t = new TextView(this);
        t.setText(text);
        t.setTextSize(15);
        t.setTextColor(getColor(R.color.mute));
        t.setPadding(0, dp(6), 0, dp(6));
        return t;
    }

    private View eventRow(final Cal.Ev e, long now) {
        boolean past = !e.allDay && e.end <= now;
        boolean current = !e.allDay && e.begin <= now && now < e.end;
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setMinimumHeight(dp(52));
        row.setPadding(0, dp(10), 0, dp(10));

        TextView time = new TextView(this);
        time.setText(e.allDay ? "All day" : Day.clock(this, e.begin));
        time.setTextSize(18);
        time.setTypeface(Typeface.create("sans-serif-condensed", Typeface.BOLD));
        time.setTextColor(getColor(current ? R.color.accent : past ? R.color.mute : R.color.ink));
        row.addView(time, new LinearLayout.LayoutParams(dp(92), ViewGroup.LayoutParams.WRAP_CONTENT));

        LinearLayout body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        TextView title = new TextView(this);
        title.setText(e.title);
        title.setTextSize(16);
        title.setTypeface(Typeface.create("sans-serif-medium", Typeface.NORMAL));
        title.setTextColor(getColor(past ? R.color.mute : R.color.ink));
        body.addView(title);
        String sub = e.allDay ? e.place
                : "until " + Day.clock(this, e.end) + (e.place.isEmpty() ? "" : " · " + e.place);
        if (!sub.isEmpty()) {
            TextView s = new TextView(this);
            s.setText(sub);
            s.setTextSize(14);
            s.setTextColor(getColor(R.color.mute));
            body.addView(s);
        }
        row.addView(body, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));

        row.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent view = new Intent(Intent.ACTION_VIEW,
                        ContentUris.withAppendedId(CalendarContract.Events.CONTENT_URI, e.id))
                        .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, e.begin)
                        .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, e.end);
                try {
                    startActivity(view);
                } catch (ActivityNotFoundException | SecurityException ex) {
                    toast("No calendar app can open this event.");
                }
            }
        });
        return row;
    }

    private View todoRow(final Store.Todo t, String today) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setMinimumHeight(dp(48));

        CheckBox box = new CheckBox(this);
        boolean overdue = !t.done && Day.isDate(t.date) && t.date.compareTo(today) < 0;
        box.setText(overdue ? t.text + " · from " + Day.shortDate(t.date) : t.text);
        box.setTextSize(16);
        box.setChecked(t.done);
        box.setTextColor(getColor(t.done ? R.color.mute : R.color.ink));
        if (t.done) box.setPaintFlags(box.getPaintFlags() | Paint.STRIKE_THRU_TEXT_FLAG);
        box.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton button, boolean checked) {
                Store.setDone(MainActivity.this, t.id, checked);
                render();
                DayWidget.refresh(MainActivity.this);
            }
        });
        row.addView(box, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        row.addView(removeButton(new Runnable() {
            @Override
            public void run() {
                Store.deleteTodo(MainActivity.this, t.id);
            }
        }));
        return row;
    }

    private View noteRow(final Store.Note n) {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setBackgroundResource(R.drawable.note_bg);
        row.setPadding(dp(14), dp(2), dp(2), dp(2));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.bottomMargin = dp(8);
        row.setLayoutParams(lp);

        TextView text = new TextView(this);
        text.setText(Day.isDate(n.until) ? n.text + "\nUntil " + Day.shortDate(n.until) : n.text);
        text.setTextSize(15);
        text.setTextColor(getColor(R.color.ink));
        row.addView(text, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
        row.addView(removeButton(new Runnable() {
            @Override
            public void run() {
                Store.deleteNote(MainActivity.this, n.id);
            }
        }));
        return row;
    }

    private View removeButton(final Runnable remove) {
        TextView x = new TextView(this);
        x.setText("✕");
        x.setTextSize(16);
        x.setGravity(Gravity.CENTER);
        x.setTextColor(getColor(R.color.mute));
        x.setContentDescription("Remove");
        x.setLayoutParams(new LinearLayout.LayoutParams(dp(48), dp(48)));
        x.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                remove.run();
                render();
                DayWidget.refresh(MainActivity.this);
            }
        });
        return x;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void toast(String text) {
        Toast.makeText(this, text, Toast.LENGTH_LONG).show();
    }

    private void hideKeyboard() {
        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        View focus = getCurrentFocus();
        if (imm != null && focus != null) imm.hideSoftInputFromWindow(focus.getWindowToken(), 0);
    }
}
