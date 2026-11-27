package com.didwanabullion.app;

import android.os.Build;
import android.os.Bundle;
import android.view.Display;
import android.view.Window;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hardenWindowSecurity();
        enableHighRefreshRate();
    }

    private void hardenWindowSecurity() {
        Window window = getWindow();
        if (window == null) return;
        // Prevent unencrypted screenshots & screen recording of sensitive session/rate screens
        window.addFlags(WindowManager.LayoutParams.FLAG_SECURE);
    }

    private void enableHighRefreshRate() {
        Window window = getWindow();
        if (window == null) return;

        window.addFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = window.getAttributes();
            lp.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(lp);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Display display = getWindowManager().getDefaultDisplay();
            if (display != null) {
                Display.Mode currentMode = display.getMode();
                Display.Mode bestMode = currentMode;
                for (Display.Mode mode : display.getSupportedModes()) {
                    if (mode.getPhysicalWidth() == currentMode.getPhysicalWidth()
                            && mode.getPhysicalHeight() == currentMode.getPhysicalHeight()
                            && mode.getRefreshRate() > bestMode.getRefreshRate()) {
                        bestMode = mode;
                    }
                }
                if (bestMode != null && bestMode.getModeId() != currentMode.getModeId()) {
                    WindowManager.LayoutParams params = window.getAttributes();
                    params.preferredDisplayModeId = bestMode.getModeId();
                    window.setAttributes(params);
                }
            }
        }
    }
}
