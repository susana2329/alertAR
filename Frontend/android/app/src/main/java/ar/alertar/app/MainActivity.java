package ar.alertar.app;

import android.os.Bundle;
import android.graphics.Color;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.ViewGroup;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private boolean recoveringRenderer;
    private boolean activityResumed;
    private boolean recreationScheduled;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        registerPlugin(ReportCameraRecoveryPlugin.class);
        bridgeBuilder.addWebViewListener(new WebViewListener() {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                Log.e("AlertARRecovery", "WebView exited; crashed=" + detail.didCrash());
                if (view.getParent() instanceof ViewGroup) {
                    ((ViewGroup) view.getParent()).removeView(view);
                }
                view.destroy();
                if (!recoveringRenderer && !isFinishing()) {
                    recoveringRenderer = true;
                    // Recreate the bridge using Android's saved activity/plugin state.
                    // Reloading a WebView whose renderer died is not supported.
                    if (activityResumed) recreateBridge();
                }
                // Prevent Chromium from killing the entire host application.
                return true;
            }
        });
        super.onCreate(savedInstanceState);
        getBridge().getWebView().setBackgroundColor(Color.WHITE);
    }

    @Override
    public void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        ReportCameraRecoveryPlugin.persist(this, state);
    }

    @Override
    public void onPause() {
        activityResumed = false;
        if (getBridge() != null) {
            Bundle state = new Bundle();
            getBridge().saveInstanceState(state);
            ReportCameraRecoveryPlugin.persist(this, state);
        }
        super.onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
        activityResumed = true;
        if (recoveringRenderer) recreateBridge();
    }

    private void recreateBridge() {
        if (recreationScheduled) return;
        recreationScheduled = true;
        new Handler(Looper.getMainLooper()).post(() -> {
            if (!isFinishing() && !isDestroyed()) recreate();
        });
    }
}
