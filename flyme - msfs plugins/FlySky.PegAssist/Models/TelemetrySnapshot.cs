namespace FlySky.PegAssist.Models;

public sealed class TelemetrySnapshot
{
    public double Lat { get; set; }
    public double Lng { get; set; }
    public int Altitude { get; set; }
    public int Heading { get; set; }
    public int GroundSpeed { get; set; }
    public int VerticalSpeed { get; set; }
    public double Pitch { get; set; }
    public double Bank { get; set; }
    public bool OnGround { get; set; }
    public bool GearDown { get; set; }
    public double FlapsPct { get; set; }
    public double FuelTotalKg { get; set; }
    public double FuelFlowKgPerH { get; set; }
    public double GrossWeightKg { get; set; }
    public double OutsideTempC { get; set; }
    public int WindSpeedKts { get; set; }
    public int WindDirection { get; set; }

    public bool BatteryOn { get; set; }
    public bool ExternalPowerOn { get; set; }
    public bool AvionicsOn { get; set; }
    public bool ApuOn { get; set; }
    public bool BeaconLightOn { get; set; }
    public bool NavLightOn { get; set; }
    public bool StrobeLightOn { get; set; }
    public bool LandingLightOn { get; set; }

    public string Phase { get; set; } = "PREFLIGHT";
}
