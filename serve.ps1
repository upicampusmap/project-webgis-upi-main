param(
  [int]$PreferredPort = 8000,
  [switch]$NoBrowser
)
# Local preview only. GitHub Pages serves the same static files directly.
$siteRoot = [IO.Path]::GetFullPath($PSScriptRoot)
$rootPrefix = $siteRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
$listener = $null
$ports = @($PreferredPort, 8001, 8080, 5500, 3000) | Select-Object -Unique
foreach ($candidatePort in $ports) {
  $candidate = $null
  try {
    $candidate = New-Object Net.HttpListener
    $candidate.Prefixes.Add("http://localhost:$candidatePort/")
    $candidate.Start()
    $listener = $candidate
    $sitePort = $candidatePort
    break
  } catch { if ($candidate) { $candidate.Close() } }
}
if (-not $listener) { throw "Tidak dapat membuka server lokal pada port $($ports -join ', ')." }
$mime = @{
  '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8';
  '.js'='application/javascript; charset=utf-8'; '.mjs'='application/javascript; charset=utf-8';
  '.json'='application/json'; '.geojson'='application/geo+json';
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.webp'='image/webp';
  '.gif'='image/gif'; '.svg'='image/svg+xml'; '.ico'='image/x-icon'; '.txt'='text/plain; charset=utf-8'
}
Write-Host "WebGIS UPI: http://localhost:$sitePort/map.html"
Write-Host 'Biarkan server terbuka. Tekan Ctrl+C untuk berhenti.'
if (-not $NoBrowser) { Start-Process "http://localhost:$sitePort/map.html" }
try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    try {
      if ($context.Request.HttpMethod -notin @('GET', 'HEAD')) {
        $context.Response.StatusCode = 405
        $context.Response.Headers['Allow'] = 'GET, HEAD'
        continue
      }
      $relative = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath).TrimStart('/')
      if (-not $relative) { $relative = 'index.html' }
      $segments = $relative -split '[/\\]'
      $resolved = [IO.Path]::GetFullPath((Join-Path $siteRoot $relative))
      $blocked = -not $resolved.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)
      $blocked = $blocked -or @($segments | Where-Object { $_.StartsWith('.') -or $_ -eq 'data-source' }).Count -gt 0
      if ($blocked) { $context.Response.StatusCode = 403; continue }
      if (-not [IO.File]::Exists($resolved)) { $context.Response.StatusCode = 404; continue }
      $extension = [IO.Path]::GetExtension($resolved).ToLowerInvariant()
      $context.Response.ContentType = if ($mime.ContainsKey($extension)) { $mime[$extension] } else { 'application/octet-stream' }
      $context.Response.Headers['X-Content-Type-Options'] = 'nosniff'
      $bytes = [IO.File]::ReadAllBytes($resolved)
      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.StatusCode = 200
      if ($context.Request.HttpMethod -eq 'GET') { $context.Response.OutputStream.Write($bytes, 0, $bytes.Length) }
    } catch {
      try { $context.Response.StatusCode = 500 } catch {}
      Write-Warning $_.Exception.Message
    } finally { $context.Response.Close() }
  }
} finally { $listener.Stop(); $listener.Close() }
