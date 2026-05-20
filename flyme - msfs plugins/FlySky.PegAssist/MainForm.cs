namespace FlySky.PegAssist;

using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Net.Http;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using FlySky.PegAssist.Models;
using FlySky.PegAssist.Services;

public sealed class MainForm : Form
{
    private readonly PluginConfig _config;
    private readonly HttpClient _httpClient;
    private readonly string _configPath;
    private readonly TrackingSessionRunner _runner;

    private bool _lightTheme;
    private bool _mapReady;
    private bool _mapPageReady;
    private bool _simConnected;
    private bool _simProbeBusy;
    private bool _livePlayersBusy;
    private bool _allowExit;
    private bool _dispatchSyncInProgress;
    private string? _selectedDispatchId;
    private List<DispatchInfo> _dispatches = [];
    private List<Button> _dispatchButtons = [];
    private List<Panel> _cards = [];

    private TableLayoutPanel _root = null!;
    private TableLayoutPanel _titleBar = null!;
    private TableLayoutPanel _rightContent = null!;
    private SplitContainer _split = null!;
    private Panel _heroPanel = null!;
    private Label _titleLabel = null!;
    private Label _statusLabel = null!;
    private Label _heroBadge = null!;
    private Label _heroTitle = null!;
    private Label _heroSubtitle = null!;
    private Label _heroDepartureValue = null!;
    private Label _heroArrivalValue = null!;
    private Label _heroDurationValue = null!;
    private Label _heroPassengerValue = null!;
    private Label _dispatchEmptyLabel = null!;
    private Label _dispatchRouteValue = null!;
    private Label _dispatchAirportValue = null!;
    private Label _dispatchMetaValue = null!;
    private Label _aircraftInfoValue = null!;
    private Label _dispatchSimBriefValue = null!;
    private Label _dispatchPromptValue = null!;
    private Label _phaseValue = null!;
    private Label _altitudeValue = null!;
    private Label _groundSpeedValue = null!;
    private Label _verticalSpeedValue = null!;
    private Label _positionValue = null!;
    private Label _weatherValue = null!;
    private Label _systemsValue = null!;

    private Panel _leftPanel = null!;
    private Panel _rightPanel = null!;
    private Panel _dispatchListPanel = null!;
    private RichTextBox _logBox = null!;
    private WebView2 _mapView = null!;

    private Button _startButton = null!;
    private Button _stopButton = null!;
    private Button _finishButton = null!;
    private Button _cancelButton = null!;
    private Button _themeButton = null!;
    private Button _settingsButton = null!;
    private Button _newUpdateButton = null!;
    private Button _floatingStartButton = null!;
    private Button _floatingStopButton = null!;

    private System.Windows.Forms.Timer? _dispatchTimer;
    private System.Windows.Forms.Timer? _simProbeTimer;
    private System.Windows.Forms.Timer? _livePlayersTimer;
    private NotifyIcon? _trayIcon;

    private AirportPoint? _departureAirport;
    private AirportPoint? _arrivalAirport;

    private record AirportPoint(string Icao, double Lat, double Lng, string Name);
    private record DispatchInfo(string Id, string FlightNumber, string DepIcao, string ArrIcao, string DepName, string ArrName, int DistanceNm, int FlightTimeMinutes, string AircraftType, string? AircraftRegistration, string? AircraftName, DateTimeOffset BookedAt, DateTimeOffset? ExpiresAt, string? SimBriefStaticId);
    private record DispatchListResponse(List<DispatchItemResponse>? Dispatches);
    private record DispatchItemResponse(string Id, RouteInfo Route, AircraftInfo? Aircraft, DateTimeOffset BookedAt, DateTimeOffset? ExpiresAt, string? SimBriefStaticId);
    private record RouteInfo(string FlightNumber, string DepIcao, string ArrIcao, string DepName, string ArrName, int Distance, int FlightTime, string AircraftType);
    private record AircraftInfo(string IcaoCode, string? Registration, string? Type);

    public MainForm(PluginConfig config, HttpClient httpClient)
    {
        _config = config;
        _httpClient = httpClient;
        _configPath = ResolveConfigPath();
        _lightTheme = false;
        _config.UseLightTheme = false;
        _config.PollIntervalMs = 2000;
        _runner = new TrackingSessionRunner(config, httpClient);
        _runner.StatusChanged += OnStatusChanged;
        _runner.SnapshotReceived += OnSnapshotReceived;
        _runner.RunningChanged += (_) => RefreshHeaderAndAircraftCard();

        Text = "FlySky PegAssist";
        StartPosition = FormStartPosition.CenterScreen;
        Size = new Size(1600, 1000);
        FormBorderStyle = FormBorderStyle.Sizable;
        BackColor = _lightTheme ? Color.White : Color.FromArgb(30, 41, 59);
        ForeColor = _lightTheme ? Color.FromArgb(15, 23, 42) : Color.FromArgb(226, 232, 240);
        Font = new Font("Segoe UI", 9, FontStyle.Regular);
        AllowDrop = false;
        DoubleBuffered = true;

        _root = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 2, Padding = new Padding(0) };
        _root.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
        _root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

        _titleBar = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 6, RowCount = 1, Padding = new Padding(10, 4, 8, 4), Margin = new Padding(0) };
        _titleBar.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 180));
        _titleBar.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        _titleBar.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 300));
        _titleBar.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 72));
        _titleBar.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 84));
        _titleBar.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 36));

        _titleLabel = new Label { Dock = DockStyle.Fill, Text = "VOLANTA  •", Font = new Font("Segoe UI", 11, FontStyle.Bold), TextAlign = ContentAlignment.MiddleLeft, Padding = new Padding(2, 0, 0, 0) };
        _statusLabel = new Label { Dock = DockStyle.Fill, Text = DateTime.Now.ToString("HH:mm", CultureInfo.InvariantCulture), Font = new Font("Segoe UI", 8.5f, FontStyle.Regular), TextAlign = ContentAlignment.MiddleCenter };

        var searchBox = new TextBox
        {
            Dock = DockStyle.Fill,
            Text = "Search for airports, flights or users",
            BorderStyle = BorderStyle.FixedSingle,
            Font = new Font("Segoe UI", 8.5f, FontStyle.Regular),
            Margin = new Padding(0, 2, 0, 2),
            BackColor = Color.FromArgb(35, 39, 49),
            ForeColor = Color.FromArgb(174, 183, 198),
        };

        _themeButton = new Button { Dock = DockStyle.Fill, Text = "Dark", FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand, Margin = new Padding(4, 4, 4, 4) };
        _themeButton.Click += (_, _) => ToggleTheme();

        _settingsButton = new Button { Dock = DockStyle.Fill, Text = "⚙", FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand, Margin = new Padding(4, 6, 4, 6), Font = new Font("Segoe UI", 11, FontStyle.Bold) };
        _settingsButton.Click += (_, _) => OpenAccountDialog();

        var topIcons = new Label
        {
            Text = "◌  ⌂",
            Dock = DockStyle.Fill,
            TextAlign = ContentAlignment.MiddleCenter,
            ForeColor = Color.FromArgb(148, 163, 184),
            Font = new Font("Segoe UI", 9, FontStyle.Regular),
        };

        _titleBar.Controls.Add(_titleLabel, 0, 0);
        _titleBar.Controls.Add(new Panel { Dock = DockStyle.Fill }, 1, 0);
        _titleBar.Controls.Add(searchBox, 2, 0);
        _titleBar.Controls.Add(_statusLabel, 3, 0);
        _titleBar.Controls.Add(topIcons, 4, 0);
        _titleBar.Controls.Add(_settingsButton, 5, 0);

        _heroPanel = new Panel
        {
            Dock = DockStyle.Top,
            Height = 170,
            Margin = new Padding(0, 0, 0, 10),
            Padding = new Padding(12),
            BackColor = Color.FromArgb(20, 24, 31),
        };

        var heroLayout = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 2, RowCount = 1, BackColor = Color.Transparent };
        heroLayout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 68));
        heroLayout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 32));

        var heroTextPanel = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 3, BackColor = Color.Transparent };
        heroTextPanel.RowStyles.Add(new RowStyle(SizeType.Absolute, 34));
        heroTextPanel.RowStyles.Add(new RowStyle(SizeType.Absolute, 64));
        heroTextPanel.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));

        _heroBadge = new Label
        {
            Text = "● Scheduled Flight",
            AutoSize = false,
            Width = 160,
            Height = 28,
            TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font("Segoe UI", 9, FontStyle.Bold),
            BackColor = Color.FromArgb(154, 196, 235),
            ForeColor = Color.FromArgb(236, 253, 245),
            Padding = new Padding(8, 0, 8, 0),
            Margin = new Padding(0, 0, 0, 6),
        };

        _heroTitle = new Label
        {
            Dock = DockStyle.Fill,
            Text = "No Flight Selected",
            Font = new Font("Segoe UI", 20, FontStyle.Bold),
            ForeColor = Color.FromArgb(238, 242, 247),
            TextAlign = ContentAlignment.BottomLeft,
        };

        _heroSubtitle = new Label
        {
            Dock = DockStyle.Fill,
            Text = "Aircraft pending • Select a dispatch",
            Font = new Font("Segoe UI", 9, FontStyle.Regular),
            ForeColor = Color.FromArgb(150, 163, 179),
            TextAlign = ContentAlignment.BottomLeft,
        };

        heroTextPanel.Controls.Add(_heroBadge, 0, 0);
        heroTextPanel.Controls.Add(_heroTitle, 0, 1);
        heroTextPanel.Controls.Add(_heroSubtitle, 0, 2);

        var heroStatsPanel = new TableLayoutPanel
        {
            Dock = DockStyle.Bottom,
            ColumnCount = 4,
            RowCount = 2,
            Height = 72,
            Margin = new Padding(0),
            Padding = new Padding(6, 0, 0, 0),
            BackColor = Color.Transparent,
        };
        for (var i = 0; i < 4; i++)
        {
            heroStatsPanel.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 25));
        }
        heroStatsPanel.RowStyles.Add(new RowStyle(SizeType.Absolute, 24));
        heroStatsPanel.RowStyles.Add(new RowStyle(SizeType.Absolute, 30));

        var depCaption = new Label { Text = "DEP", Dock = DockStyle.Fill, TextAlign = ContentAlignment.BottomLeft, Font = new Font("Segoe UI", 8, FontStyle.Regular), ForeColor = Color.FromArgb(125, 138, 157), Padding = new Padding(0), BackColor = Color.Transparent };
        var arrCaption = new Label { Text = "ARR", Dock = DockStyle.Fill, TextAlign = ContentAlignment.BottomLeft, Font = new Font("Segoe UI", 8, FontStyle.Regular), ForeColor = Color.FromArgb(125, 138, 157), Padding = new Padding(0), BackColor = Color.Transparent };
        var durCaption = new Label { Text = "TIME", Dock = DockStyle.Fill, TextAlign = ContentAlignment.BottomLeft, Font = new Font("Segoe UI", 8, FontStyle.Regular), ForeColor = Color.FromArgb(125, 138, 157), Padding = new Padding(0), BackColor = Color.Transparent };
        var paxCaption = new Label { Text = "PAX", Dock = DockStyle.Fill, TextAlign = ContentAlignment.BottomLeft, Font = new Font("Segoe UI", 8, FontStyle.Regular), ForeColor = Color.FromArgb(125, 138, 157), Padding = new Padding(0), BackColor = Color.Transparent };

        _heroDepartureValue = new Label { Text = "--:--", Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft, Font = new Font("Segoe UI", 10, FontStyle.Bold), ForeColor = Color.FromArgb(230, 238, 250), Padding = new Padding(0), BackColor = Color.Transparent };
        _heroArrivalValue = new Label { Text = "--:--", Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft, Font = new Font("Segoe UI", 10, FontStyle.Bold), ForeColor = Color.FromArgb(230, 238, 250), Padding = new Padding(0), BackColor = Color.Transparent };
        _heroDurationValue = new Label { Text = "--:--", Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft, Font = new Font("Segoe UI", 10, FontStyle.Bold), ForeColor = Color.FromArgb(230, 238, 250), Padding = new Padding(0), BackColor = Color.Transparent };
        _heroPassengerValue = new Label { Text = "--", Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft, Font = new Font("Segoe UI", 10, FontStyle.Bold), ForeColor = Color.FromArgb(230, 238, 250), Padding = new Padding(0), BackColor = Color.Transparent };

        heroStatsPanel.Controls.Add(depCaption, 0, 0);
        heroStatsPanel.Controls.Add(arrCaption, 1, 0);
        heroStatsPanel.Controls.Add(durCaption, 2, 0);
        heroStatsPanel.Controls.Add(paxCaption, 3, 0);
        heroStatsPanel.Controls.Add(_heroDepartureValue, 0, 1);
        heroStatsPanel.Controls.Add(_heroArrivalValue, 1, 1);
        heroStatsPanel.Controls.Add(_heroDurationValue, 2, 1);
        heroStatsPanel.Controls.Add(_heroPassengerValue, 3, 1);

        var heroRightSpacer = new Panel { Dock = DockStyle.Fill, BackColor = Color.Transparent };
        heroRightSpacer.Controls.Add(heroStatsPanel);

        heroLayout.Controls.Add(heroTextPanel, 0, 0);
        heroLayout.Controls.Add(heroRightSpacer, 1, 0);
        _heroPanel.Controls.Add(heroLayout);

        _split = new SplitContainer { Dock = DockStyle.Fill, Orientation = Orientation.Vertical, IsSplitterFixed = false, SplitterWidth = 1 };
        _split.SizeChanged += (_, _) => ApplySafeSplitDistance(330);

        _leftPanel = new Panel { Dock = DockStyle.Fill, AutoScroll = true };
        _dispatchListPanel = new Panel { Dock = DockStyle.Fill, AutoScroll = true };

        _dispatchEmptyLabel = new Label { Dock = DockStyle.Top, Height = 54, Text = "No active dispatches", Font = new Font("Segoe UI", 9, FontStyle.Italic), TextAlign = ContentAlignment.MiddleCenter, ForeColor = Color.Gray };

        var dispatchListCard = BuildCard("Active Flights");
        dispatchListCard.Margin = new Padding(0, 0, 0, 12);
        dispatchListCard.Padding = new Padding(10);
        dispatchListCard.Height = 260;
        dispatchListCard.Dock = DockStyle.Top;
        dispatchListCard.Controls.Add(_dispatchListPanel);
        dispatchListCard.Controls.Add(_dispatchEmptyLabel);

        var actionCard = BuildCard("Quick Actions");
        actionCard.Margin = new Padding(0, 0, 0, 12);
        actionCard.Padding = new Padding(12, 30, 12, 12);
        actionCard.Height = 130;
        actionCard.Dock = DockStyle.Top;

        var actionGrid = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 2, Padding = new Padding(0) };
        actionGrid.RowStyles.Add(new RowStyle(SizeType.Percent, 50));
        actionGrid.RowStyles.Add(new RowStyle(SizeType.Percent, 50));

        _startButton = new Button { Text = "Start Tracking", Dock = DockStyle.Fill, Height = 32, FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand, Margin = new Padding(0, 0, 0, 6), Visible = true };
        _startButton.Click += (_, _) => _runner.Start();

        _stopButton = new Button { Text = "Stop Tracking", Dock = DockStyle.Fill, Height = 32, FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand, Margin = new Padding(0, 0, 0, 6) };
        _stopButton.Click += async (_, _) => await _runner.StopAsync();

        _finishButton = new Button { Text = "Finish Flight", Dock = DockStyle.Fill, Height = 30, FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand, Margin = new Padding(0, 0, 0, 6), Visible = false };
        _finishButton.Click += async (_, _) => await _runner.FinishFlightAsync();

        _cancelButton = new Button { Text = "Cancel Booking", Dock = DockStyle.Fill, Height = 30, FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand, Margin = new Padding(0, 0, 0, 0), Visible = false };
        _cancelButton.Click += async (_, _) => await _runner.CancelFlightAsync();

        actionGrid.Controls.Add(_startButton, 0, 0);
        actionGrid.Controls.Add(_stopButton, 0, 1);
        actionCard.Controls.Add(actionGrid);

        var aircraftCard = BuildCard("Aircraft");
        aircraftCard.Margin = new Padding(0, 0, 0, 8);
        aircraftCard.Padding = new Padding(12, 30, 12, 12);
        aircraftCard.Height = 120;
        aircraftCard.Dock = DockStyle.Top;
        _aircraftInfoValue = new Label
        {
            Dock = DockStyle.Fill,
            Text = "Aircraft --  |  Registration --",
            Font = new Font("Segoe UI", 10, FontStyle.Bold),
            TextAlign = ContentAlignment.MiddleLeft,
            ForeColor = Color.FromArgb(30, 41, 59),
        };
        aircraftCard.Controls.Add(_aircraftInfoValue);

        _leftPanel.Controls.Add(aircraftCard);
        _leftPanel.Controls.Add(actionCard);
        _leftPanel.Controls.Add(dispatchListCard);
        _leftPanel.Controls.Add(_heroPanel);

        var mapCard = BuildCard(string.Empty);
        mapCard.Padding = new Padding(0);
        mapCard.Margin = new Padding(0);
        _mapView = new WebView2 { Dock = DockStyle.Fill };
        mapCard.Controls.Add(_mapView);

        var telemetryCard = BuildCard("Telemetry");
        telemetryCard.Margin = new Padding(0, 0, 0, 0);
        telemetryCard.Padding = new Padding(12, 30, 12, 12);
        var telemetryGrid = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 2, RowCount = 4 };
        telemetryGrid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 40));
        telemetryGrid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 60));
        for (var i = 0; i < 4; i++)
        {
            telemetryGrid.RowStyles.Add(new RowStyle(SizeType.Percent, 25));
        }
        _phaseValue = AddMetricRow(telemetryGrid, 0, "Phase");
        _altitudeValue = AddMetricRow(telemetryGrid, 1, "Altitude");
        _groundSpeedValue = AddMetricRow(telemetryGrid, 2, "Ground Speed");
        _verticalSpeedValue = AddMetricRow(telemetryGrid, 3, "Vertical Speed");
        telemetryCard.Controls.Add(telemetryGrid);

        var positionCard = BuildCard("Position / Environment");
        positionCard.Margin = new Padding(8, 0, 8, 0);
        positionCard.Padding = new Padding(12, 30, 12, 12);
        _positionValue = BuildValueLabel("Lat/Lng: --");
        _positionValue.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
        _weatherValue = new Label { Dock = DockStyle.Bottom, Height = 34, Text = "Wind: --  |  OAT: --", Font = new Font("Segoe UI", 9, FontStyle.Regular), TextAlign = ContentAlignment.MiddleLeft };
        positionCard.Controls.Add(_weatherValue);
        positionCard.Controls.Add(_positionValue);

        var systemsCard = BuildCard("Aircraft Systems");
        systemsCard.Padding = new Padding(12, 30, 12, 12);
        _systemsValue = BuildValueLabel("BAT -- | EXT PWR -- | AVIONICS -- | APU -- | BCN -- | NAV -- | STRB -- | LDG --");
        _systemsValue.Font = new Font("Segoe UI", 9, FontStyle.Regular);
        systemsCard.Controls.Add(_systemsValue);

        var metricsRow = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 3, RowCount = 1 };
        metricsRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33.33f));
        metricsRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33.33f));
        metricsRow.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 33.33f));
        metricsRow.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        metricsRow.Controls.Add(telemetryCard, 0, 0);
        metricsRow.Controls.Add(positionCard, 1, 0);
        metricsRow.Controls.Add(systemsCard, 2, 0);

        _dispatchRouteValue = BuildValueLabel("No dispatch selected");
        _dispatchAirportValue = BuildValueLabel("Select a flight card to load its dispatch details.");
        _dispatchMetaValue = BuildValueLabel("Distance -- nm  |  Flight time --:--  |  Booked --");
        _dispatchSimBriefValue = BuildValueLabel("SimBrief: not linked");
        _dispatchPromptValue = BuildValueLabel("Pick a dispatch to preview the route and unlock Start Tracking.");

        _rightContent = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 1 };
        _rightContent.RowStyles.Add(new RowStyle(SizeType.Percent, 100));

        _logBox = new RichTextBox { Dock = DockStyle.Fill, ReadOnly = true, Font = new Font("Consolas", 8.5f, FontStyle.Regular), Margin = new Padding(0, 0, 0, 8) };
        _rightContent.Controls.Add(mapCard, 0, 0);

        _rightPanel = new Panel { Dock = DockStyle.Fill };
        _rightPanel.Controls.Add(_rightContent);

        var floatingStartCard = new Panel
        {
            Width = 265,
            Height = 142,
            BackColor = Color.FromArgb(12, 14, 18),
            BorderStyle = BorderStyle.FixedSingle,
            Padding = new Padding(10, 8, 10, 10),
            Location = new Point(16, 16),
            Anchor = AnchorStyles.Top | AnchorStyles.Left,
        };
        var fsTitle = new Label { Dock = DockStyle.Top, Height = 22, Text = "Start a new flight", Font = new Font("Segoe UI", 9.5f, FontStyle.Bold), ForeColor = Color.FromArgb(236, 242, 252), TextAlign = ContentAlignment.MiddleCenter };
        var fsSub = new Label { Dock = DockStyle.Top, Height = 30, Text = "Start your simulator to automatically begin a flight", Font = new Font("Segoe UI", 8f, FontStyle.Regular), ForeColor = Color.FromArgb(145, 154, 171), TextAlign = ContentAlignment.MiddleCenter };
        _floatingStartButton = new Button { Dock = DockStyle.Bottom, Height = 28, Text = "Start Tracking", FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(95, 79, 255), ForeColor = Color.White, Cursor = Cursors.Hand };
        _floatingStartButton.FlatAppearance.BorderSize = 0;
        _floatingStartButton.Click += (_, _) => _runner.Start();
        _floatingStopButton = new Button { Dock = DockStyle.Bottom, Height = 24, Text = "Stop Tracking", FlatStyle = FlatStyle.Flat, BackColor = Color.FromArgb(55, 60, 72), ForeColor = Color.FromArgb(219, 226, 237), Cursor = Cursors.Hand, Margin = new Padding(0, 6, 0, 0) };
        _floatingStopButton.FlatAppearance.BorderSize = 0;
        _floatingStopButton.Click += async (_, _) => await _runner.StopAsync();
        floatingStartCard.Controls.Add(_floatingStartButton);
        floatingStartCard.Controls.Add(_floatingStopButton);
        floatingStartCard.Controls.Add(fsSub);
        floatingStartCard.Controls.Add(fsTitle);
        _rightPanel.Controls.Add(floatingStartCard);
        floatingStartCard.BringToFront();

        _split.Panel1.Controls.Add(_leftPanel);
        _split.Panel2.Controls.Add(_rightPanel);

        var sideRail = new Panel { Dock = DockStyle.Fill, BackColor = Color.FromArgb(10, 11, 14), Padding = new Padding(0, 8, 0, 8) };
        var rail = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 12 };
        for (var i = 0; i < 12; i++)
        {
            rail.RowStyles.Add(new RowStyle(SizeType.Absolute, 28));
        }
        foreach (var icon in new[] { "☰", "✈", "☷", "⚒", "⌂", "◉", "⌖", "☰", "⚙" })
        {
            rail.Controls.Add(new Label
            {
                Dock = DockStyle.Fill,
                Text = icon,
                TextAlign = ContentAlignment.MiddleCenter,
                ForeColor = Color.FromArgb(122, 132, 150),
                Font = new Font("Segoe UI", 9, FontStyle.Regular),
            });
        }
        sideRail.Controls.Add(rail);

        var bodyLayout = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 2, RowCount = 1, Margin = new Padding(0) };
        bodyLayout.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 46));
        bodyLayout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        bodyLayout.Controls.Add(sideRail, 0, 0);
        bodyLayout.Controls.Add(_split, 1, 0);

        var footerPanel = new Panel { Dock = DockStyle.Fill, BackColor = Color.Transparent, Visible = false };
        _newUpdateButton = new Button
        {
            Text = "New Update",
            AutoSize = false,
            Width = 134,
            Height = 34,
            Anchor = AnchorStyles.Right | AnchorStyles.Bottom,
            FlatStyle = FlatStyle.Flat,
            Font = new Font("Segoe UI", 9, FontStyle.Bold),
            Cursor = Cursors.Hand,
            Margin = new Padding(0, 4, 0, 0),
        };
        _newUpdateButton.FlatAppearance.BorderSize = 0;
        _newUpdateButton.Location = new Point(Math.Max(0, footerPanel.Width - _newUpdateButton.Width), 6);
        footerPanel.Resize += (_, _) => _newUpdateButton.Location = new Point(Math.Max(0, footerPanel.Width - _newUpdateButton.Width), 6);
        _newUpdateButton.Click += (_, _) => OpenAccountDialog();
        footerPanel.Controls.Add(_newUpdateButton);

        _root.Controls.Add(_titleBar, 0, 0);
        _root.Controls.Add(bodyLayout, 0, 1);
        Controls.Add(_root);

        _phaseValue.Text = "PREFLIGHT";
        _altitudeValue.Text = "0 ft";
        _groundSpeedValue.Text = "0 kts";
        _verticalSpeedValue.Text = "0 fpm";
        _positionValue.Text = "Lat/Lng: --";
        _systemsValue.Text = "BAT -- | EXT PWR -- | AVIONICS -- | APU -- | BCN -- | NAV -- | STRB -- | LDG --";
        _heroDurationValue.Text = "--:--";

        ApplyTheme(_lightTheme);
        RefreshHeaderAndAircraftCard();
        _ = InitializeMapAsync();

        _dispatchTimer = new System.Windows.Forms.Timer { Interval = 20000 };
        _dispatchTimer.Tick += async (_, _) => await SyncDispatchesAsync();
        _dispatchTimer.Start();
        _ = SyncDispatchesAsync();

        _simProbeTimer = new System.Windows.Forms.Timer { Interval = 2000 };
        _simProbeTimer.Tick += async (_, _) => await UpdateSimConnectionAsync();
        _simProbeTimer.Start();

        _livePlayersTimer = new System.Windows.Forms.Timer { Interval = 2000 };
        _livePlayersTimer.Tick += async (_, _) => await PushLivePlayersToMapAsync();
        _livePlayersTimer.Start();

        Shown += (_, _) =>
        {
            Show();
            WindowState = FormWindowState.Normal;
            Activate();
            BringToFront();
            ApplySafeSplitDistance(280);
            _ = UpdateSimConnectionAsync();
            _ = PushLivePlayersToMapAsync();
        };

        FormClosing += async (_, e) =>
        {
            if (!_allowExit && e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                Hide();
                _trayIcon?.ShowBalloonTip(1000, "FlyMe", "FlyMe is still running in the tray.", ToolTipIcon.Info);
                return;
            }

            _dispatchTimer?.Stop();
            _simProbeTimer?.Stop();
            _livePlayersTimer?.Stop();
            await _runner.StopAsync();
            _runner.Dispose();
            _trayIcon?.Dispose();
        };
    }

    public void SetTrayIcon(NotifyIcon trayIcon)
    {
        _trayIcon = trayIcon;
        trayIcon.MouseDoubleClick += (_, _) => ShowFromTray();
        var contextMenu = new ContextMenuStrip();
        contextMenu.Items.Add("Show", null, (_, _) => ShowFromTray());
        contextMenu.Items.Add("Exit", null, (_, _) => { _allowExit = true; Close(); });
        trayIcon.ContextMenuStrip = contextMenu;
    }

    private void ShowFromTray()
    {
        Show();
        WindowState = FormWindowState.Normal;
        Activate();
        BringToFront();
    }

    private string ResolveConfigPath()
    {
        var basePath = Path.Combine(AppContext.BaseDirectory, "appsettings.json");
        if (File.Exists(basePath)) return basePath;

        var cwdPath = Path.Combine(Directory.GetCurrentDirectory(), "appsettings.json");
        if (File.Exists(cwdPath)) return cwdPath;

        return basePath;
    }

    private static string FormatFlightTime(int minutes)
    {
        var totalMinutes = Math.Max(minutes, 0);
        var hours = totalMinutes / 60;
        var mins = totalMinutes % 60;
        return $"{hours:00}:{mins:00}";
    }

    private static string FormatDate(DateTimeOffset value)
    {
        return value.ToLocalTime().ToString("dd MMM yyyy HH:mm", CultureInfo.InvariantCulture);
    }

    private DispatchInfo? GetSelectedDispatch()
    {
        if (string.IsNullOrWhiteSpace(_selectedDispatchId))
        {
            return null;
        }

        return _dispatches.FirstOrDefault(dispatch => string.Equals(dispatch.Id, _selectedDispatchId, StringComparison.Ordinal));
    }

    private void RenderDispatchList()
    {
        _dispatchListPanel.SuspendLayout();
        _dispatchListPanel.Controls.Clear();
        _dispatchButtons.Clear();

        _dispatchEmptyLabel.Visible = _dispatches.Count == 0;
        var buttonWidth = Math.Max(260, _dispatchListPanel.ClientSize.Width - 22);

        foreach (var dispatch in _dispatches)
        {
            var aircraftText = string.IsNullOrWhiteSpace(dispatch.AircraftRegistration)
                ? (dispatch.AircraftType ?? dispatch.AircraftName ?? "Aircraft pending")
                : $"{dispatch.AircraftType ?? dispatch.AircraftName ?? "Aircraft"}  |  {dispatch.AircraftRegistration}";

            var button = new Button
            {
                Width = buttonWidth,
                Height = 82,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 9.25f, FontStyle.Regular),
                TextAlign = ContentAlignment.MiddleLeft,
                TextImageRelation = TextImageRelation.ImageBeforeText,
                Padding = new Padding(12, 8, 12, 8),
                Margin = new Padding(0, 0, 0, 8),
                Cursor = Cursors.Hand,
                Text = $"{dispatch.FlightNumber}   {dispatch.DepIcao} -> {dispatch.ArrIcao}{Environment.NewLine}{dispatch.DepName} to {dispatch.ArrName}{Environment.NewLine}{aircraftText}",
                Tag = dispatch.Id,
                Enabled = !_runner.IsRunning,
            };
            button.FlatAppearance.BorderSize = 1;
            button.Click += async (_, _) => await SelectDispatchAsync(dispatch.Id);

            ApplyDispatchButtonTheme(button, string.Equals(dispatch.Id, _selectedDispatchId, StringComparison.Ordinal));
            _dispatchButtons.Add(button);
            _dispatchListPanel.Controls.Add(button);
        }

        _dispatchListPanel.ResumeLayout();
    }

    private void ApplyDispatchButtonTheme(Button button, bool selected)
    {
        if (_lightTheme)
        {
            button.BackColor = selected ? Color.FromArgb(219, 234, 254) : Color.FromArgb(248, 251, 255);
            button.ForeColor = Color.FromArgb(15, 23, 42);
            button.FlatAppearance.BorderColor = selected ? Color.FromArgb(59, 130, 246) : Color.FromArgb(203, 213, 225);
        }
        else
        {
            button.BackColor = selected ? Color.FromArgb(55, 63, 122) : Color.FromArgb(28, 31, 38);
            button.ForeColor = Color.FromArgb(214, 221, 232);
            button.FlatAppearance.BorderColor = selected ? Color.FromArgb(96, 104, 182) : Color.FromArgb(56, 61, 76);
        }
    }

    private void UpdateDispatchDetails(DispatchInfo? dispatch)
    {
        if (dispatch is null)
        {
            _dispatchRouteValue.Text = "No dispatch selected";
            _dispatchAirportValue.Text = "Select a flight card to load its dispatch details.";
            _dispatchMetaValue.Text = "Distance -- nm  |  Flight time --:--  |  Booked --";
            _aircraftInfoValue.Text = "Aircraft --  |  Registration --";
            _dispatchSimBriefValue.Text = "SimBrief: not linked";
            _dispatchPromptValue.Text = "Pick a dispatch to preview the route and unlock Start Tracking.";
            _heroTitle.Text = "No Flight Selected";
            _heroSubtitle.Text = "Aircraft pending • Select a dispatch";
            _heroDepartureValue.Text = "--:--";
            _heroArrivalValue.Text = "--:--";
            _heroDurationValue.Text = "--:--";
            _heroPassengerValue.Text = "123";
            return;
        }

        _dispatchRouteValue.Text = $"{dispatch.FlightNumber}";
        _dispatchAirportValue.Text = $"{dispatch.DepIcao} ({dispatch.DepName}) → {dispatch.ArrIcao} ({dispatch.ArrName})";
        _dispatchMetaValue.Text = $"Distance {dispatch.DistanceNm} nm  |  Flight time {FormatFlightTime(dispatch.FlightTimeMinutes)}  |  Booked {FormatDate(dispatch.BookedAt)}";

        var aircraftInfo = string.IsNullOrWhiteSpace(dispatch.AircraftRegistration)
            ? dispatch.AircraftType ?? dispatch.AircraftName ?? "Aircraft pending"
            : $"{dispatch.AircraftType ?? dispatch.AircraftName ?? "Aircraft"} ({dispatch.AircraftRegistration})";
        _aircraftInfoValue.Text = aircraftInfo;

        _dispatchSimBriefValue.Text = string.IsNullOrWhiteSpace(dispatch.SimBriefStaticId)
            ? "SimBrief: not linked"
            : $"SimBrief: {dispatch.SimBriefStaticId}";

        _dispatchPromptValue.Text = "Route loaded. Press Start Tracking to begin.";
        _heroTitle.Text = $"{dispatch.FlightNumber} • {dispatch.DepIcao} -> {dispatch.ArrIcao}";
        _heroSubtitle.Text = $"{dispatch.AircraftType} • {dispatch.DepName} to {dispatch.ArrName}";
        _heroDepartureValue.Text = dispatch.BookedAt.ToLocalTime().ToString("HH:mm", CultureInfo.InvariantCulture);
        _heroArrivalValue.Text = dispatch.BookedAt.ToLocalTime().AddMinutes(Math.Max(dispatch.FlightTimeMinutes, 0)).ToString("HH:mm", CultureInfo.InvariantCulture);
        _heroDurationValue.Text = FormatFlightTime(dispatch.FlightTimeMinutes);
        _heroPassengerValue.Text = "--";
    }

    private async Task SelectDispatchAsync(string dispatchId)
    {
        _selectedDispatchId = dispatchId;
        RenderDispatchList();
        var selected = GetSelectedDispatch();
        await ApplySelectedDispatchAsync(selected);
    }

    private async Task ApplySelectedDispatchAsync(DispatchInfo? dispatch)
    {
        UpdateDispatchDetails(dispatch);
        if (dispatch is not null)
        {
            _config.DepartureIcao = dispatch.DepIcao;
            _config.ArrivalIcao = dispatch.ArrIcao;
            await LoadRouteAirportsAsync();
            PushRouteToMap();
        }
    }

    private void RefreshHeaderAndAircraftCard()
    {
        if (_runner.IsRunning)
        {
            _statusLabel.Text = "Status: Tracking";
            _statusLabel.ForeColor = Color.FromArgb(22, 163, 74);
            _startButton.Visible = false;
            _stopButton.Visible = true;
            _stopButton.Enabled = true;
            _floatingStartButton.Visible = false;
            _floatingStopButton.Visible = true;
            _floatingStopButton.Enabled = true;
            _finishButton.Enabled = true;
            _cancelButton.Enabled = true;
        }
        else
        {
            _statusLabel.Text = _simConnected ? "Status: Sim Connected" : "Status: Waiting for SimConnect";
            _statusLabel.ForeColor = _lightTheme ? Color.FromArgb(71, 85, 105) : Color.FromArgb(148, 163, 184);
            _startButton.Visible = _simConnected;
            _startButton.Enabled = _simConnected && _selectedDispatchId is not null;
            _floatingStartButton.Visible = _simConnected;
            _floatingStartButton.Enabled = _simConnected && _selectedDispatchId is not null;
            _stopButton.Visible = false;
            _stopButton.Enabled = false;
            _floatingStopButton.Visible = false;
            _floatingStopButton.Enabled = false;
            _finishButton.Enabled = false;
            _cancelButton.Enabled = false;
        }
    }

    private async Task UpdateSimConnectionAsync()
    {
        if (_simProbeBusy)
        {
            return;
        }

        if (_runner.IsRunning)
        {
            _simConnected = true;
            RefreshHeaderAndAircraftCard();
            return;
        }

        _simProbeBusy = true;
        try
        {
            using var cts = new System.Threading.CancellationTokenSource(1500);
            var connected = await _runner.ProbeSimConnectAsync(cts.Token);
            if (connected != _simConnected)
            {
                _simConnected = connected;
                OnStatusChanged(_simConnected ? "SimConnect connected." : "SimConnect not detected.");
            }
            RefreshHeaderAndAircraftCard();
        }
        catch
        {
            _simConnected = false;
            RefreshHeaderAndAircraftCard();
        }
        finally
        {
            _simProbeBusy = false;
        }
    }

    private async Task PushLivePlayersToMapAsync()
    {
        if (_livePlayersBusy || !_mapReady || !_mapPageReady || _mapView.CoreWebView2 is null || string.IsNullOrWhiteSpace(_config.ApiBaseUrl))
        {
            return;
        }

        _livePlayersBusy = true;
        try
        {
            using var res = await _httpClient.GetAsync($"{_config.ApiBaseUrl.TrimEnd('/')}/api/tracking/live");
            if (!res.IsSuccessStatusCode)
            {
                return;
            }

            var raw = await res.Content.ReadAsStringAsync();
            if (string.IsNullOrWhiteSpace(raw) || raw[0] != '[')
            {
                return;
            }

            var script = $"window.flyskySetPlayers({raw});";
            await _mapView.CoreWebView2.ExecuteScriptAsync(script);
        }
        catch (Exception ex)
        {
            OnStatusChanged($"Live players sync failed: {ex.Message}");
        }
        finally
        {
            _livePlayersBusy = false;
        }
    }

    private void OpenAccountDialog()
    {
        var dialog = new Form
        {
            Text = "Settings",
            Width = 500,
            Height = 600,
            StartPosition = FormStartPosition.CenterParent,
            FormBorderStyle = FormBorderStyle.FixedDialog,
            MaximizeBox = false,
            MinimizeBox = false,
            BackColor = _lightTheme ? Color.FromArgb(248, 251, 255) : Color.FromArgb(23, 34, 49),
        };

        var grid = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 11,
            Padding = new Padding(12),
        };

        for (int i = 0; i < 11; i++)
        {
            grid.RowStyles.Add(new RowStyle(SizeType.Absolute, 40));
        }

        var addLabel = (string text) =>
        {
            var label = new Label
            {
                Text = text,
                ForeColor = _lightTheme ? Color.FromArgb(15, 23, 42) : Color.FromArgb(226, 232, 240),
                Font = new Font("Segoe UI", 9, FontStyle.Bold),
                Dock = DockStyle.Top,
                Height = 20,
            };
            return label;
        };

        var addTextBox = (string initialValue) =>
        {
            var box = new TextBox
            {
                Text = initialValue ?? string.Empty,
                Dock = DockStyle.Fill,
                Font = new Font("Segoe UI", 9),
                Margin = new Padding(0, 4, 0, 8),
                Height = 32,
            };
            return box;
        };

        var apiBaseLabel = addLabel("API Base URL:");
        var apiBase = addTextBox(_config.ApiBaseUrl);

        var networkLabel = addLabel("Network:");
        var network = addTextBox(_config.Network);

        var callsignLabel = addLabel("Pilot Callsign:");
        var callsign = addTextBox(_config.PilotCallsign);

        var aircraftTypeLabel = addLabel("Aircraft Type:");
        var aircraftType = addTextBox(_config.AircraftType);

        var aircraftRegLabel = addLabel("Aircraft Registration:");
        var aircraftReg = addTextBox(_config.AircraftRegistration);

        var pollMsLabel = addLabel("Poll Interval (ms):");
        var pollMs = addTextBox(_config.PollIntervalMs.ToString());

        var useLightLabel = addLabel("Use Light Theme:");
        var useLight = new CheckBox { Checked = _config.UseLightTheme, Dock = DockStyle.Top, Margin = new Padding(0, 8, 0, 0) };

        var useMockLabel = addLabel("Use Mock Telemetry:");
        var useMock = new CheckBox { Checked = _config.UseMockTelemetry, Dock = DockStyle.Top, Margin = new Padding(0, 8, 0, 0) };

        grid.Controls.Add(apiBaseLabel, 0, 0);
        grid.Controls.Add(apiBase, 0, 0);
        grid.Controls.Add(networkLabel, 0, 1);
        grid.Controls.Add(network, 0, 1);
        grid.Controls.Add(callsignLabel, 0, 2);
        grid.Controls.Add(callsign, 0, 2);
        grid.Controls.Add(aircraftTypeLabel, 0, 3);
        grid.Controls.Add(aircraftType, 0, 3);
        grid.Controls.Add(aircraftRegLabel, 0, 4);
        grid.Controls.Add(aircraftReg, 0, 4);
        grid.Controls.Add(pollMsLabel, 0, 5);
        grid.Controls.Add(pollMs, 0, 5);
        grid.Controls.Add(useLightLabel, 0, 6);
        grid.Controls.Add(useLight, 0, 6);
        grid.Controls.Add(useMockLabel, 0, 7);
        grid.Controls.Add(useMock, 0, 7);

        var buttons = new FlowLayoutPanel
        {
            Dock = DockStyle.Bottom,
            Height = 50,
            FlowDirection = FlowDirection.RightToLeft,
            Padding = new Padding(12),
        };

        var cancel = new Button { Text = "Cancel", Width = 80, Height = 30, FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand };
        var save = new Button { Text = "Save", Width = 80, Height = 30, FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand };

        cancel.Click += (_, _) => dialog.Close();
        save.Click += async (_, _) =>
        {
            _config.ApiBaseUrl = apiBase.Text.Trim();
            _config.AircraftType = aircraftType.Text.Trim().ToUpperInvariant();
            _config.AircraftRegistration = aircraftReg.Text.Trim().ToUpperInvariant();
            _config.Network = network.Text.Trim().ToUpperInvariant();
            _config.PilotCallsign = callsign.Text.Trim().ToUpperInvariant();
            _config.UseLightTheme = useLight.Checked;
            _config.UseMockTelemetry = useMock.Checked;

            _config.PollIntervalMs = 2000;

            try
            {
                var json = JsonSerializer.Serialize(_config, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(_configPath, json);

                _lightTheme = _config.UseLightTheme;
                ApplyTheme(_lightTheme);
                PushThemeToMap();
                RefreshHeaderAndAircraftCard();
                await LoadRouteAirportsAsync();
                PushRouteToMap();
                await SyncDispatchesAsync(force: true);
                OnStatusChanged($"Settings saved: {_configPath}");
                dialog.Close();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to save settings: {ex.Message}", "PegAssist", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        };

        buttons.Controls.Add(save);
        buttons.Controls.Add(cancel);
        dialog.Controls.Add(grid);
        dialog.Controls.Add(buttons);
        dialog.ShowDialog(this);
    }

    private async Task<List<DispatchInfo>> FetchDispatchesAsync()
    {
        if (string.IsNullOrWhiteSpace(_config.ApiBaseUrl) || string.IsNullOrWhiteSpace(_config.PilotCallsign))
        {
            return [];
        }

        var qs = Uri.EscapeDataString(_config.PilotCallsign.Trim().ToUpperInvariant());
        using var res = await _httpClient.GetAsync($"{_config.ApiBaseUrl.TrimEnd('/')}/api/flyme/dispatches?pilotCallsign={qs}");
        if (!res.IsSuccessStatusCode)
        {
            OnStatusChanged($"Dispatch sync failed: {(int)res.StatusCode}");
            return [];
        }

        var responseBody = await res.Content.ReadAsStringAsync();
        var payload = JsonSerializer.Deserialize<DispatchListResponse>(responseBody, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
        });

        return payload?.Dispatches?
            .Where(dispatch => dispatch.Route is not null)
            .Select(dispatch => new DispatchInfo(
                dispatch.Id,
                dispatch.Route.FlightNumber,
                dispatch.Route.DepIcao,
                dispatch.Route.ArrIcao,
                dispatch.Route.DepName,
                dispatch.Route.ArrName,
                dispatch.Route.Distance,
                dispatch.Route.FlightTime,
                dispatch.Aircraft?.IcaoCode ?? dispatch.Route.AircraftType,
                dispatch.Aircraft?.Registration,
                dispatch.Aircraft?.Type,
                dispatch.BookedAt,
                dispatch.ExpiresAt,
                dispatch.SimBriefStaticId))
            .ToList() ?? [];
    }

    private async Task SyncDispatchesAsync(bool force = false)
    {
        if (_dispatchSyncInProgress) return;
        _dispatchSyncInProgress = true;

        try
        {
            if (_runner.IsRunning && !force)
            {
                return;
            }

            var dispatches = await FetchDispatchesAsync();
            if (dispatches.Count == 0)
            {
                if (_dispatches.Count > 0)
                {
                    OnStatusChanged("Dispatch cleared. Waiting for new dispatch from website.");
                }
                _dispatches = [];
                _selectedDispatchId = null;
                RenderDispatchList();
                UpdateDispatchDetails(null);
                RefreshHeaderAndAircraftCard();
                return;
            }

            var previousSelectedId = _selectedDispatchId;
            _dispatches = dispatches;
            _selectedDispatchId = dispatches.Any(dispatch => string.Equals(dispatch.Id, previousSelectedId, StringComparison.Ordinal))
                ? previousSelectedId
                : dispatches[0].Id;

            RenderDispatchList();
            var selected = GetSelectedDispatch();
            await ApplySelectedDispatchAsync(selected);

            if (!string.Equals(previousSelectedId, _selectedDispatchId, StringComparison.Ordinal) && selected is not null)
            {
                OnStatusChanged($"Dispatch selected: {selected.DepIcao} -> {selected.ArrIcao} ({selected.FlightNumber})");
            }
        }
        catch (Exception ex)
        {
            OnStatusChanged($"Dispatch sync error: {ex.Message}");
        }
        finally
        {
            _dispatchSyncInProgress = false;
        }
    }

    private void ToggleTheme()
    {
        _lightTheme = !_lightTheme;
        ApplyTheme(_lightTheme);
        PushThemeToMap();
    }

    private void ApplyTheme(bool light)
    {
        var appBack = light ? Color.FromArgb(236, 236, 236) : Color.FromArgb(12, 14, 18);
        var chrome = light ? Color.FromArgb(224, 231, 239) : Color.FromArgb(17, 19, 24);
        var panel = light ? Color.FromArgb(236, 236, 236) : Color.FromArgb(12, 14, 18);
        var card = light ? Color.FromArgb(95, 170, 226) : Color.FromArgb(20, 23, 30);
        var text = light ? Color.FromArgb(12, 18, 30) : Color.FromArgb(230, 234, 242);
        var muted = light ? Color.FromArgb(37, 56, 82) : Color.FromArgb(132, 141, 157);

        BackColor = appBack;
        _root.BackColor = appBack;
        _titleBar.BackColor = chrome;
        _leftPanel.BackColor = panel;
        _rightPanel.BackColor = panel;
        _heroPanel.BackColor = light ? Color.FromArgb(225, 210, 196) : Color.FromArgb(18, 21, 27);
        _titleLabel.ForeColor = text;
        _statusLabel.ForeColor = _runner.IsRunning ? Color.FromArgb(22, 163, 74) : muted;
        _dispatchEmptyLabel.ForeColor = muted;
        _dispatchRouteValue.ForeColor = text;
        _dispatchAirportValue.ForeColor = text;
        _dispatchMetaValue.ForeColor = muted;
        _aircraftInfoValue.ForeColor = muted;
        _dispatchSimBriefValue.ForeColor = muted;
        _dispatchPromptValue.ForeColor = muted;

        foreach (var cardPanel in _cards)
        {
            cardPanel.BackColor = card;
            foreach (Control c in cardPanel.Controls)
            {
                if (c is Label label)
                {
                    label.ForeColor = label.Font.Bold ? text : muted;
                }
            }
        }

        _split.BackColor = light ? Color.FromArgb(232, 232, 232) : Color.FromArgb(30, 33, 40);

        _heroBadge.BackColor = light ? Color.FromArgb(112, 172, 221) : Color.FromArgb(44, 52, 66);
        _heroBadge.ForeColor = light ? Color.FromArgb(232, 244, 255) : Color.FromArgb(165, 174, 191);
        _heroTitle.ForeColor = text;
        _heroSubtitle.ForeColor = muted;
        _heroDepartureValue.ForeColor = text;
        _heroArrivalValue.ForeColor = text;
        _heroDurationValue.ForeColor = text;
        _heroPassengerValue.ForeColor = text;

        _weatherValue.ForeColor = muted;
        _logBox.BackColor = light ? Color.FromArgb(241, 245, 249) : Color.FromArgb(17, 24, 39);
        _logBox.ForeColor = light ? Color.FromArgb(15, 23, 42) : Color.FromArgb(226, 232, 240);

        foreach (var button in _dispatchButtons)
        {
            ApplyDispatchButtonTheme(button, string.Equals(button.Tag as string, _selectedDispatchId, StringComparison.Ordinal));
        }

        _themeButton.Text = light ? "Light" : "Dark";
        _themeButton.BackColor = light ? Color.FromArgb(96, 114, 142) : Color.FromArgb(30, 34, 43);
        _themeButton.ForeColor = light ? Color.FromArgb(243, 248, 255) : Color.FromArgb(188, 197, 212);
        _themeButton.FlatAppearance.BorderColor = light ? Color.FromArgb(77, 95, 124) : Color.FromArgb(58, 63, 75);

        _settingsButton.BackColor = light ? Color.FromArgb(106, 120, 98) : Color.FromArgb(30, 34, 43);
        _settingsButton.ForeColor = light ? Color.FromArgb(245, 248, 232) : Color.FromArgb(188, 197, 212);
        _settingsButton.FlatAppearance.BorderColor = light ? Color.FromArgb(88, 102, 80) : Color.FromArgb(58, 63, 75);

        _startButton.BackColor = light ? Color.FromArgb(31, 122, 225) : Color.FromArgb(95, 79, 255);
        _startButton.ForeColor = Color.White;
        _startButton.FlatAppearance.BorderColor = light ? Color.FromArgb(15, 94, 188) : Color.FromArgb(122, 110, 255);

        _stopButton.BackColor = light ? Color.FromArgb(255, 56, 56) : Color.FromArgb(50, 55, 67);
        _stopButton.ForeColor = light ? Color.White : Color.FromArgb(220, 226, 236);
        _stopButton.FlatAppearance.BorderColor = light ? Color.FromArgb(222, 40, 40) : Color.FromArgb(68, 74, 84);

        _finishButton.BackColor = light ? Color.FromArgb(255, 71, 71) : Color.FromArgb(197, 53, 53);
        _finishButton.ForeColor = Color.White;
        _finishButton.FlatAppearance.BorderColor = light ? Color.FromArgb(222, 40, 40) : Color.FromArgb(245, 87, 87);

        _cancelButton.BackColor = light ? Color.FromArgb(255, 56, 56) : Color.FromArgb(197, 53, 53);
        _cancelButton.ForeColor = Color.White;
        _cancelButton.FlatAppearance.BorderColor = light ? Color.FromArgb(222, 40, 40) : Color.FromArgb(245, 87, 87);

        _newUpdateButton.BackColor = Color.FromArgb(247, 127, 34);
        _newUpdateButton.ForeColor = Color.White;
    }

    private void DrawHeroBackdrop(object? sender, PaintEventArgs e)
    {
        var rect = _heroPanel.ClientRectangle;
        if (rect.Width <= 0 || rect.Height <= 0)
        {
            return;
        }

        using var sky = new LinearGradientBrush(rect, Color.FromArgb(109, 169, 222), Color.FromArgb(246, 224, 188), 18f);
        e.Graphics.FillRectangle(sky, rect);
    }

    private async Task InitializeMapAsync()
    {
        try
        {
            _mapReady = false;
            _mapPageReady = false;
            await _mapView.EnsureCoreWebView2Async();
            _mapView.CoreWebView2.Settings.AreDevToolsEnabled = false;
            _mapView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            _mapView.CoreWebView2.WebMessageReceived -= OnMapWebMessageReceived;
            _mapView.CoreWebView2.WebMessageReceived += OnMapWebMessageReceived;
            _mapView.NavigateToString(GetMapHtml());
        }
        catch (Exception ex)
        {
            _mapReady = false;
            _mapPageReady = false;
            OnStatusChanged($"Map initialization failed: {ex.Message}");
        }
    }

    private async void OnMapWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        var msg = e.TryGetWebMessageAsString();
        if (!string.IsNullOrWhiteSpace(msg) && msg.StartsWith("map-error:", StringComparison.Ordinal))
        {
            OnStatusChanged($"Map warning: {msg.Substring("map-error:".Length)}");
            return;
        }

        if (!string.Equals(msg, "map-ready", StringComparison.Ordinal))
        {
            return;
        }

        _mapPageReady = true;
        _mapReady = true;
        PushThemeToMap();
        await LoadRouteAirportsAsync();
        PushRouteToMap();
        await PushLivePlayersToMapAsync();
        OnStatusChanged("Live map initialized.");
    }

    private async Task LoadRouteAirportsAsync()
    {
        try
        {
            var dep = _config.DepartureIcao.Trim().ToUpperInvariant();
            var arr = _config.ArrivalIcao.Trim().ToUpperInvariant();
            using var http = new HttpClient { BaseAddress = new Uri(_config.ApiBaseUrl.TrimEnd('/') + "/") };
            var icaoList = Uri.EscapeDataString($"{dep},{arr}");
            using var res = await http.GetAsync($"api/tracking/airports?icao={icaoList}");
            if (!res.IsSuccessStatusCode) return;

            await using var stream = await res.Content.ReadAsStreamAsync();
            using var doc = await JsonDocument.ParseAsync(stream);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return;

            foreach (var item in doc.RootElement.EnumerateArray())
            {
                var icao = item.GetProperty("icao").GetString()?.Trim().ToUpperInvariant();
                var lat = item.GetProperty("lat").GetDouble();
                var lng = item.GetProperty("lng").GetDouble();
                var name = item.GetProperty("name").GetString() ?? icao ?? string.Empty;

                if (icao == dep)
                {
                    _departureAirport = new AirportPoint(icao, lat, lng, name);
                }
                else if (icao == arr)
                {
                    _arrivalAirport = new AirportPoint(icao, lat, lng, name);
                }
            }
        }
        catch (Exception ex)
        {
            OnStatusChanged($"Airport lookup failed: {ex.Message}");
        }
    }

    private void PushRouteToMap()
    {
        if (!_mapReady || !_mapPageReady || _mapView.CoreWebView2 is null || _departureAirport is null || _arrivalAirport is null)
        {
            return;
        }

        var script = string.Format(
            CultureInfo.InvariantCulture,
            "window.flyskySetRoute({0}, {1}, {2}, {3}, {4}, {5});",
            _departureAirport.Lat,
            _departureAirport.Lng,
            _arrivalAirport.Lat,
            _arrivalAirport.Lng,
            Js(_departureAirport.Icao),
            Js(_arrivalAirport.Icao));

        _ = _mapView.CoreWebView2.ExecuteScriptAsync(script);
    }

    private void PushThemeToMap()
    {
        if (!_mapReady || !_mapPageReady || _mapView.CoreWebView2 is null)
        {
            return;
        }

        _ = _mapView.CoreWebView2.ExecuteScriptAsync($"window.flyskySetTheme({(_lightTheme ? "true" : "false")});");
    }

    private static string Js(string value) => $"'{value.Replace("\\", "\\\\").Replace("'", "\\'")}'";

    private void ApplySafeSplitDistance(int preferred)
    {
        if (_split.Width <= 0)
        {
            return;
        }

        const int preferredLeftMin = 230;
        const int preferredRightMin = 500;

        try
        {
            if (_split.Width >= preferredLeftMin + preferredRightMin)
            {
                _split.Panel1MinSize = preferredLeftMin;
                _split.Panel2MinSize = preferredRightMin;
            }
            else
            {
                _split.Panel1MinSize = 0;
                _split.Panel2MinSize = 0;
            }

            var min = _split.Panel1MinSize;
            var max = _split.Width - _split.Panel2MinSize;
            if (max < min)
            {
                return;
            }

            var target = Math.Max(min, Math.Min(preferred, max));
            if (_split.SplitterDistance != target)
            {
                _split.SplitterDistance = target;
            }
        }
        catch (ArgumentOutOfRangeException)
        {
            // Ignore transient split-layout races during initial handle creation.
        }
    }

    private static string GetMapHtml()
    {
        return """
<!doctype html>
<html>
<head>
  <meta charset='utf-8'/>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'/>
  <link href='https://api.mapbox.com/mapbox-gl-js/v2.16.1/mapbox-gl.css' rel='stylesheet'/>
  <link href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' rel='stylesheet'/>
  <style>
        html,body,#map{height:100%;margin:0;background:#0b1220}
        body{font-family:Segoe UI, Arial, sans-serif;overflow:hidden}
        .mapboxgl-canvas{outline:none}
        .leaflet-container{background:#0b1220}
  </style>
</head>
<body>
  <div id='map'></div>
  <script src='https://api.mapbox.com/mapbox-gl-js/v2.16.1/mapbox-gl.js'></script>
  <script src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'></script>
  <script>
        const token = 'pk.eyJ1IjoiZmlubm95YWlyd2F5cyIsImEiOiJjbWJhNWk2aHAwaGFxMmlzaTZrZjVxcTYyIn0.ulHtSfoUvNyDHc7EIdiLOg';
        const lightStyle = 'mapbox://styles/mapbox/light-v11';
        const darkStyle = 'mapbox://styles/mapbox/dark-v11';

        let mapEngine = 'none';
        let map = null;
        let leaflet = null;

        const state = {
            routeDefined: false,
            routeOrigin: null,
            routeDestination: null,
            points: [],
            depIcao: '',
            arrIcao: '',
            routeLine: null,
            trailLine: null,
            depMarker: null,
            arrMarker: null,
            currentMarker: null,
        };

        function notify(msg) {
            if (window.chrome && window.chrome.webview) {
                window.chrome.webview.postMessage(msg);
            }
        }

        function ensureMapboxSources() {
            const ids = ['fly-route', 'fly-trail', 'fly-current', 'fly-departure', 'fly-arrival', 'fly-players'];
            for (const id of ids) {
                if (!map.getSource(id)) {
                    map.addSource(id, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
                }
            }
        }

        function ensureMapboxLayers() {
            if (!map.getLayer('fly-route-line')) {
                map.addLayer({ id: 'fly-route-line', type: 'line', source: 'fly-route', paint: { 'line-color': '#22c55e', 'line-width': 4, 'line-opacity': 0.95 } });
            }
            if (!map.getLayer('fly-trail-line')) {
                map.addLayer({ id: 'fly-trail-line', type: 'line', source: 'fly-trail', paint: { 'line-color': '#94a3b8', 'line-width': 2, 'line-opacity': 0.7, 'line-dasharray': [2, 2] } });
            }
            if (!map.getLayer('fly-current-layer')) {
                map.addLayer({
                    id: 'fly-current-layer',
                    type: 'symbol',
                    source: 'fly-current',
                    layout: {
                        'text-field': '✈',
                        'text-size': 20,
                        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                        'text-rotate': ['to-number', ['coalesce', ['get', 'heading'], 0]],
                        'text-rotation-alignment': 'map',
                        'text-allow-overlap': true,
                        'text-ignore-placement': true,
                    },
                    paint: { 'text-color': '#22c55e', 'text-halo-color': '#ffffff', 'text-halo-width': 1.4 },
                });
            }
            if (!map.getLayer('fly-departure-layer')) {
                map.addLayer({ id: 'fly-departure-layer', type: 'circle', source: 'fly-departure', paint: { 'circle-radius': 6, 'circle-color': '#2dd4bf', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
            }
            if (!map.getLayer('fly-arrival-layer')) {
                map.addLayer({ id: 'fly-arrival-layer', type: 'circle', source: 'fly-arrival', paint: { 'circle-radius': 6, 'circle-color': '#60a5fa', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
            }
            if (!map.getLayer('fly-players-layer')) {
                map.addLayer({ id: 'fly-players-layer', type: 'circle', source: 'fly-players', paint: { 'circle-radius': 4, 'circle-color': '#f59e0b', 'circle-stroke-width': 1.5, 'circle-stroke-color': '#0b1220' } });
            }
        }

        function setMapboxSource(id, data) {
            const src = map.getSource(id);
            if (src) src.setData(data);
        }

        function syncMapbox() {
            if (!map) return;
            const current = state.points[state.points.length - 1];
            const routeFeatures = (state.routeDefined && state.routeOrigin && state.routeDestination)
                ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [state.routeOrigin, state.routeDestination] } }]
                : [];
            const trailFeatures = state.points.length > 1
                ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: state.points } }]
                : [];

            setMapboxSource('fly-route', { type: 'FeatureCollection', features: routeFeatures });
            setMapboxSource('fly-trail', { type: 'FeatureCollection', features: trailFeatures });
            if (state.routeOrigin) {
                setMapboxSource('fly-departure', {
                    type: 'FeatureCollection',
                    features: [{ type: 'Feature', properties: { icao: state.depIcao }, geometry: { type: 'Point', coordinates: state.routeOrigin } }],
                });
            }
            if (state.routeDestination) {
                setMapboxSource('fly-arrival', {
                    type: 'FeatureCollection',
                    features: [{ type: 'Feature', properties: { icao: state.arrIcao }, geometry: { type: 'Point', coordinates: state.routeDestination } }],
                });
            }
            setMapboxSource('fly-current', {
                type: 'FeatureCollection',
                features: current ? [{ type: 'Feature', properties: { heading: 0 }, geometry: { type: 'Point', coordinates: current } }] : [],
            });
        }

        function ensureLeafletMap() {
            if (leaflet) return;
            leaflet = L.map('map', { zoomControl: true, attributionControl: true }).setView([60.17, 24.94], 4);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap &copy; CARTO',
            }).addTo(leaflet);
        }

        function syncLeaflet() {
            if (!leaflet) return;
            if (state.trailLine) {
                state.trailLine.setLatLngs(state.points.map(p => [p[1], p[0]]));
            } else {
                state.trailLine = L.polyline(state.points.map(p => [p[1], p[0]]), { color: '#93a0b6', weight: 2, dashArray: '6 4' }).addTo(leaflet);
            }

            if (state.routeDefined && state.routeOrigin && state.routeDestination) {
                const routePoints = [[state.routeOrigin[1], state.routeOrigin[0]], [state.routeDestination[1], state.routeDestination[0]]];
                if (state.routeLine) {
                    state.routeLine.setLatLngs(routePoints);
                } else {
                    state.routeLine = L.polyline(routePoints, { color: '#22c55e', weight: 4 }).addTo(leaflet);
                }
            }

            if (state.routeOrigin) {
                if (state.depMarker) {
                    state.depMarker.setLatLng([state.routeOrigin[1], state.routeOrigin[0]]);
                } else {
                    state.depMarker = L.circleMarker([state.routeOrigin[1], state.routeOrigin[0]], { radius: 6, color: '#ffffff', weight: 2, fillColor: '#2dd4bf', fillOpacity: 1 }).addTo(leaflet);
                }
            }
            if (state.routeDestination) {
                if (state.arrMarker) {
                    state.arrMarker.setLatLng([state.routeDestination[1], state.routeDestination[0]]);
                } else {
                    state.arrMarker = L.circleMarker([state.routeDestination[1], state.routeDestination[0]], { radius: 6, color: '#ffffff', weight: 2, fillColor: '#60a5fa', fillOpacity: 1 }).addTo(leaflet);
                }
            }

            if (state.points.length > 0) {
                const current = state.points[state.points.length - 1];
                if (state.currentMarker) {
                    state.currentMarker.setLatLng([current[1], current[0]]);
                } else {
                    state.currentMarker = L.circleMarker([current[1], current[0]], { radius: 5, color: '#16a34a', weight: 2, fillColor: '#22c55e', fillOpacity: 1 }).addTo(leaflet);
                }
                leaflet.panTo([current[1], current[0]], { animate: true, duration: 0.6 });
            }
        }

        function setPlayersMapbox(players) {
            if (!map) return;
            const features = Array.isArray(players)
                ? players
                    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))
                    .map(p => ({
                        type: 'Feature',
                        properties: { callsign: p.callsign || '' },
                        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
                    }))
                : [];
            setMapboxSource('fly-players', { type: 'FeatureCollection', features });
        }

        const leafletPlayers = [];
        function setPlayersLeaflet(players) {
            if (!leaflet) return;
            while (leafletPlayers.length > 0) {
                const m = leafletPlayers.pop();
                if (m) leaflet.removeLayer(m);
            }
            if (!Array.isArray(players)) return;
            for (const p of players) {
                if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
                const marker = L.circleMarker([p.lat, p.lng], { radius: 4, color: '#0b1220', weight: 1.5, fillColor: '#f59e0b', fillOpacity: 1 }).addTo(leaflet);
                if (p.callsign) marker.bindTooltip(String(p.callsign), { direction: 'top', opacity: 0.85 });
                leafletPlayers.push(marker);
            }
        }

        function fitRoute(depLat, depLng, arrLat, arrLng) {
            if (mapEngine === 'mapbox' && map) {
                const bounds = new mapboxgl.LngLatBounds([depLng, depLat], [arrLng, arrLat]);
                map.fitBounds(bounds, { padding: 48, maxZoom: 6, duration: 700 });
            } else if (mapEngine === 'leaflet' && leaflet) {
                const b = L.latLngBounds([[depLat, depLng], [arrLat, arrLng]]);
                leaflet.fitBounds(b, { padding: [40, 40], maxZoom: 6 });
            }
        }

        function bootMapbox() {
            mapboxgl.accessToken = token;
            map = new mapboxgl.Map({
                container: 'map',
                style: darkStyle,
                center: [12, 48],
                zoom: 4.2,
                projection: 'mercator',
                attributionControl: true,
            });
            map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-left');

            map.on('load', () => {
                mapEngine = 'mapbox';
                ensureMapboxSources();
                ensureMapboxLayers();
                syncMapbox();
                notify('map-ready');
            });

            map.on('style.load', () => {
                ensureMapboxSources();
                ensureMapboxLayers();
                syncMapbox();
            });

            map.on('error', (ev) => {
                const msg = ev && ev.error && ev.error.message ? ev.error.message : 'mapbox-error';
                notify('map-error:' + msg);
                if (mapEngine !== 'mapbox') {
                    return;
                }
                try { map.remove(); } catch {}
                map = null;
                bootLeaflet();
            });
        }

        function bootLeaflet() {
            mapEngine = 'leaflet';
            ensureLeafletMap();
            syncLeaflet();
            notify('map-ready');
        }

        window.flyskySetTheme = (light) => {
            if (mapEngine === 'mapbox' && map) {
                map.setStyle(light ? lightStyle : darkStyle);
            }
        };

        window.flyskySetRoute = (depLat, depLng, arrLat, arrLng, depIcao, arrIcao) => {
            if (![depLat, depLng, arrLat, arrLng].every(Number.isFinite)) return;
            state.routeDefined = true;
            state.routeOrigin = [depLng, depLat];
            state.routeDestination = [arrLng, arrLat];
            state.depIcao = depIcao || '';
            state.arrIcao = arrIcao || '';
            if (mapEngine === 'mapbox') {
                syncMapbox();
            } else if (mapEngine === 'leaflet') {
                syncLeaflet();
            }
            fitRoute(depLat, depLng, arrLat, arrLng);
        };

        window.flyskySetPlayers = (players) => {
            if (mapEngine === 'mapbox') {
                setPlayersMapbox(players);
            } else if (mapEngine === 'leaflet') {
                setPlayersLeaflet(players);
            }
        };

        window.flyskyUpdate = (lat, lng, heading) => {
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            const p = [lng, lat];
            state.points.push(p);
            if (state.points.length > 120) state.points.shift();

            if (mapEngine === 'mapbox') {
                syncMapbox();
                if (map) {
                    map.easeTo({ center: p, duration: 600 });
                    const src = map.getSource('fly-current');
                    if (src) {
                        src.setData({
                            type: 'FeatureCollection',
                            features: [{ type: 'Feature', properties: { heading: Number.isFinite(heading) ? heading : 0 }, geometry: { type: 'Point', coordinates: p } }],
                        });
                    }
                }
            } else if (mapEngine === 'leaflet') {
                syncLeaflet();
            }
        };

        try {
            if (typeof mapboxgl === 'undefined' || !mapboxgl.supported()) {
                notify('map-error:mapbox-not-supported');
                bootLeaflet();
            } else {
                bootMapbox();
            }
        } catch (e) {
            notify('map-error:' + (e && e.message ? e.message : 'map-init-failed'));
            bootLeaflet();
        }
  </script>
</body>
</html>
""";
    }

    private void OnStatusChanged(string message)
    {
        if (InvokeRequired)
        {
            BeginInvoke(() => OnStatusChanged(message));
            return;
        }

        _logBox.AppendText($"[{DateTime.Now:HH:mm:ss}] {message}{Environment.NewLine}");
    }

    private void OnSnapshotReceived(TelemetrySnapshot snapshot)
    {
        if (InvokeRequired)
        {
            BeginInvoke(() => OnSnapshotReceived(snapshot));
            return;
        }

        _phaseValue.Text = snapshot.Phase;
        _altitudeValue.Text = $"{snapshot.Altitude:N0} ft";
        _groundSpeedValue.Text = $"{snapshot.GroundSpeed} kts";
        _verticalSpeedValue.Text = $"{snapshot.VerticalSpeed} fpm";
        _positionValue.Text = $"Lat/Lng: {snapshot.Lat:F4}, {snapshot.Lng:F4}  |  HDG(T) {snapshot.Heading:000}°";
        _weatherValue.Text = $"Wind: {snapshot.WindDirection}°/{snapshot.WindSpeedKts} kts  |  OAT: {snapshot.OutsideTempC:F1} C  |  Fuel: {snapshot.FuelTotalKg:N0} kg";
        _systemsValue.Text = $"BAT {(snapshot.BatteryOn ? "ON" : "OFF")} | EXT PWR {(snapshot.ExternalPowerOn ? "ON" : "OFF")} | AVIONICS {(snapshot.AvionicsOn ? "ON" : "OFF")} | APU {(snapshot.ApuOn ? "ON" : "OFF")} | BCN {(snapshot.BeaconLightOn ? "ON" : "OFF")} | NAV {(snapshot.NavLightOn ? "ON" : "OFF")} | STRB {(snapshot.StrobeLightOn ? "ON" : "OFF")} | LDG {(snapshot.LandingLightOn ? "ON" : "OFF")}";

        if (_mapReady && _mapView.CoreWebView2 is not null)
        {
            var script = string.Format(
                CultureInfo.InvariantCulture,
                "window.flyskyUpdate({0}, {1}, {2});",
                snapshot.Lat,
                snapshot.Lng,
                snapshot.Heading);
            _ = _mapView.CoreWebView2.ExecuteScriptAsync(script);
        }
    }

    private Panel BuildCard(string title)
    {
        var card = new Panel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(12),
            Margin = new Padding(0, 0, 8, 8),
            BorderStyle = BorderStyle.None,
            BackColor = _lightTheme ? Color.FromArgb(248, 251, 255) : Color.FromArgb(23, 34, 49),
        };

        var titleLabel = new Label
        {
            Text = title,
            Dock = DockStyle.Top,
            Height = 22,
            Font = new Font("Segoe UI", 9, FontStyle.Bold),
            ForeColor = _lightTheme ? Color.FromArgb(15, 23, 42) : Color.FromArgb(226, 232, 240),
        };

        card.Controls.Add(titleLabel);
        _cards.Add(card);
        return card;
    }

    private Label BuildValueLabel(string text)
    {
        var label = new Label
        {
            Dock = DockStyle.Top,
            Height = 32,
            Text = text,
            Font = new Font("Segoe UI", 9, FontStyle.Regular),
            TextAlign = ContentAlignment.MiddleLeft,
            ForeColor = _lightTheme ? Color.FromArgb(71, 85, 105) : Color.FromArgb(148, 163, 184),
            Margin = new Padding(0, 4, 0, 4),
        };
        return label;
    }

    private Label AddMetricRow(TableLayoutPanel grid, int row, string label)
    {
        var labelControl = new Label
        {
            Dock = DockStyle.Fill,
            Text = $"{label}:",
            Font = new Font("Segoe UI", 9, FontStyle.Bold),
            TextAlign = ContentAlignment.MiddleLeft,
            ForeColor = _lightTheme ? Color.FromArgb(15, 23, 42) : Color.FromArgb(226, 232, 240),
        };

        var valueControl = new Label
        {
            Dock = DockStyle.Fill,
            Text = "--",
            Font = new Font("Segoe UI", 9, FontStyle.Regular),
            TextAlign = ContentAlignment.MiddleRight,
            ForeColor = _lightTheme ? Color.FromArgb(71, 85, 105) : Color.FromArgb(148, 163, 184),
        };

        grid.Controls.Add(labelControl, 0, row);
        grid.Controls.Add(valueControl, 1, row);

        return valueControl;
    }
}
