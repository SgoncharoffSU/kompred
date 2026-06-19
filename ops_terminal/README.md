Использование терминальных скриптов с транскрибированием

1. Все временные/операционные скрипты создаются только в этой папке.
2. Запускать скрипты через `run_with_transcript.ps1`.
3. Логи транскрибирования сохраняются в `ops_terminal/transcripts/`.

Пример:

```powershell
powershell -ExecutionPolicy Bypass -File .\ops_terminal\run_with_transcript.ps1 -ScriptPath .\ops_terminal\scripts\sample.ps1
```
