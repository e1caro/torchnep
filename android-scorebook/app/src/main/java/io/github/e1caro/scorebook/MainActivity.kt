package io.github.e1caro.scorebook

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import io.github.e1caro.scorebook.ui.ScorebookRoot
import io.github.e1caro.scorebook.ui.ScorebookTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { ScorebookTheme { ScorebookRoot() } }
    }
}
