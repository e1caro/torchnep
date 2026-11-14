package io.github.e1caro.scorebook

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import io.github.e1caro.scorebook.ui.ScorebookRoot
import io.github.e1caro.scorebook.ui.ScorebookTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // "take": open a saved take directly (used by the on-device test, and later by notifications)
        val take = intent?.getStringExtra(EXTRA_TAKE)
        setContent { ScorebookTheme { ScorebookRoot(openTake = take) } }
    }

    companion object {
        const val EXTRA_TAKE = "take"
    }
}
