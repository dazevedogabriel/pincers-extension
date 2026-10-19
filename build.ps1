# Builds the browser extension from src/ into dist/:
#   dist/chrome/              -> Opera GX / Chrome: "Load unpacked"
#   dist/firefox/             -> Firefox: about:debugging -> "Load Temporary Add-on"
#   dist/pincers-firefox.xpi  -> Firefox package (for signing on addons.mozilla.org)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$srcDir = Join-Path $root "src"

# --- Translations: every key used must exist in every language, all languages
# must have the same keys, and no key may be left unused.
$used = New-Object System.Collections.Generic.SortedSet[string]
$patterns = @('\bt\("(\w+)"', 'data-i18n(?:-html|-placeholder)?="(\w+)"', '__MSG_(\w+)__')
$sources = @(Get-ChildItem $srcDir -Recurse -Include *.js, *.html -File | Where-Object { $_.FullName -notmatch '\\_locales\\' }) +
           @(Get-ChildItem $root -Filter "manifest.*.json" -File)
# Convention: always call t("literal"), so this scan sees every key.
foreach ($file in $sources) {
    # Skip comment lines: examples in comments are not real keys.
    $lines = [IO.File]::ReadAllLines($file.FullName) | Where-Object { $_ -notmatch '^\s*(//|/\*|\*)' }
    $text = $lines -join "`n"
    foreach ($p in $patterns) {
        foreach ($m in [regex]::Matches($text, $p)) { [void]$used.Add($m.Groups[1].Value) }
    }
}

$problems = @()
$reference = $null
foreach ($dir in Get-ChildItem (Join-Path $srcDir "_locales") -Directory) {
    $json = [IO.File]::ReadAllText((Join-Path $dir.FullName "messages.json")) | ConvertFrom-Json
    $keys = New-Object System.Collections.Generic.SortedSet[string]
    $json.PSObject.Properties.Name | ForEach-Object { [void]$keys.Add($_) }
    $missing = $used | Where-Object { -not $keys.Contains($_) }
    $unused = $keys | Where-Object { -not $used.Contains($_) }
    if ($missing) { $problems += "$($dir.Name): missing $($missing -join ', ')" }
    if ($unused) { $problems += "$($dir.Name): unused $($unused -join ', ')" }
    if ($null -eq $reference) { $reference = $keys; $refName = $dir.Name }
    elseif (-not $reference.SetEquals($keys)) { $problems += "$($dir.Name): keys differ from $refName" }
}
if ($problems) {
    $problems | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    throw "translations are out of sync"
}
Write-Host "Translations OK: $($used.Count) keys in $((Get-ChildItem (Join-Path $srcDir '_locales') -Directory).Count) languages"

# --- Package
$dist = Join-Path $root "dist"
if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
foreach ($browser in "chrome", "firefox") {
    $out = Join-Path $dist $browser
    Copy-Item -Recurse $srcDir $out
    Copy-Item (Join-Path $root "manifest.$browser.json") (Join-Path $out "manifest.json")
}

# Zip with forward slashes: Windows PowerShell's Compress-Archive writes "\",
# which Firefox rejects for files in sub-folders.
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$ff = Join-Path $dist "firefox"
$xpi = Join-Path $dist "pincers-firefox.xpi"
$zip = [System.IO.Compression.ZipFile]::Open($xpi, "Create")
try {
    Get-ChildItem -Recurse -File $ff | ForEach-Object {
        $name = $_.FullName.Substring($ff.Length + 1).Replace("\", "/")
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $name) | Out-Null
    }
} finally { $zip.Dispose() }

Write-Host "Done:"
Write-Host "  Opera GX / Chrome: $dist\chrome"
Write-Host "  Firefox:           $xpi"
