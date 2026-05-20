using FlySky.PegAssist.Models;

namespace FlySky.PegAssist.Services;

public interface ITelemetryProvider
{
    Task<TelemetrySnapshot> ReadAsync(CancellationToken cancellationToken);
}
