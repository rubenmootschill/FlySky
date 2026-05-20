using FlySky.PegAssist.Models;

namespace FlySky.PegAssist.Services;

public sealed class MockTelemetryProvider : ITelemetryProvider
{
    private int _tick;

    public Task<TelemetrySnapshot> ReadAsync(CancellationToken cancellationToken)
    {
        _tick++;
        var climbing = _tick < 40;
        var cruise = _tick is >= 40 and < 120;

        var altitude = climbing
            ? 500 + (_tick * 350)
            : cruise
                ? 35000
                : Math.Max(1000, 35000 - ((_tick - 120) * 450));

        var gs = climbing ? 180 + (_tick * 4) : cruise ? 470 : Math.Max(140, 470 - ((_tick - 120) * 5));
        var phase = _tick < 10
            ? "TAXI"
            : _tick < 40
                ? "CLIMB"
                : _tick < 120
                    ? "CRUISE"
                    : _tick < 170
                        ? "DESCENT"
                        : "APPROACH";

        var snapshot = new TelemetrySnapshot
        {
            Lat = 51.470 + (_tick * 0.02),
            Lng = -0.454 + (_tick * 0.03),
            Altitude = altitude,
            Heading = 85,
            GroundSpeed = gs,
            VerticalSpeed = climbing ? 1800 : cruise ? 0 : -1600,
            Pitch = climbing ? 4.5 : cruise ? 2.2 : -2.5,
            Bank = 0,
            OnGround = _tick < 8,
            GearDown = _tick < 12 || _tick > 160,
            FlapsPct = _tick < 20 ? 15 : _tick > 155 ? 20 : 0,
            FuelTotalKg = Math.Max(4000, 18000 - (_tick * 65)),
            FuelFlowKgPerH = cruise ? 4200 : 3900,
            GrossWeightKg = Math.Max(48000, 69000 - (_tick * 70)),
            OutsideTempC = cruise ? -46 : -8,
            WindSpeedKts = cruise ? 54 : 15,
            WindDirection = 270,
            BatteryOn = true,
            ExternalPowerOn = _tick < 8,
            AvionicsOn = true,
            ApuOn = _tick < 16,
            BeaconLightOn = _tick >= 6,
            NavLightOn = true,
            StrobeLightOn = _tick >= 8,
            LandingLightOn = _tick >= 8 && _tick < 155,
            Phase = phase,
        };

        return Task.FromResult(snapshot);
    }
}
