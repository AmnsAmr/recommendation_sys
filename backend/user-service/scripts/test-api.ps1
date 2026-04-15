param(
    [string]$BaseUrl = "http://localhost:8081",
    [string]$Password = "Password123!",
    [string]$TestSuffix = "",
    [string]$Email = "",
    [string]$Username = "",
    [string]$DisplayName = "Curl Test User"
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($TestSuffix)) {
    $TestSuffix = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds().ToString()
}

if ([string]::IsNullOrWhiteSpace($Email)) {
    $Email = "curltest$TestSuffix@example.com"
}

if ([string]::IsNullOrWhiteSpace($Username)) {
    $Username = "curltest_$TestSuffix"
}

function Write-Step {
    param(
        [string]$Label,
        [string]$Method,
        [string]$Url,
        [int]$StatusCode,
        [object]$Body
    )

    Write-Host ""
    Write-Host "=== $Label ==="
    Write-Host "$Method $Url"
    Write-Host "HTTP $StatusCode"
    if ($null -ne $Body) {
        $Body | ConvertTo-Json -Depth 10
    }
}

function Invoke-ApiRequest {
    param(
        [string]$Label,
        [string]$Method,
        [string]$Path,
        [object]$Payload = $null,
        [hashtable]$Headers = @{}
    )

    $url = "$BaseUrl$Path"
    $jsonBody = $null
    if ($null -ne $Payload) {
        $jsonBody = $Payload | ConvertTo-Json -Depth 10
    }

    try {
        $response = Invoke-RestMethod `
            -Method $Method `
            -Uri $url `
            -Headers $Headers `
            -ContentType "application/json" `
            -Body $jsonBody `
            -StatusCodeVariable statusCode

        Write-Step -Label $Label -Method $Method -Url $url -StatusCode $statusCode -Body $response
        return @{
            StatusCode = $statusCode
            Body = $response
        }
    }
    catch {
        $statusCode = 0
        $errorBody = $null

        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }

        if ($_.ErrorDetails.Message) {
            try {
                $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
            }
            catch {
                $errorBody = $_.ErrorDetails.Message
            }
        }

        Write-Step -Label $Label -Method $Method -Url $url -StatusCode $statusCode -Body $errorBody
        throw
    }
}

Write-Host "Testing user-service endpoints at $BaseUrl"
Write-Host "Using generated account: $Email / $Username"

$registerPayload = @{
    email = $Email
    password = $Password
    username = $Username
    displayName = $DisplayName
    interests = @("music", "gaming", "education")
}

$registerResult = Invoke-ApiRequest -Label "Register" -Method "POST" -Path "/users/register" -Payload $registerPayload
$userId = $registerResult.Body.userId
$token = $registerResult.Body.token

if ([string]::IsNullOrWhiteSpace($userId)) {
    throw "Could not extract userId from register response."
}

Write-Host ""
Write-Host "Captured userId: $userId"
if (-not [string]::IsNullOrWhiteSpace($token)) {
    Write-Host "Captured token from register response."
}

$loginPayload = @{
    email = $Email
    password = $Password
}

$loginResult = Invoke-ApiRequest -Label "Login" -Method "POST" -Path "/users/login" -Payload $loginPayload
if (-not [string]::IsNullOrWhiteSpace($loginResult.Body.token)) {
    $token = $loginResult.Body.token
}

$ownerHeader = @{
    "X-User-Id" = $userId
    "Authorization" = "Bearer $token"
}

$null = Invoke-ApiRequest -Label "Get Profile" -Method "GET" -Path "/users/$userId/profile" -Headers $ownerHeader

$updateProfilePayload = @{
    displayName = "Updated $DisplayName"
    bio = "Updated from scripts/test-api.ps1"
    profilePictureUrl = "https://example.com/avatar/$TestSuffix.png"
}

$null = Invoke-ApiRequest -Label "Update Profile" -Method "PUT" -Path "/users/$userId/profile" -Payload $updateProfilePayload -Headers $ownerHeader

$updatePreferencesPayload = @{
    preferences = @(
        @{ category = "music"; weight = 0.90 }
        @{ category = "gaming"; weight = 0.70 }
        @{ category = "education"; weight = 0.65 }
    )
}

$null = Invoke-ApiRequest -Label "Update Preferences" -Method "PUT" -Path "/users/$userId/preferences" -Payload $updatePreferencesPayload -Headers $ownerHeader

Write-Host ""
Write-Host "All user-service endpoint checks completed successfully."
