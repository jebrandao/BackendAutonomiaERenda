# Mede o TTFB de 10 requisições à função local.
# Uso (com o servidor rodando em outro terminal):
#   powershell -ExecutionPolicy Bypass -File .\medir-ttfb.ps1
$url = if ($args[0]) { $args[0] } else { 'http://localhost:4000/api/hora' }
1..10 | ForEach-Object {
  $t = curl.exe -s -o NUL -w '%{time_starttransfer}' $url
  "req $_ : TTFB = $t s"
}
