; Eighth Rank for Windows: the installer (NSIS 3).
;
;   makensis -DVERSION=1.5 installer/EighthRank.nsi      (build.py does this when makensis is installed)
;   makensis reads its paths from this file's folder: by default it packs ../dist/EighthRank.exe and writes
;   ../dist/EighthRank-Setup.exe; -DEXE= and -DOUT= change them.
;
; It installs for the person running it, so it never asks for an administrator: the program goes to
; %LOCALAPPDATA%\Programs\EighthRank, with a shortcut in the Start menu and on the desktop and an entry in
; Settings > Apps (Installed apps) to uninstall it. Installing a newer version over an older one replaces the
; program and keeps everything else. Your progress lives apart from the program, in %APPDATA%\EighthRank, and
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
  !define EXE "../dist/EighthRank.exe"
!endif
!ifndef OUT
  !define OUT "../dist/EighthRank-Setup.exe"
!endif
!define UNINST "Software\Microsoft\Windows\CurrentVersion\Uninstall\EighthRank"

Name "Eighth Rank"
OutFile "${OUT}"
RequestExecutionLevel user
InstallDir "$LOCALAPPDATA\Programs\EighthRank"
InstallDirRegKey HKCU "Software\EighthRank" "InstallDir"
SetCompressor /SOLID lzma
BrandingText "Eighth Rank ${VERSION}"
ShowInstDetails nevershow
ShowUninstDetails nevershow

VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "Eighth Rank"
VIAddVersionKey "FileDescription" "Eighth Rank installer"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "Free software under the GNU GPL v3"

!define MUI_ICON "icon.ico"
!define MUI_UNICON "icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Eighth Rank ${VERSION}"
!define MUI_WELCOMEPAGE_TEXT "This puts Eighth Rank on this computer: a chess course in six ranks, puzzles, openings to explore and train, and a computer opponent with a coach that rates every move.$\r$\n$\r$\nIt installs for you only, so no administrator is needed, and it works offline. If you have used it before, your progress is kept.$\r$\n$\r$\nChoose Next to continue."
!define MUI_FINISHPAGE_RUN "$INSTDIR\EighthRank.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Open Eighth Rank now"

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
    nsExec::Exec '"$SYSDIR\cmd.exe" /c tasklist /FI "IMAGENAME eq EighthRank.exe" /NH | find /I "EighthRank.exe"'
    Pop $0
    StrCmp $0 "0" 0 done
    IfSilent close
    MessageBox MB_OKCANCEL|MB_ICONINFORMATION "Eighth Rank is open. It will be closed to go on; your progress is saved." IDOK close
    Abort
    close:
    nsExec::Exec '"$SYSDIR\taskkill.exe" /IM EighthRank.exe'
    Sleep 2500
    nsExec::Exec '"$SYSDIR\taskkill.exe" /F /IM EighthRank.exe'
    Sleep 500
    done:
  FunctionEnd
!macroend
!insertmacro CloseRunning ""
!insertmacro CloseRunning "un."

Section "Eighth Rank"
  Call CloseRunning
  SetOutPath "$INSTDIR"
  File "/oname=EighthRank.exe" "${EXE}"
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  CreateShortcut "$SMPROGRAMS\Eighth Rank.lnk" "$INSTDIR\EighthRank.exe" "" "$INSTDIR\EighthRank.exe" 0 SW_SHOWNORMAL "" "Learn chess one rank at a time"
  CreateShortcut "$DESKTOP\Eighth Rank.lnk" "$INSTDIR\EighthRank.exe" "" "$INSTDIR\EighthRank.exe" 0 SW_SHOWNORMAL "" "Learn chess one rank at a time"

  WriteRegStr HKCU "Software\EighthRank" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNINST}" "DisplayName" "Eighth Rank"
  WriteRegStr HKCU "${UNINST}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINST}" "Publisher" "e1caro"
  WriteRegStr HKCU "${UNINST}" "URLInfoAbout" "https://github.com/e1caro/torchnep/tree/master/chess"
  WriteRegStr HKCU "${UNINST}" "DisplayIcon" "$INSTDIR\EighthRank.exe"
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
  Delete "$INSTDIR\EighthRank.exe"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
  Delete "$SMPROGRAMS\Eighth Rank.lnk"
  Delete "$DESKTOP\Eighth Rank.lnk"
  DeleteRegKey HKCU "${UNINST}"
  DeleteRegKey HKCU "Software\EighthRank"
  ; %APPDATA%\EighthRank, your progress, is left where it is: installing again finds it
SectionEnd
