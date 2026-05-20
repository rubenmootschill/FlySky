# FlyMe / PegAssist

This desktop app now starts with a pilot login/signup flow and then loads the current dispatch for that pilot.

## What it does

- sign in or create a pilot account
- detect the current dispatch for the logged-in pilot
- show dispatch details and live telemetry
- keep the app running in the tray when the window is closed
- stream telemetry heartbeat points to the backend
- end flight sessions automatically or from the UI

## Configure

Edit `appsettings.json` for local preferences only:

- `ApiBaseUrl` (for example `http://localhost:3000`)
- `AircraftType`
- `AircraftRegistration`
- `Network`
- `PollIntervalMs`
- `UseMockTelemetry`
- `SimConnectHost` / `SimConnectPort` / `SimConnectProtocol`
- `SimConnectRequestTimeoutMs`

No local API key is stored in the app anymore.

## Run

From this folder:

`dotnet run`

If `UseMockTelemetry` is `false`, the app tries to connect to MSFS through SimConnect.
If SimConnect connection fails, it falls back to mock telemetry automatically.

## Backend note

The website ACARS routes now accept a signed-in pilot session as well as the legacy ACARS key.
