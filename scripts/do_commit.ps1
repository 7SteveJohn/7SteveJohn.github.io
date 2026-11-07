
$ErrorActionPreference = 'Stop'
git add -A
git commit -F scripts/commit_msg.txt
git push origin main
Remove-Item -Force scripts/commit_msg.txt -ErrorAction SilentlyContinue
