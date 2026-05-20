using FlySky.PegAssist.Models;
using SimConnect.NET;

namespace FlySky.PegAssist.Services;

public sealed class SimConnectTelemetryProvider : ITelemetryProvider, IDisposable
{
    private readonly SimConnectClient _client;
    private readonly PluginConfig _config;
    private readonly SemaphoreSlim _connectLock = new(1, 1);
    private TelemetrySnapshot? _latest;
    private bool _hasBeenAirborne;

    public SimConnectTelemetryProvider(PluginConfig config)
    {
        _config = config;
        _client = new SimConnectClient("FlySky PegAssist");
    }

    public async Task<TelemetrySnapshot> ReadAsync(CancellationToken cancellationToken)
    {
        await EnsureConnectedAsync(cancellationToken);

        var lat = await GetDoubleAsync("PLANE LATITUDE", "degrees", 0, cancellationToken);
        var lng = await GetDoubleAsync("PLANE LONGITUDE", "degrees", 0, cancellationToken);
        var altitude = await GetDoubleAsync("PLANE ALTITUDE", "feet", _latest?.Altitude ?? 0, cancellationToken);
        var altitudeAgl = await GetDoubleAsync("PLANE ALT ABOVE GROUND", "feet", 0, cancellationToken);
        var heading = await GetDoubleAsync("PLANE HEADING DEGREES TRUE", "degrees", _latest?.Heading ?? 0, cancellationToken);
        var groundSpeed = await GetDoubleAsync("GROUND VELOCITY", "knots", _latest?.GroundSpeed ?? 0, cancellationToken);
        var verticalSpeed = await GetDoubleAsync("VERTICAL SPEED", "feet per minute", _latest?.VerticalSpeed ?? 0, cancellationToken);
        var pitch = await GetDoubleAsync("PLANE PITCH DEGREES", "degrees", _latest?.Pitch ?? 0, cancellationToken);
        var bank = await GetDoubleAsync("PLANE BANK DEGREES", "degrees", _latest?.Bank ?? 0, cancellationToken);
        var simOnGround = await GetDoubleAsync("SIM ON GROUND", "bool", 0, cancellationToken);
        var gearHandle = await GetDoubleAsync("GEAR HANDLE POSITION", "bool", 0, cancellationToken);
        var flapsPercent = await GetDoubleAsync("FLAPS HANDLE PERCENT", "percent", 0, cancellationToken);
        var fuelWeightLb = await GetDoubleAsync("FUEL TOTAL QUANTITY WEIGHT", "pounds", _latest?.FuelTotalKg is null ? 0 : _latest.FuelTotalKg / 0.45359237, cancellationToken);
        var totalWeightLb = await GetDoubleAsync("TOTAL WEIGHT", "pounds", _latest?.GrossWeightKg is null ? 0 : _latest.GrossWeightKg / 0.45359237, cancellationToken);
        var oat = await GetDoubleAsync("AMBIENT TEMPERATURE", "celsius", _latest?.OutsideTempC ?? 0, cancellationToken);
        var windSpeed = await GetDoubleAsync("AMBIENT WIND VELOCITY", "knots", _latest?.WindSpeedKts ?? 0, cancellationToken);
        var windDirection = await GetDoubleAsync("AMBIENT WIND DIRECTION", "degrees", _latest?.WindDirection ?? 0, cancellationToken);

        var batteryOn = await GetBoolFromCandidatesAsync(
            new[]
            {
                ("ELECTRICAL MASTER BATTERY", "bool"),
                ("MASTER BATTERY", "bool"),
            },
            _latest?.BatteryOn ?? false,
            cancellationToken);

        var externalPowerOn = await GetBoolFromCandidatesAsync(
            new[]
            {
                ("EXTERNAL POWER ON:1", "bool"),
                ("EXTERNAL POWER ON", "bool"),
            },
            _latest?.ExternalPowerOn ?? false,
            cancellationToken);

        var avionicsOn = await GetBoolFromCandidatesAsync(
            new[]
            {
                ("AVIONICS MASTER SWITCH", "bool"),
            },
            _latest?.AvionicsOn ?? false,
            cancellationToken);

        var apuOn = await GetBoolFromCandidatesAsync(
            new[]
            {
                ("APU SWITCH", "bool"),
                ("APU GENERATOR SWITCH", "bool"),
            },
            _latest?.ApuOn ?? false,
            cancellationToken);

        var beaconLightOn = await GetBoolFromCandidatesAsync(
            new[]
            {
                ("LIGHT BEACON", "bool"),
            },
            _latest?.BeaconLightOn ?? false,
            cancellationToken);

        var navLightOn = await GetBoolFromCandidatesAsync(
            new[]
            {
                ("LIGHT NAV", "bool"),
            },
            _latest?.NavLightOn ?? false,
            cancellationToken);

        var strobeLightOn = await GetBoolFromCandidatesAsync(
            new[]
            {
                ("LIGHT STROBE", "bool"),
            },
            _latest?.StrobeLightOn ?? false,
            cancellationToken);

        var landingLightOn = await GetBoolFromCandidatesAsync(
            new[]
            {
                ("LIGHT LANDING", "bool"),
            },
            _latest?.LandingLightOn ?? false,
            cancellationToken);

        var onGround = simOnGround > 0.5 || (altitudeAgl <= 8 && groundSpeed < 45);
        if (!onGround && altitudeAgl > 50)
        {
            _hasBeenAirborne = true;
        }

        var phase = DeterminePhase(onGround, groundSpeed, verticalSpeed, altitude, altitudeAgl);
        var snapshot = new TelemetrySnapshot
        {
            Lat = lat,
            Lng = lng,
            Altitude = (int)Math.Round(altitude),
            Heading = NormalizeHeading(heading),
            GroundSpeed = (int)Math.Round(groundSpeed),
            VerticalSpeed = (int)Math.Round(verticalSpeed),
            Pitch = pitch,
            Bank = bank,
            OnGround = onGround,
            GearDown = gearHandle > 0.5,
            FlapsPct = Math.Clamp(flapsPercent, 0, 100),
            FuelTotalKg = Math.Max(0, PoundsToKg(fuelWeightLb)),
            FuelFlowKgPerH = 0,
            GrossWeightKg = Math.Max(0, PoundsToKg(totalWeightLb)),
            OutsideTempC = oat,
            WindSpeedKts = Math.Max(0, (int)Math.Round(windSpeed)),
            WindDirection = NormalizeHeading(windDirection),
            BatteryOn = batteryOn,
            ExternalPowerOn = externalPowerOn,
            AvionicsOn = avionicsOn,
            ApuOn = apuOn,
            BeaconLightOn = beaconLightOn,
            NavLightOn = navLightOn,
            StrobeLightOn = strobeLightOn,
            LandingLightOn = landingLightOn,
            Phase = phase,
        };

        _latest = snapshot;
        return snapshot;
    }

    public void Dispose()
    {
        try
        {
            _ = _client.DisconnectAsync();
        }
        catch
        {
            // Ignore cleanup errors during shutdown.
        }

        _client.Dispose();
        _connectLock.Dispose();
    }

    private static double PoundsToKg(double pounds) => pounds * 0.45359237;

    private async Task EnsureConnectedAsync(CancellationToken cancellationToken)
    {
        if (_client.IsConnected)
        {
            return;
        }

        await _connectLock.WaitAsync(cancellationToken);
        try
        {
            if (_client.IsConnected)
            {
                return;
            }

            var timeoutMs = Math.Clamp(_config.SimConnectRequestTimeoutMs, 500, 10000);
            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(timeoutMs);
            await _client.ConnectAsync(IntPtr.Zero, 0, 0, timeoutCts.Token);
        }
        finally
        {
            _connectLock.Release();
        }
    }

    private async Task<double> GetDoubleAsync(string simVarName, string unit, double fallback, CancellationToken cancellationToken)
    {
        var (ok, value) = await TryGetDoubleAsync(simVarName, unit, cancellationToken);
        return ok ? value : fallback;
    }

    private async Task<bool> GetBoolFromCandidatesAsync((string simVarName, string unit)[] candidates, bool fallback, CancellationToken cancellationToken)
    {
        foreach (var (simVarName, unit) in candidates)
        {
            var (ok, value) = await TryGetDoubleAsync(simVarName, unit, cancellationToken);
            if (ok)
            {
                return value > 0.5;
            }
        }

        return fallback;
    }

    private async Task<(bool ok, double value)> TryGetDoubleAsync(string simVarName, string unit, CancellationToken cancellationToken)
    {
        try
        {
            var value = await _client.SimVars.GetAsync<double>(simVarName, unit, 0, cancellationToken);
            return (true, value);
        }
        catch
        {
            return (false, 0);
        }
    }

    private static int NormalizeHeading(double heading)
    {
        var normalized = heading % 360;
        if (normalized < 0)
        {
            normalized += 360;
        }

        return (int)Math.Round(normalized);
    }

    private string DeterminePhase(bool onGround, double groundSpeed, double verticalSpeed, double altitude, double altitudeAgl)
    {
        if (onGround && _hasBeenAirborne && groundSpeed < 35)
        {
            return "LANDED";
        }

        if (onGround)
        {
            return groundSpeed > 5 ? "TAXI" : "PREFLIGHT";
        }

        if (altitudeAgl < 1500 && verticalSpeed > 900)
        {
            return "TAKEOFF";
        }

        if (verticalSpeed > 500)
        {
            return "CLIMB";
        }

        if (verticalSpeed < -600)
        {
            return "DESCENT";
        }

        if (altitude < 10000 && groundSpeed < 230)
        {
            return "APPROACH";
        }

        return "CRUISE";
    }
}