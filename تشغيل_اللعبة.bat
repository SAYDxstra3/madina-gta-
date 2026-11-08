@echo off
cd /d "%~dp0"
echo جاري تشغيل خادم اللعبة على المنفذ 8080...
python -m http.server 8080
pause