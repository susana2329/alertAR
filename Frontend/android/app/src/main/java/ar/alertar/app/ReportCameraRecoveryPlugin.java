package ar.alertar.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

@CapacitorPlugin(name = "ReportCameraRecovery")
public class ReportCameraRecoveryPlugin extends Plugin {
    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences("report_camera_recovery", Context.MODE_PRIVATE);
    }

    static void persist(Context context, Bundle state) {
        if (!"Camera".equals(state.getString("capacitorLastActivityPluginId"))) return;
        if (!"getPhoto".equals(state.getString("capacitorLastActivityPluginMethod"))) return;
        Bundle camera = state.getBundle("capacitorLastPluginCallBundle");
        String path = camera == null ? null : camera.getString("cameraImageFileSavePath");
        if (path != null) {
            // Commit before the process becomes eligible for a low-memory kill.
            preferences(context).edit().putString("path", path)
                .putLong("created", System.currentTimeMillis()).commit();
        }
    }

    @PluginMethod
    public void pending(PluginCall call) {
        SharedPreferences prefs = preferences(getContext());
        String path = prefs.getString("path", null);
        boolean pending = path != null && System.currentTimeMillis() - prefs.getLong("created", 0) < 86400000;
        JSObject data = new JSObject();
        data.put("pending", pending);
        if (pending) {
            File photo = new File(path);
            if (photo.isFile() && photo.length() > 0) data.put("uri", Uri.fromFile(photo).toString());
        }
        call.resolve(data);
    }

    @PluginMethod
    public void clear(PluginCall call) {
        preferences(getContext()).edit().clear().commit();
        call.resolve();
    }

    @PluginMethod
    public void uploadResult(PluginCall call) {
        Log.i("AlertARUpload", "status=" + call.getInt("status", -1)
            + " durationMs=" + call.getInt("durationMs", 0));
        call.resolve();
    }
}
