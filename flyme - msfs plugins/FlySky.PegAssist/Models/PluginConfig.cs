namespace FlySky.PegAssist.Models;

public sealed class PluginConfig
{
    public string ApiBaseUrl { get; set; } = "http://localhost:3000";
    public string PilotCallsign { get; set; } = "";
    public string FlightCallsign { get; set; } = "";
    public string AircraftType { get; set; } = "A320";
    public string AircraftRegistration { get; set; } = "N-FSKY";
    public string DepartureIcao { get; set; } = "EGLL";
    public string ArrivalIcao { get; set; } = "EDDF";
    public string Network { get; set; } = "OFFLINE";
    public int PollIntervalMs { get; set; } = 2000;
    public bool StartSessionWhenParked { get; set; } = false;
    public bool UseMockTelemetry { get; set; } = true;
    public string SimConnectHost { get; set; } = "localhost";
    public int SimConnectPort { get; set; } = 500;
    public string SimConnectProtocol { get; set; } = "Ipv4";
    public int SimConnectRequestTimeoutMs { get; set; } = 1500;
    public bool UseLightTheme { get; set; } = false;
    public string FlymeAuthToken { get; set; } = "";
}
