Option Explicit

Dim shell, fso, scriptDir, repoRoot, logDir, pnpm, command

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
repoRoot = fso.GetParentFolderName(scriptDir)
logDir = fso.BuildPath(repoRoot, "logs")

If WScript.Arguments.Count > 0 Then
  pnpm = WScript.Arguments.Item(0)
Else
  pnpm = "pnpm"
End If

command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command " & _
  Chr(34) & _
  "Set-Location -LiteralPath '" & repoRoot & "'; " & _
  "New-Item -ItemType Directory -Path '" & logDir & "' -Force | Out-Null; " & _
  "& '" & pnpm & "' watch:once *> '" & fso.BuildPath(logDir, "watcher.log") & "'" & _
  Chr(34)

shell.Run command, 0, False
