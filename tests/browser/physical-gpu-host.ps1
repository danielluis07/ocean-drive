param([switch]$PinFirefox, [Parameter(Mandatory=$true)][uint32]$OwnerProcess)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class VoyageHost {
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int left, top, right, bottom; }
  public delegate bool EnumCallback(IntPtr handle, IntPtr parameter);
  [DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint flags);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumCallback callback, IntPtr parameter);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr handle, out uint process);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr handle);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr handle);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr handle, out Rect rectangle);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr handle, int command);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr handle);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr handle, IntPtr after, int x, int y, int width, int height, uint flags);
  public static IntPtr[] Find(uint process) {
    var windows = new List<IntPtr>();
    EnumWindows((handle, _) => {
      uint owner; GetWindowThreadProcessId(handle, out owner);
      if (owner == process && IsWindowVisible(handle)) windows.Add(handle);
      return true;
    }, IntPtr.Zero);
    return windows.ToArray();
  }
}
'@
# The helper's thread holds these requests only until its stdin closes.
# No power plan, timeout or other machine setting is changed.
$previousExecution = [VoyageHost]::SetThreadExecutionState([uint32]2147483651)
if ($previousExecution -eq 0) { throw 'Could not keep the physical lab display awake' }
$taskWindow = [IntPtr]::Zero
$originalRectangle = New-Object VoyageHost+Rect
try {
  $nativeWindow = $null
  if ($PinFirefox) {
    # Firefox's launcher and browser can share the same command line. Select
    # the visible window, restricted to this lab's patched automation browser.
    $taskProcesses = @(Get-CimInstance Win32_Process)
    $taskParents = @{}
    foreach ($taskProcess in $taskProcesses) { $taskParents[[uint32]$taskProcess.ProcessId] = [uint32]$taskProcess.ParentProcessId }
    $taskFirefox = @($taskProcesses | Where-Object {
      $taskOwned = $false
      if ($_.Name -eq 'firefox.exe' -and $_.CommandLine -like '*ms-playwright*' -and $_.CommandLine -like '*-juggler-pipe*') {
        $taskAncestor = [uint32]$_.ProcessId
        for ($taskDepth = 0; $taskDepth -lt 32 -and $taskParents.ContainsKey($taskAncestor); $taskDepth++) {
          $taskAncestor = $taskParents[$taskAncestor]
          if ($taskAncestor -eq $OwnerProcess) { $taskOwned = $true; break }
        }
      }
      $taskOwned
    })
    $taskWindows = @(foreach ($taskProcess in $taskFirefox) {
      foreach ($taskHandle in [VoyageHost]::Find([uint32]$taskProcess.ProcessId)) {
        [pscustomobject]@{ process = $taskProcess.ProcessId; handle = $taskHandle }
      }
    })
    if ($taskWindows.Count -ne 1) { throw "Expected one owned Firefox window, found $($taskWindows.Count)" }
    $taskWindow = $taskWindows[0].handle
    if (-not [VoyageHost]::GetWindowRect($taskWindow, [ref]$originalRectangle)) { throw 'Could not read the owned Firefox window bounds' }
    $wasMinimized = [VoyageHost]::IsIconic($taskWindow)
    [void][VoyageHost]::ShowWindowAsync($taskWindow, 9)
    # Place the owned lab window on the primary display, preserving its viewport.
    $pinned = [VoyageHost]::SetWindowPos($taskWindow, [IntPtr](-1), 0, 0, 0, 0, 0x11)
    if (-not $pinned) { throw 'Could not keep the owned Firefox window visible' }
    $requestedFocus = [VoyageHost]::SetForegroundWindow($taskWindow)
    # Windows can refuse background applications permission to take focus.
    # A visible but unfocused window is not the foreground-device lab condition.
    $focusDeadline = [DateTime]::UtcNow.AddSeconds(300)
    while ([VoyageHost]::GetForegroundWindow() -ne $taskWindow -and [DateTime]::UtcNow -lt $focusDeadline) { Start-Sleep -Milliseconds 250 }
    if ([VoyageHost]::GetForegroundWindow() -ne $taskWindow) { throw 'The physical Firefox lab needs its native window in the foreground. Select the test window and retry.' }
    $nativeWindow = @{ process = $taskWindows[0].process; pinned = $pinned; primaryDisplay = $true; requestedFocus = $requestedFocus; foreground = [VoyageHost]::GetForegroundWindow() -eq $taskWindow; wasMinimized = $wasMinimized }
  }
  [Console]::WriteLine((@{ displayAwake = $true; nativeWindow = $nativeWindow } | ConvertTo-Json -Compress -Depth 3))
  [void][Console]::ReadLine()
} finally {
  if ($taskWindow -ne [IntPtr]::Zero) { [void][VoyageHost]::SetWindowPos($taskWindow, [IntPtr](-2), $originalRectangle.left, $originalRectangle.top, 0, 0, 0x11) }
  [void][VoyageHost]::SetThreadExecutionState($previousExecution)
}
