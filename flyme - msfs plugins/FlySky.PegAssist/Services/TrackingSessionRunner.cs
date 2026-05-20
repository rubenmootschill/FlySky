using FlySky.PegAssist.Models;

namespace FlySky.PegAssist.Services;

public sealed class TrackingSessionRunner : IDisposable
{
    private const int MaxConsecutiveHeartbeatFailures = 20;

    private readonly PluginConfig _config;
    private readonly HttpClient _httpClient;
    private readonly bool _ownsHttpClient;
    private readonly AcarsApiClient _apiClient;

    private ITelemetryProvider? _telemetry;
    private CancellationTokenSource? _cts;
    private Task? _runTask;
    private readonly object _stateLock = new();
    private string? _sessionId;
    private bool _ended;
    private TelemetrySnapshot? _lastSnapshot;

    public bool IsRunning => _runTask is { IsCompleted: false };

    public event Action<string>? StatusChanged;
    public event Action<TelemetrySnapshot>? SnapshotReceived;
    public event Action<bool>? RunningChanged;

    public TrackingSessionRunner(PluginConfig config, HttpClient? httpClient = null)
    {
        _config = config;
        if (httpClient is null)
        {
            _httpClient = new HttpClient
            {
                BaseAddress = new Uri(_config.ApiBaseUrl.TrimEnd('/') + "/"),
            };
            _ownsHttpClient = true;
        }
        else
        {
            _httpClient = httpClient;
            _ownsHttpClient = false;
        }

        _apiClient = new AcarsApiClient(_httpClient, _config);
    }

    public void Start()
    {
        if (IsRunning)
        {
            return;
        }

        _cts = new CancellationTokenSource();
        _runTask = Task.Run(() => RunAsync(_cts.Token));
        RunningChanged?.Invoke(true);
    }

    public async Task StopAsync()
    {
        if (!IsRunning)
        {
            return;
        }

        _cts?.Cancel();

        if (_runTask is not null)
        {
            try
            {
                await _runTask;
            }
            catch
            {
                // Errors are already published to status output.
            }
        }
    }

    public bool TryGetLatestSnapshot(out TelemetrySnapshot? snapshot)
    {
        lock (_stateLock)
        {
            snapshot = _lastSnapshot;
            return snapshot is not null;
        }
    }

    public async Task<bool> ProbeSimConnectAsync(CancellationToken cancellationToken)
    {
        if (_config.UseMockTelemetry)
        {
            return true;
        }

        SimConnectTelemetryProvider? probe = null;
        try
        {
            probe = new SimConnectTelemetryProvider(_config);
            _ = await probe.ReadAsync(cancellationToken);
            return true;
        }
        catch
        {
            return false;
        }
        finally
        {
            probe?.Dispose();
        }
    }

    public Task FinishFlightAsync()
    {
        return EndFromUiAsync("ENDED", "MANUAL_FINISH", "Flight finished from UI.");
    }

    public Task CancelFlightAsync()
    {
        return EndFromUiAsync("ABORTED", "MANUAL_CANCEL", "Flight canceled from UI.");
    }

    public void Dispose()
    {
        _cts?.Cancel();
        if (_telemetry is IDisposable disposableTelemetry)
        {
            disposableTelemetry.Dispose();
        }
        _cts?.Dispose();
        if (_ownsHttpClient)
        {
            _httpClient.Dispose();
        }
    }

    private async Task EndFromUiAsync(string status, string finalPhase, string successMessage)
    {
        string? sessionId;
        bool alreadyEnded;

        lock (_stateLock)
        {
            sessionId = _sessionId;
            alreadyEnded = _ended;
        }

        if (sessionId is null)
        {
            StatusChanged?.Invoke("No active session to end.");
            return;
        }

        if (alreadyEnded)
        {
            StatusChanged?.Invoke("Session is already ended.");
            return;
        }

        try
        {
            await _apiClient.EndSessionAsync(sessionId, status, finalPhase, CancellationToken.None);
            lock (_stateLock)
            {
                _ended = true;
            }
            StatusChanged?.Invoke(successMessage);
            _cts?.Cancel();
        }
        catch (Exception ex)
        {
            StatusChanged?.Invoke($"Failed to end session: {ex.Message}");
        }
    }

    private async Task RunAsync(CancellationToken cancellationToken)
    {
        lock (_stateLock)
        {
            _sessionId = null;
            _ended = false;
            _lastSnapshot = null;
        }

        var consecutiveHeartbeatFailures = 0;
        var waitingForMovementMessageShown = false;
        TelemetrySnapshot? previousSnapshot = null;

        try
        {
            _telemetry = CreateTelemetryProvider();
            StatusChanged?.Invoke($"Telemetry mode: {( _config.UseMockTelemetry ? "MOCK" : "SIMCONNECT" )}");
            StatusChanged?.Invoke($"Sending ACARS data to {_config.ApiBaseUrl}");

            while (!cancellationToken.IsCancellationRequested)
            {
                var snapshot = await _telemetry.ReadAsync(cancellationToken);
                SnapshotReceived?.Invoke(snapshot);
                lock (_stateLock)
                {
                    _lastSnapshot = snapshot;
                }
                EmitSystemChanges(previousSnapshot, snapshot);
                previousSnapshot = snapshot;

                string? sessionId;
                lock (_stateLock)
                {
                    sessionId = _sessionId;
                }

                if (sessionId is null)
                {
                    if (!ShouldStartSession(snapshot))
                    {
                        if (!waitingForMovementMessageShown)
                        {
                            StatusChanged?.Invoke(_config.StartSessionWhenParked
                                ? "Armed and waiting for valid telemetry before starting session..."
                                : "Armed and waiting for movement/flight phase before starting session...");
                            waitingForMovementMessageShown = true;
                        }

                        await Task.Delay(Math.Max(500, _config.PollIntervalMs), cancellationToken);
                        continue;
                    }

                    sessionId = await _apiClient.StartSessionAsync(snapshot, cancellationToken);
                    lock (_stateLock)
                    {
                        _sessionId = sessionId;
                    }
                    StatusChanged?.Invoke($"Session started: {sessionId}");
                    consecutiveHeartbeatFailures = 0;
                }

                try
                {
                    await _apiClient.SendHeartbeatAsync(sessionId, snapshot, cancellationToken);
                    consecutiveHeartbeatFailures = 0;
                    StatusChanged?.Invoke($"HB {DateTime.Now:HH:mm:ss} | {snapshot.Phase} | ALT {snapshot.Altitude} | GS {snapshot.GroundSpeed}");
                }
                catch (Exception ex) when (IsTransientHeartbeatError(ex))
                {
                    consecutiveHeartbeatFailures++;
                    StatusChanged?.Invoke($"Heartbeat warning ({consecutiveHeartbeatFailures}/{MaxConsecutiveHeartbeatFailures}): {ex.Message}");

                    if (consecutiveHeartbeatFailures >= MaxConsecutiveHeartbeatFailures)
                    {
                        throw new InvalidOperationException("Too many consecutive heartbeat failures; aborting session.", ex);
                    }

                    await Task.Delay(Math.Max(1000, _config.PollIntervalMs), cancellationToken);
                    continue;
                }

                if (snapshot.Phase.Equals("LANDED", StringComparison.OrdinalIgnoreCase) && snapshot.OnGround && snapshot.GroundSpeed < 30)
                {
                    await _apiClient.EndSessionAsync(sessionId, "ENDED", snapshot.Phase, cancellationToken);
                    lock (_stateLock)
                    {
                        _ended = true;
                    }
                    StatusChanged?.Invoke("Session ended after landing condition.");
                    break;
                }

                await Task.Delay(Math.Max(500, _config.PollIntervalMs), cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            StatusChanged?.Invoke("Tracking stopped.");
        }
        catch (Exception ex)
        {
            StatusChanged?.Invoke($"Fatal error: {ex.Message}");
        }
        finally
        {
            string? currentSessionId;
            bool alreadyEnded;
            lock (_stateLock)
            {
                currentSessionId = _sessionId;
                alreadyEnded = _ended;
            }

            if (!alreadyEnded && currentSessionId is not null)
            {
                try
                {
                    await _apiClient.EndSessionAsync(currentSessionId, "ABORTED", "SHUTDOWN", CancellationToken.None);
                    StatusChanged?.Invoke("Session aborted cleanly.");
                }
                catch (Exception ex)
                {
                    StatusChanged?.Invoke($"Failed to close session cleanly: {ex.Message}");
                }
            }

            lock (_stateLock)
            {
                _sessionId = null;
            }

            if (_telemetry is IDisposable disposableTelemetry)
            {
                disposableTelemetry.Dispose();
            }
            _telemetry = null;

            RunningChanged?.Invoke(false);
        }
    }

    private bool ShouldStartSession(TelemetrySnapshot snapshot)
    {
        if (_config.StartSessionWhenParked)
        {
            return true;
        }

        if (!snapshot.OnGround)
        {
            return true;
        }

        if (snapshot.GroundSpeed >= 8)
        {
            return true;
        }

        var phase = snapshot.Phase?.Trim().ToUpperInvariant() ?? string.Empty;
        return phase is "TAXI" or "TAKEOFF" or "CLIMB" or "CRUISE" or "DESCENT" or "APPROACH";
    }

    private void EmitSystemChanges(TelemetrySnapshot? previous, TelemetrySnapshot current)
    {
        if (previous is null)
        {
            StatusChanged?.Invoke($"SYS INIT | BAT {(current.BatteryOn ? "ON" : "OFF")} | EXT PWR {(current.ExternalPowerOn ? "ON" : "OFF")} | AVIONICS {(current.AvionicsOn ? "ON" : "OFF")} | APU {(current.ApuOn ? "ON" : "OFF")}");
            StatusChanged?.Invoke($"FLIGHT INIT | PHASE {current.Phase} | HDG(T) {current.Heading:000} | ALT {current.Altitude} | GS {current.GroundSpeed}");
            return;
        }

        PublishSystemToggle("Battery", previous.BatteryOn, current.BatteryOn);
        PublishSystemToggle("External Power", previous.ExternalPowerOn, current.ExternalPowerOn);
        PublishSystemToggle("Avionics", previous.AvionicsOn, current.AvionicsOn);
        PublishSystemToggle("APU", previous.ApuOn, current.ApuOn);
        PublishSystemToggle("Beacon Light", previous.BeaconLightOn, current.BeaconLightOn);
        PublishSystemToggle("Nav Light", previous.NavLightOn, current.NavLightOn);
        PublishSystemToggle("Strobe Light", previous.StrobeLightOn, current.StrobeLightOn);
        PublishSystemToggle("Landing Light", previous.LandingLightOn, current.LandingLightOn);

        if (!string.Equals(previous.Phase, current.Phase, StringComparison.OrdinalIgnoreCase))
        {
            StatusChanged?.Invoke($"PHASE {previous.Phase} -> {current.Phase}");
        }

        if (previous.GearDown != current.GearDown)
        {
            StatusChanged?.Invoke($"SYS GEAR {(current.GearDown ? "DOWN" : "UP")}");
        }

        if (Math.Abs(previous.FlapsPct - current.FlapsPct) >= 1)
        {
            StatusChanged?.Invoke($"SYS FLAPS {current.FlapsPct:0.#}%");
        }

        if (previous.OnGround != current.OnGround)
        {
            StatusChanged?.Invoke($"STATE {(current.OnGround ? "ON GROUND" : "AIRBORNE")}");
        }

        if (Math.Abs(previous.Heading - current.Heading) >= 10)
        {
            StatusChanged?.Invoke($"HDG(T) {current.Heading:000}");
        }
    }

    private void PublishSystemToggle(string label, bool oldValue, bool newValue)
    {
        if (oldValue == newValue)
        {
            return;
        }

        StatusChanged?.Invoke($"SYS {label} {(newValue ? "ON" : "OFF")}");
    }

    private ITelemetryProvider CreateTelemetryProvider()
    {
        if (_config.UseMockTelemetry)
        {
            return new MockTelemetryProvider();
        }

        try
        {
            return new SimConnectTelemetryProvider(_config);
        }
        catch (Exception ex)
        {
            StatusChanged?.Invoke($"SimConnect initialization failed: {ex.Message}");
            StatusChanged?.Invoke("Falling back to mock telemetry.");
            return new MockTelemetryProvider();
        }
    }

    private static bool IsTransientHeartbeatError(Exception ex)
    {
        var message = ex.Message;
        return message.Contains("Heartbeat failed (500)", StringComparison.OrdinalIgnoreCase)
            || message.Contains("Heartbeat failed (502)", StringComparison.OrdinalIgnoreCase)
            || message.Contains("Heartbeat failed (503)", StringComparison.OrdinalIgnoreCase)
            || message.Contains("Heartbeat failed (504)", StringComparison.OrdinalIgnoreCase)
            || message.Contains("ENOENT", StringComparison.OrdinalIgnoreCase)
            || message.Contains("connection", StringComparison.OrdinalIgnoreCase)
            || message.Contains("timeout", StringComparison.OrdinalIgnoreCase);
    }
}
