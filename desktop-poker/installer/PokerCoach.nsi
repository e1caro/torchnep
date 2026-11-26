; Poker Coach for Windows: the installer (NSIS 3).
;
;   makensis -DVERSION=1.5 installer/PokerCoach.nsi      (build.py does this when makensis is installed)
;   makensis reads its paths from this file's folder: by default it packs ../dist/PokerCoach.exe and writes
;   ../dist/PokerCoach-Setup.exe; -DEXE= and -DOUT= change them.
;
; It installs for the person running it, so it never asks for an administrator: the program goes to
; %LOCALAPPDATA%\Programs\PokerCoach, with a shortcut in the Start menu and on the desktop and an entry in
; Settings > Apps (Installed apps) to uninstall it. Installing a newer version over an older one replaces the
; program and keeps everything else. Your progress lives apart from the program, in %APPDATA%\PokerCoach, and
; uninstalling leaves it there.
;
; Run with /S it installs without a window (the workflow tests it that way), and Uninstall.exe /S likewise.

Unicode true
!include "MUI2.nsh"
!include "FileFunc.nsh"

!ifndef VERSION
  !define VERSION "1.0"
!endif
!ifndef EXE
  !define EXE "../dist/PokerCoach.exe"
!endif
!ifndef OUT
  !define OUT "../dist/PokerCoach-Setup.exe"
!endif
!define UNINST "Software\Microsoft\Windows\CurrentVersion\Uninstall\PokerCoach"

Name "Poker Coach"
OutFile "${OUT}"
RequestExecutionLevel user
InstallDir "$LOCALAPPDATA\Programs\PokerCoach"
InstallDirRegKey HKCU "Software\PokerCoach" "InstallDir"
SetCompressor /SOLID lzma
BrandingText "Poker Coach ${VERSION}"
ShowInstDetails nevershow
ShowUninstDetails nevershow

VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "Poker Coach"
VIAddVersionKey "FileDescription" "Poker Coach installer"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "Free software under the GNU GPL v3"

!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Poker Coach ${VERSION}"
!define MUI_WELCOMEPAGE_TEXT "This puts Poker Coach on this computer: ten lessons on Texas Hold'em, six drills, and a six-player table where a coach grades every decision.$\r$\n$\r$\nIt installs for you only, so no administrator is needed, and it works offline. If you have played before, your progress is kept.$\r$\n$\r$\nChoose Next to continue."
!define MUI_FINISHPAGE_RUN "$INSTDIR\PokerCoach.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Open Poker Coach now"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

; A copy that is open holds its file: it is asked to close (it saves after every action), the way the window's
; close button would.
!macro CloseRunning UN
  Function ${UN}CloseRunning
    nsExec::Exec '"$SYSDIR\cmd.exe" /c tasklist /FI "IMAGENAME eq PokerCoach.exe" /NH | find /I "PokerCoach.exe"'
    Pop $0
    StrCmp $0 "0" 0 done
    IfSilent close
    MessageBox MB_OKCANCEL|MB_ICONINFORMATION "Poker Coach is open. It will be closed to go on; your progress is saved." IDOK close
    Abort
    close:
    nsExec::Exec '"$SYSDIR\taskkill.exe" /IM PokerCoach.exe'
    Sleep 2500
    nsExec::Exec '"$SYSDIR\taskkill.exe" /F /IM PokerCoach.exe'
    Sleep 500
    done:
  FunctionEnd
!macroend
!insertmacro CloseRunning ""
!insertmacro CloseRunning "un."

Section "Poker Coach"
  Call CloseRunning
  SetOutPath "$INSTDIR"
  File "/oname=PokerCoach.exe" "${EXE}"
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  CreateShortcut "$SMPROGRAMS\Poker Coach.lnk" "$INSTDIR\PokerCoach.exe" "" "$INSTDIR\PokerCoach.exe" 0 SW_SHOWNORMAL "" "Learn to play Texas Hold'em well"
  CreateShortcut "$DESKTOP\Poker Coach.lnk" "$INSTDIR\PokerCoach.exe" "" "$INSTDIR\PokerCoach.exe" 0 SW_SHOWNORMAL "" "Learn to play Texas Hold'em well"

  WriteRegStr HKCU "Software\PokerCoach" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNINST}" "DisplayName" "Poker Coach"
  WriteRegStr HKCU "${UNINST}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINST}" "Publisher" "e1caro"
  WriteRegStr HKCU "${UNINST}" "URLInfoAbout" "https://github.com/e1caro/torchnep/tree/master/poker"
  WriteRegStr HKCU "${UNINST}" "DisplayIcon" "$INSTDIR\PokerCoach.exe"
  WriteRegStr HKCU "${UNINST}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINST}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "${UNINST}" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
  WriteRegDWORD HKCU "${UNINST}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST}" "NoRepair" 1
  ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
  WriteRegDWORD HKCU "${UNINST}" "EstimatedSize" "$0"
SectionEnd

Section "Uninstall"
  Call un.CloseRunning
  Delete "$INSTDIR\PokerCoach.exe"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
  Delete "$SMPROGRAMS\Poker Coach.lnk"
  Delete "$DESKTOP\Poker Coach.lnk"
  DeleteRegKey HKCU "${UNINST}"
  DeleteRegKey HKCU "Software\PokerCoach"
  ; %APPDATA%\PokerCoach, your progress, is left where it is: installing again finds it
SectionEnd
