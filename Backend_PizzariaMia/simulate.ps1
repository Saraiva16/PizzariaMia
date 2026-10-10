$ErrorActionPreference = "Continue"

$baseUrl = "http://localhost:5210/api"

# 1. Registrar um Admin (ignora erro se já existir)
$registerBody = @{
    name = "Admin Bot"
    phone = "0000000000"
    password = "admin"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $registerBody -ContentType "application/json" | Out-Null

# 2. Login to get token
$loginBody = @{
    phone = "0000000000"
    password = "admin"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.token

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "Token obtido. Iniciando simulação para o Pedido #2 em 2 segundos..."
Start-Sleep -Seconds 2

# 3. Preparing
Write-Host "-> Mudando status para: Preparing (Em Preparo)"
$statusBody = '"Preparing"'
Invoke-RestMethod -Uri "$baseUrl/orders/2/status" -Method Put -Body $statusBody -Headers $headers | Out-Null

Write-Host "Aguardando 10 segundos..."
Start-Sleep -Seconds 10

# 4. OutForDelivery
Write-Host "-> Mudando status para: OutForDelivery (Indo até você)"
$statusBody = '"OutForDelivery"'
Invoke-RestMethod -Uri "$baseUrl/orders/2/status" -Method Put -Body $statusBody -Headers $headers | Out-Null

Write-Host "Aguardando 10 segundos..."
Start-Sleep -Seconds 10

# 5. Delivered
Write-Host "-> Mudando status para: Delivered (Pedido Entregue)"
$statusBody = '"Delivered"'
Invoke-RestMethod -Uri "$baseUrl/orders/2/status" -Method Put -Body $statusBody -Headers $headers | Out-Null

Write-Host "Simulação concluída com sucesso!"
