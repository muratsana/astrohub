using System.Collections;
using System.Globalization;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

var driverId = Arg("--driver") ?? Environment.GetEnvironmentVariable("ASTROHUB_ASCOM_DRIVER_ID") ?? "ASCOM.Simulator.Telescope";
var prefix = Arg("--prefix") ?? "http://127.0.0.1:4765/";
var bridge = new Bridge(driverId, prefix);
bridge.Run();

string? Arg(string name)
{
  for (var i = 0; i < args.Length - 1; i++)
  {
    if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase)) return args[i + 1];
  }
  return null;
}

sealed class Bridge(string driverId, string prefix)
{
  readonly HttpListener listener = new();
  object? mount;
  string activeDriverId = driverId;

  static readonly JsonSerializerOptions Json = new()
  {
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
  };

  public void Run()
  {
    if (!OperatingSystem.IsWindows())
    {
      Console.Error.WriteLine("Astrohub Mount Bridge sadece Windows + ASCOM ortamında çalışır.");
      Environment.Exit(1);
    }

    listener.Prefixes.Add(prefix);
    listener.Start();
    Console.WriteLine($"Astrohub Mount Bridge dinliyor: {prefix}");
    Console.WriteLine($"Varsayılan driver: {activeDriverId}");
    Console.WriteLine("Diagnostic:");
    Console.WriteLine(JsonSerializer.Serialize(Diagnostics(), Json));

    Console.CancelKeyPress += (_, eventArgs) =>
    {
      eventArgs.Cancel = true;
      Stop();
    };

    while (listener.IsListening)
    {
      try { Handle(listener.GetContext()); }
      catch (HttpListenerException) when (!listener.IsListening) {}
    }
  }

  void Handle(HttpListenerContext context)
  {
    AddCors(context);
    if (context.Request.HttpMethod == "OPTIONS")
    {
      Send(context, 204, new { ok = true });
      return;
    }

    try
    {
      switch (context.Request.Url?.AbsolutePath.ToLowerInvariant())
      {
        case "/health":
          Send(context, 200, new { ok = true, app = "Astrohub Mount Bridge", version = "0.3.0" });
          break;
        case "/diagnostics":
          Send(context, 200, Diagnostics());
          break;
        case "/drivers":
          Send(context, 200, new { ok = true, drivers = AscomDrivers() });
          break;
        case "/status":
          Send(context, 200, Status());
          break;
        case "/connect":
          Connect(ReadDriverId(context.Request) ?? activeDriverId);
          Send(context, 200, Status());
          break;
        case "/disconnect":
          Set(mount, "Connected", false);
          Send(context, 200, Status());
          break;
        default:
          Send(context, 404, new { ok = false, connected = false, error = "Bilinmeyen endpoint" });
          break;
      }
    }
    catch (Exception error)
    {
      Send(context, 500, new { ok = false, connected = false, error = error.Message });
    }
  }

  void Connect(string id)
  {
    if (string.IsNullOrWhiteSpace(id)) throw new InvalidOperationException("DriverId gerekli.");
    if (mount == null || !string.Equals(activeDriverId, id, StringComparison.OrdinalIgnoreCase))
    {
      var type = Type.GetTypeFromProgID(id) ?? throw new InvalidOperationException($"ASCOM sürücüsü bulunamadı: {id}");
      mount = Activator.CreateInstance(type);
      activeDriverId = id;
    }
    Set(mount, "Connected", true);
  }

  object Diagnostics()
  {
    var ascomProfile = Type.GetTypeFromProgID("ASCOM.Utilities.Profile") != null;
    var selectedDriver = Type.GetTypeFromProgID(activeDriverId) != null;
    var phd2 = Phd2("get_app_state");
    var diagnostics = new List<string>();
    if (!OperatingSystem.IsWindows()) diagnostics.Add("Bu program Windows üzerinde çalışmalı.");
    if (!ascomProfile) diagnostics.Add("ASCOM Platform bulunamadı. ASCOM Platform 6.6+ kurulu olmalı.");
    if (!selectedDriver) diagnostics.Add($"Seçili ASCOM driver bulunamadı: {activeDriverId}");
    if (phd2 == null) diagnostics.Add("PHD2 açık değil veya 127.0.0.1:4400 JSON-RPC erişilemiyor. Guiding verisi boş kalır.");
    if (diagnostics.Count == 0) diagnostics.Add("Temel kontroller temiz.");

    return new
    {
      ok = true,
      app = "Astrohub Mount Bridge",
      version = "0.3.0",
      prefix,
      activeDriverId,
      windows = OperatingSystem.IsWindows(),
      os = Environment.OSVersion.VersionString,
      x64 = Environment.Is64BitOperatingSystem,
      ascomProfile,
      selectedDriver,
      drivers = AscomDrivers(),
      phd2Connected = phd2 != null,
      phd2State = Text(phd2),
      connected = Bool(Get(mount, "Connected")) ?? false,
      diagnostics,
      endpoints = new[] { "/health", "/diagnostics", "/drivers", "/status", "/connect", "/disconnect" },
    };
  }

  object Status()
  {
    if (mount == null)
    {
      return new { ok = true, connected = false, driverId = activeDriverId, utc = DateTime.UtcNow.ToString("O") };
    }

    return new
    {
      ok = true,
      connected = Bool(Get(mount, "Connected")),
      driverId = activeDriverId,
      name = Text(Get(mount, "Name")),
      description = Text(Get(mount, "Description")),
      driverInfo = Text(Get(mount, "DriverInfo")),
      driverVersion = Text(Get(mount, "DriverVersion")),
      rightAscensionHours = Number(Get(mount, "RightAscension")),
      declinationDeg = Number(Get(mount, "Declination")),
      altitudeDeg = Number(Get(mount, "Altitude")),
      azimuthDeg = Number(Get(mount, "Azimuth")),
      siteLatitudeDeg = Number(Get(mount, "SiteLatitude")),
      siteLongitudeDeg = Number(Get(mount, "SiteLongitude")),
      siteElevationM = Number(Get(mount, "SiteElevation")),
      tracking = Bool(Get(mount, "Tracking")),
      slewing = Bool(Get(mount, "Slewing")),
      atPark = Bool(Get(mount, "AtPark")),
      sideOfPier = Text(Get(mount, "SideOfPier")),
      capture = Phd2Capture(),
      utc = DateTime.UtcNow.ToString("O"),
    };
  }

  List<object> AscomDrivers()
  {
    var drivers = new List<object>();
    try
    {
      var type = Type.GetTypeFromProgID("ASCOM.Utilities.Profile");
      var profile = type == null ? null : Activator.CreateInstance(type);
      var registered = Call(profile, "RegisteredDevices", "Telescope");
      if (registered is IEnumerable items)
      {
        foreach (var item in items)
        {
          var id = Text(Get(item, "ProgID")) ?? Text(Get(item, "Key"));
          if (id == null) continue;
          var name = Text(Get(item, "Name")) ?? Text(Get(item, "Value")) ?? id;
          drivers.Add(new { id, name });
        }
      }
    }
    catch {}

    if (drivers.Count == 0) drivers.Add(new { id = "ASCOM.Simulator.Telescope", name = "ASCOM Telescope Simulator" });
    return drivers;
  }

  object? Phd2Capture()
  {
    var state = Phd2("get_app_state");
    var stats = Phd2("get_stats");
    if (state == null && stats == null) return null;
    return new
    {
      app = "PHD2",
      state = Text(state) ?? "çalışıyor",
      rmsArcsec = Number(Get(stats, "rms_tot")),
      raRmsArcsec = Number(Get(stats, "rms_ra")),
      decRmsArcsec = Number(Get(stats, "rms_dec")),
    };
  }

  static object? Phd2(string method)
  {
    try
    {
      using var client = new TcpClient();
      if (!client.ConnectAsync(IPAddress.Loopback, 4400).Wait(700)) return null;
      client.ReceiveTimeout = 700;
      client.SendTimeout = 700;
      using var stream = client.GetStream();
      using var writer = new StreamWriter(stream, new UTF8Encoding(false)) { AutoFlush = true, NewLine = "\n" };
      using var reader = new StreamReader(stream, Encoding.UTF8);
      writer.WriteLine(JsonSerializer.Serialize(new { jsonrpc = "2.0", method, id = 1 }));
      var line = reader.ReadLine();
      if (string.IsNullOrWhiteSpace(line)) return null;
      using var doc = JsonDocument.Parse(line);
      return doc.RootElement.TryGetProperty("result", out var result) ? Clone(result) : null;
    }
    catch { return null; }
  }

  static object? Clone(JsonElement value) =>
    value.ValueKind switch
    {
      JsonValueKind.String => value.GetString(),
      JsonValueKind.Number => value.TryGetDouble(out var number) ? number : null,
      JsonValueKind.True => true,
      JsonValueKind.False => false,
      JsonValueKind.Object => value.EnumerateObject().ToDictionary(item => item.Name, item => Clone(item.Value)),
      _ => null,
    };

  static string? ReadDriverId(HttpListenerRequest request)
  {
    if (!request.HasEntityBody) return null;
    using var reader = new StreamReader(request.InputStream, request.ContentEncoding);
    var body = reader.ReadToEnd();
    if (string.IsNullOrWhiteSpace(body)) return null;
    using var doc = JsonDocument.Parse(body);
    return doc.RootElement.TryGetProperty("driverId", out var id) ? id.GetString() : null;
  }

  static void AddCors(HttpListenerContext context)
  {
    var origin = context.Request.Headers["Origin"];
    if (origin == null || origin == "https://astrohub.com.tr" || origin.StartsWith("http://localhost:") || origin.StartsWith("http://127.0.0.1:"))
    {
      context.Response.Headers["Access-Control-Allow-Origin"] = origin ?? "*";
    }
    context.Response.Headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS";
    context.Response.Headers["Access-Control-Allow-Headers"] = "content-type";
  }

  static void Send(HttpListenerContext context, int status, object data)
  {
    var bytes = JsonSerializer.SerializeToUtf8Bytes(data, Json);
    context.Response.StatusCode = status;
    context.Response.ContentType = "application/json; charset=utf-8";
    context.Response.ContentLength64 = bytes.Length;
    context.Response.OutputStream.Write(bytes);
    context.Response.OutputStream.Close();
  }

  void Stop()
  {
    Set(mount, "Connected", false);
    listener.Stop();
  }

  static object? Get(object? target, string name)
  {
    try { return target?.GetType().InvokeMember(name, System.Reflection.BindingFlags.GetProperty, null, target, null); }
    catch { return null; }
  }

  static object? Call(object? target, string name, params object[] args)
  {
    try { return target?.GetType().InvokeMember(name, System.Reflection.BindingFlags.InvokeMethod, null, target, args); }
    catch { return null; }
  }

  static void Set(object? target, string name, object value)
  {
    try { target?.GetType().InvokeMember(name, System.Reflection.BindingFlags.SetProperty, null, target, [value]); }
    catch {}
  }

  static string? Text(object? value) => value?.ToString();
  static bool? Bool(object? value) => value is bool flag ? flag : null;
  static double? Number(object? value)
  {
    try { return value == null ? null : Convert.ToDouble(value, CultureInfo.InvariantCulture); }
    catch { return null; }
  }
}
