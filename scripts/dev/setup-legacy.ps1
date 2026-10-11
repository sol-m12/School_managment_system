<#
  Sets up the legacy PHP system on MAMP, only for comparing old pages with new pages.
  Touches only: database keyit_legacy, folder C:\MAMP\htdocs\keyt.com, the PHP error log.
  Contains no secrets. Safe to run again at any time.

  Run: powershell -ExecutionPolicy Bypass -File scripts\dev\setup-legacy.ps1
#>

$ErrorActionPreference = 'Stop'

$RepoRoot    = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$SourceDir   = Join-Path $RepoRoot 'legacy-php\ElasticSaaS'
$SqlFile     = Join-Path $SourceDir 'fixed_backup.sql'
$SeedFile    = Join-Path $PSScriptRoot 'legacy-menu-seed.json'
$TargetDir   = 'C:\MAMP\htdocs\keyt.com'
$ConfigRel   = 'includes\config.php'
$MysqlExe    = 'C:\MAMP\bin\mysql\bin\mysql.exe'
$HttpdConf   = 'C:\MAMP\conf\apache\httpd.conf'
$DbHost      = '127.0.0.1'
$DbPort      = '3306'
$DbUser      = 'keyt_app'
$DbName      = 'keyit_legacy'
$TestUserId  = 15
$TestPass    = 'Test#12345'
$LoginUrl    = 'http://localhost:81/keyt.com/login.php'
$Protected   = @('keyt_school', 'keyt_school_before_tenant', 'keyt_school_test')

function Fail([string]$msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

if ($Protected -contains $DbName) { Fail "Refusing to touch protected database $DbName." }
if ($TargetDir -ne 'C:\MAMP\htdocs\keyt.com') { Fail "Unexpected target folder $TargetDir." }

# Active PHP version and its error log, read from the MAMP Apache config.
$phpDir = $null
if (Test-Path $HttpdConf) {
    $m = Select-String -Path $HttpdConf -Pattern 'LoadModule\s+php\w*_module\s+"?([^"]+)\\php[^\\"]+\.dll' | Select-Object -First 1
    if ($m) { $phpDir = $m.Matches[0].Groups[1].Value }
}
if (-not $phpDir) { $phpDir = 'C:\MAMP\bin\php\php8.3.1' }
$PhpExe = Join-Path $phpDir 'php.exe'
$PhpIni = Join-Path 'C:\MAMP\conf' ((Split-Path $phpDir -Leaf) + '\php.ini')
$ErrorLog = 'C:\MAMP\logs\php_error.log'
if (Test-Path $PhpIni) {
    $l = Select-String -Path $PhpIni -Pattern '^\s*error_log\s*=\s*"?([^"\r\n]+?)"?\s*$' | Select-Object -First 1
    if ($l) { $ErrorLog = $l.Matches[0].Groups[1].Value -replace '/', '\' }
}

foreach ($p in @($SourceDir, $SqlFile, $SeedFile, $MysqlExe, $PhpExe)) {
    if (-not (Test-Path $p)) { Fail "Not found: $p" }
}

Write-Host ''
Write-Host 'This script will:' -ForegroundColor Cyan
Write-Host "  1. DROP and recreate database $DbName (utf8mb4 / utf8mb4_general_ci) on ${DbHost}:$DbPort as $DbUser"
Write-Host "  2. Import fixed_backup.sql into $DbName"
Write-Host "  3. DELETE $TargetDir and copy legacy-php\ElasticSaaS into it (*.sql and .env files are not copied)"
Write-Host "  4. Patch the database connection settings in the copy only"
Write-Host "  5. Set test password '$TestPass' for users.user_id = $TestUserId in $DbName"
Write-Host "  6. Clear $ErrorLog and request $LoginUrl"
Write-Host "  Never touched: $($Protected -join ', ')"
Write-Host ''
$answer = Read-Host 'Type YES to continue'
if ($answer -ne 'YES') { Write-Host 'Cancelled.'; exit 0 }

$secure = Read-Host "Password for MySQL user $DbUser" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $DbPass = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
if ([string]::IsNullOrEmpty($DbPass)) { Fail 'Empty password.' }

$MysqlArgs = @("--host=$DbHost", "--port=$DbPort", "--user=$DbUser", '--default-character-set=utf8mb4')

function Invoke-Mysql([string]$sql, [string]$database = '') {
    $ErrorActionPreference = 'Continue'
    $a = $MysqlArgs + @('-N', '-B')
    if ($database) { $a += $database }
    $a += @('-e', $sql)
    $out = & $MysqlExe @a
    if ($LASTEXITCODE -ne 0) { Fail "mysql command failed (exit $LASTEXITCODE)." }
    return $out
}

function Invoke-MysqlText([string]$sql, [string]$database) {
    # Through a UTF-8 file so Amharic text is not corrupted by the Windows command line.
    $tmp = [IO.Path]::Combine([IO.Path]::GetTempPath(), 'keyt-legacy-' + [guid]::NewGuid().ToString('N') + '.tmp')
    try {
        [IO.File]::WriteAllText($tmp, $sql, (New-Object Text.UTF8Encoding $false))
        $a = ($MysqlArgs + @($database)) | ForEach-Object { '"' + $_ + '"' }
        $p = Start-Process -FilePath $MysqlExe -ArgumentList $a -RedirectStandardInput $tmp -NoNewWindow -Wait -PassThru
        if ($p.ExitCode -ne 0) { Fail "mysql script failed (exit $($p.ExitCode))." }
    } finally { Remove-Item -LiteralPath $tmp -ErrorAction SilentlyContinue }
}

function SqlStr($v) {
    if ($null -eq $v) { return 'NULL' }
    return "'" + ([string]$v).Replace('\', '\\').Replace("'", "''") + "'"
}

# Stage 1 of rebuilding what the legacy code expects but fixed_backup.sql lacks:
# roles, users.role_id / tenant_id / created_at, and the database-driven sidebar.
$SchemaStage1 = @'
CREATE TABLE IF NOT EXISTS roles (
  role_id INT AUTO_INCREMENT PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  dashboard_url VARCHAR(255) NULL,
  UNIQUE KEY uq_roles_name (role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE users
  MODIFY role ENUM('Teacher','Admin','Technician','Secretary','Counselor','Finance','V_Principal','Registrar','Librarian','Store_Keeper','Student') NULL,
  ADD COLUMN role_id INT NULL AFTER role,
  ADD COLUMN tenant_id INT NOT NULL DEFAULT 1,
  ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  ADD INDEX idx_users_role_id (role_id);

CREATE TABLE IF NOT EXISTS modules (
  module_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  url VARCHAR(255) NOT NULL,
  icon VARCHAR(100) NOT NULL DEFAULT 'fa-solid fa-link',
  group_title VARCHAR(100) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS role_modules (
  role_id INT NOT NULL,
  module_id INT NOT NULL,
  PRIMARY KEY (role_id, module_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
'@

# Stage 2: per-year class sessions and student enrollments. The old dump keeps
# grade, section and year on students; the newer code reads them from these tables.
$SchemaStage2 = @'
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS registration_types (
  type_id INT AUTO_INCREMENT PRIMARY KEY,
  type_name VARCHAR(100) NOT NULL,
  category_name VARCHAR(100) NULL,
  sub_type_name VARCHAR(100) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS class_sessions (
  session_id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  class_id INT NOT NULL,
  stream VARCHAR(50) NULL,
  academic_year VARCHAR(10) NOT NULL,
  class_teacher_id INT NULL,
  max_capacity INT NULL,
  shift VARCHAR(20) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_cs_class_year (class_id, academic_year),
  INDEX idx_cs_teacher (class_teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS student_enrollments (
  enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1,
  student_id INT NOT NULL,
  academic_year VARCHAR(10) NOT NULL,
  grade_level INT NULL,
  stream VARCHAR(50) NULL,
  section VARCHAR(10) NULL,
  age INT NULL,
  reg_type_id INT NULL,
  is_transfer TINYINT(1) NOT NULL DEFAULT 0,
  admission_date DATE NULL,
  submission_status VARCHAR(20) NULL DEFAULT 'Draft',
  registered_by INT NULL,
  is_approved TINYINT(1) NOT NULL DEFAULT 0,
  session_id INT NULL,
  class_id INT NULL,
  class_session_id INT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_se_student (student_id),
  INDEX idx_se_year (academic_year),
  INDEX idx_se_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET @cur_year = (SELECT setting_value FROM system_settings WHERE setting_key = 'current_academic_year' LIMIT 1);

INSERT INTO registration_types (type_name, category_name)
SELECT DISTINCT CONVERT(registration_type USING utf8mb4), CONVERT(registration_type USING utf8mb4)
FROM students WHERE registration_type IS NOT NULL AND registration_type <> '';

INSERT INTO class_sessions (class_id, stream, academic_year, class_teacher_id, max_capacity)
SELECT class_id, stream, @cur_year, class_teacher_id, max_capacity FROM classes;

INSERT INTO student_enrollments
  (student_id, academic_year, grade_level, stream, section, age, reg_type_id, is_transfer,
   admission_date, submission_status, registered_by, is_approved, class_id)
SELECT s.student_id,
       COALESCE(NULLIF(s.academic_year, ''), @cur_year),
       s.grade_level, s.stream, s.section, s.age,
       (SELECT rt.type_id FROM registration_types rt
         WHERE rt.type_name = CONVERT(s.registration_type USING utf8mb4) COLLATE utf8mb4_general_ci LIMIT 1),
       COALESCE(s.is_transfer, 0), s.admission_date, s.submission_status, s.registered_by,
       COALESCE(s.is_approved, 0),
       (SELECT MIN(c.class_id) FROM classes c
         WHERE c.grade_level = s.grade_level AND c.section = s.section
           AND (c.stream IS NULL OR s.stream IS NULL OR s.stream = '' OR c.stream = s.stream))
FROM students s;

UPDATE student_enrollments se
JOIN class_sessions cs ON cs.class_id = se.class_id AND cs.academic_year = @cur_year
SET se.session_id = cs.session_id, se.class_session_id = cs.session_id;
'@

try {
    $env:MYSQL_PWD = $DbPass

    Write-Host "`n[1/6] Checking connection..." -ForegroundColor Cyan
    Invoke-Mysql 'SELECT 1;' | Out-Null

    Write-Host "[1/6] Recreating database $DbName..." -ForegroundColor Cyan
    Invoke-Mysql "DROP DATABASE IF EXISTS ``$DbName``; CREATE DATABASE ``$DbName`` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;" | Out-Null

    Write-Host "[2/6] Importing fixed_backup.sql (this can take a while)..." -ForegroundColor Cyan
    # --one-database ignores any statement aimed at another database.
    $importArgs = ($MysqlArgs + @('--one-database', $DbName)) | ForEach-Object { '"' + $_ + '"' }
    $proc = Start-Process -FilePath $MysqlExe -ArgumentList $importArgs -RedirectStandardInput $SqlFile `
        -NoNewWindow -Wait -PassThru
    if ($proc.ExitCode -ne 0) { Fail "Import failed (exit $($proc.ExitCode)). See the mysql message above." }
    $tableCount = Invoke-Mysql "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$DbName';"
    Write-Host "      Tables imported: $tableCount"
    if ([int]$tableCount -eq 0) { Fail 'No tables were imported.' }
    $hasRoles = Invoke-Mysql "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$DbName' AND TABLE_NAME = 'roles';"
    if ([int]$hasRoles -eq 0) {
        Write-Host '      Adding missing legacy schema (stage 1: roles, users.role_id, sidebar menu)...'
        $seed = Get-Content -LiteralPath $SeedFile -Raw -Encoding UTF8 | ConvertFrom-Json
        $sb = New-Object Text.StringBuilder
        [void]$sb.AppendLine('SET NAMES utf8mb4;')
        [void]$sb.AppendLine($SchemaStage1)
        foreach ($r in $seed.roles) {
            [void]$sb.AppendLine("INSERT INTO roles (role_name, dashboard_url) VALUES ($(SqlStr $r.role_name), $(SqlStr $r.dashboard_url));")
        }
        [void]$sb.AppendLine('UPDATE users u JOIN roles r ON r.role_name = u.role SET u.role_id = r.role_id;')
        foreach ($m in $seed.modules) {
            [void]$sb.AppendLine("INSERT INTO modules (title, url, icon, group_title, sort_order) VALUES ($(SqlStr $m.title), $(SqlStr $m.url), $(SqlStr $m.icon), $(SqlStr $m.group_title), $([int]$m.sort_order));")
            [void]$sb.AppendLine("INSERT INTO role_modules (role_id, module_id) SELECT role_id, LAST_INSERT_ID() FROM roles WHERE role_name = $(SqlStr $m.role);")
        }
        Invoke-MysqlText $sb.ToString() $DbName
        $noRole = Invoke-Mysql 'SELECT COUNT(*) FROM users WHERE role_id IS NULL;' $DbName
        Write-Host "      Done. Menu items: $(@($seed.modules).Count). Users without a role: $noRole"
    }
    $hasEnroll = Invoke-Mysql "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$DbName' AND TABLE_NAME = 'student_enrollments';"
    if ([int]$hasEnroll -eq 0) {
        Write-Host '      Adding missing legacy schema (stage 2: class sessions, student enrollments)...'
        Invoke-MysqlText $SchemaStage2 $DbName
        $stats = Invoke-Mysql "SELECT CONCAT((SELECT COUNT(*) FROM class_sessions), ' sessions, ', (SELECT COUNT(*) FROM student_enrollments), ' enrollments, ', (SELECT COUNT(*) FROM student_enrollments WHERE session_id IS NULL), ' without a class');" $DbName
        Write-Host "      Done. $stats"
    }

    Write-Host "[3/6] Copying code to $TargetDir..." -ForegroundColor Cyan
    if (Test-Path $TargetDir) { Remove-Item -LiteralPath $TargetDir -Recurse -Force }
    $ErrorActionPreference = 'Continue'
    & robocopy $SourceDir $TargetDir /E /XF *.sql .env .env.* /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { Fail "robocopy failed (exit $LASTEXITCODE)." }
    $ErrorActionPreference = 'Stop'

    Write-Host "[4/6] Patching connection settings in the copy..." -ForegroundColor Cyan
    $configPath = Join-Path $TargetDir $ConfigRel
    if (-not (Test-Path $configPath)) { Fail "Not found: $configPath" }
    $phpPass = $DbPass.Replace('\', '\\').Replace("'", "\'")
    $values = [ordered]@{ DB_SERVER = $DbHost; DB_USERNAME = $DbUser; DB_PASSWORD = $phpPass; DB_NAME = $DbName }
    $text = [IO.File]::ReadAllText($configPath, [Text.Encoding]::UTF8)
    foreach ($name in $values.Keys) {
        $pattern = "define\(\s*(['""])$name\1\s*,\s*(['""]).*?\2\s*\)"
        if (-not [regex]::IsMatch($text, $pattern)) { Fail "$name not found in $ConfigRel." }
        $replacement = "define('$name', '$($values[$name])')"
        $text = [regex]::Replace($text, $pattern, [Text.RegularExpressions.MatchEvaluator] { param($m) $replacement })
    }
    [IO.File]::WriteAllText($configPath, $text, (New-Object Text.UTF8Encoding $false))
    Write-Host "      Changed: $ConfigRel"

    $others = Get-ChildItem $TargetDir -Recurse -File -Include *.php |
        Where-Object { $_.FullName -notmatch '\\vendor\\' -and $_.FullName -ne $configPath } |
        Select-String -Pattern 'mysqli_connect|new\s+mysqli|new\s+PDO|mysql_connect' -List
    foreach ($o in $others) {
        Write-Host "      WARNING: other connection point not patched: $($o.Path.Replace($TargetDir + '\', ''))" -ForegroundColor Yellow
    }

    Write-Host "[5/6] Setting test password for user_id $TestUserId..." -ForegroundColor Cyan
    $ErrorActionPreference = 'Continue'
    $hash = [string](& $PhpExe -r "echo password_hash('$TestPass', PASSWORD_BCRYPT);")
    $phpExit = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    $hash = $hash.Trim()
    if ($phpExit -ne 0 -or -not $hash.StartsWith('$2y$') -or $hash.Length -ne 60) { Fail 'Could not generate bcrypt hash with MAMP PHP.' }
    $rows = Invoke-Mysql ("UPDATE users SET password_hash = '" + $hash + "', password_changed = 1, is_active = 1 WHERE user_id = $TestUserId; SELECT ROW_COUNT();") $DbName
    if ([int]$rows -eq 1) {
        $uname = Invoke-Mysql "SELECT username FROM users WHERE user_id = $TestUserId;" $DbName
        Write-Host "      Login: username '$uname', password '$TestPass'"
    } else {
        Write-Host "      WARNING: user_id $TestUserId not found; no password changed." -ForegroundColor Yellow
    }
}
finally {
    Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}

Write-Host "[6/6] Testing $LoginUrl..." -ForegroundColor Cyan
$logDir = Split-Path $ErrorLog -Parent
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
Set-Content -LiteralPath $ErrorLog -Value $null

$status = $null
try {
    $resp = Invoke-WebRequest -Uri $LoginUrl -UseBasicParsing -TimeoutSec 30
    $status = [int]$resp.StatusCode
} catch {
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    else { Write-Host "      Request failed: $($_.Exception.Message)" -ForegroundColor Yellow }
}
Write-Host "      HTTP status: $status"

Start-Sleep -Seconds 1
$lines = @()
if (Test-Path $ErrorLog) { $lines = Get-Content -LiteralPath $ErrorLog | Where-Object { $_ -match 'keyt\.com' } }
if ($lines.Count -eq 0) {
    Write-Host "      No new keyt.com lines in $ErrorLog"
} else {
    Write-Host "      New keyt.com lines in ${ErrorLog}:"
    foreach ($line in $lines) {
        $masked = $line.Replace($DbPass, 'XXXX') -replace '(?i)(password\s*[=:]\s*)\S+', '$1XXXX'
        Write-Host "      $masked"
    }
}

$DbPass = $null; $phpPass = $null; $values = $null; $text = $null
Write-Host "`nDone. Open $LoginUrl" -ForegroundColor Green
