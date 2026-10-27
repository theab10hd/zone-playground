# zDev copydll: stop the running frontend, build the backend, run CopyDll.bat,
# copy C:\zOneDlls\*.dll into the frontend's bin\Debug\net7.0, then notify.
param([string]$Root)

$ErrorActionPreference = 'Stop'
$bat = 'backend\zLink.References\CopyDll.bat'
$dllStore = 'C:\zOneDlls'

function Notify([string]$text) {
    try {
        Add-Type -AssemblyName System.Windows.Forms, System.Drawing
        $n = New-Object System.Windows.Forms.NotifyIcon
        $n.Icon = [System.Drawing.SystemIcons]::Information
        $n.Visible = $true
        $n.ShowBalloonTip(5000, 'zDev', $text, 'Info')
        Start-Sleep -Seconds 6  # the balloon disappears when the icon is disposed
        $n.Dispose()
    } catch { Write-Host "Notification failed: $_" }
}

function Fail([string]$text) {
    Write-Host "ERROR: $text"
    Notify "Copy Dll failed: $text"
    exit 1
}

# 1. Find the zOne root: -Root, then up from the current folder, then D:\zOne, then every drive.
function Find-Root {
    if ($Root) { if (Test-Path (Join-Path $Root $bat)) { return (Resolve-Path $Root).Path }; Fail "No $bat under $Root" }
    $dir = (Get-Location).Path
    while ($dir) {
        if (Test-Path (Join-Path $dir $bat)) { return $dir }
        $dir = Split-Path $dir -Parent
    }
    if (Test-Path "D:\zOne\$bat") { return 'D:\zOne' }
    foreach ($drive in (Get-PSDrive -PSProvider FileSystem).Root) {
        # shortcut: searches 4 levels deep per drive, pass -Root for deeper checkouts
        $hit = Get-ChildItem $drive -Filter CopyDll.bat -Recurse -Depth 4 -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Directory.Name -eq 'zLink.References' } | Select-Object -First 1
        if ($hit) { return $hit.Directory.Parent.Parent.FullName }
    }
    Fail "Could not find zLink.References\CopyDll.bat on any drive. Pass the zOne folder: /zdev:copydll <path>"
}

$root = Find-Root
$backendSln = Get-ChildItem (Join-Path $root 'backend') -Filter *.sln -File | Select-Object -First 1
$frontendBin = Join-Path $root 'frontend\bin\Debug\net7.0'
if (-not $backendSln) { Fail "No .sln in $root\backend" }
if (-not (Test-Path $frontendBin)) { Fail "$frontendBin does not exist. Build the frontend once first." }
# Output is kept to a few marker lines (START, PROGRESS, WARN, ERROR, COPYDLL DONE): each one wakes Claude in /zdev:copydll.
$modules = @((dotnet sln $backendSln.FullName list) -match '\.csproj$' | ForEach-Object { [IO.Path]::GetFileNameWithoutExtension($_) })

# 2. Stop every running frontend (dotnet run / dotnet watch / the built exe / IIS Express), wherever it was started.
$frontendExe = 'zlink.business.platformbuilder.zOne'
$all = Get-CimInstance Win32_Process
$apps = @($all | Where-Object {
    $_.Name -like "$frontendExe*" -or
    ($_.Name -in 'dotnet.exe', 'iisexpress.exe' -and $_.CommandLine -match 'platformbuilder\.zOne')
})
# `dotnet run` / `dotnet watch` carry no path on their command line, so also stop the dotnet.exe ancestors
# of each app (watch -> run -> app); otherwise watch restarts it.
$procs = @($apps)
$queue = @($apps)
while ($queue) {
    $up = @($all | Where-Object { $_.Name -eq 'dotnet.exe' -and $_.ProcessId -in $queue.ParentProcessId -and $_.ProcessId -notin $procs.ProcessId })
    $procs += $up
    $queue = $up
}
$procs = @($procs | Sort-Object ProcessId -Unique | Where-Object { $_.ProcessId -ne $PID })
foreach ($p in $procs) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }
$stopped = if ($procs) { ($procs | ForEach-Object { "$($_.Name) ($($_.ProcessId))" }) -join ', ' } else { 'none running' }
Write-Host "START: root=$root; modules=$($modules.Count); stopped=$stopped"

# 3. Build the backend. No node reuse, so no MSBuild node keeps the DLLs locked afterwards.
# Minimal verbosity prints "  <Project> -> <path>.dll" as each project finishes; report only at each quarter.
$built = New-Object System.Collections.Generic.List[string]
$marks = @(1..4 | ForEach-Object { [Math]::Ceiling($modules.Count * $_ / 4) })
dotnet build $backendSln.FullName -c Debug -nodeReuse:false -v minimal | ForEach-Object {
    if ("$_" -match '^\s*(\S+) -> .+\.dll\s*$') {
        $built.Add($Matches[1])
        if ($built.Count -in $marks) { Write-Host "PROGRESS: $($built.Count)/$($modules.Count) $($Matches[1] -ireplace '^zLink\.Business\.zOne\.', '')" }
    } elseif ("$_" -match 'error [A-Z]+\d+') { Write-Host "$_" }
}
if ($LASTEXITCODE -ne 0) { Fail "Backend build failed (exit $LASTEXITCODE)." }
$notBuilt = @($modules | Where-Object { $_ -notin $built })  # -notin ignores case, as the names in output can differ

# 4. Run CopyDll.bat from its own folder: it copies with ..\ paths.
New-Item -ItemType Directory -Force $dllStore | Out-Null
Push-Location (Join-Path $root 'backend\zLink.References')
cmd /c "CopyDll.bat < nul" | Out-Null
# The bat's exit code is only its last copy's, so check each source instead: a missing .config is a warning, a missing .dll fails.
$missing = @(Get-Content CopyDll.bat | Where-Object { $_ -match '^\s*copy\s+(\S+)' } | ForEach-Object { $Matches[1] } | Where-Object { -not (Test-Path $_) })
Pop-Location
if ($missing) { Write-Host "WARN: CopyDll.bat sources missing: $(($missing | Split-Path -Leaf) -join ', ')" }
$missingDlls = @($missing | Where-Object { $_ -like '*.dll' })
if ($missingDlls) { Fail "CopyDll.bat could not find $($missingDlls.Count) DLL(s): $($missingDlls -join ', ')" }

# 5. Copy the DLLs into the frontend.
$dlls = @(Get-ChildItem $dllStore -Filter *.dll -File)
if (-not $dlls) { Fail "No .dll files in $dllStore" }
$dlls | Copy-Item -Destination $frontendBin -Force
$unreported = if ($notBuilt) { "; not reported: $($notBuilt -join ', ')" } else { '' }
Write-Host "COPYDLL DONE: built $($built.Count)/$($modules.Count)$unreported; copied $($dlls.Count) DLLs to $frontendBin"

Notify 'Copy Dll Done'
