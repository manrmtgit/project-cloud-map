# Script de test Firebase - Cloud Map
# Run: .\test-firebase.ps1

Write-Host "Testing Firebase Synchronisation - Cloud Map" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$API_URL = "http://localhost:3000"
$LOGIN_EMAIL = "manager@cloudmap.local"
$LOGIN_PASSWORD = "Manager123!"

# Test 1: Check API connectivity
Write-Host "TEST 1: Verifying API connectivity" -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "$API_URL/api/signalements" -Method GET -ErrorAction Stop
    Write-Host "OK - API is accessible" -ForegroundColor Green
} catch {
    Write-Host "FAILED - Cannot connect to API: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Login
Write-Host "`nTEST 2: Manager authentication" -ForegroundColor Yellow
try {
    $loginBody = @{
        email = $LOGIN_EMAIL
        password = $LOGIN_PASSWORD
    } | ConvertTo-Json

    $loginResponse = Invoke-WebRequest -Uri "$API_URL/api/auth/login" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $loginBody `
        -ErrorAction Stop

    $loginData = $loginResponse.Content | ConvertFrom-Json
    $TOKEN = $loginData.token
    
    Write-Host "OK - Authentication successful" -ForegroundColor Green
    Write-Host "Token: $($TOKEN.Substring(0, 30))..." -ForegroundColor Green
} catch {
    Write-Host "FAILED - Authentication error: $_" -ForegroundColor Red
    exit 1
}

# Test 3: Get signalements from PostgreSQL
Write-Host "`nTEST 3: Checking PostgreSQL signalements" -ForegroundColor Yellow
try {
    $headers = @{ 
        "Authorization" = "Bearer $TOKEN"
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-WebRequest -Uri "$API_URL/api/signalements" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    $signalements = $response.Content | ConvertFrom-Json
    $count = ($signalements | Measure-Object).Count
    
    Write-Host "OK - Found $count signalements in PostgreSQL" -ForegroundColor Green
} catch {
    Write-Host "FAILED - Error getting signalements: $_" -ForegroundColor Red
    exit 1
}

# Test 4: Check Firebase status
Write-Host "`nTEST 4: Firebase connection status" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/api/signalements/sync/status" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop

    $stats = $response.Content | ConvertFrom-Json
    
    if ($stats.stats) {
        Write-Host "OK - Firebase is configured" -ForegroundColor Green
        Write-Host "  PostgreSQL signalements: $($stats.stats.postgresql_count)" -ForegroundColor Green
        Write-Host "  Firebase signalements: $($stats.stats.firebase_count)" -ForegroundColor Green
    }
} catch {
    Write-Host "WARNING - Cannot check Firebase status: $_" -ForegroundColor Yellow
}

# Test 5: PUSH to Firebase
Write-Host "`nTEST 5: Sending signalements to Firebase (PUSH)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/api/signalements/sync/push" `
        -Method POST `
        -Headers $headers `
        -ErrorAction Stop

    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "OK - PUSH to Firebase successful" -ForegroundColor Green
    Write-Host "Message: $($result.message)" -ForegroundColor Green
    if ($result.data.pushed_count) {
        Write-Host "Signalements sent: $($result.data.pushed_count)" -ForegroundColor Green
    }
} catch {
    Write-Host "FAILED - PUSH error: $_" -ForegroundColor Red
}

# Test 6: Verify in Firebase Console
Write-Host "`nTEST 6: Manual verification needed" -ForegroundColor Cyan
Write-Host ""
Write-Host "To verify data in Firebase:" -ForegroundColor White
Write-Host "1. Open Firebase Console:" -ForegroundColor White
Write-Host "   https://console.firebase.google.com/" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Select project: signalementroutier-1b496" -ForegroundColor White
Write-Host ""
Write-Host "3. Go to: Firestore Database > Collection 'signalements'" -ForegroundColor White
Write-Host ""
Write-Host "4. You should see the documents with signalements" -ForegroundColor White
Write-Host ""

# Test 7: PULL from Firebase
Write-Host "TEST 7: Retrieving signalements from Firebase (PULL)" -ForegroundColor Yellow
Start-Sleep -Seconds 2

try {
    $response = Invoke-WebRequest -Uri "$API_URL/api/signalements/sync/pull" `
        -Method POST `
        -Headers $headers `
        -ErrorAction Stop

    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "OK - PULL from Firebase successful" -ForegroundColor Green
    Write-Host "Message: $($result.message)" -ForegroundColor Green
} catch {
    Write-Host "FAILED - PULL error: $_" -ForegroundColor Red
}

# Test 8: Bidirectional sync
Write-Host "`nTEST 8: Bidirectional synchronization (PUSH + PULL)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$API_URL/api/signalements/sync/bidirectional" `
        -Method POST `
        -Headers $headers `
        -ErrorAction Stop

    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "OK - Bidirectional sync successful" -ForegroundColor Green
} catch {
    Write-Host "FAILED - Sync error: $_" -ForegroundColor Red
}

# Summary
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "TESTS COMPLETED" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Check Firebase Console for data" -ForegroundColor White
Write-Host "2. Test sync buttons in Manager interface (/manager)" -ForegroundColor White
Write-Host "3. Add new signalements and test sync" -ForegroundColor White
Write-Host ""
