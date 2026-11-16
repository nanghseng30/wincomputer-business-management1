# Win Computer — Windows LAN self-hosting

ဤဖိုင်များသည် **ပြင်ဆင်ထားသော source/configuration သာ** ဖြစ်သည်။ ယခု environment တွင် Docker, Windows, ဖုန်း သို့မဟုတ် LAN ပေါ်၌ စမ်းသပ်/တပ်ဆင်ထားခြင်း မရှိပါ။ Owner ၏ ခွင့်ပြုချက်ဖြင့်သာ အမှန်တကယ် တပ်ဆင်ပါ။

## Architecture နှင့် ကန့်သတ်ချက်

- Docker Compose သည် MySQL 8.4 + persistent `mysql_data` volume နှင့် server image ကို အသုံးပြုသည်။ MySQL ကို host port မဖွင့်ပါ။ App ၏ HTTP port ကို host `127.0.0.1:3000` သို့သာ bind လုပ်ထားပြီး LAN client က တိုက်ရိုက် မဝင်နိုင်ပါ။
- **Windows host ပေါ်ရှိ သီးခြား Caddy** က သတ်မှတ်ထားသော private LAN IP ၏ TCP 443 တွင်သာ HTTPS လက်ခံပြီး `127.0.0.1:3000` သို့ proxy လုပ်သည်။ Local firewall တွင် သတ်မှတ်ထားသော ဆိုင်၏ subnet/private profile ကိုသာ ခွင့်ပြုပါ။ Router port forwarding၊ public tunnel၊ VPN၊ internet-facing rule မပြုလုပ်ပါ။ Router ၏ guest isolation ကြောင့် စက်အချင်းချင်း မမြင်ရနိုင်သည်။
- App ကို `TRUST_PROXY=1` ဖြင့် တစ်ဆင့် proxy ဟုသတ်မှတ်ထားသည်။ Caddy ၏ untrusted forwarded-header handling နှင့် backend ၏ client-IP rate limit ကို စမ်းသပ်ပါ။ Loopback HTTP ကို ထပ်မံ expose မလုပ်ပါနှင့်; host ပေါ်ရှိ အခြား local users များက loopback သို့ တိုက်ရိုက်ဆက်သွယ်၍ forwarded headers အတု ပို့နိုင်သဖြင့် host access ကိုလည်း ကန့်သတ်ပါ။
- Secure session cookie များကြောင့် client များသည် `http://` မဟုတ်ဘဲ **ယုံကြည်ထားသော certificate ပါ HTTPS** ကို အသုံးပြုရမည်။ Certificate warning ကို bypass မလုပ်ပါနှင့်။ Server host ကိုပါ `https://<LAN-IP>` မှ ဝင်ပါ။
- Host PC/Docker/proxy ဖွင့်ထားရမည်၊ sleep/hibernate မဝင်ရ၊ လျှပ်စစ်နှင့် Wi-Fi/LAN ချိတ်ဆက်မှုရှိရမည်။ Router တွင် host အတွက် private IPv4 ကို DHCP reservation လုပ်ပါ။ IP ပြောင်းလျှင် certificate ကို IP အသစ်ဖြင့် ထပ်ထုတ်ပြီး clients တွင် URL ပြောင်းရမည်။
- Managed server နှင့် LAN server သည် **sync မလုပ်ပါ**။ သီးခြားဒေတာနှစ်စုံကို တစ်ပြိုင်နက်ရေးပြီး ပေါင်းစည်း၍ မရပါ။ Server တစ်ခုကိုသာ active သတ်မှတ်၍ လိုအပ်ချိန်တွင် သေချာစစ်ထားသည့် backup ကို တစ်ဖက်သို့ တစ်ကြိမ် လွှဲပါ။

## လိုအပ်ချက်များ

Windows 10/11 host, Docker Desktop with Linux containers and **Docker Engine 28.0+** (older releases may expose localhost-published ports to the same L2 network), Docker Compose v2 (2.20+ for `--wait`), PowerShell 5.1 သို့မဟုတ် 7, Caddy v2 (`caddy.exe` in PATH), OpenSSL 1.1.1+ (Windows installation in PATH) လိုအပ်သည်။ `docker version` ဖြင့် server engine version ကို စစ်ပါ။ Image/dependencies ကို ပထမ build လုပ်ချိန်တွင် internet လိုသည်။ Network/firewall/certificate ပြင်ဆင်မှုအချို့အတွက် administrator လိုသည်။ Docker Desktop နှင့် Caddy ကို သက်ဆိုင်ရာ official source မှ owner က တပ်ဆင်ပါ။ App အလုပ်လုပ်ချိန်တွင် LAN သာ လိုသည်။

## 1. Secrets နှင့် database

Project root တွင် PowerShell ဖွင့်ပြီး အောက်ပါအတိုင်း `.env` ကို **တစ်ကြိမ်သာ** local တွင် ဖန်တီးပါ။ အထွက်တန်ဖိုးများကို chat၊ issue၊ screenshot၊ git သို့ မပို့ပါနှင့်။ ဥပမာက မတူညီသော 256-bit random secret လေးခု ထုတ်ပေးသည်; approval password သည် login password မဟုတ်ပါ။ ရှိပြီးသား `.env` ကို မထပ်ရေးပါနှင့်။

```powershell
Set-Location C:\path\to\wincomputer
if (Test-Path .env) { throw '.env already exists; do not overwrite it' }
function New-Secret {
  $b = New-Object byte[] 32
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($b) } finally { $rng.Dispose() }
  -join ($b | ForEach-Object { $_.ToString('x2') })
}
@(
  'MYSQL_ROOT_PASSWORD=' + (New-Secret)
  'MYSQL_PASSWORD=' + (New-Secret)
  'APP_SESSION_SECRET=' + (New-Secret)
  'WIN_APPROVAL_PASSWORD=' + (New-Secret)
) | Set-Content -Encoding ASCII .env
$me = '{0}\{1}' -f $env:USERDOMAIN, $env:USERNAME
icacls .env /inheritance:r /grant:r "${me}:(F)" 'SYSTEM:(F)'
```

`.env.example` မှ ကူးယူပြီး ကိုယ်တိုင်ဖြည့်လည်းရသည်။ PowerShell scripts သည် DB/session secrets ကို 64 hex characters နှင့် approval ကို 20–128 ASCII letters/digits/`_`/`-`, အားလုံးမတူရန် စစ်သည်။ Hex DB password သည် database URL ထဲ၌ safely parse လုပ်နိုင်ရန်ဖြစ်သည်။ Approval value ကို owner က local password manager တွင် သိမ်းပြီး setup/approval တွင်သာ ရိုက်ပါ။ `.env`၊ backup နှင့် private keys ကို access ကန့်သတ်၊ encrypted backup ပြုလုပ်ပါ။ Docker administrators နှင့် host administrators သည် container environment/secrets များကို မြင်နိုင်သည်။ `docker compose config` output တွင် secrets ပါနိုင်သဖြင့် မမျှဝေပါနှင့်။

MySQL image ၏ initialization environment သည် **အသစ် volume စတင်ချိန်တွင်သာ** database/user/password ဖန်တီးသည်။ နောက်မှ `.env` password ကို တစ်ဖက်တည်းပြောင်းလျှင် DB password မပြောင်းပါ; database password rotation ကို MySQL အတွင်း အရင်စီမံပြီး `.env` ကို တပြိုင်နက် ပြောင်းပါ။ `APP_SESSION_SECRET` ပြောင်းလျှင် sessions များ invalid ဖြစ်နိုင်သည်။ Volume ကို ဖျက်ခြင်းသည် data ဖျက်ခြင်းဖြစ်သည်။

## 2. Private LAN CA နှင့် IP certificate

အောက်ပါ command များကို **host** ပေါ် admin PowerShell တွင်သာ လုပ်ပါ။ `192.168.1.50` ကို host ၏ reserved private IPv4 အစစ်ဖြင့် အစားထိုးပါ။ Caddyfile ၏ `{$WIN_LAN_IP}` သည် Caddy process environment မှ ယူသည်; စာသားကို မအစားထိုးရပါ။ IP-address Subject Alternative Name (SAN) ပါဝင်သည့် server certificate တည်ဆောက်သည်။

```powershell
$env:WIN_LAN_IP = '192.168.1.50'  # EXAMPLE ONLY: replace with host LAN IPv4
$certDir = 'C:\ProgramData\WinComputer\certs'
New-Item -ItemType Directory -Force $certDir | Out-Null
$me = '{0}\{1}' -f $env:USERDOMAIN, $env:USERNAME
icacls $certDir /inheritance:r /grant:r "${me}:(OI)(CI)F" 'SYSTEM:(OI)(CI)F'
Set-Location $certDir
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out rootCA.key
openssl req -x509 -new -key rootCA.key -sha256 -days 3650 -subj '/CN=Win Computer LAN Root CA' -addext 'basicConstraints=critical,CA:TRUE' -addext 'keyUsage=critical,keyCertSign,cRLSign' -out rootCA.crt
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out server.key
openssl req -new -key server.key -subj '/CN=Win Computer LAN' -out server.csr
$ext = "basicConstraints=critical,CA:FALSE`nkeyUsage=critical,digitalSignature,keyEncipherment`nextendedKeyUsage=serverAuth`nsubjectAltName=IP:$env:WIN_LAN_IP`n"
[IO.File]::WriteAllText((Join-Path $certDir 'server-ext.cnf'), $ext, [Text.Encoding]::ASCII)
openssl x509 -req -in server.csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial -days 825 -sha256 -extfile server-ext.cnf -out server.crt
openssl verify -CAfile rootCA.crt -verify_ip $env:WIN_LAN_IP server.crt
openssl x509 -in rootCA.crt -noout -fingerprint -sha256
openssl x509 -in rootCA.crt -outform DER -out rootCA.cer  # if Android needs DER
openssl x509 -in rootCA.cer -inform DER -noout -fingerprint -sha256
```

Every OpenSSL command must succeed; inspect `server.crt` SAN (`openssl x509 -in server.crt -noout -text`). Fingerprint ကို owner က trusted channel ဖြင့် client များတွင် စစ်ဆေးပါ။ **rootCA.key** ကို offline, encrypted, access-restricted backup သို့ ပြောင်းသိမ်းပါ; CA key ပျောက်လျှင် CA အသစ်နှင့် client trust ပြန်လုပ်ရမည်။ `server.key` သည် host ပေါ် Caddy အတွက် လိုအပ်သော်လည်း private ဖြစ်သည်။ Public root certificate (`rootCA.crt` သို့မဟုတ် equivalent `rootCA.cer`) တစ်ခုသာ clients သို့ မျှဝေပါ; keys မျှဝေခြင်း၊ repo ထဲထည့်ခြင်း မပြုလုပ်ပါနှင့်။ Certificate သက်တမ်းကုန်မတိုင်မီ တူညီသော trusted CA ဖြင့် leaf certificate ပြန်ထုတ်ပြီး Caddy ပြန်စပါ။

**Windows client:** trusted source မှ rootCA.crt ယူ၍ fingerprint စစ်ပြီး သက်ဆိုင်ရာ user အတွက် `certutil -user -addstore Root C:\secure-transfer\rootCA.crt` လုပ်ပါ (organization-managed devices တွင် IT policy ကိုလိုက်နာပါ)။ WebView2 နှင့် browser ကို restart လုပ်ပြီး URL အတိအကျကို စမ်းပါ။ CA trust သည် security-sensitive ဖြစ်သဖြင့် သုံးမည့်စက်များတွင်သာ ထည့်ပါ။

**Android client:** rootCA.crt သို့မဟုတ် ၎င်း၏ DER encoding rootCA.cer ကို secure channel မှကူးပါ၊ fingerprint ကို သီးခြားစစ်ပါ။ Android Settings > Security > Encryption & credentials > Install a certificate > **CA certificate** မှ ထည့်ပါ (ဖုန်းအလိုက် menu ကွဲနိုင်သည်၊ screen lock လိုနိုင်သည်၊ system က network monitoring warning ပြနိုင်သည်)။ Thin client သည် system နှင့် user-installed CA နှစ်မျိုးလုံးကို trust လုပ်ရန် configure လုပ်ထားသည်—user CA တစ်ခုခုကို ပေါ့ပေါ့တန်တန် မထည့်ပါနှင့်။ Browser တစ်ခုချင်းစီ၏ user CA support ကွဲနိုင်သည်။ Invalid certificate ကို bypass လုပ်ရန် code/setting မထည့်ထားပါ။ Android နှင့် Windows တွင် IP SAN, expiry, device clock, trust chain ကို စမ်းပါ။

## 3. Start, stop, restart

Project root တွင် အောက်ပါ commands လုပ်ပါ။ လိုအပ်ပါက signed script policy နှင့် ကိုက်ညီစေရန် PowerShell ကို `-ExecutionPolicy Bypass` ဖြင့် **ထို process အတွက်သာ** ဖွင့်ပါ။ Scripts သည် `.env` မှ secret ကို process environment သို့ သတ်မှတ်ပြီး stale shell variables ကို override လုပ်သည်။

```powershell
Set-Location C:\path\to\wincomputer
.\scripts\start.ps1    # builds, waits for healthy DB, stops app, runs migrations, starts app
.\scripts\stop.ps1     # stops/removes containers; volume ကို မဖျက်ပါ
.\scripts\restart.ps1  # rebuilds, checks DB, migrates, starts app
```

`start.ps1` သည် migration failure ဖြစ်လျှင် app ကို stopped ထားသည်။ Compose ၏ `migrate` dependency သည် plain `docker compose up -d --build` အတွက်လည်း DB healthy ဖြစ်ပြီး migration အောင်မြင်မှ app စတင်စေသည်။ Schema ပြောင်းထားသည့် update တိုင်းတွင် script သုံးပါ; Drizzle migration journal က apply ပြီးသား migrations များကို မှတ်ထားသည်။ MySQL DDL failure ကို transaction ဖြင့် အပြည့် rollback လုပ်မည်ဟု မယူဆပါနှင့်—upgrade မတိုင်မီ backup လိုသည်။ Build ပါသော start လုပ်လျှင် internet လိုနိုင်သည်။ App start command အောင်မြင်ခြင်းသည် end-to-end health confirmation မဟုတ်ပါ။

HTTPS proxy ကို **သီးခြား PowerShell window** မှ စတင်ပြီး ထို window ကို ဖွင့်ထားပါ။ စတင်ခြင်း/ပြန်စခြင်းတိုင်း LAN IP ကို အတည်ပြုပါ။ Project root မှ:

```powershell
.\scripts\start-proxy.ps1 -LanIp '192.168.1.50'  # EXAMPLE ONLY: replace with host LAN IPv4
```

Launcher သည် RFC1918 private IPv4 ဖြစ်ပြီး host interface တွင် တကယ်ရှိကြောင်း စစ်ဆေးသည်။ ရပ်ရန် Caddy window တွင် Ctrl+C နှိပ်ပါ။ ပြန်စရန် command ပြန်လုပ်ပါ။ `stop.ps1` သည် Caddy ကို မရပ်ပါ။ Caddyfile သည် automatic HTTP redirect နှင့် admin endpoint ပိတ်ထားပြီး port 443 တွင် private IP ကိုသာ bind လုပ်သည်။ HTTPS process သည် separate foreground process ဖြစ်သဖြင့် Windows reboot ပြီး **ကိုယ်တိုင် ပြန်စ** ရမည်။ Automatic Windows service မတပ်ဆင်ထားပါ။

Admin PowerShell မှ private network source အတွက်သာ firewall allow rule ထည့်ပါ (IP/subnet နှစ်ခုလုံးကို အမှန်တကယ် LAN နှင့် အစားထိုးပါ):

```powershell
$caddy = (Get-Command caddy.exe).Source
New-NetFirewallRule -DisplayName 'Win Computer LAN HTTPS' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 443 -LocalAddress '192.168.1.50' -RemoteAddress '192.168.1.0/24' -Profile Private -Program $caddy
```

Existing firewall rules, other interfaces နှင့် router WAN settings ကိုပါ စစ်ပါ။ LAN client မှ `https://<reserved-IP>/api/health` နှင့် login/receipt လုပ်ဆောင်ချက်များကို certificate warning မရှိဘဲ စမ်းပါ။ `docker compose ps` / `docker compose logs app` ဖြင့် ရှာဖွေနိုင်သော်လည်း logs ထဲ confidential data ရှိနိုင်သဖြင့် မျှဝေမီ စစ်ပါ။

## 4. Backup နှင့် destructive restore

SQL dump သည် sensitive records နှင့် password hashes ပါဝင်နိုင်သည်။ Owner-only directory, encrypted offline copy, backup retention နှင့် periodic **separate test system** restore check လုပ်ပါ။ Scripts သည် DB container `/tmp` တွင် owner-only temporary SQL file ဖန်တီးပြီး ပုံမှန်ပြီးစီး/controlled failure တွင် ဖျက်သည်; power loss/abrupt kill ဖြစ်လျှင် ကျန်နိုင်သဖြင့် host နှင့် Docker admin access ကို ကန့်သတ်ပြီး stale `wincomputer-backup-*` / `wincomputer-restore-*` files ကို စစ်ပြီး ဖျက်ပါ။ Backup source DB သည် MySQL/InnoDB ဖြစ်ရန်နှင့် dump အတွင်း app schema နှင့် Drizzle `__drizzle_migrations` အပါအဝင် အားလုံးပါရန် စစ်ပါ။ Script သည် `--single-transaction` ဖြင့် transactional tables အတွက် consistent snapshot ယူသည်; non-transactional tables, schema changes နှင့် concurrent migrations ကို မကာကွယ်ပါ။ Consistency အတွက် staff အားလုံး write ရပ်ပြီး migration မလုပ်နေချိန်တွင် ယူပါ။ Output path သည် project အပြင်ဘက်၊ အသစ်ဖြစ်ရမည်။

```powershell
.\scripts\backup.ps1 -OutputPath 'D:\WinComputerBackups\before-change.sql'
# Restore destroys/replaces the current LAN DB. Pre-restore backup and owner approval REQUIRED.
.\scripts\restore.ps1 -BackupPath 'D:\WinComputerBackups\approved.sql' -ConfirmRestore 'ERASE-LAN-DATABASE'
```

Restore script သည် app ကို ရပ်ပြီး `wincomputer` database ကို **DROP + CREATE** လုပ်ကာ trusted SQL dump ကို import၊ migrations လုပ်ပြီး အောင်မှ app ပြန်စသည်။ Failure ကြားဖြတ်ပါက database သည် အလွတ်/တစ်စိတ်တစ်ပိုင်း ဖြစ်နိုင်ပြီး app stopped ဖြစ်မည်; လက်ရှိ data ကို ပြန်ရရန် မတိုင်မီယူထားသော backup လိုသည်။ Untrusted SQL ကို root ဖြင့် မတင်ပါနှင့်။ SQL file သည် single-database dump (`mysqldump ... wincomputer`, `--databases` မသုံး) ဖြစ်ရမည်၊ user/grant management မပါရ။ Backup မတူသည့် MySQL version/schema၊ DEFINER/routine permissions သို့မဟုတ် migration history နှင့် မကိုက်နိုင်သဖြင့် copy ကို test system တွင် အရင် restore စစ်ပါ။ Restore ပြီး accounts/receipts/audit နမူနာ၊ migration status၊ access နှင့် backup integrity ကို စစ်ပါ။

**Managed ↔ LAN one-way cutover:** source ကို အဓိက သတ်မှတ်၊ writes ရပ်၊ source provider ၏ authorized consistent SQL export ယူ၊ target ကို အရင် backup၊ schema/version/migration history ကို test system တွင် စစ်၊ target ကို restore ပြီး verify လုပ်ပါ။ ပြီးမှ users ကို target သို့သာ ပြောင်းပါ။ ပြောင်းပြီး source ၌ အသစ်ရေးထားသည့် data နှင့် အလိုအလျောက် sync/merge/rollback မရှိပါ။ Managed DB export/import access သည် provider permissions ပေါ် မူတည်ပြီး ဤ repository မှ test မလုပ်ထားပါ။

**မလုပ်ရ:** `docker compose down -v`, volume delete, passwords/keys/backup ကို Git တွင်ထည့်ခြင်း၊ TLS check ကျော်ခြင်း၊ public port forward/tunnel ဖွင့်ခြင်း။
