using System.Drawing.Drawing2D;
using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json;

namespace FlySky.PegAssist;

public sealed class AuthDialog : Form
{
    private readonly HttpClient _http;
    private readonly Panel _rightPanel;
    private readonly Label _versionLabel;
    private readonly Label _brandLabel;

    private readonly Label _headingLabel;
    private readonly Label _subheadingLabel;
    private readonly Label _statusLabel;
    private readonly Label _switchPromptLabel;
    private readonly LinkLabel _switchModeLink;
    private readonly LinkLabel _forgotPasswordLink;
    private readonly Button _primaryButton;
    private readonly Panel _visualPanel;

    private readonly Label _firstNameLabel;
    private readonly TextBox _firstNameTextBox;
    private readonly Label _lastNameLabel;
    private readonly TextBox _lastNameTextBox;
    private readonly Label _hubLabel;
    private readonly TextBox _hubTextBox;
    private readonly Label _emailLabel;
    private readonly TextBox _emailTextBox;
    private readonly Label _passwordLabel;
    private readonly TextBox _passwordTextBox;
    private readonly Label _confirmPasswordLabel;
    private readonly TextBox _confirmPasswordTextBox;

    private bool _signupMode;

    public string? Callsign { get; private set; }
    public string? EmailAddress { get; private set; }

    public AuthDialog(HttpClient http)
    {
        _http = http;

        Text = "FlyMe";
        StartPosition = FormStartPosition.CenterScreen;
        Width = 1120;
        Height = 690;
        MinimumSize = new Size(1040, 690);
        BackColor = Color.FromArgb(36, 36, 36);
        ForeColor = Color.White;
        FormBorderStyle = FormBorderStyle.FixedSingle;
        MaximizeBox = false;
        MinimizeBox = false;

        var root = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 2,
            RowCount = 1,
            BackColor = BackColor,
            Padding = new Padding(0),
        };
        root.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 66));
        root.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 34));

        _visualPanel = new Panel
        {
            Dock = DockStyle.Fill,
            BackColor = Color.FromArgb(36, 36, 36),
            Margin = new Padding(0),
        };
        _visualPanel.Paint += (_, e) => PaintVisualPanel(e.Graphics, _visualPanel.ClientRectangle);

        _rightPanel = new Panel
        {
            Dock = DockStyle.Fill,
            BackColor = Color.FromArgb(36, 36, 36),
            Padding = new Padding(26, 20, 30, 22),
        };

        _versionLabel = new Label
        {
            AutoSize = true,
            Text = BuildVersionText(),
            ForeColor = Color.White,
            Font = new Font("Segoe UI", 16, FontStyle.Regular),
            Anchor = AnchorStyles.Top | AnchorStyles.Right,
        };

        _brandLabel = new Label
        {
            AutoSize = true,
            Text = "FLYSKY",
            ForeColor = Color.White,
            Font = new Font("Segoe UI Semibold", 15, FontStyle.Bold),
        };

        _headingLabel = new Label
        {
            AutoSize = false,
            Size = new Size(320, 82),
            Text = "Sign into your\naccount",
            ForeColor = Color.White,
            Font = new Font("Segoe UI Semibold", 24, FontStyle.Bold),
        };

        _subheadingLabel = new Label
        {
            AutoSize = false,
            Size = new Size(340, 40),
            Text = "Use your FlySky account to continue.",
            ForeColor = Color.FromArgb(180, 180, 180),
            Font = new Font("Segoe UI", 10, FontStyle.Regular),
        };

        _firstNameLabel = BuildFieldLabel("First name");
        _firstNameTextBox = BuildTextBox("Ruben");
        _lastNameLabel = BuildFieldLabel("Last name");
        _lastNameTextBox = BuildTextBox("Pilot");
        _hubLabel = BuildFieldLabel("Home hub");
        _hubTextBox = BuildTextBox("EGLL", maxLength: 4);
        _emailLabel = BuildFieldLabel("Email");
        _emailTextBox = BuildTextBox("pilot@example.com");
        _passwordLabel = BuildFieldLabel("Password");
        _passwordTextBox = BuildTextBox("", isPassword: true);
        _confirmPasswordLabel = BuildFieldLabel("Confirm password");
        _confirmPasswordTextBox = BuildTextBox("", isPassword: true);

        _forgotPasswordLink = new LinkLabel
        {
            AutoSize = true,
            Text = "Forgot password?",
            LinkColor = Color.FromArgb(155, 155, 155),
            ActiveLinkColor = Color.White,
            VisitedLinkColor = Color.FromArgb(155, 155, 155),
            Font = new Font("Segoe UI", 9, FontStyle.Regular),
        };

        _primaryButton = new Button
        {
            Text = "SIGN IN",
            Size = new Size(430, 38),
            FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(255, 105, 50),
            ForeColor = Color.White,
            Font = new Font("Segoe UI Semibold", 10, FontStyle.Bold),
            Cursor = Cursors.Hand,
        };
        _primaryButton.FlatAppearance.BorderSize = 0;
        _primaryButton.Click += async (_, _) => await SubmitAsync();

        _switchPromptLabel = new Label
        {
            AutoSize = true,
            Text = "Need an account?",
            ForeColor = Color.FromArgb(155, 155, 155),
            Font = new Font("Segoe UI", 9, FontStyle.Regular),
        };

        _switchModeLink = new LinkLabel
        {
            AutoSize = true,
            Text = "Create one",
            LinkColor = Color.White,
            ActiveLinkColor = Color.White,
            VisitedLinkColor = Color.White,
            Font = new Font("Segoe UI Semibold", 9, FontStyle.Bold),
        };
        _switchModeLink.Click += (_, _) => ToggleMode();

        _statusLabel = new Label
        {
            AutoSize = false,
            Size = new Size(430, 40),
            Text = "Server status: ready",
            ForeColor = Color.FromArgb(115, 196, 91),
            Font = new Font("Segoe UI", 9, FontStyle.Regular),
        };

        _rightPanel.Controls.Add(_versionLabel);
        _rightPanel.Controls.Add(_brandLabel);
        _rightPanel.Controls.Add(_headingLabel);
        _rightPanel.Controls.Add(_subheadingLabel);
        _rightPanel.Controls.Add(_firstNameLabel);
        _rightPanel.Controls.Add(_firstNameTextBox);
        _rightPanel.Controls.Add(_lastNameLabel);
        _rightPanel.Controls.Add(_lastNameTextBox);
        _rightPanel.Controls.Add(_hubLabel);
        _rightPanel.Controls.Add(_hubTextBox);
        _rightPanel.Controls.Add(_emailLabel);
        _rightPanel.Controls.Add(_emailTextBox);
        _rightPanel.Controls.Add(_passwordLabel);
        _rightPanel.Controls.Add(_passwordTextBox);
        _rightPanel.Controls.Add(_confirmPasswordLabel);
        _rightPanel.Controls.Add(_confirmPasswordTextBox);
        _rightPanel.Controls.Add(_forgotPasswordLink);
        _rightPanel.Controls.Add(_primaryButton);
        _rightPanel.Controls.Add(_switchPromptLabel);
        _rightPanel.Controls.Add(_switchModeLink);
        _rightPanel.Controls.Add(_statusLabel);

        root.Controls.Add(_visualPanel, 0, 0);
        root.Controls.Add(_rightPanel, 1, 0);
        Controls.Add(root);

        Resize += (_, _) => LayoutAuthControls();
        _rightPanel.Resize += (_, _) => LayoutAuthControls();

        AcceptButton = _primaryButton;

        SetMode(false);
    }

    private static Label BuildFieldLabel(string text)
    {
        return new Label
        {
            AutoSize = true,
            Text = text,
            ForeColor = Color.FromArgb(200, 200, 200),
            Font = new Font("Segoe UI", 9, FontStyle.Regular),
        };
    }

    private static TextBox BuildTextBox(string placeholder, bool isPassword = false, int maxLength = 0)
    {
        var box = new TextBox
        {
            Size = new Size(320, 28),
            BorderStyle = BorderStyle.FixedSingle,
            BackColor = Color.FromArgb(43, 43, 43),
            ForeColor = Color.White,
            PlaceholderText = placeholder,
            UseSystemPasswordChar = isPassword,
            Font = new Font("Segoe UI", 10, FontStyle.Regular),
        };

        if (maxLength > 0)
        {
            box.MaxLength = maxLength;
        }

        return box;
    }

    private void ToggleMode()
    {
        SetMode(!_signupMode);
    }

    private void SetMode(bool signupMode)
    {
        _signupMode = signupMode;

        _headingLabel.Text = signupMode ? "Create your\naccount" : "Sign into your\naccount";
        _subheadingLabel.Text = signupMode
            ? "Join FlySky and unlock dispatch tracking."
            : "Use your FlySky account to continue.";
        _primaryButton.Text = signupMode ? "CREATE ACCOUNT" : "SIGN IN";
        _switchPromptLabel.Text = signupMode ? "Already have an account?" : "Need an account?";
        _switchModeLink.Text = signupMode ? "Sign in" : "Create one";

        _firstNameLabel.Visible = signupMode;
        _firstNameTextBox.Visible = signupMode;
        _lastNameLabel.Visible = signupMode;
        _lastNameTextBox.Visible = signupMode;
        _hubLabel.Visible = signupMode;
        _hubTextBox.Visible = signupMode;
        _confirmPasswordLabel.Visible = signupMode;
        _confirmPasswordTextBox.Visible = signupMode;
        _forgotPasswordLink.Visible = !signupMode;

        LayoutAuthControls();
    }

    private void LayoutAuthControls()
    {
        if (_rightPanel.ClientSize.Width <= 0)
        {
            return;
        }

        const int left = 26;
        const int top = 20;
        const int labelGap = 22;
        const int sectionGap = 16;
        const int halfGap = 12;

        var contentWidth = Math.Max(300, _rightPanel.ClientSize.Width - left - 30);
        var halfWidth = (contentWidth - halfGap) / 2;

        _versionLabel.Location = new Point(_rightPanel.ClientSize.Width - _versionLabel.PreferredWidth - 6, top);
        _brandLabel.Location = new Point(left, 92);
        _headingLabel.Location = new Point(left, 132);
        _headingLabel.Size = new Size(contentWidth, _signupMode ? 74 : 82);
        _subheadingLabel.Location = new Point(left, _headingLabel.Bottom + 8);
        _subheadingLabel.Size = new Size(contentWidth, 36);

        if (_signupMode)
        {
            _firstNameLabel.Location = new Point(left, 268);
            _firstNameTextBox.Location = new Point(left, _firstNameLabel.Bottom + 6);
            _firstNameTextBox.Width = halfWidth;

            _lastNameLabel.Location = new Point(left + halfWidth + halfGap, 268);
            _lastNameTextBox.Location = new Point(left + halfWidth + halfGap, _lastNameLabel.Bottom + 6);
            _lastNameTextBox.Width = halfWidth;

            _emailLabel.Location = new Point(left, _firstNameTextBox.Bottom + labelGap);
            _emailTextBox.Location = new Point(left, _emailLabel.Bottom + 6);
            _emailTextBox.Width = contentWidth;

            _hubLabel.Location = new Point(left, _emailTextBox.Bottom + labelGap);
            _hubTextBox.Location = new Point(left, _hubLabel.Bottom + 6);
            _hubTextBox.Width = halfWidth;

            _passwordLabel.Location = new Point(left + halfWidth + halfGap, _hubLabel.Top);
            _passwordTextBox.Location = new Point(left + halfWidth + halfGap, _passwordLabel.Bottom + 6);
            _passwordTextBox.Width = halfWidth;

            _confirmPasswordLabel.Location = new Point(left, _hubTextBox.Bottom + labelGap);
            _confirmPasswordTextBox.Location = new Point(left, _confirmPasswordLabel.Bottom + 6);
            _confirmPasswordTextBox.Width = contentWidth;

            _primaryButton.Location = new Point(left, _confirmPasswordTextBox.Bottom + sectionGap);
            _primaryButton.Width = contentWidth;
            _switchPromptLabel.Location = new Point(left, _primaryButton.Bottom + 16);
            _switchModeLink.Location = new Point(_switchPromptLabel.Right + 6, _switchPromptLabel.Top);
            _statusLabel.Location = new Point(left, _switchPromptLabel.Bottom + 18);
            _statusLabel.Size = new Size(contentWidth, 32);
        }
        else
        {
            _emailLabel.Location = new Point(left, 312);
            _emailTextBox.Location = new Point(left, _emailLabel.Bottom + 6);
            _emailTextBox.Width = contentWidth;

            _passwordLabel.Location = new Point(left, _emailTextBox.Bottom + labelGap);
            _passwordTextBox.Location = new Point(left, _passwordLabel.Bottom + 6);
            _passwordTextBox.Width = contentWidth;

            _forgotPasswordLink.Location = new Point(left, _passwordTextBox.Bottom + 10);
            _primaryButton.Location = new Point(left, _forgotPasswordLink.Bottom + 18);
            _primaryButton.Width = contentWidth;
            _switchPromptLabel.Location = new Point(left, _primaryButton.Bottom + 16);
            _switchModeLink.Location = new Point(_switchPromptLabel.Right + 6, _switchPromptLabel.Top);
            _statusLabel.Location = new Point(left, _switchPromptLabel.Bottom + 18);
            _statusLabel.Size = new Size(contentWidth, 32);
        }
    }

    private string BuildVersionText()
    {
        var version = Assembly.GetExecutingAssembly().GetName().Version;
        return version is null ? "v0.0.0" : $"v{version.Major}.{version.Minor}.{version.Build}";
    }

    private void PaintVisualPanel(Graphics graphics, Rectangle bounds)
    {
        graphics.SmoothingMode = SmoothingMode.AntiAlias;
        graphics.Clear(Color.FromArgb(36, 36, 36));

        using var thinPen = new Pen(Color.FromArgb(140, 220, 220, 220), 1.1f);
        using var accentPen = new Pen(Color.FromArgb(90, 255, 255, 255), 1.6f);

        var wing = new[]
        {
            new PointF(bounds.Left + 20, bounds.Bottom - 70),
            new PointF(bounds.Left + 220, bounds.Bottom - 220),
            new PointF(bounds.Left + 420, bounds.Bottom - 160),
            new PointF(bounds.Left + 670, bounds.Top + 30),
            new PointF(bounds.Left + 590, bounds.Top + 15),
            new PointF(bounds.Left + 370, bounds.Top + 235),
            new PointF(bounds.Left + 210, bounds.Bottom - 110),
        };

        graphics.DrawPolygon(accentPen, wing);

        for (var i = 0; i < 18; i++)
        {
            var startX = bounds.Left - 60 + i * 48;
            graphics.DrawLine(thinPen, startX, bounds.Bottom - 220, startX + 430, bounds.Bottom - 390);
        }

        for (var i = 0; i < 12; i++)
        {
            var startY = bounds.Bottom - 40 - i * 44;
            graphics.DrawLine(thinPen, bounds.Left + 10, startY, bounds.Left + 570, startY - 210);
        }

        for (var i = 0; i < 7; i++)
        {
            var pivotX = bounds.Left + 170 + i * 84;
            var pivotY = bounds.Bottom - 120 - i * 30;
            graphics.DrawEllipse(accentPen, pivotX, pivotY, 10, 10);
        }
    }

    private async Task SubmitAsync()
    {
        if (_signupMode)
        {
            await SignupAsync();
            return;
        }

        await LoginAsync();
    }

    private async Task LoginAsync()
    {
        _statusLabel.ForeColor = Color.FromArgb(240, 191, 76);
        _statusLabel.Text = "Signing in...";
        try
        {
            var result = await AuthenticateAsync(_emailTextBox.Text.Trim(), _passwordTextBox.Text);
            if (result is null)
            {
                _statusLabel.ForeColor = Color.FromArgb(255, 107, 107);
                _statusLabel.Text = "Login failed. Check your credentials and try again.";
                return;
            }

            Callsign = result.Callsign;
            EmailAddress = result.Email;
            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex)
        {
            _statusLabel.ForeColor = Color.FromArgb(255, 107, 107);
            _statusLabel.Text = $"Login failed: {ex.Message}";
        }
    }

    private async Task SignupAsync()
    {
        if (!string.Equals(_passwordTextBox.Text, _confirmPasswordTextBox.Text, StringComparison.Ordinal))
        {
            _statusLabel.ForeColor = Color.FromArgb(255, 107, 107);
            _statusLabel.Text = "Passwords do not match.";
            return;
        }

        if (_passwordTextBox.Text.Length < 8)
        {
            _statusLabel.ForeColor = Color.FromArgb(255, 107, 107);
            _statusLabel.Text = "Password must be at least 8 characters.";
            return;
        }

        _statusLabel.ForeColor = Color.FromArgb(240, 191, 76);
        _statusLabel.Text = "Creating account...";
        try
        {
            var payload = new
            {
                firstName = _firstNameTextBox.Text.Trim(),
                lastName = _lastNameTextBox.Text.Trim(),
                email = _emailTextBox.Text.Trim(),
                password = _passwordTextBox.Text,
                hub = _hubTextBox.Text.Trim().ToUpperInvariant(),
            };

            using var res = await _http.PostAsJsonAsync("api/auth/register", payload);
            var body = await res.Content.ReadAsStringAsync();
            if (!res.IsSuccessStatusCode)
            {
                _statusLabel.ForeColor = Color.FromArgb(255, 107, 107);
                _statusLabel.Text = ExtractMessage(body) ?? "Registration failed.";
                return;
            }

            _statusLabel.Text = "Account created. Signing in...";
            var result = await AuthenticateAsync(payload.email, payload.password);
            if (result is null)
            {
                _statusLabel.ForeColor = Color.FromArgb(255, 107, 107);
                _statusLabel.Text = "Account created, but sign in failed. Try signing in manually.";
                SetMode(false);
                return;
            }

            Callsign = result.Callsign;
            EmailAddress = result.Email;
            DialogResult = DialogResult.OK;
            Close();
        }
        catch (Exception ex)
        {
            _statusLabel.ForeColor = Color.FromArgb(255, 107, 107);
            _statusLabel.Text = $"Signup failed: {ex.Message}";
        }
    }

    private async Task<AuthResult?> AuthenticateAsync(string email, string password)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return null;
        }

        using var response = await _http.PostAsJsonAsync("api/flyme/auth", new { email, password });
        var responseBody = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            return null;
        }

        var auth = JsonSerializer.Deserialize<AuthResponse>(responseBody, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        var callsign = auth?.Callsign?.Trim();
        if (string.IsNullOrWhiteSpace(callsign))
        {
            return null;
        }

        return new AuthResult(auth?.UserId ?? string.Empty, email, callsign);
    }

    private static string? ExtractMessage(string body)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("error", out var error))
            {
                return error.GetString();
            }
        }
        catch
        {
        }

        return null;
    }

    private sealed record AuthResult(string UserId, string Email, string Callsign);
    private sealed record AuthResponse(bool Ok, string? Callsign, string? UserId, string? Email, string? Error);
}
