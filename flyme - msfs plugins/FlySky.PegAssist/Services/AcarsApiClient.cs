using System.Net.Http.Json;
using FlySky.PegAssist.Models;

namespace FlySky.PegAssist.Services;

public sealed class AcarsApiClient
{
    private readonly HttpClient _http;
    private readonly PluginConfig _config;

    public AcarsApiClient(HttpClient httpClient, PluginConfig config)
    {
        _http = httpClient;
        _config = config;
    }

    public async Task<string> StartSessionAsync(TelemetrySnapshot s, CancellationToken cancellationToken)
    {
        var payload = new
        {
            pilotCallsign = _config.PilotCallsign,
            callsign = _config.FlightCallsign,
            depIcao = _config.DepartureIcao,
            arrIcao = _config.ArrivalIcao,
            aircraftType = _config.AircraftType,
            aircraftRegistration = _config.AircraftRegistration,
            network = _config.Network,
            lat = s.Lat,
            lng = s.Lng,
            altitude = s.Altitude,
            heading = s.Heading,
            groundSpeed = s.GroundSpeed,
            verticalSpeed = s.VerticalSpeed,
            phase = s.Phase,
        };

        using var res = await _http.PostAsJsonAsync("api/acars/session/start", payload, cancellationToken);
        var body = await res.Content.ReadAsStringAsync(cancellationToken);
        if (!res.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Start session failed ({(int)res.StatusCode}): {body}");
        }

        var doc = System.Text.Json.JsonDocument.Parse(body);
        var sessionId = doc.RootElement.GetProperty("sessionId").GetString();
        if (string.IsNullOrWhiteSpace(sessionId)) throw new InvalidOperationException("No sessionId returned");
        return sessionId;
    }

    public async Task SendHeartbeatAsync(string sessionId, TelemetrySnapshot s, CancellationToken cancellationToken)
    {
        var payload = new
        {
            sessionId,
            pilotCallsign = _config.PilotCallsign,
            callsign = _config.FlightCallsign,
            lat = s.Lat,
            lng = s.Lng,
            altitude = s.Altitude,
            heading = s.Heading,
            groundSpeed = s.GroundSpeed,
            verticalSpeed = s.VerticalSpeed,
            phase = s.Phase,
            pitch = s.Pitch,
            bank = s.Bank,
            onGround = s.OnGround,
            gearDown = s.GearDown,
            flapsPct = s.FlapsPct,
            fuelTotalKg = s.FuelTotalKg,
            fuelFlowKgPerH = s.FuelFlowKgPerH,
            grossWeightKg = s.GrossWeightKg,
            outsideTempC = s.OutsideTempC,
            windSpeedKts = s.WindSpeedKts,
            windDirection = s.WindDirection,
        };

        using var res = await _http.PostAsJsonAsync("api/acars/session/heartbeat", payload, cancellationToken);
        if (!res.IsSuccessStatusCode)
        {
            var body = await res.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Heartbeat failed ({(int)res.StatusCode}): {body}");
        }
    }

    public async Task EndSessionAsync(string sessionId, string status, string finalPhase, CancellationToken cancellationToken)
    {
        var payload = new
        {
            sessionId,
            pilotCallsign = _config.PilotCallsign,
            status,
            finalPhase,
        };

        using var res = await _http.PostAsJsonAsync("api/acars/session/end", payload, cancellationToken);
        if (!res.IsSuccessStatusCode)
        {
            var body = await res.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"End session failed ({(int)res.StatusCode}): {body}");
        }
    }
}
