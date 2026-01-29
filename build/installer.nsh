!macro customUnInstall
  MessageBox MB_YESNO "Do you also want to delete your personal data (History, Settings, and downloaded AI Models)?$\n$\nThis action cannot be undone." /SD IDNO IDYES deleteData IDNO keepData
  
  deleteData:
    RMDir /r "$APPDATA\${PRODUCT_FILENAME}"
    RMDir /r "$APPDATA\whisper-flow-clone" ; Legacy folder just in case
  
  keepData:
!macroend
