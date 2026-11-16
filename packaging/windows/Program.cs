using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace WinComputer;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();

        var origin = ServerOrigin.LoadOrPrompt();
        if (origin is null)
        {
            return;
        }

        Application.Run(new WebAppWindow(origin));
    }
}

internal static class ServerOrigin
{
    private static readonly string SettingsDirectory = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "WinComputer");
    private static readonly string SettingsPath = Path.Combine(SettingsDirectory, "server-url.txt");

    public static Uri? LoadOrPrompt()
    {
        while (true)
        {
            var configured = TryRead();
            if (configured is not null)
            {
                return configured;
            }

            using var prompt = new OriginPrompt(configured is null && File.Exists(SettingsPath));
            if (prompt.ShowDialog() != DialogResult.OK)
            {
                return null;
            }

            if (!TryNormalize(prompt.ServerUrl, out var origin, out var error))
            {
                MessageBox.Show(error, "Win Computer", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                continue;
            }

            Directory.CreateDirectory(SettingsDirectory);
            File.WriteAllText(SettingsPath, origin.AbsoluteUri, new System.Text.UTF8Encoding(false));
            return origin;
        }
    }

    public static bool IsAllowed(Uri candidate, Uri origin) =>
        candidate.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) &&
        candidate.Host.Equals(origin.Host, StringComparison.OrdinalIgnoreCase) &&
        candidate.Port == origin.Port;

    private static Uri? TryRead()
    {
        try
        {
            if (!File.Exists(SettingsPath))
            {
                return null;
            }

            var value = File.ReadAllText(SettingsPath).Trim();
            return TryNormalize(value, out var origin, out _) ? origin : null;
        }
        catch
        {
            return null;
        }
    }

    private static bool TryNormalize(string? value, out Uri origin, out string error)
    {
        origin = null!;
        error = "Enter a valid HTTPS server URL, for example https://app.example.com.";

        if (!Uri.TryCreate(value?.Trim(), UriKind.Absolute, out var parsed) ||
            !parsed.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(parsed.Host) ||
            !string.IsNullOrEmpty(parsed.UserInfo) ||
            parsed.Fragment.Length != 0)
        {
            return false;
        }

        // Store and use the origin only; paths, queries, credentials, and fragments are not configuration.
        origin = new UriBuilder(Uri.UriSchemeHttps, parsed.Host, parsed.Port).Uri;
        return true;
    }
}

internal sealed class WebAppWindow : Form
{
    private readonly Uri origin;
    private readonly WebView2 browser = new() { Dock = DockStyle.Fill };

    public WebAppWindow(Uri origin)
    {
        this.origin = origin;
        Text = "Win Computer";
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;
        MinimumSize = new Size(960, 640);
        Controls.Add(browser);
        Load += InitializeBrowserAsync;
    }

    private async void InitializeBrowserAsync(object? sender, EventArgs e)
    {
        try
        {
            var profilePath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "WinComputer",
                "WebView2Profile");
            Directory.CreateDirectory(profilePath);

            var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: profilePath);
            await browser.EnsureCoreWebView2Async(environment);

            var settings = browser.CoreWebView2.Settings;
            settings.AreDevToolsEnabled = false;
            settings.AreHostObjectsAllowed = false;
            settings.AreDefaultContextMenusEnabled = false;
            settings.IsStatusBarEnabled = false;
            settings.IsZoomControlEnabled = false;
            settings.IsPasswordAutosaveEnabled = false;
            settings.IsGeneralAutofillEnabled = false;

            browser.CoreWebView2.NavigationStarting += OnNavigationStarting;
            browser.CoreWebView2.NewWindowRequested += OnNewWindowRequested;
            browser.CoreWebView2.ProcessFailed += OnProcessFailed;
            browser.CoreWebView2.Navigate(origin.AbsoluteUri);
        }
        catch (Exception exception)
        {
            MessageBox.Show(
                $"WebView2 could not be started. Install the Microsoft Edge WebView2 Runtime and try again.\n\n{exception.Message}",
                "Win Computer",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            Close();
        }
    }

    private void OnNavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
    {
        if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out var target) || !ServerOrigin.IsAllowed(target, origin))
        {
            e.Cancel = true;
            MessageBox.Show(
                "Navigation was blocked. This client only permits HTTPS pages on the configured server origin.",
                "Win Computer",
                MessageBoxButtons.OK,
                MessageBoxIcon.Warning);
        }
    }

    private static void OnNewWindowRequested(object? sender, CoreWebView2NewWindowRequestedEventArgs e)
    {
        e.Handled = true;
    }

    private void OnProcessFailed(object? sender, CoreWebView2ProcessFailedEventArgs e)
    {
        MessageBox.Show(
            "The web application process stopped. Restart Win Computer and verify the server is available.",
            "Win Computer",
            MessageBoxButtons.OK,
            MessageBoxIcon.Error);
    }
}

internal sealed class OriginPrompt : Form
{
    private readonly TextBox url = new() { Width = 520 };

    public string ServerUrl => url.Text;

    public OriginPrompt(bool invalidSavedValue)
    {
        Text = "Win Computer server";
        Width = 650;
        Height = 220;
        MinimumSize = new Size(650, 220);
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(18),
            ColumnCount = 1,
            RowCount = 4,
        };
        layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
        layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));

        layout.Controls.Add(new Label
        {
            AutoSize = true,
            Text = "Connect to the Win Computer web app",
            Font = new Font("Segoe UI", 12, FontStyle.Bold),
        });
        layout.Controls.Add(new Label
        {
            AutoSize = true,
            Text = invalidSavedValue
                ? "The saved server URL is invalid. Enter an HTTPS origin to continue."
                : "Internet access is required. Enter the public HTTPS server origin.",
            Padding = new Padding(0, 8, 0, 8),
        });
        layout.Controls.Add(url);

        var buttons = new FlowLayoutPanel { AutoSize = true, FlowDirection = FlowDirection.RightToLeft, Dock = DockStyle.Fill };
        var connect = new Button { Text = "Connect", DialogResult = DialogResult.OK, AutoSize = true };
        var cancel = new Button { Text = "Exit", DialogResult = DialogResult.Cancel, AutoSize = true };
        buttons.Controls.Add(connect);
        buttons.Controls.Add(cancel);
        layout.Controls.Add(buttons);

        Controls.Add(layout);
        AcceptButton = connect;
        CancelButton = cancel;
    }
}
