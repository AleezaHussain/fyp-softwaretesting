# Script to remove Lombok and add getters/setters to all DTO files

$dtoPath = "src/main/java/com/acme/chilledwatersystem/api/dto"

Get-ChildItem -Path $dtoPath -Filter "*.java" | ForEach-Object {
    $file = $_.FullName
    $content = Get-Content $file -Raw
    
    # Remove Lombok imports
    $content = $content -replace "import lombok\.Data;`r?`n", ""
    $content = $content -replace "import lombok\.Builder;`r?`n", ""
    $content = $content -replace "import lombok\.NoArgsConstructor;`r?`n", ""
    $content = $content -replace "import lombok\.AllArgsConstructor;`r?`n", ""
    
    # Remove Lombok annotations
    $content = $content -replace "@Data`r?`n", ""
    $content = $content -replace "@Builder`r?`n", ""
    $content = $content -replace "@NoArgsConstructor`r?`n", ""
    $content = $content -replace "@AllArgsConstructor`r?`n", ""
    
    # Save the file
    Set-Content -Path $file -Value $content -NoNewline
    
    Write-Host "Processed: $($_.Name)"
}

Write-Host "`nLombok annotations removed from all DTO files!"
Write-Host "Note: You'll need to add getters/setters manually or use IDE generation."
