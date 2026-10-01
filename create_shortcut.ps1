$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath('Desktop')
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\Capybara Desktop Pet.lnk")
$Shortcut.TargetPath = "d:\Aquadesktop\start.bat"
$Shortcut.WorkingDirectory = "d:\Aquadesktop"
$Shortcut.IconLocation = "d:\Aquadesktop\assets\icon.ico"
$Shortcut.Description = "Capybara 2D Desktop Pet"
$Shortcut.Save()
Write-Host "Desktop shortcut created successfully!"
