package cz.spolecnenalezy.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int APP_PERMISSIONS_REQUEST = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestAppPermissions();
    }

    private void requestAppPermissions() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            boolean cameraMissing = checkSelfPermission(Manifest.permission.CAMERA)
                    != PackageManager.PERMISSION_GRANTED;
            boolean locationMissing = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED;

            if (cameraMissing || locationMissing) {
                requestPermissions(
                        new String[] {
                                Manifest.permission.CAMERA,
                                Manifest.permission.ACCESS_FINE_LOCATION
                        },
                        APP_PERMISSIONS_REQUEST
                );
            }
        }
    }
}
