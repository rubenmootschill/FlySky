using System.Text.Json;
using System.Net;
using System.Net.Http.Headers;
using FlySky.PegAssist.Models;

namespace FlySky.PegAssist;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        var config = LoadConfig();
        if (config is null)
        {
            return;
        }

        ApplicationConfiguration.Initialize();

        try
        {
            Application.Run(new StartupContext(config));
        }
        catch (Exception ex)
        {
            MessageBox.Show($"FlyMe failed to start: {ex.Message}", "FlySky PegAssist", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private static PluginConfig? LoadConfig()
    {
        var configPath = ResolveConfigPath();

        if (!File.Exists(configPath))
        {
            MessageBox.Show(
                "Missing appsettings.json. Copy appsettings.example.json and configure it.",
                "FlySky PegAssist",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return null;
        }

        try
        {
            var configText = File.ReadAllText(configPath);
            var config = JsonSerializer.Deserialize<PluginConfig>(configText, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            });

            if (config is null)
            {
                MessageBox.Show("Invalid appsettings.json.", "FlySky PegAssist", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return null;
            }

            return config;
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Failed to read appsettings.json: {ex.Message}", "FlySky PegAssist", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return null;
        }
    }

    private static string ResolveConfigPath()
    {
        var basePath = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
        if (File.Exists(basePath))
        {
            return basePath;
        }

        var cwdPath = Path.Combine(Directory.GetCurrentDirectory(), "appsettings.json");
        return File.Exists(cwdPath) ? cwdPath : basePath;
    }

    private sealed class StartupContext : ApplicationContext
    {
        private readonly HttpClientHandler _httpHandler;
        private readonly HttpClient _httpClient;
        private readonly CookieContainer _cookieContainer;
        private readonly PluginConfig _config;
        private readonly string _configPath;
        private readonly Uri _apiBaseUri;

        private const string FlymeCookieName = "flyme_auth";

        public StartupContext(PluginConfig config)
        {
            _config = config;
            _configPath = ResolveConfigPath();
            _apiBaseUri = new Uri(config.ApiBaseUrl.TrimEnd('/') + "/");

            _cookieContainer = new CookieContainer();
            _httpHandler = new HttpClientHandler
            {
                UseCookies = true,
                CookieContainer = _cookieContainer,
            };

            _httpClient = new HttpClient(_httpHandler)
            {
                BaseAddress = _apiBaseUri,
            };

            if (!TryRestoreAuthFromConfig())
            {
                using var authDialog = new AuthDialog(_httpClient);
                if (authDialog.ShowDialog() != DialogResult.OK || string.IsNullOrWhiteSpace(authDialog.Callsign))
                {
                    ExitThread();
                    return;
                }

                _config.PilotCallsign = authDialog.Callsign.Trim().ToUpperInvariant();
                PersistAuthCookie();
                SaveConfig();
            }

            OpenMainWindow();
        }

        private bool TryRestoreAuthFromConfig()
        {
            if (string.IsNullOrWhiteSpace(_config.PilotCallsign) || string.IsNullOrWhiteSpace(_config.FlymeAuthToken))
            {
                return false;
            }

            try
            {
                _cookieContainer.Add(_apiBaseUri, new Cookie(FlymeCookieName, _config.FlymeAuthToken, "/", _apiBaseUri.Host));
                using var probe = _httpClient.GetAsync($"api/flyme/dispatches?pilotCallsign={Uri.EscapeDataString(_config.PilotCallsign.Trim().ToUpperInvariant())}").GetAwaiter().GetResult();
                if (probe.IsSuccessStatusCode)
                {
                    return true;
                }
            }
            catch
            {
            }

            _config.FlymeAuthToken = string.Empty;
            SaveConfig();
            return false;
        }

        private void PersistAuthCookie()
        {
            var cookie = _cookieContainer.GetCookies(_apiBaseUri)[FlymeCookieName];
            _config.FlymeAuthToken = cookie?.Value ?? string.Empty;
        }

        private void SaveConfig()
        {
            try
            {
                var json = JsonSerializer.Serialize(_config, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(_configPath, json);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"FlyMe could not save login state: {ex.Message}", "FlySky PegAssist", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void OpenMainWindow()
        {
            try
            {
                var mainForm = new MainForm(_config, _httpClient);
                MainForm = mainForm;
                mainForm.Show();
                mainForm.WindowState = FormWindowState.Normal;
                mainForm.Activate();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"FlyMe failed to open the tracker window: {ex.Message}", "FlySky PegAssist", MessageBoxButtons.OK, MessageBoxIcon.Error);
                ExitThread();
            }
        }

        protected override void ExitThreadCore()
        {
            _httpClient.Dispose();
            _httpHandler.Dispose();
            base.ExitThreadCore();
        }
    }
}
