package com.plummz.classapp;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // The WebView ignores file downloads by default; hand them to the phone's browser,
        // which saves them to Downloads like any other download.
        getBridge().getWebView().setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url == null || !(url.startsWith("http://") || url.startsWith("https://"))) {
                Toast.makeText(this, "This file can't be downloaded in the app", Toast.LENGTH_SHORT).show();
                return;
            }
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            } catch (ActivityNotFoundException e) {
                Toast.makeText(this, "No app found to open this file", Toast.LENGTH_SHORT).show();
            }
        });
    }
}
