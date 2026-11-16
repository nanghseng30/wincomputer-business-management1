package com.wincomputer.client;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public final class MainActivity extends Activity {
    private WebView webView;
    private Uri origin;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        origin = parseOrigin(BuildConfig.WEB_APP_ORIGIN);
        if (origin == null) {
            Toast.makeText(this, "Configure a valid HTTPS web app origin before building.", Toast.LENGTH_LONG).show();
            finish();
            return;
        }

        webView = new WebView(this);
        configureWebView(webView);
        setContentView(webView);
        webView.loadUrl(origin.toString());
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView(WebView view) {
        view.getSettings().setJavaScriptEnabled(true);
        view.getSettings().setDomStorageEnabled(true);
        view.getSettings().setAllowFileAccess(false);
        view.getSettings().setAllowContentAccess(false);
        view.getSettings().setSupportMultipleWindows(false);
        view.getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        // WebView's normal profile persists cookies/cache for login; no business data is stored by this client.
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(view, false);

        view.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView webView, WebResourceRequest request) {
                return !isAllowed(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView webView, String url) {
                return !isAllowed(Uri.parse(url));
            }
        });
    }

    private boolean isAllowed(Uri candidate) {
        return candidate != null
                && "https".equalsIgnoreCase(candidate.getScheme())
                && origin.getHost().equalsIgnoreCase(candidate.getHost())
                && httpsPort(origin) == httpsPort(candidate);
    }

    private static int httpsPort(Uri value) {
        return value.getPort() == -1 ? 443 : value.getPort();
    }

    private static Uri parseOrigin(String value) {
        if (value == null) return null;
        Uri parsed = Uri.parse(value.trim());
        if (!"https".equalsIgnoreCase(parsed.getScheme())
                || parsed.getHost() == null
                || parsed.getUserInfo() != null
                || parsed.getQuery() != null
                || parsed.getFragment() != null
                || (parsed.getPath() != null && !parsed.getPath().isEmpty() && !"/".equals(parsed.getPath()))) {
            return null;
        }
        return new Uri.Builder()
                .scheme("https")
                .encodedAuthority(parsed.getAuthority())
                .build();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
