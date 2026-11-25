package app.myday.widget;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Keeps the Claude API key encrypted with a key held in the Android Keystore. */
final class Secret {
    private static final String ALIAS = "myday_api_key";

    private Secret() {}

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences("secret", Context.MODE_PRIVATE);
    }

    private static SecretKey key() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (!ks.containsAlias(ALIAS)) {
            KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            kg.init(new KeyGenParameterSpec.Builder(ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .build());
            kg.generateKey();
        }
        return (SecretKey) ks.getKey(ALIAS, null);
    }

    static boolean has(Context ctx) {
        return prefs(ctx).contains("key");
    }

    /** Returns false if the phone could not store it. */
    static boolean set(Context ctx, String apiKey) {
        try {
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.ENCRYPT_MODE, key());
            byte[] ct = c.doFinal(apiKey.getBytes(StandardCharsets.UTF_8));
            String packed = Base64.encodeToString(c.getIV(), Base64.NO_WRAP) + ":"
                    + Base64.encodeToString(ct, Base64.NO_WRAP);
            prefs(ctx).edit().putString("key", packed).apply();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** The stored key, or null if there is none or it can no longer be read. */
    static String get(Context ctx) {
        String packed = prefs(ctx).getString("key", null);
        if (packed == null) return null;
        try {
            int colon = packed.indexOf(':');
            byte[] iv = Base64.decode(packed.substring(0, colon), Base64.NO_WRAP);
            byte[] ct = Base64.decode(packed.substring(colon + 1), Base64.NO_WRAP);
            Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
            c.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, iv));
            return new String(c.doFinal(ct), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }

    static void clear(Context ctx) {
        prefs(ctx).edit().remove("key").apply();
    }
}
